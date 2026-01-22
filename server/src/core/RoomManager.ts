import { RoomState, RoomSettings, Participant } from '../types/room';
import { generateRoomId } from '../utils/idGenerator';
import { getServerTime } from '../utils/timeSync';
import logger from '../utils/logger';
import { hashPassword, verifyPassword } from '../utils/password';
import { RedisStore, getRedisStore } from '../storage';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private redisStore: RedisStore;
  private useRedis: boolean = false;
  private redisInitialized: boolean = false;

  constructor() {
    this.redisStore = getRedisStore();
  }

  /**
   * Initialize Redis connection and load persisted rooms.
   * Call this after creating the RoomManager instance.
   */
  async initializeRedis(): Promise<void> {
    if (this.redisInitialized) return;

    try {
      await this.redisStore.connect();
      this.useRedis = this.redisStore.isAvailable();
      if (this.useRedis) {
        // Load existing rooms from Redis on startup
        await this.loadRoomsFromRedis();
        logger.info('Redis storage enabled for room persistence');
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory storage only');
      this.useRedis = false;
    }
    this.redisInitialized = true;
  }

  private async loadRoomsFromRedis(): Promise<void> {
    if (!this.useRedis) return;

    try {
      const rooms = await this.redisStore.getAllRooms();
      for (const room of rooms) {
        // Only load rooms that still have participants or were created recently
        // (within last 5 minutes if empty)
        const isEmpty = room.participants.size === 0;
        const isRecent = Date.now() - room.createdAt < 5 * 60 * 1000;

        if (!isEmpty || isRecent) {
          this.rooms.set(room.roomId, room);
        } else {
          // Clean up old empty rooms
          await this.redisStore.deleteRoom(room.roomId);
        }
      }
      logger.info(`Loaded ${this.rooms.size} rooms from Redis`);
    } catch (error) {
      logger.error(`Failed to load rooms from Redis: ${(error as Error).message}`);
    }
  }

  private async persistRoom(room: RoomState): Promise<void> {
    if (this.useRedis) {
      await this.redisStore.saveRoom(room);
    }
  }

  private async removePersistedRoom(roomId: string): Promise<void> {
    if (this.useRedis) {
      await this.redisStore.deleteRoom(roomId);
    }
  }

  /**
   * Create a room synchronously with optional password hash.
   * Use createRoomWithPassword for password-protected rooms.
   */
  createRoom(hostId: string, settings?: Partial<RoomSettings>): RoomState {
    const roomId = generateRoomId();

    const room: RoomState = {
      roomId,
      createdAt: getServerTime(),
      hostId,
      media: null,
      playback: {
        isPlaying: false,
        offset: 0,
        serverTimestamp: getServerTime(),
        rate: 1.0,
      },
      participants: new Map(),
      settings: {
        isPrivate: settings?.isPrivate || false,
        passwordHash: settings?.passwordHash,
        maxParticipants: settings?.maxParticipants || 20,
      },
    };

    this.rooms.set(roomId, room);
    logger.info(`Room created: ${roomId}`);

    // Persist to Redis asynchronously (fire and forget)
    this.persistRoom(room).catch((err) => {
      logger.error(`Failed to persist room ${roomId}: ${err.message}`);
    });

    return room;
  }

  /**
   * Create a password-protected room (async due to bcrypt)
   */
  async createRoomWithPassword(hostId: string, password: string, maxParticipants = 20): Promise<RoomState> {
    const passwordHash = await hashPassword(password);
    return this.createRoom(hostId, {
      isPrivate: true,
      passwordHash,
      maxParticipants,
    });
  }

  /**
   * Verify password for a private room
   */
  async verifyRoomPassword(roomId: string, password: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room || !room.settings.isPrivate || !room.settings.passwordHash) {
      return false;
    }
    return verifyPassword(password, room.settings.passwordHash);
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    logger.info(`Room deleted: ${roomId}`);

    // Remove from Redis asynchronously
    this.removePersistedRoom(roomId).catch((err) => {
      logger.error(`Failed to remove persisted room ${roomId}: ${err.message}`);
    });
  }

  addParticipant(roomId: string, participant: Participant): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.participants.size >= room.settings.maxParticipants) {
      return false;
    }

    room.participants.set(participant.id, participant);
    logger.info(`Participant ${participant.id} joined room ${roomId}`);

    // Persist updated room to Redis
    this.persistRoom(room).catch((err) => {
      logger.error(`Failed to persist room after participant joined: ${err.message}`);
    });

    return true;
  }

  removeParticipant(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(participantId);
    logger.info(`Participant ${participantId} left room ${roomId}`);

    // If room is empty, schedule cleanup
    if (room.participants.size === 0) {
      this.scheduleRoomCleanup(roomId);
    }

    // Persist updated room to Redis
    this.persistRoom(room).catch((err) => {
      logger.error(`Failed to persist room after participant left: ${err.message}`);
    });
  }

  transferHost(roomId: string, newHostId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(newHostId)) return false;

    // Remove host flag from old host
    const oldHost = room.participants.get(room.hostId);
    if (oldHost) {
      oldHost.isHost = false;
    }

    // Set new host
    room.hostId = newHostId;
    const newHost = room.participants.get(newHostId);
    if (newHost) {
      newHost.isHost = true;
    }

    logger.info(`Host transferred in room ${roomId} to ${newHostId}`);

    // Persist updated room to Redis
    this.persistRoom(room).catch((err) => {
      logger.error(`Failed to persist room after host transfer: ${err.message}`);
    });

    return true;
  }

  /**
   * Update room playback state and persist to Redis
   */
  updatePlayback(roomId: string, playback: Partial<RoomState['playback']>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.playback = { ...room.playback, ...playback };

    // Persist to Redis
    if (this.useRedis) {
      this.redisStore.updateRoomPlayback(roomId, room.playback).catch((err) => {
        logger.error(`Failed to persist playback update: ${err.message}`);
      });
    }
  }

  /**
   * Update room media and persist to Redis
   */
  updateMedia(roomId: string, media: RoomState['media']): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.media = media;

    // Persist to Redis
    if (this.useRedis) {
      this.redisStore.updateRoomMedia(roomId, media).catch((err) => {
        logger.error(`Failed to persist media update: ${err.message}`);
      });
    }
  }

  private scheduleRoomCleanup(roomId: string): void {
    // Delete room after 5 minutes if still empty
    setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room && room.participants.size === 0) {
        this.deleteRoom(roomId);
      }
    }, 5 * 60 * 1000);
  }

  getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  isRedisEnabled(): boolean {
    return this.useRedis;
  }
}

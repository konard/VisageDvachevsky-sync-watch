import Redis from 'ioredis';
import { RoomState, Participant, MediaInfo, PlaybackState, RoomSettings } from '../types/room';
import logger from '../utils/logger';

// Serializable versions of room data (without Map)
interface SerializableRoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  media: MediaInfo | null;
  playback: PlaybackState;
  participants: Record<string, Participant>;
  settings: RoomSettings;
}

export interface RedisStoreOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  ttl?: number; // Room TTL in seconds (default: 24 hours)
}

export class RedisStore {
  private client: Redis;
  private keyPrefix: string;
  private roomTTL: number;
  private isConnected: boolean = false;

  constructor(options: RedisStoreOptions = {}) {
    const {
      host = process.env.REDIS_HOST || 'localhost',
      port = parseInt(process.env.REDIS_PORT || '6379'),
      password = process.env.REDIS_PASSWORD,
      db = parseInt(process.env.REDIS_DB || '0'),
      keyPrefix = 'syncwatch:',
      ttl = 24 * 60 * 60, // 24 hours default
    } = options;

    this.keyPrefix = keyPrefix;
    this.roomTTL = ttl;

    this.client = new Redis({
      host,
      port,
      password,
      db,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => {
        // Retry with exponential backoff, max 3 seconds
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.info('Redis connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.warn(`Redis connection failed: ${(error as Error).message}. Using in-memory storage.`);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  private roomKey(roomId: string): string {
    return `${this.keyPrefix}room:${roomId}`;
  }

  private roomListKey(): string {
    return `${this.keyPrefix}rooms`;
  }

  // Convert RoomState to serializable format
  private serializeRoom(room: RoomState): SerializableRoomState {
    return {
      roomId: room.roomId,
      createdAt: room.createdAt,
      hostId: room.hostId,
      media: room.media,
      playback: room.playback,
      participants: Object.fromEntries(room.participants),
      settings: room.settings,
    };
  }

  // Convert serializable format back to RoomState
  private deserializeRoom(data: SerializableRoomState): RoomState {
    return {
      roomId: data.roomId,
      createdAt: data.createdAt,
      hostId: data.hostId,
      media: data.media,
      playback: data.playback,
      participants: new Map(Object.entries(data.participants)),
      settings: data.settings,
    };
  }

  async saveRoom(room: RoomState): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const serialized = this.serializeRoom(room);
      const key = this.roomKey(room.roomId);

      await this.client
        .multi()
        .set(key, JSON.stringify(serialized), 'EX', this.roomTTL)
        .sadd(this.roomListKey(), room.roomId)
        .exec();

      return true;
    } catch (error) {
      logger.error(`Redis saveRoom error: ${(error as Error).message}`);
      return false;
    }
  }

  async getRoom(roomId: string): Promise<RoomState | null> {
    if (!this.isConnected) return null;

    try {
      const key = this.roomKey(roomId);
      const data = await this.client.get(key);

      if (!data) return null;

      const serialized: SerializableRoomState = JSON.parse(data);
      return this.deserializeRoom(serialized);
    } catch (error) {
      logger.error(`Redis getRoom error: ${(error as Error).message}`);
      return null;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const key = this.roomKey(roomId);
      await this.client
        .multi()
        .del(key)
        .srem(this.roomListKey(), roomId)
        .exec();

      return true;
    } catch (error) {
      logger.error(`Redis deleteRoom error: ${(error as Error).message}`);
      return false;
    }
  }

  async getAllRoomIds(): Promise<string[]> {
    if (!this.isConnected) return [];

    try {
      const roomIds = await this.client.smembers(this.roomListKey());
      return roomIds;
    } catch (error) {
      logger.error(`Redis getAllRoomIds error: ${(error as Error).message}`);
      return [];
    }
  }

  async getAllRooms(): Promise<RoomState[]> {
    if (!this.isConnected) return [];

    try {
      const roomIds = await this.getAllRoomIds();
      const rooms: RoomState[] = [];

      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (room) {
          rooms.push(room);
        } else {
          // Clean up stale room ID
          await this.client.srem(this.roomListKey(), roomId);
        }
      }

      return rooms;
    } catch (error) {
      logger.error(`Redis getAllRooms error: ${(error as Error).message}`);
      return [];
    }
  }

  async getRoomCount(): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      return await this.client.scard(this.roomListKey());
    } catch (error) {
      logger.error(`Redis getRoomCount error: ${(error as Error).message}`);
      return 0;
    }
  }

  // Refresh room TTL (call this on any room activity)
  async touchRoom(roomId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const key = this.roomKey(roomId);
      await this.client.expire(key, this.roomTTL);
      return true;
    } catch (error) {
      logger.error(`Redis touchRoom error: ${(error as Error).message}`);
      return false;
    }
  }

  // Update specific room fields without full serialization
  async updateRoomPlayback(roomId: string, playback: PlaybackState): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const room = await this.getRoom(roomId);
      if (!room) return false;

      room.playback = playback;
      return await this.saveRoom(room);
    } catch (error) {
      logger.error(`Redis updateRoomPlayback error: ${(error as Error).message}`);
      return false;
    }
  }

  async updateRoomMedia(roomId: string, media: MediaInfo | null): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const room = await this.getRoom(roomId);
      if (!room) return false;

      room.media = media;
      return await this.saveRoom(room);
    } catch (error) {
      logger.error(`Redis updateRoomMedia error: ${(error as Error).message}`);
      return false;
    }
  }

  async updateRoomParticipants(roomId: string, participants: Map<string, Participant>): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const room = await this.getRoom(roomId);
      if (!room) return false;

      room.participants = participants;
      return await this.saveRoom(room);
    } catch (error) {
      logger.error(`Redis updateRoomParticipants error: ${(error as Error).message}`);
      return false;
    }
  }
}

// Singleton instance
let redisStoreInstance: RedisStore | null = null;

export function getRedisStore(options?: RedisStoreOptions): RedisStore {
  if (!redisStoreInstance) {
    redisStoreInstance = new RedisStore(options);
  }
  return redisStoreInstance;
}

export default RedisStore;

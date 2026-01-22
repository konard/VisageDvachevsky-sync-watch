import { RoomState, RoomSettings, Participant } from '../types/room';
import { generateRoomId } from '../utils/idGenerator';
import { getServerTime } from '../utils/timeSync';
import logger from '../utils/logger';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();

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
        password: settings?.password,
        maxParticipants: settings?.maxParticipants || 20,
      },
    };

    this.rooms.set(roomId, room);
    logger.info(`Room created: ${roomId}`);

    return room;
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    logger.info(`Room deleted: ${roomId}`);
  }

  addParticipant(roomId: string, participant: Participant): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.participants.size >= room.settings.maxParticipants) {
      return false;
    }

    room.participants.set(participant.id, participant);
    logger.info(`Participant ${participant.id} joined room ${roomId}`);

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
    return true;
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
}

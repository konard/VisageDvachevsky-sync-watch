import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../core/RoomManager';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create a room with a unique ID', () => {
      const hostId = 'host-123';
      const room = roomManager.createRoom(hostId);

      expect(room.roomId).toBeDefined();
      expect(room.roomId.length).toBeGreaterThan(0);
      expect(room.hostId).toBe(hostId);
      expect(room.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should create a room with default settings', () => {
      const room = roomManager.createRoom('host-123');

      expect(room.settings.isPrivate).toBe(false);
      expect(room.settings.passwordHash).toBeUndefined();
      expect(room.settings.maxParticipants).toBe(20);
    });

    it('should create a private room with custom settings', () => {
      const room = roomManager.createRoom('host-123', {
        isPrivate: true,
        maxParticipants: 10,
      });

      expect(room.settings.isPrivate).toBe(true);
      expect(room.settings.maxParticipants).toBe(10);
    });

    it('should initialize playback state correctly', () => {
      const room = roomManager.createRoom('host-123');

      expect(room.playback.isPlaying).toBe(false);
      expect(room.playback.offset).toBe(0);
      expect(room.playback.rate).toBe(1.0);
    });
  });

  describe('getRoom', () => {
    it('should return a room by ID', () => {
      const room = roomManager.createRoom('host-123');
      const retrieved = roomManager.getRoom(room.roomId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.roomId).toBe(room.roomId);
    });

    it('should return undefined for non-existent room', () => {
      const room = roomManager.getRoom('non-existent');
      expect(room).toBeUndefined();
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to a room', () => {
      const room = roomManager.createRoom('host-123');
      const participant = {
        id: 'participant-1',
        odId: 'participant-1',
        nickname: 'TestUser',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      };

      const added = roomManager.addParticipant(room.roomId, participant);

      expect(added).toBe(true);
      expect(room.participants.get(participant.id)).toBeDefined();
    });

    it('should reject participant when room is full', () => {
      const room = roomManager.createRoom('host-123', { maxParticipants: 1 });

      // Add first participant
      roomManager.addParticipant(room.roomId, {
        id: 'participant-1',
        odId: 'participant-1',
        nickname: 'User1',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      });

      // Try to add second participant
      const added = roomManager.addParticipant(room.roomId, {
        id: 'participant-2',
        odId: 'participant-2',
        nickname: 'User2',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      });

      expect(added).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const added = roomManager.addParticipant('non-existent', {
        id: 'participant-1',
        odId: 'participant-1',
        nickname: 'TestUser',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      });

      expect(added).toBe(false);
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant from a room', () => {
      const room = roomManager.createRoom('host-123');
      const participant = {
        id: 'participant-1',
        odId: 'participant-1',
        nickname: 'TestUser',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      };

      roomManager.addParticipant(room.roomId, participant);
      roomManager.removeParticipant(room.roomId, participant.id);

      expect(room.participants.get(participant.id)).toBeUndefined();
    });
  });

  describe('transferHost', () => {
    it('should transfer host to a new participant', () => {
      const room = roomManager.createRoom('host-123');

      const newHost = {
        id: 'new-host',
        odId: 'new-host',
        nickname: 'NewHost',
        isHost: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        voice: { enabled: false, muted: true },
      };

      roomManager.addParticipant(room.roomId, newHost);
      const success = roomManager.transferHost(room.roomId, 'new-host');

      expect(success).toBe(true);
      expect(room.hostId).toBe('new-host');
      expect(room.participants.get('new-host')?.isHost).toBe(true);
    });

    it('should return false for non-existent target', () => {
      const room = roomManager.createRoom('host-123');
      const success = roomManager.transferHost(room.roomId, 'non-existent');

      expect(success).toBe(false);
    });
  });

  describe('getRoomCount', () => {
    it('should return the correct room count', () => {
      expect(roomManager.getRoomCount()).toBe(0);

      roomManager.createRoom('host-1');
      expect(roomManager.getRoomCount()).toBe(1);

      roomManager.createRoom('host-2');
      expect(roomManager.getRoomCount()).toBe(2);
    });
  });

  describe('deleteRoom', () => {
    it('should delete a room', () => {
      const room = roomManager.createRoom('host-123');
      roomManager.deleteRoom(room.roomId);

      expect(roomManager.getRoom(room.roomId)).toBeUndefined();
      expect(roomManager.getRoomCount()).toBe(0);
    });
  });
});

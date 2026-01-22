import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../core/RoomManager';
import { StateManager } from '../core/StateManager';

describe('StateManager', () => {
  let roomManager: RoomManager;
  let stateManager: StateManager;
  let roomId: string;
  const hostId = 'host-123';

  beforeEach(() => {
    roomManager = new RoomManager();
    stateManager = new StateManager(roomManager);

    const room = roomManager.createRoom(hostId);
    roomId = room.roomId;
  });

  describe('setMedia', () => {
    it('should set media for a room', () => {
      const media = {
        type: 'youtube' as const,
        source: 'https://youtube.com/watch?v=test',
        duration: 300,
      };

      const success = stateManager.setMedia(roomId, hostId, media);

      expect(success).toBe(true);
      const room = roomManager.getRoom(roomId);
      expect(room?.media).toEqual(media);
    });

    it('should reset playback when setting new media', () => {
      const media = {
        type: 'youtube' as const,
        source: 'https://youtube.com/watch?v=test',
        duration: 300,
      };

      stateManager.setMedia(roomId, hostId, media);
      const room = roomManager.getRoom(roomId);

      expect(room?.playback.isPlaying).toBe(false);
      expect(room?.playback.offset).toBe(0);
      expect(room?.playback.rate).toBe(1.0);
    });

    it('should reject media from non-host', () => {
      const media = {
        type: 'youtube' as const,
        source: 'https://youtube.com/watch?v=test',
        duration: 300,
      };

      const success = stateManager.setMedia(roomId, 'not-host', media);
      expect(success).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const media = {
        type: 'youtube' as const,
        source: 'https://youtube.com/watch?v=test',
        duration: 300,
      };

      const success = stateManager.setMedia('non-existent', hostId, media);
      expect(success).toBe(false);
    });
  });

  describe('play', () => {
    it('should start playback', () => {
      const state = stateManager.play(roomId, hostId);

      expect(state).not.toBeNull();
      expect(state?.isPlaying).toBe(true);
    });

    it('should return current state if already playing', () => {
      stateManager.play(roomId, hostId);
      const state = stateManager.play(roomId, hostId);

      expect(state?.isPlaying).toBe(true);
    });

    it('should reject play from non-host', () => {
      const state = stateManager.play(roomId, 'not-host');
      expect(state).toBeNull();
    });
  });

  describe('pause', () => {
    it('should pause playback', () => {
      stateManager.play(roomId, hostId);
      const state = stateManager.pause(roomId, hostId);

      expect(state).not.toBeNull();
      expect(state?.isPlaying).toBe(false);
    });

    it('should return current state if already paused', () => {
      const state = stateManager.pause(roomId, hostId);

      expect(state?.isPlaying).toBe(false);
    });

    it('should reject pause from non-host', () => {
      stateManager.play(roomId, hostId);
      const state = stateManager.pause(roomId, 'not-host');

      expect(state).toBeNull();
    });
  });

  describe('seek', () => {
    it('should seek to a position', () => {
      const state = stateManager.seek(roomId, hostId, 60);

      expect(state).not.toBeNull();
      expect(state?.offset).toBe(60);
    });

    it('should clamp negative positions to 0', () => {
      const state = stateManager.seek(roomId, hostId, -10);

      expect(state?.offset).toBe(0);
    });

    it('should clamp positions past duration', () => {
      stateManager.setMedia(roomId, hostId, {
        type: 'youtube',
        source: 'test',
        duration: 100,
      });

      const state = stateManager.seek(roomId, hostId, 200);

      expect(state?.offset).toBe(100);
    });

    it('should reject seek from non-host', () => {
      const state = stateManager.seek(roomId, 'not-host', 60);
      expect(state).toBeNull();
    });
  });

  describe('setRate', () => {
    it('should set playback rate', () => {
      const state = stateManager.setRate(roomId, hostId, 1.5);

      expect(state).not.toBeNull();
      expect(state?.rate).toBe(1.5);
    });

    it('should clamp rate to minimum 0.5', () => {
      const state = stateManager.setRate(roomId, hostId, 0.1);

      expect(state?.rate).toBe(0.5);
    });

    it('should clamp rate to maximum 2.0', () => {
      const state = stateManager.setRate(roomId, hostId, 3.0);

      expect(state?.rate).toBe(2.0);
    });

    it('should reject rate change from non-host', () => {
      const state = stateManager.setRate(roomId, 'not-host', 1.5);
      expect(state).toBeNull();
    });
  });

  describe('getPlaybackState', () => {
    it('should return playback state for existing room', () => {
      const state = stateManager.getPlaybackState(roomId);

      expect(state).not.toBeNull();
      expect(state?.isPlaying).toBe(false);
      expect(state?.offset).toBe(0);
    });

    it('should return null for non-existent room', () => {
      const state = stateManager.getPlaybackState('non-existent');
      expect(state).toBeNull();
    });
  });
});

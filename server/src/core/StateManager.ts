import { MediaInfo, PlaybackState } from '../types/room';
import { RoomManager } from './RoomManager';
import { getServerTime } from '../utils/timeSync';
import logger from '../utils/logger';

export class StateManager {
  constructor(private roomManager: RoomManager) {}

  setMedia(roomId: string, hostId: string, media: MediaInfo): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return false;

    room.media = media;

    // Reset playback
    room.playback = {
      isPlaying: false,
      offset: 0,
      serverTimestamp: getServerTime(),
      rate: 1.0,
    };

    logger.info(`Media set in room ${roomId}: ${media.type} - ${media.source}`);
    return true;
  }

  play(roomId: string, hostId: string): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    const now = getServerTime();

    // If already playing, return current state
    if (room.playback.isPlaying) {
      return room.playback;
    }

    // Update state
    room.playback.isPlaying = true;
    room.playback.serverTimestamp = now;
    // offset stays the same

    logger.info(`Playback started in room ${roomId}`);
    return { ...room.playback };
  }

  pause(roomId: string, hostId: string): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    const now = getServerTime();

    if (!room.playback.isPlaying) {
      return room.playback;
    }

    // Calculate current position
    const elapsed = (now - room.playback.serverTimestamp) / 1000;
    const currentOffset = room.playback.offset + elapsed * room.playback.rate;

    // Update state
    room.playback.isPlaying = false;
    room.playback.offset = currentOffset;
    room.playback.serverTimestamp = now;

    logger.info(`Playback paused in room ${roomId} at ${currentOffset}s`);
    return { ...room.playback };
  }

  seek(roomId: string, hostId: string, time: number): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    const now = getServerTime();

    // Check boundaries
    if (room.media && time > room.media.duration) {
      time = room.media.duration;
    }
    if (time < 0) time = 0;

    room.playback.offset = time;
    room.playback.serverTimestamp = now;

    logger.info(`Seeked in room ${roomId} to ${time}s`);
    return { ...room.playback };
  }

  setRate(roomId: string, hostId: string, rate: number): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    // Limit rate
    rate = Math.max(0.5, Math.min(2.0, rate));

    const now = getServerTime();

    // If playing, recalculate offset
    if (room.playback.isPlaying) {
      const elapsed = (now - room.playback.serverTimestamp) / 1000;
      room.playback.offset += elapsed * room.playback.rate;
    }

    room.playback.rate = rate;
    room.playback.serverTimestamp = now;

    logger.info(`Playback rate changed in room ${roomId} to ${rate}x`);
    return { ...room.playback };
  }

  getPlaybackState(roomId: string): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    return room ? { ...room.playback } : null;
  }
}

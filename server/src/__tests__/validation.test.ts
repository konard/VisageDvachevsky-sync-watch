import { describe, it, expect } from 'vitest';
import {
  validatePayload,
  CreateRoomSchema,
  JoinRoomSchema,
  SetMediaSchema,
  ChatMessageSchema,
  SeekSchema,
  SetRateSchema,
} from '../utils/validation';

describe('Validation', () => {
  describe('CreateRoomSchema', () => {
    it('should validate valid nickname', () => {
      const result = validatePayload(CreateRoomSchema, { nickname: 'TestUser' });
      expect(result.success).toBe(true);
    });

    it('should reject empty nickname', () => {
      const result = validatePayload(CreateRoomSchema, { nickname: '' });
      expect(result.success).toBe(false);
    });

    it('should reject nickname too long', () => {
      const result = validatePayload(CreateRoomSchema, {
        nickname: 'a'.repeat(25),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing nickname', () => {
      const result = validatePayload(CreateRoomSchema, {});
      expect(result.success).toBe(false);
    });
  });

  describe('JoinRoomSchema', () => {
    it('should validate valid join request', () => {
      const result = validatePayload(JoinRoomSchema, {
        roomId: 'ABC123',
        nickname: 'TestUser',
      });
      expect(result.success).toBe(true);
    });

    it('should accept password', () => {
      const result = validatePayload(JoinRoomSchema, {
        roomId: 'ABC123',
        nickname: 'TestUser',
        password: 'secret',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short roomId', () => {
      const result = validatePayload(JoinRoomSchema, {
        roomId: 'ABC',
        nickname: 'TestUser',
      });
      expect(result.success).toBe(false);
    });

    it('should reject long roomId', () => {
      const result = validatePayload(JoinRoomSchema, {
        roomId: 'ABCDEFGHIJKLM',
        nickname: 'TestUser',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SetMediaSchema', () => {
    it('should validate valid YouTube URL', () => {
      const result = validatePayload(SetMediaSchema, {
        roomId: 'room123',
        mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
      expect(result.success).toBe(true);
    });

    it('should validate valid direct URL', () => {
      const result = validatePayload(SetMediaSchema, {
        roomId: 'room123',
        mediaUrl: 'https://example.com/video.mp4',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validatePayload(SetMediaSchema, {
        roomId: 'room123',
        mediaUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ChatMessageSchema', () => {
    it('should validate valid message', () => {
      const result = validatePayload(ChatMessageSchema, {
        roomId: 'room123',
        text: 'Hello world!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = validatePayload(ChatMessageSchema, {
        roomId: 'room123',
        text: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject message too long', () => {
      const result = validatePayload(ChatMessageSchema, {
        roomId: 'room123',
        text: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SeekSchema', () => {
    it('should validate valid seek', () => {
      const result = validatePayload(SeekSchema, {
        roomId: 'room123',
        position: 60,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative position', () => {
      const result = validatePayload(SeekSchema, {
        roomId: 'room123',
        position: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SetRateSchema', () => {
    it('should validate valid rate', () => {
      const result = validatePayload(SetRateSchema, {
        roomId: 'room123',
        rate: 1.5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject rate too slow', () => {
      const result = validatePayload(SetRateSchema, {
        roomId: 'room123',
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate too fast', () => {
      const result = validatePayload(SetRateSchema, {
        roomId: 'room123',
        rate: 5,
      });
      expect(result.success).toBe(false);
    });
  });
});

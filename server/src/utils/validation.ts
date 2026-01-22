import { z } from 'zod';

// Payload validation schemas
export const CreateRoomSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname too long'),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().min(6, 'Room ID too short').max(12, 'Room ID too long'),
  nickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname too long'),
  password: z.string().max(100, 'Password too long').optional(),
});

export const UpdateNicknameSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname too long'),
});

export const TransferHostSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
});

export const SetMediaSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  mediaUrl: z.string().url('Invalid URL'),
});

export const PlaySchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
});

export const PauseSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
});

export const SeekSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  position: z.number().min(0, 'Position must be non-negative'),
});

export const SetRateSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  rate: z.number().min(0.25, 'Rate too slow').max(4, 'Rate too fast'),
});

export const ChatMessageSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  text: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
});

export const WebRTCSignalSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  signal: z.unknown(),
});

export const PingSchema = z.object({
  clientTime: z.number(),
});

// Helper function to safely validate payload
export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Zod v4 uses issues array
  const issues = result.error.issues || [];
  const errorMessage = issues.map((e) => e.message).join(', ');
  return { success: false, error: errorMessage || 'Validation failed' };
}

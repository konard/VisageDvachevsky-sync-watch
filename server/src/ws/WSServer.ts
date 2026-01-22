import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server as HttpServer } from 'http';
import {
  WSMessage,
  PlaybackStatePayload,
} from '../types/messages';
import { Participant } from '../types/room';
import { RoomManager } from '../core/RoomManager';
import { StateManager } from '../core/StateManager';
import logger from '../utils/logger';
import { generateClientId, generateMessageId } from '../utils/idGenerator';
import { getServerTime } from '../utils/timeSync';
import { z } from 'zod';
import {
  validatePayload,
  CreateRoomSchema,
  JoinRoomSchema,
  UpdateNicknameSchema,
  TransferHostSchema,
  SetMediaSchema,
  PlaySchema,
  PauseSchema,
  SeekSchema,
  SetRateSchema,
  ChatMessageSchema,
  WebRTCSignalSchema,
  PingSchema,
} from '../utils/validation';

// Inferred types from Zod schemas
type CreateRoomPayload = z.infer<typeof CreateRoomSchema>;
type JoinRoomPayload = z.infer<typeof JoinRoomSchema>;
type UpdateNicknamePayload = z.infer<typeof UpdateNicknameSchema>;
type TransferHostPayload = z.infer<typeof TransferHostSchema>;
type SetMediaPayload = z.infer<typeof SetMediaSchema>;
type PlayPayload = z.infer<typeof PlaySchema>;
type PausePayload = z.infer<typeof PauseSchema>;
type SeekPayload = z.infer<typeof SeekSchema>;
type SetRatePayload = z.infer<typeof SetRateSchema>;
type ChatMessagePayload = z.infer<typeof ChatMessageSchema>;
type WebRTCSignalPayload = z.infer<typeof WebRTCSignalSchema>;
type PingPayload = z.infer<typeof PingSchema>;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_COMMANDS_PER_WINDOW = 10; // Max 10 commands per second

export interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  roomId?: string;
  nickname?: string;
  lastPing: number;
  commandTimestamps: number[]; // For rate limiting
}

export class WSServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private roomManager: RoomManager;
  private stateManager: StateManager;

  constructor(port: number, httpServer?: HttpServer) {
    this.roomManager = new RoomManager();
    this.stateManager = new StateManager(this.roomManager);

    // If an HTTP server is provided, attach WebSocket to it; otherwise create standalone
    if (httpServer) {
      this.wss = new WebSocketServer({ server: httpServer });
    } else {
      this.wss = new WebSocketServer({ port });
    }

    this.wss.on('connection', this.handleConnection.bind(this));

    // Periodic heartbeat check
    setInterval(() => this.checkHeartbeats(), 30000);

    logger.info(`WebSocket server started on port ${port}`);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = generateClientId();

    const client: ClientConnection = {
      ws,
      clientId,
      lastPing: Date.now(),
      commandTimestamps: [],
    };

    this.clients.set(ws, client);
    logger.info(`Client connected: ${clientId}`);

    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (error) => logger.error(`WebSocket error: ${error.message}`));
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) client.lastPing = Date.now();
    });
  }

  private checkRateLimit(client: ClientConnection): boolean {
    const now = Date.now();
    // Remove timestamps outside the window
    client.commandTimestamps = client.commandTimestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );

    if (client.commandTimestamps.length >= MAX_COMMANDS_PER_WINDOW) {
      return false; // Rate limited
    }

    client.commandTimestamps.push(now);
    return true;
  }

  private handleMessage(ws: WebSocket, data: unknown): void {
    try {
      const message: WSMessage = JSON.parse(data?.toString() || '{}');
      const client = this.clients.get(ws);

      if (!client) return;

      // Check rate limit
      if (!this.checkRateLimit(client)) {
        this.sendError(ws, 'RATE_LIMIT', 'Too many commands, please slow down');
        return;
      }

      logger.debug(`Received ${message.type} from ${client.clientId}`);

      switch (message.type) {
        case 'create_room': {
          const result = validatePayload(CreateRoomSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleCreateRoom(ws, client, result.data);
          break;
        }
        case 'join_room': {
          const result = validatePayload(JoinRoomSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleJoinRoom(ws, client, result.data);
          break;
        }
        case 'update_nickname': {
          const result = validatePayload(UpdateNicknameSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleUpdateNickname(ws, client, result.data);
          break;
        }
        case 'transfer_host': {
          const result = validatePayload(TransferHostSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleTransferHost(ws, client, result.data);
          break;
        }
        case 'set_media': {
          const result = validatePayload(SetMediaSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleSetMedia(ws, client, result.data);
          break;
        }
        case 'play': {
          const result = validatePayload(PlaySchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handlePlay(ws, client, result.data);
          break;
        }
        case 'pause': {
          const result = validatePayload(PauseSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handlePause(ws, client, result.data);
          break;
        }
        case 'seek': {
          const result = validatePayload(SeekSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleSeek(ws, client, result.data);
          break;
        }
        case 'set_rate': {
          const result = validatePayload(SetRateSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleSetRate(ws, client, result.data);
          break;
        }
        case 'chat_message': {
          const result = validatePayload(ChatMessageSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleChatMessage(ws, client, result.data);
          break;
        }
        case 'webrtc_signal': {
          const result = validatePayload(WebRTCSignalSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handleWebRTCSignal(ws, client, result.data);
          break;
        }
        case 'ping': {
          const result = validatePayload(PingSchema, message.payload);
          if (!result.success) {
            this.sendError(ws, 'VALIDATION_ERROR', result.error);
            return;
          }
          this.handlePing(ws, client, result.data);
          break;
        }
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error handling message: ${error}`);
      this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
    }
  }

  private handleCreateRoom(ws: WebSocket, client: ClientConnection, payload: CreateRoomPayload): void {
    const { nickname } = payload;

    const room = this.roomManager.createRoom(client.clientId);

    const participant: Participant = {
      id: client.clientId,
      odId: client.clientId,
      nickname,
      isHost: true,
      joinedAt: getServerTime(),
      lastSeen: getServerTime(),
      voice: { enabled: false, muted: true },
    };

    this.roomManager.addParticipant(room.roomId, participant);
    client.roomId = room.roomId;
    client.nickname = nickname;

    this.sendMessage(ws, {
      type: 'room_created',
      payload: { roomId: room.roomId },
    });

    this.sendRoomState(ws, client);
  }

  private async handleJoinRoom(ws: WebSocket, client: ClientConnection, payload: JoinRoomPayload): Promise<void> {
    const { roomId, nickname, password } = payload;

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
      return;
    }

    // Verify password for private rooms using bcrypt
    if (room.settings.isPrivate) {
      const isValid = await this.roomManager.verifyRoomPassword(roomId, password || '');
      if (!isValid) {
        this.sendError(ws, 'INVALID_PASSWORD', 'Invalid password');
        return;
      }
    }

    const participant: Participant = {
      id: client.clientId,
      odId: client.clientId,
      nickname,
      isHost: false,
      joinedAt: getServerTime(),
      lastSeen: getServerTime(),
      voice: { enabled: false, muted: true },
    };

    const added = this.roomManager.addParticipant(roomId, participant);
    if (!added) {
      this.sendError(ws, 'ROOM_FULL', 'Room is full');
      return;
    }

    client.roomId = roomId;
    client.nickname = nickname;

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'participant_joined',
      payload: { participant },
    }, client.clientId);

    // Send room state to new participant
    this.sendMessage(ws, {
      type: 'room_joined',
      payload: { roomId },
    });

    this.sendRoomState(ws, client);
  }

  private sendRoomState(ws: WebSocket, client: ClientConnection): void {
    if (!client.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) return;

    const participants = Array.from(room.participants.values());

    const playbackState: PlaybackStatePayload = {
      isPlaying: room.playback.isPlaying,
      offset: room.playback.offset,
      serverTimestamp: room.playback.serverTimestamp,
      rate: room.playback.rate,
      mediaUrl: room.media?.source,
      mediaType: room.media?.type,
    };

    this.sendMessage(ws, {
      type: 'room_state',
      payload: {
        room: {
          roomId: room.roomId,
          createdAt: room.createdAt,
          hostId: room.hostId,
        },
        participants,
        playbackState,
      },
    });
  }

  private handleUpdateNickname(ws: WebSocket, client: ClientConnection, payload: UpdateNicknamePayload): void {
    const { nickname } = payload;
    if (!client.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    if (!room) return;

    const participant = room.participants.get(client.clientId);
    if (participant) {
      participant.nickname = nickname;
      client.nickname = nickname;

      this.broadcastToRoom(client.roomId, {
        type: 'participant_updated',
        payload: { participant },
      });
    }
  }

  private handleTransferHost(ws: WebSocket, client: ClientConnection, payload: TransferHostPayload): void {
    const { targetId } = payload;
    if (!client.roomId) return;

    const room = this.roomManager.getRoom(client.roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can transfer host');
      return;
    }

    const success = this.roomManager.transferHost(client.roomId, targetId);
    if (success) {
      this.broadcastToRoom(client.roomId, {
        type: 'host_changed',
        payload: { newHostId: targetId },
      });
    }
  }

  private handleSetMedia(ws: WebSocket, client: ClientConnection, payload: SetMediaPayload): void {
    const { roomId, mediaUrl } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can set media');
      return;
    }

    // Detect media type from URL
    let mediaType: 'youtube' | 'vk' | 'direct' = 'direct';
    if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
      mediaType = 'youtube';
    } else if (mediaUrl.includes('vk.com')) {
      mediaType = 'vk';
    }

    const success = this.stateManager.setMedia(roomId, client.clientId, {
      type: mediaType,
      source: mediaUrl,
      duration: 0, // Will be updated when video loads
    });

    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'media_set',
        payload: { mediaUrl, mediaType },
      });
    }
  }

  private handlePlay(ws: WebSocket, client: ClientConnection, payload: PlayPayload): void {
    const { roomId } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can control playback');
      return;
    }

    const state = this.stateManager.play(roomId, client.clientId);
    if (state) {
      this.broadcastToRoom(roomId, {
        type: 'playback_state',
        payload: {
          ...state,
          mediaUrl: room.media?.source,
          mediaType: room.media?.type,
        },
      });
    }
  }

  private handlePause(ws: WebSocket, client: ClientConnection, payload: PausePayload): void {
    const { roomId } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can control playback');
      return;
    }

    const state = this.stateManager.pause(roomId, client.clientId);
    if (state) {
      this.broadcastToRoom(roomId, {
        type: 'playback_state',
        payload: {
          ...state,
          mediaUrl: room.media?.source,
          mediaType: room.media?.type,
        },
      });
    }
  }

  private handleSeek(ws: WebSocket, client: ClientConnection, payload: SeekPayload): void {
    const { roomId, position } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can control playback');
      return;
    }

    const state = this.stateManager.seek(roomId, client.clientId, position);
    if (state) {
      this.broadcastToRoom(roomId, {
        type: 'playback_state',
        payload: {
          ...state,
          mediaUrl: room.media?.source,
          mediaType: room.media?.type,
        },
      });
    }
  }

  private handleSetRate(ws: WebSocket, client: ClientConnection, payload: SetRatePayload): void {
    const { roomId, rate } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== client.clientId) {
      this.sendError(ws, 'NOT_HOST', 'Only the host can control playback');
      return;
    }

    const state = this.stateManager.setRate(roomId, client.clientId, rate);
    if (state) {
      this.broadcastToRoom(roomId, {
        type: 'playback_state',
        payload: {
          ...state,
          mediaUrl: room.media?.source,
          mediaType: room.media?.type,
        },
      });
    }
  }

  private handleChatMessage(ws: WebSocket, client: ClientConnection, payload: ChatMessagePayload): void {
    const { roomId, text } = payload;
    if (!client.roomId || client.roomId !== roomId) return;

    // Sanitize message
    const sanitizedText = text.trim().slice(0, 1000);
    if (!sanitizedText) return;

    this.broadcastToRoom(roomId, {
      type: 'chat_message',
      payload: {
        id: generateMessageId(),
        senderId: client.clientId,
        nickname: client.nickname || 'Anonymous',
        text: sanitizedText,
        type: 'user',
        timestamp: getServerTime(),
      },
    });
  }

  private handleWebRTCSignal(ws: WebSocket, client: ClientConnection, payload: WebRTCSignalPayload): void {
    const { targetId, signal } = payload;
    if (!client.roomId) return;

    const targetWs = this.findClientByIdInRoom(targetId, client.roomId);
    if (targetWs) {
      this.sendMessage(targetWs, {
        type: 'webrtc_signal',
        payload: {
          senderId: client.clientId,
          signal,
        },
      });
    }
  }

  private handlePing(ws: WebSocket, client: ClientConnection, payload: PingPayload): void {
    this.sendMessage(ws, {
      type: 'pong',
      payload: {
        clientTime: payload.clientTime,
        serverTime: getServerTime(),
      },
    });
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    logger.info(`Client disconnected: ${client.clientId}`);

    // Remove from room
    if (client.roomId) {
      const room = this.roomManager.getRoom(client.roomId);
      this.roomManager.removeParticipant(client.roomId, client.clientId);

      // If disconnected client was host, transfer to another participant
      if (room && room.hostId === client.clientId && room.participants.size > 0) {
        const newHost = Array.from(room.participants.values())[0];
        this.roomManager.transferHost(client.roomId, newHost.id);
        this.broadcastToRoom(client.roomId, {
          type: 'host_changed',
          payload: { newHostId: newHost.id },
        });
      }

      this.broadcastToRoom(client.roomId, {
        type: 'participant_left',
        payload: { odId: client.clientId },
        timestamp: Date.now(),
      });
    }

    this.clients.delete(ws);
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    this.clients.forEach((client, ws) => {
      if (now - client.lastPing > 60000) {
        logger.info(`Terminating inactive client: ${client.clientId}`);
        ws.terminate();
      } else {
        ws.ping();
      }
    });
  }

  sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws: WebSocket, code: string, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      payload: { code, message },
    });
  }

  broadcastToRoom(roomId: string, message: WSMessage, excludeClientId?: string): void {
    this.clients.forEach((client, ws) => {
      if (client.roomId === roomId && client.clientId !== excludeClientId) {
        this.sendMessage(ws, message);
      }
    });
  }

  findClientByIdInRoom(clientId: string, roomId: string): WebSocket | null {
    for (const [ws, client] of this.clients.entries()) {
      if (client.clientId === clientId && client.roomId === roomId) {
        return ws;
      }
    }
    return null;
  }

  getRoomManager(): RoomManager {
    return this.roomManager;
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }
}

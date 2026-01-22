import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  WSMessage,
  CreateRoomPayload,
  JoinRoomPayload,
  UpdateNicknamePayload,
  TransferHostPayload,
  SetMediaPayload,
  PlayPayload,
  PausePayload,
  SeekPayload,
  SetRatePayload,
  ChatMessagePayload,
  WebRTCSignalPayload,
  PingPayload,
  PlaybackStatePayload,
} from '../types/messages';
import { Participant } from '../types/room';
import { RoomManager } from '../core/RoomManager';
import { StateManager } from '../core/StateManager';
import logger from '../utils/logger';
import { generateClientId, generateMessageId } from '../utils/idGenerator';
import { getServerTime } from '../utils/timeSync';

export interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  roomId?: string;
  nickname?: string;
  lastPing: number;
}

export class WSServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private roomManager: RoomManager;
  private stateManager: StateManager;

  constructor(port: number) {
    this.roomManager = new RoomManager();
    this.stateManager = new StateManager(this.roomManager);

    this.wss = new WebSocketServer({ port });

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

  private handleMessage(ws: WebSocket, data: unknown): void {
    try {
      const message: WSMessage = JSON.parse(data?.toString() || '{}');
      const client = this.clients.get(ws);

      if (!client) return;

      logger.debug(`Received ${message.type} from ${client.clientId}`);

      switch (message.type) {
        case 'create_room':
          this.handleCreateRoom(ws, client, message.payload as CreateRoomPayload);
          break;
        case 'join_room':
          this.handleJoinRoom(ws, client, message.payload as JoinRoomPayload);
          break;
        case 'update_nickname':
          this.handleUpdateNickname(ws, client, message.payload as UpdateNicknamePayload);
          break;
        case 'transfer_host':
          this.handleTransferHost(ws, client, message.payload as TransferHostPayload);
          break;
        case 'set_media':
          this.handleSetMedia(ws, client, message.payload as SetMediaPayload);
          break;
        case 'play':
          this.handlePlay(ws, client, message.payload as PlayPayload);
          break;
        case 'pause':
          this.handlePause(ws, client, message.payload as PausePayload);
          break;
        case 'seek':
          this.handleSeek(ws, client, message.payload as SeekPayload);
          break;
        case 'set_rate':
          this.handleSetRate(ws, client, message.payload as SetRatePayload);
          break;
        case 'chat_message':
          this.handleChatMessage(ws, client, message.payload as ChatMessagePayload);
          break;
        case 'webrtc_signal':
          this.handleWebRTCSignal(ws, client, message.payload as WebRTCSignalPayload);
          break;
        case 'ping':
          this.handlePing(ws, client, message.payload as PingPayload);
          break;
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

  private handleJoinRoom(ws: WebSocket, client: ClientConnection, payload: JoinRoomPayload): void {
    const { roomId, nickname, password } = payload;

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      this.sendError(ws, 'ROOM_NOT_FOUND', 'Room not found');
      return;
    }

    if (room.settings.isPrivate && room.settings.password !== password) {
      this.sendError(ws, 'INVALID_PASSWORD', 'Invalid password');
      return;
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

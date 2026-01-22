# План реализации SyncWatch (Часть 2)
## Разделы 5-9

**Продолжение документа IMPLEMENTATION_PLAN.md**

---

## 5. Текстовый чат

### 5.1 Компоненты чата

#### Задача 5.1.1: Создать компонент сообщения

**Файл: `client/src/components/Chat/Message.tsx`**

```tsx
import dayjs from 'dayjs';

interface MessageProps {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
  isSystem: boolean;
}

function Message({ senderName, text, timestamp, isOwn, isSystem }: MessageProps) {
  if (isSystem) {
    return (
      <div className="text-center text-sm text-gray-400 py-2">
        {text}
      </div>
    );
  }

  return (
    <div className={`mb-3 ${isOwn ? 'text-right' : 'text-left'}`}>
      <div className="text-xs text-gray-400 mb-1">
        {senderName} · {dayjs(timestamp).format('HH:mm')}
      </div>
      <div
        className={`inline-block px-4 py-2 rounded-lg max-w-xs ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export default Message;
```

#### Задача 5.1.2: Создать список сообщений

**Файл: `client/src/components/Chat/MessageList.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import Message from './Message';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'user' | 'system';
}

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Автоскролл к последнему сообщению
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No messages yet. Start the conversation!
        </div>
      )}

      {messages.map((msg) => (
        <Message
          key={msg.id}
          id={msg.id}
          senderName={msg.senderName}
          text={msg.text}
          timestamp={msg.timestamp}
          isOwn={msg.senderId === currentUserId}
          isSystem={msg.type === 'system'}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
```

#### Задача 5.1.3: Создать поле ввода

**Файл: `client/src/components/Chat/MessageInput.tsx`**

```tsx
import { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
}

function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed.length <= 500) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-4 border-t border-gray-700">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
        maxLength={500}
        className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}

export default MessageInput;
```

#### Задача 5.1.4: Создать главный компонент чата

**Файл: `client/src/components/Chat/Chat.tsx`**

```tsx
import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { WSClient } from '../../services/WSClient';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'user' | 'system';
}

interface ChatProps {
  ws: WSClient;
  currentUserId: string;
}

function Chat({ ws, currentUserId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const handleChatMessage = (payload: ChatMessage) => {
      setMessages((prev) => [...prev, payload]);
    };

    ws.on('chat_message', handleChatMessage);

    return () => {
      ws.off('chat_message', handleChatMessage);
    };
  }, [ws]);

  const handleSend = (text: string) => {
    ws.send('chat_message', { text });
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Chat</h2>
      </div>

      <MessageList messages={messages} currentUserId={currentUserId} />

      <MessageInput onSend={handleSend} />
    </div>
  );
}

export default Chat;
```

### 5.2 Интеграция чата в комнату

#### Задача 5.2.1: Обновить RoomPage

**Обновить `client/src/pages/RoomPage.tsx`:**

```tsx
import Chat from '../components/Chat/Chat';

// В JSX, заменить блок чата:
<div className="mt-4 bg-gray-800 p-4 rounded h-96">
  <Chat ws={ws} currentUserId={clientId} />
</div>
```

---

## 6. Голосовой чат (WebRTC)

### 6.1 WebRTC Manager

#### Задача 6.1.1: Создать WebRTC менеджер

**Файл: `client/src/services/WebRTCManager.ts`**

```typescript
import SimplePeer from 'simple-peer';
import { WSClient } from './WSClient';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private micEnabled: boolean = false;

  constructor(
    private ws: WSClient,
    private localUserId: string
  ) {
    this.setupSignaling();
  }

  private setupSignaling(): void {
    this.ws.on('webrtc_signal', ({ targetId, senderId, signal }) => {
      if (targetId !== this.localUserId) return;

      const peer = this.peers.get(senderId);

      if (!peer) {
        // Создать новое peer соединение
        this.createPeerConnection(senderId, false, signal);
      } else {
        // Обработать сигнал
        peer.peer.signal(signal);
      }
    });

    this.ws.on('participant_joined', ({ participant }) => {
      // Если голос включен, инициировать соединение
      if (this.micEnabled && participant.id !== this.localUserId) {
        this.createPeerConnection(participant.id, true);
      }
    });

    this.ws.on('participant_left', ({ participantId }) => {
      this.closePeerConnection(participantId);
    });
  }

  async enableMicrophone(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.micEnabled = true;

      // Создать соединения со всеми участниками
      // (получить список из состояния комнаты)

      console.log('Microphone enabled');
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }

  disableMicrophone(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Закрыть все peer соединения
    this.peers.forEach((_, peerId) => {
      this.closePeerConnection(peerId);
    });

    this.micEnabled = false;

    console.log('Microphone disabled');
  }

  private createPeerConnection(
    peerId: string,
    initiator: boolean,
    initialSignal?: any
  ): void {
    const peer = new SimplePeer({
      initiator,
      stream: this.localStream || undefined,
      trickle: true,
    });

    peer.on('signal', (signal) => {
      // Отправить сигнал через WebSocket
      this.ws.send('webrtc_signal', {
        targetId: peerId,
        signal,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log(`Received stream from ${peerId}`);

      const connection = this.peers.get(peerId);
      if (connection) {
        connection.stream = remoteStream;
      }

      // Воспроизвести удаленный поток
      this.playRemoteStream(peerId, remoteStream);
    });

    peer.on('error', (error) => {
      console.error(`Peer error with ${peerId}:`, error);
      this.closePeerConnection(peerId);
    });

    peer.on('close', () => {
      console.log(`Connection closed with ${peerId}`);
      this.peers.delete(peerId);
    });

    this.peers.set(peerId, { peer });

    // Если есть начальный сигнал, обработать его
    if (initialSignal) {
      peer.signal(initialSignal);
    }
  }

  private closePeerConnection(peerId: string): void {
    const connection = this.peers.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(peerId);
    }
  }

  private playRemoteStream(peerId: string, stream: MediaStream): void {
    // Создать audio element для воспроизведения
    const audioElement = document.createElement('audio');
    audioElement.id = `audio-${peerId}`;
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    document.body.appendChild(audioElement);
  }

  destroy(): void {
    this.disableMicrophone();
  }
}
```

### 6.2 Серверный обработчик WebRTC

#### Задача 6.2.1: Создать обработчик сигналов

**Файл: `server/src/ws/handlers/webrtcHandlers.ts`**

```typescript
import { WebSocket } from 'ws';
import { WSServer, ClientConnection } from '../WSServer';
import logger from '../../utils/logger';

export function handleWebRTCSignal(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: { targetId: string; signal: any }
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const { targetId, signal } = payload;

  // Найти целевого клиента
  const targetClient = Array.from(server['clients'].entries()).find(
    ([_, c]) => c.clientId === targetId && c.roomId === client.roomId
  );

  if (!targetClient) {
    server.sendError(ws, 'TARGET_NOT_FOUND', 'Target client not found');
    return;
  }

  const [targetWs, _] = targetClient;

  // Переслать сигнал
  server.sendMessage(targetWs, {
    type: 'webrtc_signal',
    payload: {
      senderId: client.clientId,
      targetId: targetId,
      signal: signal,
    },
  });

  logger.debug(`WebRTC signal relayed from ${client.clientId} to ${targetId}`);
}
```

**Добавить в `WSServer.ts` обработку:**

```typescript
import { handleWebRTCSignal } from './handlers/webrtcHandlers';

// В switch case:
case 'webrtc_signal':
  handleWebRTCSignal(this, ws, client, message.payload);
  break;
```

### 6.3 UI компоненты голосового чата

#### Задача 6.3.1: Создать компонент управления голосом

**Файл: `client/src/components/Voice/VoiceControls.tsx`**

```tsx
import { useState } from 'react';
import { WebRTCManager } from '../../services/WebRTCManager';

interface VoiceControlsProps {
  webrtc: WebRTCManager | null;
}

function VoiceControls({ webrtc }: VoiceControlsProps) {
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);

  const toggleVoice = async () => {
    if (!webrtc) return;

    if (enabled) {
      webrtc.disableMicrophone();
      setEnabled(false);
      setMuted(false);
    } else {
      try {
        await webrtc.enableMicrophone();
        setEnabled(true);
      } catch (error) {
        alert('Failed to access microphone. Please check permissions.');
      }
    }
  };

  const toggleMute = () => {
    // TODO: Реализовать mute/unmute через отключение аудиотреков
    setMuted(!muted);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleVoice}
        className={`px-4 py-2 rounded-lg ${
          enabled
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-gray-600 hover:bg-gray-700'
        } text-white`}
      >
        {enabled ? '🎤 Voice On' : '🎤 Voice Off'}
      </button>

      {enabled && (
        <button
          onClick={toggleMute}
          className={`px-4 py-2 rounded-lg ${
            muted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {muted ? '🔇 Muted' : '🔊 Unmuted'}
        </button>
      )}
    </div>
  );
}

export default VoiceControls;
```

#### Задача 6.3.2: Интегрировать в RoomPage

**Обновить `client/src/pages/RoomPage.tsx`:**

```tsx
import { WebRTCManager } from '../services/WebRTCManager';
import VoiceControls from '../components/Voice/VoiceControls';

// В компоненте:
const [webrtc, setWebrtc] = useState<WebRTCManager | null>(null);

useEffect(() => {
  // После подключения WS
  const rtc = new WebRTCManager(ws, clientId);
  setWebrtc(rtc);

  return () => {
    rtc.destroy();
  };
}, [ws, clientId]);

// В JSX:
<VoiceControls webrtc={webrtc} />
```

---

## 7. Дополнительные функции

### 7.1 Приватные комнаты

#### Задача 7.1.1: Добавить UI для создания приватной комнаты

**Обновить `client/src/pages/HomePage.tsx`:**

```tsx
const [isPrivate, setIsPrivate] = useState(false);
const [password, setPassword] = useState('');

const createRoom = () => {
  const newRoomId = Math.random().toString(36).substring(2, 10);
  const params = new URLSearchParams();

  if (isPrivate && password) {
    params.set('password', password);
  }

  navigate(`/room/${newRoomId}?${params.toString()}`);
};

// В JSX добавить чекбокс и поле пароля:
<label className="flex items-center gap-2 mb-2">
  <input
    type="checkbox"
    checked={isPrivate}
    onChange={(e) => setIsPrivate(e.target.checked)}
  />
  <span>Private room</span>
</label>

{isPrivate && (
  <input
    type="password"
    placeholder="Room password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
  />
)}
```

#### Задача 7.1.2: Обработка пароля при присоединении

**Обновить `client/src/pages/RoomPage.tsx`:**

```tsx
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const password = searchParams.get('password');

// При join_room отправить пароль
ws.send('join_room', {
  roomId,
  nickname,
  password: password || undefined,
});

// Обработать ошибку неверного пароля
ws.on('error', (payload) => {
  if (payload.code === 'UNAUTHORIZED') {
    alert('Invalid password');
    navigate('/');
  }
});
```

### 7.2 Передача прав хоста

#### Задача 7.2.1: Добавить функцию на сервере

**Обновить `server/src/ws/handlers/roomHandlers.ts`:**

```typescript
export function handleTransferHost(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: { targetId: string }
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const room = server.getRoomManager().getRoom(client.roomId);
  if (!room || room.hostId !== client.clientId) {
    server.sendError(ws, 'UNAUTHORIZED', 'Only host can transfer host rights');
    return;
  }

  const success = server.getRoomManager().transferHost(client.roomId, payload.targetId);

  if (!success) {
    server.sendError(ws, 'FAILED', 'Failed to transfer host');
    return;
  }

  // Уведомить всех
  server.broadcastToRoom(client.roomId, {
    type: 'host_transferred',
    payload: {
      newHostId: payload.targetId,
    },
    timestamp: Date.now(),
  });

  logger.info(`Host transferred in room ${client.roomId} to ${payload.targetId}`);
}
```

**Добавить в `WSServer.ts`:**

```typescript
case 'transfer_host':
  handleTransferHost(this, ws, client, message.payload);
  break;
```

#### Задача 7.2.2: Добавить UI

**Создать компонент `client/src/components/Room/ParticipantsList.tsx`:**

```tsx
import { Participant } from '../../types/participant';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  onTransferHost: (participantId: string) => void;
}

function ParticipantsList({
  participants,
  currentUserId,
  isHost,
  onTransferHost,
}: ParticipantsListProps) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">
        Participants ({participants.length})
      </h2>

      <div className="space-y-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-gray-700 p-3 rounded"
          >
            <div>
              <div className="font-medium">
                {p.nickname}
                {p.isHost && ' 👑'}
                {p.id === currentUserId && ' (You)'}
              </div>
              {p.voice.enabled && (
                <div className="text-xs text-green-400">
                  🎤 {p.voice.muted ? 'Muted' : 'Speaking'}
                </div>
              )}
            </div>

            {isHost && p.id !== currentUserId && (
              <button
                onClick={() => onTransferHost(p.id)}
                className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded"
              >
                Make Host
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ParticipantsList;
```

### 7.3 Индикация активности

#### Задача 7.3.1: Добавить индикацию говорящего

**В `WebRTCManager.ts` добавить обработку аудиоактивности:**

```typescript
private setupAudioLevelMonitoring(peerId: string, stream: MediaStream): void {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);

  source.connect(analyser);
  analyser.fftSize = 512;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    // Если уровень > порога, участник говорит
    if (average > 20) {
      this.onSpeaking?.(peerId);
    }
  };

  setInterval(checkLevel, 100);
}

onSpeaking?: (peerId: string) => void;
```

---

## 8. Оптимизация и тестирование

### 8.1 Оптимизация производительности

#### Задача 8.1.1: Добавить rate limiting

**Файл: `server/src/ws/middleware/rateLimiter.ts`**

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number = 10; // запросов
  private windowMs: number = 1000; // в секунду

  check(clientId: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.limits.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false; // Превышен лимит
    }

    entry.count++;
    return true;
  }
}
```

**Использовать в `WSServer.ts`:**

```typescript
private rateLimiter = new RateLimiter();

private handleMessage(ws: WebSocket, data: any): void {
  const client = this.clients.get(ws);
  if (!client) return;

  if (!this.rateLimiter.check(client.clientId)) {
    this.sendError(ws, 'RATE_LIMIT', 'Too many requests');
    return;
  }

  // ... остальная обработка
}
```

#### Задача 8.1.2: Оптимизация состояния комнат (Redis)

**Опционально: использовать Redis для хранения состояния**

```bash
npm install redis
```

**Файл: `server/src/core/RedisRoomStore.ts`**

```typescript
import { createClient } from 'redis';
import { RoomState } from '../types/room';

export class RedisRoomStore {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.connect();
  }

  async saveRoom(roomId: string, room: RoomState): Promise<void> {
    const key = `room:${roomId}`;
    await this.client.set(key, JSON.stringify(room), {
      EX: 3600, // TTL 1 час
    });
  }

  async getRoom(roomId: string): Promise<RoomState | null> {
    const key = `room:${roomId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.client.del(`room:${roomId}`);
  }
}
```

### 8.2 Логирование и мониторинг

#### Задача 8.2.1: Структурированные логи

**Обновить `server/src/utils/logger.ts`:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'syncwatch-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export default logger;
```

#### Задача 8.2.2: Метрики (опционально)

**Использовать Prometheus для метрик:**

```bash
npm install prom-client
```

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

export const register = new Registry();

export const wsConnectionsTotal = new Counter({
  name: 'ws_connections_total',
  help: 'Total WebSocket connections',
  registers: [register],
});

export const roomsActive = new Gauge({
  name: 'rooms_active',
  help: 'Number of active rooms',
  registers: [register],
});

export const messageLatency = new Histogram({
  name: 'message_latency_seconds',
  help: 'Message processing latency',
  registers: [register],
});
```

### 8.3 Тестирование

#### Задача 8.3.1: Unit тесты (Jest)

```bash
cd server
npm install -D jest ts-jest @types/jest
npx ts-jest config:init
```

**Пример теста для RoomManager:**

**Файл: `server/src/core/__tests__/RoomManager.test.ts`**

```typescript
import { RoomManager } from '../RoomManager';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  test('should create a room', () => {
    const room = roomManager.createRoom('host-123');

    expect(room).toBeDefined();
    expect(room.hostId).toBe('host-123');
    expect(room.roomId).toHaveLength(8);
  });

  test('should add participant to room', () => {
    const room = roomManager.createRoom('host-123');

    const participant = {
      id: 'participant-456',
      nickname: 'User1',
      isHost: false,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      voice: { enabled: false, muted: true },
    };

    const success = roomManager.addParticipant(room.roomId, participant);

    expect(success).toBe(true);
    expect(room.participants.size).toBe(1);
  });

  test('should not exceed max participants', () => {
    const room = roomManager.createRoom('host-123', { maxParticipants: 2 });

    const p1 = { id: '1', nickname: 'U1', isHost: false, joinedAt: Date.now(), lastSeen: Date.now(), voice: { enabled: false, muted: true } };
    const p2 = { id: '2', nickname: 'U2', isHost: false, joinedAt: Date.now(), lastSeen: Date.now(), voice: { enabled: false, muted: true } };
    const p3 = { id: '3', nickname: 'U3', isHost: false, joinedAt: Date.now(), lastSeen: Date.now(), voice: { enabled: false, muted: true } };

    expect(roomManager.addParticipant(room.roomId, p1)).toBe(true);
    expect(roomManager.addParticipant(room.roomId, p2)).toBe(true);
    expect(roomManager.addParticipant(room.roomId, p3)).toBe(false);
  });
});
```

#### Задача 8.3.2: E2E тесты (Playwright)

```bash
cd client
npm install -D @playwright/test
npx playwright install
```

**Пример E2E теста:**

**Файл: `client/e2e/room.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('should create room and join', async ({ page, context }) => {
  // Открыть главную страницу
  await page.goto('http://localhost:5173');

  // Создать комнату
  await page.click('text=Create New Room');

  // Проверить, что перешли на страницу комнаты
  await expect(page).toHaveURL(/\/room\/[a-z0-9]+/);

  // Проверить наличие компонентов
  await expect(page.locator('text=Participants')).toBeVisible();
  await expect(page.locator('text=Chat')).toBeVisible();
});

test('two users should sync playback', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Пользователь 1 создает комнату
  await page1.goto('http://localhost:5173');
  await page1.click('text=Create New Room');
  const roomUrl = page1.url();

  // Пользователь 2 присоединяется
  await page2.goto(roomUrl);

  // Пользователь 1 загружает видео и нажимает play
  // (требует реализации UI)

  // Проверить, что оба плеера синхронизированы
  // (проверить currentTime)
});
```

---

## 9. Развертывание

### 9.1 Docker

#### Задача 9.1.1: Создать Dockerfile для сервера

**Файл: `docker/Dockerfile.server`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Копировать package.json и установить зависимости
COPY server/package*.json ./
RUN npm ci --only=production

# Копировать исходники и собрать
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# Открыть порты
EXPOSE 3000 3001

# Запустить
CMD ["node", "dist/index.js"]
```

#### Задача 9.1.2: Создать Dockerfile для клиента

**Файл: `docker/Dockerfile.client`**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Задача 9.1.3: Создать docker-compose.yml

**Файл: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: docker/Dockerfile.server
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - WS_PORT=3001
      - PORT=3000
      - LOG_LEVEL=info
    restart: unless-stopped

  client:
    build:
      context: .
      dockerfile: docker/Dockerfile.client
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### 9.2 Nginx конфигурация

#### Задача 9.2.1: Создать конфиг nginx

**Файл: `docker/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Клиентское приложение
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Проксирование API (если используется HTTP API)
    location /api {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Проксирование WebSocket
    location /ws {
        proxy_pass http://server:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Таймауты
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### 9.3 Запуск и развертывание

#### Задача 9.3.1: Локальный запуск

```bash
# Сборка и запуск
docker-compose up --build

# В фоновом режиме
docker-compose up -d

# Остановка
docker-compose down
```

#### Задача 9.3.2: Production развертывание

**Использовать reverse proxy (Caddy) с автоматическим HTTPS:**

```bash
# Установить Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Caddyfile:**

```caddy
syncwatch.example.com {
    reverse_proxy /ws localhost:3001
    reverse_proxy /api localhost:3000
    reverse_proxy localhost:80
}
```

**Запустить Caddy:**

```bash
sudo caddy run --config Caddyfile
```

#### Задача 9.3.3: Мониторинг и логи

```bash
# Просмотр логов
docker-compose logs -f server

# Перезапуск сервиса
docker-compose restart server

# Статистика ресурсов
docker stats
```

---

## 10. Итоговый чеклист

### MVP (Минимально работающий продукт)

- [ ] Серверная инфраструктура
  - [ ] WebSocket сервер
  - [ ] Room Manager
  - [ ] State Manager
  - [ ] Обработчики сообщений

- [ ] Клиентское приложение
  - [ ] Роутинг и навигация
  - [ ] WebSocket клиент
  - [ ] Создание/присоединение к комнатам

- [ ] Синхронизация воспроизведения
  - [ ] YouTube адаптер
  - [ ] HTML5 адаптер
  - [ ] Sync Engine
  - [ ] Команды play/pause/seek

- [ ] Текстовый чат
  - [ ] Отправка/получение сообщений
  - [ ] UI компоненты

- [ ] Базовые функции
  - [ ] Список участников
  - [ ] Управление хостом
  - [ ] Индикация состояния

### Расширенные функции

- [ ] Голосовой чат
  - [ ] WebRTC соединения
  - [ ] Сигналинг
  - [ ] UI управления

- [ ] Дополнительные источники
  - [ ] VK Video
  - [ ] Загрузка файлов
  - [ ] Прямые URL

- [ ] Приватные комнаты
  - [ ] Парольная защита
  - [ ] UI ввода пароля

- [ ] Передача прав хоста
  - [ ] Серверная логика
  - [ ] UI

### Оптимизация и Production

- [ ] Производительность
  - [ ] Rate limiting
  - [ ] Redis кеширование (опционально)
  - [ ] Оптимизация WebSocket

- [ ] Мониторинг
  - [ ] Логирование
  - [ ] Метрики (Prometheus)
  - [ ] Error tracking

- [ ] Тестирование
  - [ ] Unit тесты
  - [ ] Integration тесты
  - [ ] E2E тесты

- [ ] Развертывание
  - [ ] Docker контейнеры
  - [ ] docker-compose
  - [ ] Nginx/Caddy
  - [ ] HTTPS
  - [ ] CI/CD (опционально)

---

## 11. Рекомендации по разработке

### 11.1 Порядок реализации

1. **Начать с инфраструктуры** (сервер, WebSocket)
2. **Реализовать базовую синхронизацию** (YouTube + sync engine)
3. **Добавить UI** (комната, плеер, управление)
4. **Реализовать чат** (простой функционал)
5. **Добавить голос** (WebRTC)
6. **Расширить функции** (приватные комнаты, другие источники)
7. **Оптимизировать** (производительность, тесты)
8. **Развернуть** (Docker, production)

### 11.2 Частые ошибки

**Ошибка 1: Клиент пытается управлять временем напрямую**
- ❌ Клиент изменяет currentTime самостоятельно
- ✅ Клиент всегда синхронизируется с серверным состоянием

**Ошибка 2: Забыть про server offset**
- ❌ Использовать локальное время клиента
- ✅ Всегда учитывать разницу между серверным и клиентским временем

**Ошибка 3: Слишком частая коррекция**
- ❌ Корректировать каждые 100мс
- ✅ Использовать пороги (thresholds) и плавную коррекцию

**Ошибка 4: Не обрабатывать разрыв соединения**
- ❌ Предполагать, что соединение всегда активно
- ✅ Реализовать автопереподключение и восстановление состояния

### 11.3 Best Practices

- **Использовать TypeScript** для типобезопасности
- **Валидировать все входящие данные** на сервере
- **Логировать важные события** для отладки
- **Тестировать на разных браузерах** (Chrome, Firefox, Safari)
- **Тестировать на мобильных устройствах**
- **Использовать Git** для версионирования
- **Писать документацию** для API и компонентов

---

## 12. Полезные ресурсы

### Документация

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WebRTC](https://webrtc.org/)
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [simple-peer](https://github.com/feross/simple-peer)

### Инструменты

- [Postman](https://www.postman.com/) - тестирование API
- [wscat](https://github.com/websockets/wscat) - WebSocket клиент CLI
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/) - отладка

### Примеры похожих проектов

- [Watch2Gether](https://w2g.tv/)
- [Syncplay](https://syncplay.pl/)
- [Hyperbeam](https://hyperbeam.com/)

---

**Конец плана реализации**

Удачи в разработке! 🚀

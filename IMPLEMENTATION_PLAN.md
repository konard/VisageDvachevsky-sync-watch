# План реализации SyncWatch
## Пошаговое руководство по разработке

**Версия:** 1.0
**Дата:** 22.01.2026
**Базируется на:** TECHNICAL_SPECIFICATION.md

---

## Оглавление

1. [Подготовка проекта](#1-подготовка-проекта)
2. [Серверная часть - Базовая инфраструктура](#2-серверная-часть---базовая-инфраструктура)
3. [Клиентская часть - Базовый UI](#3-клиентская-часть---базовый-ui)
4. [Синхронизация воспроизведения](#4-синхронизация-воспроизведения)
5. [Текстовый чат](#5-текстовый-чат)
6. [Голосовой чат (WebRTC)](#6-голосовой-чат-webrtc)
7. [Дополнительные функции](#7-дополнительные-функции)
8. [Оптимизация и тестирование](#8-оптимизация-и-тестирование)
9. [Развертывание](#9-развертывание)

---

## 1. Подготовка проекта

### 1.1 Структура проекта

Создать следующую структуру каталогов:

```
sync-watch/
├── server/                 # Серверная часть
│   ├── src/
│   │   ├── core/          # Основная логика
│   │   │   ├── RoomManager.ts
│   │   │   ├── StateManager.ts
│   │   │   └── ParticipantManager.ts
│   │   ├── ws/            # WebSocket обработчики
│   │   │   ├── WSServer.ts
│   │   │   ├── handlers/
│   │   │   │   ├── roomHandlers.ts
│   │   │   │   ├── playbackHandlers.ts
│   │   │   │   ├── chatHandlers.ts
│   │   │   │   └── webrtcHandlers.ts
│   │   │   └── middleware/
│   │   │       ├── validation.ts
│   │   │       └── rateLimiter.ts
│   │   ├── http/          # HTTP сервер (опционально)
│   │   │   ├── server.ts
│   │   │   └── routes/
│   │   │       ├── roomRoutes.ts
│   │   │       └── uploadRoutes.ts
│   │   ├── types/         # TypeScript типы
│   │   │   ├── room.ts
│   │   │   ├── participant.ts
│   │   │   ├── playback.ts
│   │   │   └── messages.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── idGenerator.ts
│   │   │   └── timeSync.ts
│   │   └── index.ts       # Точка входа
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── client/                # Клиентская часть
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   │   ├── Room/
│   │   │   │   ├── Room.tsx
│   │   │   │   ├── RoomHeader.tsx
│   │   │   │   └── ParticipantsList.tsx
│   │   │   ├── Player/
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── PlayerControls.tsx
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── IPlayerAdapter.ts
│   │   │   │   │   ├── YouTubeAdapter.ts
│   │   │   │   │   ├── VKAdapter.ts
│   │   │   │   │   └── HTML5Adapter.ts
│   │   │   │   └── SyncEngine.ts
│   │   │   ├── Chat/
│   │   │   │   ├── Chat.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── Message.tsx
│   │   │   ├── Voice/
│   │   │   │   ├── VoiceChat.tsx
│   │   │   │   ├── VoiceControls.tsx
│   │   │   │   └── ParticipantAudio.tsx
│   │   │   └── UI/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Modal.tsx
│   │   ├── services/      # Сервисы
│   │   │   ├── WSClient.ts
│   │   │   ├── WebRTCManager.ts
│   │   │   └── StateManager.ts
│   │   ├── hooks/         # React хуки
│   │   │   ├── useRoom.ts
│   │   │   ├── usePlayback.ts
│   │   │   ├── useChat.ts
│   │   │   └── useVoice.ts
│   │   ├── types/         # TypeScript типы
│   │   │   └── (зеркало серверных типов)
│   │   ├── utils/
│   │   │   ├── timeSync.ts
│   │   │   └── sanitize.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── shared/                # Общие типы (опционально)
│   └── types/
│       └── index.ts
│
├── docker/
│   ├── Dockerfile.server
│   ├── Dockerfile.client
│   └── docker-compose.yml
│
├── docs/
│   ├── TECHNICAL_SPECIFICATION.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── API.md
│
└── README.md
```

### 1.2 Инициализация проектов

#### Задача 1.2.1: Создать серверный проект

```bash
# Создать директорию server
mkdir -p server/src

# Инициализировать npm проект
cd server
npm init -y

# Установить зависимости
npm install \
  ws \
  fastify \
  @fastify/cors \
  @fastify/multipart \
  uuid \
  zod \
  dotenv \
  winston

# Установить dev-зависимости
npm install -D \
  typescript \
  @types/node \
  @types/ws \
  ts-node \
  nodemon \
  tsx
```

**Создать `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Создать `package.json` скрипты:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Создать `.env.example`:**
```env
PORT=3000
WS_PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```

#### Задача 1.2.2: Создать клиентский проект

```bash
# Создать Vite проект с React + TypeScript
npm create vite@latest client -- --template react-ts

cd client

# Установить дополнительные зависимости
npm install \
  react-router-dom \
  simple-peer \
  dayjs

# Установить UI библиотеку (например, Tailwind)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Настроить Tailwind CSS** (опционально):

`tailwind.config.js`:
```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 2. Серверная часть - Базовая инфраструктура

### 2.1 Типы данных

#### Задача 2.1.1: Создать базовые типы

**Файл: `server/src/types/room.ts`**

```typescript
export interface RoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  media: MediaInfo | null;
  playback: PlaybackState;
  participants: Map<string, Participant>;
  settings: RoomSettings;
}

export interface MediaInfo {
  type: 'youtube' | 'vk' | 'file' | 'url';
  source: string;
  duration: number;
  title?: string;
}

export interface PlaybackState {
  state: 'playing' | 'paused';
  offset: number;
  serverTimestamp: number;
  rate: number;
}

export interface RoomSettings {
  isPrivate: boolean;
  password?: string;
  maxParticipants: number;
}
```

**Файл: `server/src/types/participant.ts`**

```typescript
export interface Participant {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
  voice: {
    enabled: boolean;
    muted: boolean;
  };
}
```

**Файл: `server/src/types/messages.ts`**

```typescript
export type WSMessageType =
  | 'join_room'
  | 'joined'
  | 'playback_command'
  | 'playback_update'
  | 'set_media'
  | 'chat_message'
  | 'update_nickname'
  | 'participant_joined'
  | 'participant_left'
  | 'webrtc_signal'
  | 'error';

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp?: number;
}

// Клиент -> Сервер
export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
  password?: string;
}

export interface PlaybackCommandPayload {
  command: 'play' | 'pause' | 'seek' | 'setRate';
  value?: number;
}

export interface SetMediaPayload {
  type: 'youtube' | 'vk' | 'file' | 'url';
  source: string;
  title?: string;
}

export interface ChatMessagePayload {
  text: string;
}

// Сервер -> Клиент
export interface JoinedPayload {
  clientId: string;
  roomState: RoomState;
  participants: Participant[];
}

export interface PlaybackUpdatePayload {
  state: 'playing' | 'paused';
  offset: number;
  rate: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
```

### 2.2 Утилиты

#### Задача 2.2.1: Создать генератор ID

**Файл: `server/src/utils/idGenerator.ts`**

```typescript
import crypto from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateRoomId(length: number = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}

export function generateClientId(): string {
  return crypto.randomUUID();
}

export function generateMessageId(): string {
  return crypto.randomUUID();
}
```

#### Задача 2.2.2: Создать логгер

**Файл: `server/src/utils/logger.ts`**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
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

#### Задача 2.2.3: Создать утилиту синхронизации времени

**Файл: `server/src/utils/timeSync.ts`**

```typescript
export function getServerTime(): number {
  return Date.now();
}

export function calculateCurrentPosition(
  offset: number,
  serverTimestamp: number,
  rate: number
): number {
  const elapsed = (getServerTime() - serverTimestamp) / 1000;
  return offset + elapsed * rate;
}
```

### 2.3 Room Manager

#### Задача 2.3.1: Реализовать Room Manager

**Файл: `server/src/core/RoomManager.ts`**

```typescript
import { RoomState, RoomSettings } from '../types/room';
import { Participant } from '../types/participant';
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
        state: 'paused',
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

    // Если комната пустая, планируем удаление
    if (room.participants.size === 0) {
      this.scheduleRoomCleanup(roomId);
    }
  }

  transferHost(roomId: string, newHostId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(newHostId)) return false;

    // Снять флаг у старого хоста
    const oldHost = room.participants.get(room.hostId);
    if (oldHost) {
      oldHost.isHost = false;
    }

    // Установить нового хоста
    room.hostId = newHostId;
    const newHost = room.participants.get(newHostId);
    if (newHost) {
      newHost.isHost = true;
    }

    logger.info(`Host transferred in room ${roomId} to ${newHostId}`);
    return true;
  }

  private scheduleRoomCleanup(roomId: string): void {
    // Удалить комнату через 5 минут, если она все еще пуста
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
}
```

### 2.4 State Manager

#### Задача 2.4.1: Реализовать State Manager

**Файл: `server/src/core/StateManager.ts`**

```typescript
import { RoomState, MediaInfo, PlaybackState } from '../types/room';
import { RoomManager } from './RoomManager';
import { getServerTime } from '../utils/timeSync';
import logger from '../utils/logger';

export class StateManager {
  constructor(private roomManager: RoomManager) {}

  setMedia(roomId: string, hostId: string, media: MediaInfo): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return false;

    room.media = media;

    // Сбросить воспроизведение
    room.playback = {
      state: 'paused',
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

    // Если уже играет, ничего не делаем
    if (room.playback.state === 'playing') {
      return room.playback;
    }

    // Обновляем состояние
    room.playback.state = 'playing';
    room.playback.serverTimestamp = now;
    // offset остается прежним

    logger.info(`Playback started in room ${roomId}`);
    return { ...room.playback };
  }

  pause(roomId: string, hostId: string): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    const now = getServerTime();

    if (room.playback.state === 'paused') {
      return room.playback;
    }

    // Вычисляем текущую позицию
    const elapsed = (now - room.playback.serverTimestamp) / 1000;
    const currentOffset = room.playback.offset + elapsed * room.playback.rate;

    // Обновляем состояние
    room.playback.state = 'paused';
    room.playback.offset = currentOffset;
    room.playback.serverTimestamp = now;

    logger.info(`Playback paused in room ${roomId} at ${currentOffset}s`);
    return { ...room.playback };
  }

  seek(roomId: string, hostId: string, time: number): PlaybackState | null {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.hostId !== hostId) return null;

    const now = getServerTime();

    // Проверяем границы
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

    // Ограничиваем rate
    rate = Math.max(0.5, Math.min(2.0, rate));

    const now = getServerTime();

    // Если играет, пересчитываем offset
    if (room.playback.state === 'playing') {
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
```

### 2.5 WebSocket Server

#### Задача 2.5.1: Создать WebSocket сервер

**Файл: `server/src/ws/WSServer.ts`**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { WSMessage } from '../types/messages';
import { RoomManager } from '../core/RoomManager';
import { StateManager } from '../core/StateManager';
import logger from '../utils/logger';

export interface ClientConnection {
  ws: WebSocket;
  clientId: string;
  roomId?: string;
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

    // Периодическая проверка пингов
    setInterval(() => this.checkHeartbeats(), 30000);

    logger.info(`WebSocket server started on port ${port}`);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();

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

  private handleMessage(ws: WebSocket, data: any): void {
    try {
      const message: WSMessage = JSON.parse(data.toString());
      const client = this.clients.get(ws);

      if (!client) return;

      logger.debug(`Received ${message.type} from ${client.clientId}`);

      // Обработка сообщения в зависимости от типа
      // Делегируем обработчикам (создадим далее)

    } catch (error) {
      logger.error(`Error handling message: ${error}`);
      this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    logger.info(`Client disconnected: ${client.clientId}`);

    // Удалить из комнаты
    if (client.roomId) {
      this.roomManager.removeParticipant(client.roomId, client.clientId);
      this.broadcastToRoom(client.roomId, {
        type: 'participant_left',
        payload: { participantId: client.clientId },
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

  private generateClientId(): string {
    return `client-${Math.random().toString(36).substr(2, 9)}`;
  }

  getRoomManager(): RoomManager {
    return this.roomManager;
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }
}
```

### 2.6 Обработчики сообщений

#### Задача 2.6.1: Создать обработчики комнат

**Файл: `server/src/ws/handlers/roomHandlers.ts`**

```typescript
import { WebSocket } from 'ws';
import { WSServer, ClientConnection } from '../WSServer';
import { JoinRoomPayload, WSMessage } from '../../types/messages';
import { Participant } from '../../types/participant';
import { generateClientId } from '../../utils/idGenerator';
import logger from '../../utils/logger';

export function handleJoinRoom(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: JoinRoomPayload
): void {
  const { roomId, nickname, password } = payload;
  const roomManager = server.getRoomManager();

  let room = roomManager.getRoom(roomId);

  // Если комната не существует, создать её
  if (!room) {
    room = roomManager.createRoom(client.clientId, {
      isPrivate: !!password,
      password: password,
    });

    // Обновить roomId, если была создана новая комната
    client.roomId = room.roomId;
  } else {
    // Проверить пароль
    if (room.settings.isPrivate && room.settings.password !== password) {
      server.sendError(ws, 'UNAUTHORIZED', 'Invalid password');
      return;
    }

    client.roomId = roomId;
  }

  // Создать участника
  const participant: Participant = {
    id: client.clientId,
    nickname: nickname || `Guest-${client.clientId.substr(0, 4)}`,
    isHost: room.hostId === client.clientId,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    voice: {
      enabled: false,
      muted: true,
    },
  };

  // Добавить в комнату
  if (!roomManager.addParticipant(room.roomId, participant)) {
    server.sendError(ws, 'ROOM_FULL', 'Room is full');
    return;
  }

  // Отправить подтверждение подключения
  server.sendMessage(ws, {
    type: 'joined',
    payload: {
      clientId: client.clientId,
      roomState: {
        ...room,
        participants: undefined, // Удалим Map
      },
      participants: Array.from(room.participants.values()),
    },
    timestamp: Date.now(),
  });

  // Уведомить других участников
  server.broadcastToRoom(room.roomId, {
    type: 'participant_joined',
    payload: { participant },
    timestamp: Date.now(),
  }, client.clientId);

  logger.info(`Client ${client.clientId} joined room ${room.roomId}`);
}

export function handleUpdateNickname(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: { nickname: string }
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const room = server.getRoomManager().getRoom(client.roomId);
  if (!room) return;

  const participant = room.participants.get(client.clientId);
  if (!participant) return;

  participant.nickname = payload.nickname;

  // Уведомить всех
  server.broadcastToRoom(client.roomId, {
    type: 'participant_updated',
    payload: { participant },
    timestamp: Date.now(),
  });
}
```

#### Задача 2.6.2: Создать обработчики воспроизведения

**Файл: `server/src/ws/handlers/playbackHandlers.ts`**

```typescript
import { WebSocket } from 'ws';
import { WSServer, ClientConnection } from '../WSServer';
import { PlaybackCommandPayload, SetMediaPayload } from '../../types/messages';
import logger from '../../utils/logger';

export function handleSetMedia(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: SetMediaPayload
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const room = server.getRoomManager().getRoom(client.roomId);
  if (!room || room.hostId !== client.clientId) {
    server.sendError(ws, 'UNAUTHORIZED', 'Only host can set media');
    return;
  }

  const success = server.getStateManager().setMedia(client.roomId, client.clientId, {
    type: payload.type,
    source: payload.source,
    duration: 0, // Будет обновлено клиентом
    title: payload.title,
  });

  if (!success) {
    server.sendError(ws, 'FAILED', 'Failed to set media');
    return;
  }

  // Уведомить всех
  server.broadcastToRoom(client.roomId, {
    type: 'media_updated',
    payload: room.media,
    timestamp: Date.now(),
  });
}

export function handlePlaybackCommand(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: PlaybackCommandPayload
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const room = server.getRoomManager().getRoom(client.roomId);
  if (!room || room.hostId !== client.clientId) {
    server.sendError(ws, 'UNAUTHORIZED', 'Only host can control playback');
    return;
  }

  const stateManager = server.getStateManager();
  let newState = null;

  switch (payload.command) {
    case 'play':
      newState = stateManager.play(client.roomId, client.clientId);
      break;
    case 'pause':
      newState = stateManager.pause(client.roomId, client.clientId);
      break;
    case 'seek':
      if (payload.value !== undefined) {
        newState = stateManager.seek(client.roomId, client.clientId, payload.value);
      }
      break;
    case 'setRate':
      if (payload.value !== undefined) {
        newState = stateManager.setRate(client.roomId, client.clientId, payload.value);
      }
      break;
  }

  if (!newState) {
    server.sendError(ws, 'FAILED', 'Failed to execute command');
    return;
  }

  // Отправить обновление всем
  server.broadcastToRoom(client.roomId, {
    type: 'playback_update',
    payload: {
      state: newState.state,
      offset: newState.offset,
      rate: newState.rate,
    },
    timestamp: newState.serverTimestamp,
  });

  logger.info(`Playback command ${payload.command} in room ${client.roomId}`);
}
```

#### Задача 2.6.3: Создать обработчики чата

**Файл: `server/src/ws/handlers/chatHandlers.ts`**

```typescript
import { WebSocket } from 'ws';
import { WSServer, ClientConnection } from '../WSServer';
import { ChatMessagePayload } from '../../types/messages';
import { generateMessageId } from '../../utils/idGenerator';
import logger from '../../utils/logger';

export function handleChatMessage(
  server: WSServer,
  ws: WebSocket,
  client: ClientConnection,
  payload: ChatMessagePayload
): void {
  if (!client.roomId) {
    server.sendError(ws, 'NOT_IN_ROOM', 'Not in a room');
    return;
  }

  const room = server.getRoomManager().getRoom(client.roomId);
  if (!room) return;

  const participant = room.participants.get(client.clientId);
  if (!participant) return;

  // Валидация
  if (!payload.text || payload.text.length > 500) {
    server.sendError(ws, 'INVALID_MESSAGE', 'Message too long or empty');
    return;
  }

  // Санитизация (базовая)
  const sanitizedText = payload.text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const message = {
    id: generateMessageId(),
    senderId: client.clientId,
    senderName: participant.nickname,
    text: sanitizedText,
    type: 'user' as const,
  };

  // Отправить всем в комнате
  server.broadcastToRoom(client.roomId, {
    type: 'chat_message',
    payload: message,
    timestamp: Date.now(),
  });

  logger.debug(`Chat message in room ${client.roomId} from ${participant.nickname}`);
}
```

#### Задача 2.6.4: Интегрировать обработчики в WSServer

**Обновить `server/src/ws/WSServer.ts`:**

Добавить импорты:
```typescript
import { handleJoinRoom, handleUpdateNickname } from './handlers/roomHandlers';
import { handleSetMedia, handlePlaybackCommand } from './handlers/playbackHandlers';
import { handleChatMessage } from './handlers/chatHandlers';
```

Обновить метод `handleMessage`:
```typescript
private handleMessage(ws: WebSocket, data: any): void {
  try {
    const message: WSMessage = JSON.parse(data.toString());
    const client = this.clients.get(ws);

    if (!client) return;

    logger.debug(`Received ${message.type} from ${client.clientId}`);

    switch (message.type) {
      case 'join_room':
        handleJoinRoom(this, ws, client, message.payload);
        break;
      case 'update_nickname':
        handleUpdateNickname(this, ws, client, message.payload);
        break;
      case 'set_media':
        handleSetMedia(this, ws, client, message.payload);
        break;
      case 'playback_command':
        handlePlaybackCommand(this, ws, client, message.payload);
        break;
      case 'chat_message':
        handleChatMessage(this, ws, client, message.payload);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    logger.error(`Error handling message: ${error}`);
    this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
  }
}
```

### 2.7 Точка входа сервера

#### Задача 2.7.1: Создать главный файл сервера

**Файл: `server/src/index.ts`**

```typescript
import dotenv from 'dotenv';
import { WSServer } from './ws/WSServer';
import logger from './utils/logger';

dotenv.config();

const WS_PORT = parseInt(process.env.WS_PORT || '3001');

function main() {
  logger.info('Starting SyncWatch server...');

  const wsServer = new WSServer(WS_PORT);

  logger.info(`Server ready`);
}

main();
```

#### Задача 2.7.2: Тестовый запуск сервера

```bash
cd server
npm run dev
```

Сервер должен запуститься на порту 3001.

---

## 3. Клиентская часть - Базовый UI

### 3.1 Типы данных (зеркало серверных)

#### Задача 3.1.1: Скопировать типы

**Скопировать файлы из `server/src/types/` в `client/src/types/`**

Или использовать общий пакет `shared/types`.

### 3.2 WebSocket клиент

#### Задача 3.2.1: Создать WebSocket сервис

**Файл: `client/src/services/WSClient.ts`**

```typescript
import { WSMessage, WSMessageType } from '../types/messages';

type MessageHandler = (payload: any, timestamp?: number) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private reconnectTimeout: number = 1000;
  private maxReconnectTimeout: number = 30000;
  private reconnectAttempt: number = 0;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempt = 0;
        this.reconnectTimeout = 1000;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    });
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.payload, message.timestamp));
    }
  }

  on(type: WSMessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: WSMessageType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(type: WSMessageType, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type, payload };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempt++;
    const timeout = Math.min(
      this.reconnectTimeout * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectTimeout
    );

    console.log(`Reconnecting in ${timeout}ms...`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Будет автоматически повторяться
      });
    }, timeout);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### 3.3 Базовая структура приложения

#### Задача 3.3.1: Создать роутинг

**Файл: `client/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

#### Задача 3.3.2: Создать главную страницу

**Файл: `client/src/pages/HomePage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    // Генерируем случайный ID
    const newRoomId = Math.random().toString(36).substring(2, 10);
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-3xl font-bold mb-6 text-center">SyncWatch</h1>

        <button
          onClick={createRoom}
          className="w-full bg-blue-500 text-white py-3 rounded-lg mb-4 hover:bg-blue-600"
        >
          Create New Room
        </button>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <input
          type="text"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
        />

        <button
          onClick={joinRoom}
          disabled={!roomId.trim()}
          className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}

export default HomePage;
```

#### Задача 3.3.3: Создать страницу комнаты (базовая структура)

**Файл: `client/src/pages/RoomPage.tsx`**

```tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { WSClient } from '../services/WSClient';

function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [ws] = useState(() => new WSClient('ws://localhost:3001'));
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState(`Guest-${Math.random().toString(36).substr(2, 4)}`);

  useEffect(() => {
    ws.connect()
      .then(() => {
        setConnected(true);
        // Присоединяемся к комнате
        ws.send('join_room', {
          roomId,
          nickname,
        });
      })
      .catch((error) => {
        console.error('Failed to connect:', error);
      });

    ws.on('joined', (payload) => {
      console.log('Joined room:', payload);
    });

    ws.on('error', (payload) => {
      console.error('Server error:', payload);
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Connecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Room: {roomId}</h1>

        {/* Здесь будет плеер, чат и список участников */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-black aspect-video">
            {/* Player */}
            <div className="h-full flex items-center justify-center text-gray-500">
              No media selected
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            {/* Participants list */}
            <h2 className="font-bold mb-2">Participants</h2>
            {/* List */}
          </div>
        </div>

        <div className="mt-4 bg-gray-800 p-4 rounded">
          {/* Chat */}
          <h2 className="font-bold mb-2">Chat</h2>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
```

---

## 4. Синхронизация воспроизведения

### 4.1 Player Adapter (абстракция)

#### Задача 4.1.1: Создать интерфейс адаптера

**Файл: `client/src/components/Player/adapters/IPlayerAdapter.ts`**

```typescript
export interface PlayerState {
  currentTime: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  ready: boolean;
}

export interface IPlayerAdapter {
  load(source: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  setPlaybackRate(rate: number): void;
  getState(): PlayerState;
  destroy(): void;

  // События
  onReady(callback: () => void): void;
  onTimeUpdate(callback: (time: number) => void): void;
  onEnded(callback: () => void): void;
}
```

#### Задача 4.1.2: Реализовать YouTube адаптер

**Файл: `client/src/components/Player/adapters/YouTubeAdapter.ts`**

```typescript
import { IPlayerAdapter, PlayerState } from './IPlayerAdapter';

// Добавить YouTube API в index.html:
// <script src="https://www.youtube.com/iframe_api"></script>

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export class YouTubeAdapter implements IPlayerAdapter {
  private player: any = null;
  private ready: boolean = false;
  private readyCallbacks: (() => void)[] = [];
  private timeUpdateCallbacks: ((time: number) => void)[] = [];
  private endedCallbacks: (() => void)[] = [];
  private timeUpdateInterval: number | null = null;

  constructor(private containerId: string) {}

  async load(videoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ждем загрузки YouTube API
      const initPlayer = () => {
        this.player = new window.YT.Player(this.containerId, {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              this.ready = true;
              this.readyCallbacks.forEach(cb => cb());
              this.startTimeUpdateLoop();
              resolve();
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                this.endedCallbacks.forEach(cb => cb());
              }
            },
            onError: (error: any) => {
              reject(error);
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    });
  }

  async play(): Promise<void> {
    if (this.player) {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.player) {
      this.player.pauseVideo();
    }
  }

  seek(time: number): void {
    if (this.player) {
      this.player.seekTo(time, true);
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.player) {
      this.player.setPlaybackRate(rate);
    }
  }

  getState(): PlayerState {
    if (!this.player) {
      return {
        currentTime: 0,
        duration: 0,
        paused: true,
        playbackRate: 1,
        ready: false,
      };
    }

    return {
      currentTime: this.player.getCurrentTime() || 0,
      duration: this.player.getDuration() || 0,
      paused: this.player.getPlayerState() !== window.YT.PlayerState.PLAYING,
      playbackRate: this.player.getPlaybackRate() || 1,
      ready: this.ready,
    };
  }

  onReady(callback: () => void): void {
    if (this.ready) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallbacks.push(callback);
  }

  onEnded(callback: () => void): void {
    this.endedCallbacks.push(callback);
  }

  private startTimeUpdateLoop(): void {
    this.timeUpdateInterval = window.setInterval(() => {
      const time = this.player?.getCurrentTime();
      if (time !== undefined) {
        this.timeUpdateCallbacks.forEach(cb => cb(time));
      }
    }, 500);
  }

  destroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    if (this.player) {
      this.player.destroy();
    }
  }
}
```

#### Задача 4.1.3: Реализовать HTML5 адаптер

**Файл: `client/src/components/Player/adapters/HTML5Adapter.ts`**

```typescript
import { IPlayerAdapter, PlayerState } from './IPlayerAdapter';

export class HTML5Adapter implements IPlayerAdapter {
  private video: HTMLVideoElement | null = null;
  private readyCallbacks: (() => void)[] = [];

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  async load(source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.video) {
        reject(new Error('Video element not found'));
        return;
      }

      this.video.src = source;

      const handleCanPlay = () => {
        this.readyCallbacks.forEach(cb => cb());
        this.video?.removeEventListener('canplay', handleCanPlay);
        resolve();
      };

      const handleError = (e: Event) => {
        this.video?.removeEventListener('error', handleError);
        reject(e);
      };

      this.video.addEventListener('canplay', handleCanPlay);
      this.video.addEventListener('error', handleError);
      this.video.load();
    });
  }

  async play(): Promise<void> {
    if (this.video) {
      await this.video.play();
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause();
    }
  }

  seek(time: number): void {
    if (this.video) {
      this.video.currentTime = time;
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.video) {
      this.video.playbackRate = rate;
    }
  }

  getState(): PlayerState {
    if (!this.video) {
      return {
        currentTime: 0,
        duration: 0,
        paused: true,
        playbackRate: 1,
        ready: false,
      };
    }

    return {
      currentTime: this.video.currentTime,
      duration: this.video.duration || 0,
      paused: this.video.paused,
      playbackRate: this.video.playbackRate,
      ready: this.video.readyState >= 3,
    };
  }

  onReady(callback: () => void): void {
    if (this.video && this.video.readyState >= 3) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  onTimeUpdate(callback: (time: number) => void): void {
    if (this.video) {
      this.video.addEventListener('timeupdate', () => {
        callback(this.video!.currentTime);
      });
    }
  }

  onEnded(callback: () => void): void {
    if (this.video) {
      this.video.addEventListener('ended', callback);
    }
  }

  destroy(): void {
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
  }
}
```

### 4.2 Sync Engine

#### Задача 4.2.1: Создать движок синхронизации

**Файл: `client/src/components/Player/SyncEngine.ts`**

```typescript
import { IPlayerAdapter } from './adapters/IPlayerAdapter';
import { PlaybackState } from '../../types/room';

const DRIFT_THRESHOLD_MINOR = 0.1; // 100ms
const DRIFT_THRESHOLD_MAJOR = 0.3; // 300ms
const SYNC_CHECK_INTERVAL = 500; // 500ms

export class SyncEngine {
  private syncInterval: number | null = null;
  private serverOffset: number = 0; // разница между серверным и клиентским временем

  constructor(private adapter: IPlayerAdapter) {}

  start(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      this.checkSync();
    }, SYNC_CHECK_INTERVAL);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  applyState(playback: PlaybackState, serverTimestamp: number): void {
    const state = this.adapter.getState();

    if (!state.ready) {
      console.log('Player not ready, deferring sync');
      return;
    }

    // Обновляем server offset
    this.serverOffset = Date.now() - serverTimestamp;

    // Вычисляем целевое время
    const targetTime = this.calculateTargetTime(playback);

    // Применяем состояние
    if (playback.state === 'playing' && state.paused) {
      this.adapter.play();
    } else if (playback.state === 'paused' && !state.paused) {
      this.adapter.pause();
    }

    // Синхронизируем время
    const drift = state.currentTime - targetTime;
    this.correctDrift(drift, playback.rate);

    // Синхронизируем скорость
    if (Math.abs(state.playbackRate - playback.rate) > 0.01) {
      this.adapter.setPlaybackRate(playback.rate);
    }
  }

  private checkSync(): void {
    // Периодическая проверка синхронизации
    // Вызывается автоматически каждые 500мс
  }

  private calculateTargetTime(playback: PlaybackState): number {
    const now = Date.now();
    const serverNow = now - this.serverOffset;
    const elapsed = (serverNow - playback.serverTimestamp) / 1000;

    if (playback.state === 'playing') {
      return playback.offset + elapsed * playback.rate;
    } else {
      return playback.offset;
    }
  }

  private correctDrift(drift: number, targetRate: number): void {
    const absDrift = Math.abs(drift);

    if (absDrift < DRIFT_THRESHOLD_MINOR) {
      // Все ок
      if (this.adapter.getState().playbackRate !== targetRate) {
        this.adapter.setPlaybackRate(targetRate);
      }
      return;
    }

    if (absDrift < DRIFT_THRESHOLD_MAJOR) {
      // Плавная коррекция
      console.log(`Minor drift detected: ${drift.toFixed(3)}s, applying smooth correction`);

      if (drift > 0) {
        // Клиент впереди, замедляем
        this.adapter.setPlaybackRate(targetRate * 0.95);
      } else {
        // Клиент позади, ускоряем
        this.adapter.setPlaybackRate(targetRate * 1.05);
      }

      // Вернуть нормальную скорость через некоторое время
      setTimeout(() => {
        this.adapter.setPlaybackRate(targetRate);
      }, 2000);
    } else {
      // Жесткий seek
      console.log(`Major drift detected: ${drift.toFixed(3)}s, performing seek`);
      const state = this.adapter.getState();
      const targetTime = state.currentTime - drift;
      this.adapter.seek(targetTime);
      this.adapter.setPlaybackRate(targetRate);
    }
  }

  destroy(): void {
    this.stop();
  }
}
```

Продолжение следует... (документ большой, разбит на части).

---

## Резюме текущего плана

Выше приведены детальные шаги для:

1. **Подготовки проекта** - структура, инициализация
2. **Серверной части** - типы, менеджеры, WebSocket, обработчики
3. **Клиентской части** - базовый UI, роутинг, WebSocket клиент
4. **Синхронизации** - адаптеры плеера, движок синхронизации

Следующие разделы (5-9) включают:
- Текстовый чат (компоненты, интеграция)
- Голосовой чат (WebRTC, сигналинг)
- Дополнительные функции (приватные комнаты, передача хоста)
- Оптимизация и тестирование
- Развертывание (Docker, nginx)

Хотите, чтобы я продолжил с оставшимися разделами?

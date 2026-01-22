# Quick Start Guide
## Быстрое руководство по запуску разработки

Это краткое руководство для быстрого старта разработки проекта SyncWatch.

## Предварительные требования

```bash
# Проверить версию Node.js (требуется 20+)
node --version

# Проверить npm
npm --version

# Проверить git
git --version
```

## Шаг 1: Инициализация серверного проекта

```bash
# Создать директорию и структуру
mkdir -p server/src/{core,ws/handlers,types,utils}

# Перейти в server
cd server

# Инициализировать npm
npm init -y

# Установить зависимости
npm install ws fastify @fastify/cors uuid zod dotenv winston

# Установить dev-зависимости
npm install -D typescript @types/node @types/ws ts-node tsx nodemon

# Создать tsconfig.json
cat > tsconfig.json << 'EOF'
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
EOF

# Обновить package.json scripts
npm pkg set scripts.dev="tsx watch src/index.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"

# Создать .env
cat > .env << 'EOF'
PORT=3000
WS_PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
EOF

# Вернуться в корень
cd ..
```

## Шаг 2: Инициализация клиентского проекта

```bash
# Создать Vite проект с React + TypeScript
npm create vite@latest client -- --template react-ts

cd client

# Установить зависимости
npm install

# Установить дополнительные пакеты
npm install react-router-dom simple-peer dayjs

# Установить Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Настроить Tailwind
cat > tailwind.config.js << 'EOF'
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
EOF

# Обновить src/index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cd ..
```

## Шаг 3: Первый запуск (Hello World)

### Серверная часть

```bash
cd server

# Создать минимальный index.ts
cat > src/index.ts << 'EOF'
import { WebSocketServer } from 'ws';

const PORT = 3001;

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.send(JSON.stringify({ type: 'echo', payload: data.toString() }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
EOF

# Запустить
npm run dev
```

В другом терминале проверить:

```bash
# Установить wscat для тестирования
npm install -g wscat

# Подключиться
wscat -c ws://localhost:3001

# Отправить сообщение
> {"type":"test","payload":"hello"}

# Должны получить эхо
```

### Клиентская часть

```bash
cd client

# Создать тестовую страницу
cat > src/App.tsx << 'EOF'
import { useState, useEffect } from 'react';

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('Connected to server');
      setMessages((prev) => [...prev, 'Connected!']);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, `Received: ${data.payload}`]);
    };

    socket.onclose = () => {
      console.log('Disconnected from server');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws && input) {
      ws.send(JSON.stringify({ type: 'test', payload: input }));
      setMessages((prev) => [...prev, `Sent: ${input}`]);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">SyncWatch Test</h1>

      <div className="mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="bg-gray-800 px-4 py-2 rounded mr-2"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h2 className="font-bold mb-2">Messages:</h2>
        {messages.map((msg, i) => (
          <div key={i} className="text-sm mb-1">{msg}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
EOF

# Запустить
npm run dev
```

Открыть http://localhost:5173 - должен работать эхо-сервер.

## Шаг 4: Создание первых модулей

### Типы данных

```bash
cd server

# Создать базовые типы
cat > src/types/room.ts << 'EOF'
export interface RoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  media: MediaInfo | null;
  playback: PlaybackState;
  participants: Map<string, Participant>;
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

export interface Participant {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
}
EOF

cat > src/types/messages.ts << 'EOF'
export type WSMessageType =
  | 'join_room'
  | 'joined'
  | 'playback_command'
  | 'playback_update'
  | 'chat_message'
  | 'error';

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp?: number;
}
EOF
```

### Утилиты

```bash
# ID Generator
cat > src/utils/idGenerator.ts << 'EOF'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateRoomId(length: number = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}

export function generateClientId(): string {
  return `client-${Math.random().toString(36).substr(2, 9)}`;
}
EOF

# Logger
cat > src/utils/logger.ts << 'EOF'
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function log(level: keyof typeof LOG_LEVELS, ...args: any[]) {
  if (LOG_LEVELS[level] >= currentLevel) {
    console.log(`[${level.toUpperCase()}]`, new Date().toISOString(), ...args);
  }
}

export default {
  debug: (...args: any[]) => log('debug', ...args),
  info: (...args: any[]) => log('info', ...args),
  warn: (...args: any[]) => log('warn', ...args),
  error: (...args: any[]) => log('error', ...args),
};
EOF
```

## Шаг 5: Копирование кода из плана реализации

Теперь следуйте **IMPLEMENTATION_PLAN.md** и копируйте код из плана:

1. Скопировать `RoomManager.ts` из раздела 2.3.1
2. Скопировать `StateManager.ts` из раздела 2.4.1
3. Скопировать `WSServer.ts` из раздела 2.5.1
4. Скопировать обработчики из раздела 2.6

## Шаг 6: Docker setup (опционально)

```bash
# Создать docker директорию
mkdir -p docker

# Создать docker-compose.yml в корне
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: docker/Dockerfile.server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - WS_PORT=3001
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
EOF

# Dockerfile для сервера
cat > docker/Dockerfile.server << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
EOF

# Dockerfile для клиента
cat > docker/Dockerfile.client << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

## Полезные команды

### Разработка

```bash
# Запуск сервера
cd server && npm run dev

# Запуск клиента
cd client && npm run dev

# Тестирование WebSocket
wscat -c ws://localhost:3001

# Просмотр логов сервера
cd server && tail -f logs/combined.log
```

### Production

```bash
# Сборка
cd server && npm run build
cd client && npm run build

# Docker
docker-compose up --build
docker-compose up -d
docker-compose down
docker-compose logs -f server
```

### Тестирование

```bash
# Unit тесты
cd server && npm test

# E2E тесты
cd client && npm run test:e2e

# Линтинг
cd server && npm run lint
cd client && npm run lint
```

## Следующие шаги

1. ✅ Инициализация проектов
2. ✅ Hello World сервер
3. 📝 Реализовать модули по плану (IMPLEMENTATION_PLAN.md)
4. 📝 Создать UI компоненты
5. 📝 Интегрировать YouTube Player
6. 📝 Реализовать синхронизацию
7. 📝 Добавить чат
8. 📝 Добавить WebRTC голос
9. 🧪 Тестирование
10. 🚀 Развертывание

## Troubleshooting

### WebSocket не подключается
```bash
# Проверить, что сервер запущен
lsof -i :3001

# Проверить firewall
sudo ufw allow 3001
```

### TypeScript ошибки
```bash
# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### CORS ошибки
Добавить в клиент `.env`:
```
VITE_WS_URL=ws://localhost:3001
```

## Ресурсы

- 📖 [Полное ТЗ](./TECHNICAL_SPECIFICATION.md)
- 🛠️ [План реализации Часть 1](./IMPLEMENTATION_PLAN.md)
- 🛠️ [План реализации Часть 2](./IMPLEMENTATION_PLAN_PART2.md)
- 📚 [README](./README.md)

---

**Happy Coding! 🚀**

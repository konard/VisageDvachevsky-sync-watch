import dotenv from 'dotenv';
import http from 'http';
import { WSServer } from './ws/WSServer';
import logger from './utils/logger';

dotenv.config();

const WS_PORT = parseInt(process.env.WS_PORT || '3001');

async function main() {
  logger.info('Starting SyncWatch server...');

  // WSServer needs to be created first to get room count in health check
  let wsServer: WSServer | null = null;

  // Create HTTP server for health checks
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const roomManager = wsServer?.getRoomManager();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: Date.now(),
        rooms: roomManager?.getRoomCount() ?? 0,
        redis: roomManager?.isRedisEnabled() ?? false,
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  httpServer.listen(WS_PORT, () => {
    logger.info(`HTTP health endpoint ready on port ${WS_PORT}`);
  });

  wsServer = new WSServer(WS_PORT, httpServer);

  // Initialize Redis for room persistence (optional, will fallback to memory)
  try {
    await wsServer.getRoomManager().initializeRedis();
  } catch (error) {
    logger.warn('Redis initialization skipped - using in-memory storage');
  }

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down...');
    httpServer.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down...');
    httpServer.close();
    process.exit(0);
  });

  logger.info(`Server ready on port ${WS_PORT}`);
}

main();

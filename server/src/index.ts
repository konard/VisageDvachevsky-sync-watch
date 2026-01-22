import dotenv from 'dotenv';
import { WSServer } from './ws/WSServer';
import logger from './utils/logger';

dotenv.config();

const WS_PORT = parseInt(process.env.WS_PORT || '3001');

function main() {
  logger.info('Starting SyncWatch server...');

  const wsServer = new WSServer(WS_PORT);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down...');
    process.exit(0);
  });

  logger.info(`Server ready on port ${WS_PORT}`);
}

main();

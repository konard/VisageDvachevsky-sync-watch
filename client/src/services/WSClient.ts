import type { WSMessage, WSMessageType } from '../types/messages';

type MessageHandler = (payload: unknown, timestamp?: number) => void;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private reconnectTimeout: number = 1000;
  private maxReconnectTimeout: number = 30000;
  private reconnectAttempt: number = 0;
  private shouldReconnect: boolean = true;
  private url: string;

  constructor(url?: string) {
    this.url = url || WS_URL;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.shouldReconnect = true;

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
        if (this.shouldReconnect) {
          this.attemptReconnect();
        }
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

  removeAllHandlers(type?: WSMessageType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  send(type: WSMessageType, payload: unknown): void {
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
        // Will automatically retry
      });
    }, timeout);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

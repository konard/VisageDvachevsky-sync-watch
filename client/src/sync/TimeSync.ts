import type { WSClient } from '../services/WSClient';

export interface TimeSyncResult {
  offset: number;
  roundTripTime: number;
}

export class TimeSync {
  private offset: number = 0;
  private samples: number[] = [];
  private readonly maxSamples: number = 5;
  private readonly sampleInterval: number = 2000;
  private intervalId: number | null = null;
  private wsClient: WSClient | null = null;
  private pendingPings: Map<number, number> = new Map();

  private onSyncCallback: ((offset: number) => void) | null = null;

  constructor(wsClient?: WSClient) {
    if (wsClient) {
      this.wsClient = wsClient;
      this.setupPongHandler();
    }
  }

  private setupPongHandler(): void {
    if (this.wsClient) {
      this.wsClient.on('pong', (data) => {
        const { clientTime, serverTime } = data as { clientTime: number; serverTime: number };
        this.processPong(clientTime, serverTime);
      });
    }
  }

  start(sendPing?: () => number): void {
    // If we have a WSClient, use it for ping/pong
    if (this.wsClient) {
      this.performSync();

      this.intervalId = window.setInterval(() => {
        this.performSync();
      }, this.sampleInterval);
    } else if (sendPing) {
      // Legacy mode: use callback
      this.performSyncLegacy(sendPing);

      this.intervalId = window.setInterval(() => {
        this.performSyncLegacy(sendPing);
      }, this.sampleInterval);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private performSync(): void {
    if (this.wsClient) {
      const clientTime = Date.now();
      this.pendingPings.set(clientTime, clientTime);
      this.wsClient.send('ping', { clientTime });
    }
  }

  private performSyncLegacy(sendPing: () => number): void {
    sendPing();
  }

  processPong(clientSendTime: number, serverTime: number): void {
    const clientReceiveTime = Date.now();
    const roundTripTime = clientReceiveTime - clientSendTime;

    // Estimate one-way latency as half of round-trip time
    const oneWayLatency = roundTripTime / 2;

    // Calculate clock offset: server time when we received - our receive time
    const offset = serverTime + oneWayLatency - clientReceiveTime;

    this.addSample(offset);

    // Clean up pending ping
    this.pendingPings.delete(clientSendTime);
  }

  private addSample(offset: number): void {
    this.samples.push(offset);

    // Keep only the most recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Calculate median offset (more robust than mean)
    this.offset = this.calculateMedian(this.samples);

    if (this.onSyncCallback) {
      this.onSyncCallback(this.offset);
    }
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  getOffset(): number {
    return this.offset;
  }

  getServerTime(): number {
    return Date.now() + this.offset;
  }

  onSync(callback: (offset: number) => void): void {
    this.onSyncCallback = callback;
  }

  destroy(): void {
    this.stop();
    this.samples = [];
    this.offset = 0;
    this.onSyncCallback = null;
    this.pendingPings.clear();
  }
}

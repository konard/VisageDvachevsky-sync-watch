import type { IPlayer } from '../players/IPlayer';

export interface ServerPlaybackState {
  isPlaying: boolean;
  offset: number;
  serverTimestamp: number;
  rate: number;
}

export interface SyncConfig {
  // Threshold below which we don't correct (ms)
  noActionThreshold: number;
  // Threshold for smooth correction using playback rate (ms)
  smoothCorrectionThreshold: number;
  // Above this threshold, we do hard seek (ms)
  hardSeekThreshold: number;
  // How often to check synchronization (ms)
  syncInterval: number;
  // Playback rate adjustment for smooth correction
  speedUpRate: number;
  slowDownRate: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  noActionThreshold: 100,
  smoothCorrectionThreshold: 300,
  hardSeekThreshold: 300,
  syncInterval: 1000,
  speedUpRate: 1.05,
  slowDownRate: 0.95,
};

export class SyncEngine {
  private player: IPlayer | null = null;
  private serverState: ServerPlaybackState | null = null;
  private config: SyncConfig;
  private syncIntervalId: number | null = null;
  private clockOffset: number = 0;
  private isHost: boolean = false;
  private isSyncing: boolean = false;

  private onDriftCallback: ((drift: number) => void) | null = null;
  private onCorrectionCallback: ((type: 'smooth' | 'hard', drift: number) => void) | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setPlayer(player: IPlayer): void {
    this.player = player;
  }

  setIsHost(isHost: boolean): void {
    this.isHost = isHost;
  }

  setClockOffset(offset: number): void {
    this.clockOffset = offset;
  }

  updateServerState(state: ServerPlaybackState): void {
    this.serverState = state;

    if (!this.isHost) {
      this.synchronize();
    }
  }

  start(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = window.setInterval(() => {
      if (!this.isHost) {
        this.synchronize();
      }
    }, this.config.syncInterval);
  }

  stop(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  private calculateExpectedPosition(): number {
    if (!this.serverState) {
      return 0;
    }

    const { isPlaying, offset, serverTimestamp, rate } = this.serverState;

    if (!isPlaying) {
      return offset;
    }

    // Get current time adjusted for clock offset
    const now = Date.now() + this.clockOffset;
    const elapsed = (now - serverTimestamp) / 1000; // Convert to seconds

    // Calculate expected position: T = offset + elapsed * rate
    return offset + elapsed * rate;
  }

  private synchronize(): void {
    if (!this.player || !this.serverState || this.isSyncing) {
      return;
    }

    const expectedPosition = this.calculateExpectedPosition();
    const currentPosition = this.player.getCurrentTime();
    const drift = (currentPosition - expectedPosition) * 1000; // Convert to ms

    if (this.onDriftCallback) {
      this.onDriftCallback(drift);
    }

    const absDrift = Math.abs(drift);

    // No correction needed
    if (absDrift < this.config.noActionThreshold) {
      // Reset playback rate if it was adjusted
      if (this.player.getPlaybackRate() !== this.serverState.rate) {
        this.player.setPlaybackRate(this.serverState.rate);
      }
      return;
    }

    // Hard seek for large drifts
    if (absDrift >= this.config.hardSeekThreshold) {
      this.isSyncing = true;
      this.player.seek(expectedPosition);
      this.player.setPlaybackRate(this.serverState.rate);

      if (this.onCorrectionCallback) {
        this.onCorrectionCallback('hard', drift);
      }

      // Allow time for seek to complete before next sync check
      setTimeout(() => {
        this.isSyncing = false;
      }, 500);
      return;
    }

    // Smooth correction for medium drifts
    if (absDrift >= this.config.noActionThreshold) {
      // If we're ahead, slow down; if behind, speed up
      const adjustedRate = drift > 0
        ? this.serverState.rate * this.config.slowDownRate
        : this.serverState.rate * this.config.speedUpRate;

      this.player.setPlaybackRate(adjustedRate);

      if (this.onCorrectionCallback) {
        this.onCorrectionCallback('smooth', drift);
      }
    }
  }

  handleServerPlay(): void {
    if (!this.player) return;

    if (this.isHost) {
      // Host initiated the play, no need to sync
      return;
    }

    const expectedPosition = this.calculateExpectedPosition();
    this.player.seek(expectedPosition);
    this.player.play();
  }

  handleServerPause(): void {
    if (!this.player) return;

    if (this.isHost) {
      return;
    }

    this.player.pause();

    if (this.serverState) {
      this.player.seek(this.serverState.offset);
    }
  }

  handleServerSeek(position: number): void {
    if (!this.player) return;

    if (this.isHost) {
      return;
    }

    this.player.seek(position);
  }

  handleServerRateChange(rate: number): void {
    if (!this.player) return;

    if (this.isHost) {
      return;
    }

    this.player.setPlaybackRate(rate);
  }

  onDrift(callback: (drift: number) => void): void {
    this.onDriftCallback = callback;
  }

  onCorrection(callback: (type: 'smooth' | 'hard', drift: number) => void): void {
    this.onCorrectionCallback = callback;
  }

  getDrift(): number {
    if (!this.player || !this.serverState) {
      return 0;
    }

    const expectedPosition = this.calculateExpectedPosition();
    const currentPosition = this.player.getCurrentTime();
    return (currentPosition - expectedPosition) * 1000;
  }

  destroy(): void {
    this.stop();
    this.player = null;
    this.serverState = null;
    this.onDriftCallback = null;
    this.onCorrectionCallback = null;
  }
}

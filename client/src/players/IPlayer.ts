export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
}

export interface IPlayer {
  // Playback control
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  setPlaybackRate(rate: number): void;

  // Volume control
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;

  // State getters
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getVolume(): number;
  isMuted(): boolean;
  isPlaying(): boolean;

  // Source control
  setSource(source: string): void;
  getSource(): string;

  // Event handlers
  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onSeek(callback: (time: number) => void): void;
  onTimeUpdate(callback: (time: number) => void): void;
  onEnded(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  onReady(callback: () => void): void;
  onBuffering(callback: (isBuffering: boolean) => void): void;

  // Cleanup
  destroy(): void;
}

export type PlayerEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'timeupdate'
  | 'ended'
  | 'error'
  | 'ready'
  | 'buffering';

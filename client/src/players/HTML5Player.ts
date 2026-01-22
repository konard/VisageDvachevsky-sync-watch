import type { IPlayer } from './IPlayer';

export class HTML5Player implements IPlayer {
  private video: HTMLVideoElement;
  private source: string = '';
  private playing: boolean = false;

  private callbacks: {
    onPlay: (() => void)[];
    onPause: (() => void)[];
    onSeek: ((time: number) => void)[];
    onTimeUpdate: ((time: number) => void)[];
    onEnded: (() => void)[];
    onError: ((error: Error) => void)[];
    onReady: (() => void)[];
    onBuffering: ((isBuffering: boolean) => void)[];
  } = {
    onPlay: [],
    onPause: [],
    onSeek: [],
    onTimeUpdate: [],
    onEnded: [],
    onError: [],
    onReady: [],
    onBuffering: [],
  };

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.video.addEventListener('play', () => {
      this.playing = true;
      this.callbacks.onPlay.forEach(cb => cb());
    });

    this.video.addEventListener('pause', () => {
      this.playing = false;
      this.callbacks.onPause.forEach(cb => cb());
    });

    this.video.addEventListener('seeked', () => {
      this.callbacks.onSeek.forEach(cb => cb(this.video.currentTime));
    });

    this.video.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate.forEach(cb => cb(this.video.currentTime));
    });

    this.video.addEventListener('ended', () => {
      this.playing = false;
      this.callbacks.onEnded.forEach(cb => cb());
    });

    this.video.addEventListener('error', () => {
      const error = new Error(this.video.error?.message || 'Unknown video error');
      this.callbacks.onError.forEach(cb => cb(error));
    });

    this.video.addEventListener('canplay', () => {
      this.callbacks.onReady.forEach(cb => cb());
    });

    this.video.addEventListener('waiting', () => {
      this.callbacks.onBuffering.forEach(cb => cb(true));
    });

    this.video.addEventListener('playing', () => {
      this.callbacks.onBuffering.forEach(cb => cb(false));
    });
  }

  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      throw error;
    }
  }

  pause(): void {
    this.video.pause();
  }

  seek(time: number): void {
    this.video.currentTime = time;
  }

  setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted;
  }

  getCurrentTime(): number {
    return this.video.currentTime;
  }

  getDuration(): number {
    return this.video.duration || 0;
  }

  getPlaybackRate(): number {
    return this.video.playbackRate;
  }

  getVolume(): number {
    return this.video.volume;
  }

  isMuted(): boolean {
    return this.video.muted;
  }

  isPlaying(): boolean {
    return this.playing && !this.video.paused;
  }

  setSource(source: string): void {
    this.source = source;
    this.video.src = source;
    this.video.load();
  }

  getSource(): string {
    return this.source;
  }

  onPlay(callback: () => void): void {
    this.callbacks.onPlay.push(callback);
  }

  onPause(callback: () => void): void {
    this.callbacks.onPause.push(callback);
  }

  onSeek(callback: (time: number) => void): void {
    this.callbacks.onSeek.push(callback);
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.callbacks.onTimeUpdate.push(callback);
  }

  onEnded(callback: () => void): void {
    this.callbacks.onEnded.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.callbacks.onError.push(callback);
  }

  onReady(callback: () => void): void {
    this.callbacks.onReady.push(callback);
  }

  onBuffering(callback: (isBuffering: boolean) => void): void {
    this.callbacks.onBuffering.push(callback);
  }

  destroy(): void {
    this.video.pause();
    this.video.src = '';
    this.video.load();
    this.callbacks = {
      onPlay: [],
      onPause: [],
      onSeek: [],
      onTimeUpdate: [],
      onEnded: [],
      onError: [],
      onReady: [],
      onBuffering: [],
    };
  }
}

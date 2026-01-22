import type { IPlayer } from './IPlayer';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: YouTubePlayerOptions
      ) => YouTubePlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerOptions {
  height?: string;
  width?: string;
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    enablejsapi?: 0 | 1;
  };
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YouTubePlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  destroy(): void;
}

export class YouTubePlayer implements IPlayer {
  private player: YouTubePlayerInstance | null = null;
  private containerId: string;
  private videoId: string = '';
  private source: string = '';
  private playing: boolean = false;
  private ready: boolean = false;
  private timeUpdateInterval: number | null = null;

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

  constructor(containerId: string) {
    this.containerId = containerId;
    this.loadYouTubeAPI();
  }

  private loadYouTubeAPI(): void {
    if (window.YT) {
      this.initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.initPlayer();
    };
  }

  private initPlayer(): void {
    this.player = new window.YT.Player(this.containerId, {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: () => this.onPlayerReady(),
        onStateChange: (event) => this.onPlayerStateChange(event),
        onError: (event) => this.onPlayerError(event),
      },
    });
  }

  private onPlayerReady(): void {
    this.ready = true;
    this.startTimeUpdate();
    this.callbacks.onReady.forEach(cb => cb());
  }

  private onPlayerStateChange(event: { data: number }): void {
    const state = event.data;

    switch (state) {
      case window.YT.PlayerState.PLAYING:
        this.playing = true;
        this.callbacks.onPlay.forEach(cb => cb());
        this.callbacks.onBuffering.forEach(cb => cb(false));
        break;
      case window.YT.PlayerState.PAUSED:
        this.playing = false;
        this.callbacks.onPause.forEach(cb => cb());
        break;
      case window.YT.PlayerState.BUFFERING:
        this.callbacks.onBuffering.forEach(cb => cb(true));
        break;
      case window.YT.PlayerState.ENDED:
        this.playing = false;
        this.callbacks.onEnded.forEach(cb => cb());
        break;
    }
  }

  private onPlayerError(event: { data: number }): void {
    const errorMessages: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Video not allowed to be embedded',
      150: 'Video not allowed to be embedded',
    };

    const message = errorMessages[event.data] || 'Unknown YouTube player error';
    this.callbacks.onError.forEach(cb => cb(new Error(message)));
  }

  private startTimeUpdate(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    this.timeUpdateInterval = window.setInterval(() => {
      if (this.player && this.ready) {
        const time = this.player.getCurrentTime();
        this.callbacks.onTimeUpdate.forEach(cb => cb(time));
      }
    }, 250);
  }

  private extractVideoId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  }

  async play(): Promise<void> {
    if (this.player && this.ready) {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.player && this.ready) {
      this.player.pauseVideo();
    }
  }

  seek(time: number): void {
    if (this.player && this.ready) {
      this.player.seekTo(time, true);
      this.callbacks.onSeek.forEach(cb => cb(time));
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.player && this.ready) {
      this.player.setPlaybackRate(rate);
    }
  }

  setVolume(volume: number): void {
    if (this.player && this.ready) {
      this.player.setVolume(Math.max(0, Math.min(100, volume * 100)));
    }
  }

  setMuted(muted: boolean): void {
    if (this.player && this.ready) {
      if (muted) {
        this.player.mute();
      } else {
        this.player.unMute();
      }
    }
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime() || 0;
  }

  getDuration(): number {
    return this.player?.getDuration() || 0;
  }

  getPlaybackRate(): number {
    return this.player?.getPlaybackRate() || 1;
  }

  getVolume(): number {
    return (this.player?.getVolume() || 100) / 100;
  }

  isMuted(): boolean {
    return this.player?.isMuted() || false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setSource(source: string): void {
    this.source = source;
    this.videoId = this.extractVideoId(source);

    if (this.player && this.ready) {
      this.player.cueVideoById(this.videoId);
    }
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
    if (this.ready) {
      callback();
    }
  }

  onBuffering(callback: (isBuffering: boolean) => void): void {
    this.callbacks.onBuffering.push(callback);
  }

  destroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

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

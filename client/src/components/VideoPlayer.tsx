import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { YouTubePlayer } from '../players/YouTubePlayer';
import { HTML5Player } from '../players/HTML5Player';
import type { IPlayer } from '../players/IPlayer';
import type { PlaybackState } from '../types';

interface VideoPlayerProps {
  playbackState: PlaybackState | null;
  isHost: boolean;
  onPlayerReady: (player: IPlayer) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onError: (error: string) => void;
}

export interface VideoPlayerRef {
  player: IPlayer | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  playbackState,
  isHost,
  onPlayerReady,
  onTimeUpdate,
  onDurationChange,
  onError,
}, ref) => {
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<IPlayer | null>(null);

  useImperativeHandle(ref, () => ({
    get player() {
      return playerRef.current;
    }
  }));

  useEffect(() => {
    if (!playbackState?.mediaUrl || !playbackState?.mediaType) {
      return;
    }

    // Clean up previous player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    if (playbackState.mediaType === 'youtube' && youtubeContainerRef.current) {
      const containerId = 'youtube-player-' + Date.now();
      youtubeContainerRef.current.id = containerId;

      const player = new YouTubePlayer(containerId);
      playerRef.current = player;

      player.onReady(() => {
        player.setSource(playbackState.mediaUrl!);
        onPlayerReady(player);
        onDurationChange(player.getDuration());
      });

      player.onTimeUpdate((time) => {
        onTimeUpdate(time);
      });

      player.onError((err) => {
        onError(err.message);
      });
    } else if (playbackState.mediaType === 'direct' && videoRef.current) {
      const player = new HTML5Player(videoRef.current);
      playerRef.current = player;

      player.setSource(playbackState.mediaUrl);

      player.onReady(() => {
        onPlayerReady(player);
        onDurationChange(player.getDuration());
      });

      player.onTimeUpdate((time) => {
        onTimeUpdate(time);
      });

      player.onError((err) => {
        onError(err.message);
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [playbackState?.mediaUrl, playbackState?.mediaType, isHost, onPlayerReady, onTimeUpdate, onDurationChange, onError]);

  if (!playbackState?.mediaUrl) {
    return null;
  }

  return (
    <div className="flex-1 relative bg-black">
      {playbackState.mediaType === 'direct' && (
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={false}
          playsInline
        />
      )}
      {playbackState.mediaType === 'youtube' && (
        <div
          ref={youtubeContainerRef}
          className="w-full h-full"
        />
      )}
      {playbackState.mediaType === 'vk' && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-white/60">VK Video support coming soon</p>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;

interface PlayerControlsProps {
  isPlaying: boolean;
  isHost: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onChangeVideo: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayerControls({
  isPlaying,
  isHost,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onChangeVideo,
}: PlayerControlsProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const position = (percent / 100) * duration;
    onSeek(position);
  };

  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex flex-col gap-2">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs w-12">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={handleSeekSlider}
            disabled={!isHost}
            className="flex-1 accent-purple-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-white/60 text-xs w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {isHost ? (
            <>
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={onChangeVideo}
                className="glass-light hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Change Video
              </button>
            </>
          ) : (
            <p className="text-white/60 text-sm">
              {isPlaying ? '\u25B6 Playing' : '\u23F8 Paused'}
              <span className="ml-2 text-white/40">(Host controls playback)</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

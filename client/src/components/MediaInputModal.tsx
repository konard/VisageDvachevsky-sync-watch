interface MediaInputModalProps {
  isOpen: boolean;
  mediaUrl: string;
  onMediaUrlChange: (url: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function MediaInputModal({
  isOpen,
  mediaUrl,
  onMediaUrlChange,
  onSubmit,
  onClose,
}: MediaInputModalProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="glass rounded-xl p-6 w-full max-w-md">
        <h3 className="text-white font-semibold mb-4">Add Video</h3>
        <input
          type="text"
          value={mediaUrl}
          onChange={(e) => onMediaUrlChange(e.target.value)}
          placeholder="Paste YouTube or direct video URL"
          className="w-full glass-light rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
          onKeyDown={handleKeyDown}
        />
        <p className="text-white/40 text-xs mb-4">
          Supported: YouTube links, direct video URLs (mp4, webm)
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 glass-light hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

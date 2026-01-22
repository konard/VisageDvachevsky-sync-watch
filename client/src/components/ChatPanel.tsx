import { useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
}

export default function ChatPanel({
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
}: ChatPanelProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="glass rounded-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-semibold">Chat</h3>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <p className="text-white/40 text-sm text-center">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="text-sky-400 font-medium">
                {msg.nickname}:
              </span>
              <span className="text-white/80 ml-2">{msg.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 glass-light rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none text-sm"
          />
          <button
            onClick={onSendMessage}
            className="btn-glass-primary px-4 py-2 rounded-xl transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WSClient } from '../services/WSClient';

const wsClient = new WSClient();

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await wsClient.connect();

      wsClient.on('room_created', (data) => {
        const { roomId } = data as { roomId: string };
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('wsClient', 'connected');
        navigate(`/room/${roomId}`);
      });

      wsClient.on('error', (data) => {
        const { message } = data as { message: string };
        setError(message);
        setIsCreating(false);
      });

      wsClient.send('create_room', { nickname });
    } catch (err) {
      setError('Failed to connect to server');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      await wsClient.connect();

      wsClient.on('room_joined', () => {
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('wsClient', 'connected');
        navigate(`/room/${roomId}`);
      });

      wsClient.on('error', (data) => {
        const { message } = data as { message: string };
        setError(message);
        setIsJoining(false);
      });

      wsClient.send('join_room', { roomId, nickname });
    } catch (err) {
      setError('Failed to connect to server');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          SyncWatch
        </h1>
        <p className="text-white/60 text-center mb-8">
          Watch videos together in real-time
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none"
              maxLength={20}
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining}
              className="w-full btn-glass-primary py-3 px-6 rounded-xl transition-all"
            >
              {isCreating ? 'Creating...' : 'Create New Room'}
            </button>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="text-white/40 text-sm">or</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID to join"
              className="w-full glass-light rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={isCreating || isJoining}
            className="w-full btn-glass-secondary py-3 px-6 rounded-xl transition-all"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        <p className="text-white/40 text-xs text-center mt-8">
          Supports YouTube, VK Video, and direct video URLs
        </p>
      </div>
    </div>
  );
}

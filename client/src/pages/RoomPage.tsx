import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WSClient } from '../services/WSClient';
import { YouTubePlayer } from '../players/YouTubePlayer';
import { HTML5Player } from '../players/HTML5Player';
import { SyncEngine } from '../sync/SyncEngine';
import { TimeSync } from '../sync/TimeSync';
import type { IPlayer } from '../players/IPlayer';
import type { Participant, PlaybackState, ChatMessage } from '../types';

const wsClient = new WSClient();

interface RoomData {
  roomId: string;
  createdAt: number;
  hostId: string;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<IPlayer | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const timeSyncRef = useRef<TimeSync | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isHost = currentParticipant?.isHost ?? false;

  // Initialize TimeSync
  useEffect(() => {
    timeSyncRef.current = new TimeSync(wsClient);
    timeSyncRef.current.start();

    return () => {
      timeSyncRef.current?.stop();
    };
  }, []);

  // Initialize SyncEngine
  useEffect(() => {
    syncEngineRef.current = new SyncEngine({
      noActionThreshold: 100,
      smoothCorrectionThreshold: 300,
      hardSeekThreshold: 300,
      syncInterval: 500,
    });

    return () => {
      syncEngineRef.current?.destroy();
    };
  }, []);

  // Create player based on media type
  useEffect(() => {
    if (!playbackState?.mediaUrl || !playbackState?.mediaType) {
      return;
    }

    // Clean up previous player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    }

    if (playbackState.mediaType === 'youtube' && youtubeContainerRef.current) {
      // Create a unique container ID
      const containerId = 'youtube-player-' + Date.now();
      youtubeContainerRef.current.id = containerId;

      const player = new YouTubePlayer(containerId);
      playerRef.current = player;

      player.onReady(() => {
        player.setSource(playbackState.mediaUrl!);
        setPlayerReady(true);
        setDuration(player.getDuration());

        if (syncEngineRef.current) {
          syncEngineRef.current.setPlayer(player);
          syncEngineRef.current.setIsHost(isHost);
          syncEngineRef.current.start();
        }
      });

      player.onTimeUpdate((time) => {
        setCurrentTime(time);
        if (duration === 0) {
          setDuration(player.getDuration());
        }
      });

      player.onError((err) => {
        setError(err.message);
      });

    } else if (playbackState.mediaType === 'direct' && videoRef.current) {
      const player = new HTML5Player(videoRef.current);
      playerRef.current = player;

      player.setSource(playbackState.mediaUrl);

      player.onReady(() => {
        setPlayerReady(true);
        setDuration(player.getDuration());

        if (syncEngineRef.current) {
          syncEngineRef.current.setPlayer(player);
          syncEngineRef.current.setIsHost(isHost);
          syncEngineRef.current.start();
        }
      });

      player.onTimeUpdate((time) => {
        setCurrentTime(time);
        if (duration === 0) {
          setDuration(player.getDuration());
        }
      });

      player.onError((err) => {
        setError(err.message);
      });
    }

    return () => {
      if (playerRef.current) {
        syncEngineRef.current?.stop();
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [playbackState?.mediaUrl, playbackState?.mediaType, isHost, duration]);

  // Update sync engine when playback state changes
  useEffect(() => {
    if (playbackState && syncEngineRef.current && timeSyncRef.current) {
      syncEngineRef.current.setClockOffset(timeSyncRef.current.getOffset());
      syncEngineRef.current.updateServerState({
        isPlaying: playbackState.isPlaying,
        offset: playbackState.offset,
        serverTimestamp: playbackState.serverTimestamp,
        rate: playbackState.rate,
      });

      // Handle play/pause state for non-host participants
      if (!isHost && playerRef.current && playerReady) {
        if (playbackState.isPlaying) {
          playerRef.current.play();
        } else {
          playerRef.current.pause();
        }
      }
    }
  }, [playbackState, isHost, playerReady]);

  // Update sync engine host status
  useEffect(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.setIsHost(isHost);
    }
  }, [isHost]);

  const setupEventHandlers = useCallback(() => {
    wsClient.on('room_state', (data) => {
      const { participants: participantsData, playbackState: pbState } = data as {
        room: RoomData;
        participants: Participant[];
        playbackState: PlaybackState;
      };
      setParticipants(participantsData);
      setPlaybackState(pbState);

      const nickname = sessionStorage.getItem('nickname');
      const current = participantsData.find((p: Participant) => p.nickname === nickname);
      if (current) {
        setCurrentParticipant(current);
      }
    });

    wsClient.on('participant_joined', (data) => {
      const { participant } = data as { participant: Participant };
      setParticipants((prev) => [...prev, participant]);
    });

    wsClient.on('participant_left', (data) => {
      const { odId } = data as { odId: string };
      setParticipants((prev) => prev.filter((p) => p.odId !== odId));
    });

    wsClient.on('host_changed', (data) => {
      const { newHostId } = data as { newHostId: string };
      setParticipants((prev) =>
        prev.map((p) => ({ ...p, isHost: p.odId === newHostId }))
      );
      if (currentParticipant && currentParticipant.odId === newHostId) {
        setCurrentParticipant({ ...currentParticipant, isHost: true });
      }
    });

    wsClient.on('media_set', (data) => {
      const { mediaUrl: url, mediaType } = data as { mediaUrl: string; mediaType: string };
      setPlaybackState((prev) => prev ? {
        ...prev,
        mediaUrl: url,
        mediaType: mediaType as 'youtube' | 'vk' | 'direct',
        offset: 0,
        serverTimestamp: Date.now(),
        isPlaying: false,
        rate: 1,
      } : {
        mediaUrl: url,
        mediaType: mediaType as 'youtube' | 'vk' | 'direct',
        offset: 0,
        serverTimestamp: Date.now(),
        isPlaying: false,
        rate: 1,
      });
      setShowMediaInput(false);
    });

    wsClient.on('playback_state', (data) => {
      const state = data as PlaybackState;
      setPlaybackState(state);
    });

    wsClient.on('chat_message', (data) => {
      const message = data as ChatMessage;
      setChatMessages((prev) => [...prev, message]);
    });

    wsClient.on('error', (data) => {
      const { message } = data as { message: string };
      setError(message);
    });
  }, [currentParticipant]);

  useEffect(() => {
    const nickname = sessionStorage.getItem('nickname');

    if (!nickname) {
      navigate('/');
      return;
    }

    const connect = async () => {
      try {
        await wsClient.connect();
        setIsConnected(true);
        setupEventHandlers();
        wsClient.send('join_room', { roomId, nickname });
      } catch (err) {
        setError('Failed to connect to server');
      }
    };

    connect();

    return () => {
      wsClient.disconnect();
    };
  }, [roomId, navigate, setupEventHandlers]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSetMedia = () => {
    if (!mediaUrl.trim()) return;
    wsClient.send('set_media', { roomId, mediaUrl });
    setMediaUrl('');
  };

  const handlePlay = () => {
    if (isHost && playerRef.current) {
      playerRef.current.play();
    }
    wsClient.send('play', { roomId });
  };

  const handlePause = () => {
    if (isHost && playerRef.current) {
      playerRef.current.pause();
    }
    wsClient.send('pause', { roomId });
  };

  const handleSeek = (position: number) => {
    if (isHost && playerRef.current) {
      playerRef.current.seek(position);
    }
    wsClient.send('seek', { roomId, position });
  };

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = Number(e.target.value);
    const position = (percent / 100) * duration;
    handleSeek(position);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    wsClient.send('chat_message', { roomId, text: newMessage });
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8">
          <p className="text-white">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-4 gap-4">
      {/* Main content - Video player */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-white/60 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-white font-semibold">SyncWatch</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Room:</span>
            <code className="text-white bg-white/10 px-2 py-1 rounded text-sm">
              {roomId}
            </code>
            <button
              onClick={copyRoomId}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Copy
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-300 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Video Player Area */}
        <div className="glass rounded-xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
          {playbackState?.mediaUrl ? (
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
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-white/60 mb-4">No video loaded</p>
                {isHost && (
                  <button
                    onClick={() => setShowMediaInput(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Add Video
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Playback controls */}
          {playbackState?.mediaUrl && (
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
                        onClick={playbackState.isPlaying ? handlePause : handlePlay}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {playbackState.isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <button
                        onClick={() => setShowMediaInput(true)}
                        className="glass-light hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Change Video
                      </button>
                    </>
                  ) : (
                    <p className="text-white/60 text-sm">
                      {playbackState.isPlaying ? '▶ Playing' : '⏸ Paused'}
                      <span className="ml-2 text-white/40">(Host controls playback)</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Media URL input modal */}
        {showMediaInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="glass rounded-xl p-6 w-full max-w-md">
              <h3 className="text-white font-semibold mb-4">Add Video</h3>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Paste YouTube or direct video URL"
                className="w-full glass-light rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleSetMedia()}
              />
              <p className="text-white/40 text-xs mb-4">
                Supported: YouTube links, direct video URLs (mp4, webm)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMediaInput(false)}
                  className="flex-1 glass-light hover:bg-white/20 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetMedia}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Chat and participants */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Participants */}
        <div className="glass rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">
            Participants ({participants.length})
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {participants.map((participant) => (
              <div
                key={participant.odId}
                className="flex items-center gap-2 text-white/80"
              >
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">
                  {participant.nickname}
                  {participant.isHost && (
                    <span className="text-purple-400 ml-1">(Host)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="glass rounded-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">Chat</h3>
          </div>

          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {chatMessages.length === 0 ? (
              <p className="text-white/40 text-sm text-center">No messages yet</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <span className="text-purple-400 font-medium">
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
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 glass-light rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

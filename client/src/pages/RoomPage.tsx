import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WSClient } from '../services/WSClient';
import { SyncEngine } from '../sync/SyncEngine';
import { TimeSync } from '../sync/TimeSync';
import type { IPlayer } from '../players/IPlayer';
import type { Participant, PlaybackState, ChatMessage } from '../types';
import {
  VideoPlayer,
  PlayerControls,
  ChatPanel,
  ParticipantsList,
  MediaInputModal,
  VoiceChat,
  type VideoPlayerRef,
} from '../components';

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

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const timeSyncRef = useRef<TimeSync | null>(null);

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

  // Handle player ready
  const handlePlayerReady = useCallback((player: IPlayer) => {
    setPlayerReady(true);
    if (syncEngineRef.current) {
      syncEngineRef.current.setPlayer(player);
      syncEngineRef.current.setIsHost(isHost);
      syncEngineRef.current.start();
    }
  }, [isHost]);

  // Handle time update
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle duration change
  const handleDurationChange = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  // Handle player error
  const handlePlayerError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

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
      if (!isHost && videoPlayerRef.current?.player && playerReady) {
        if (playbackState.isPlaying) {
          videoPlayerRef.current.player.play();
        } else {
          videoPlayerRef.current.player.pause();
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
      } catch {
        setError('Failed to connect to server');
      }
    };

    connect();

    return () => {
      wsClient.disconnect();
    };
  }, [roomId, navigate, setupEventHandlers]);

  const handleSetMedia = () => {
    if (!mediaUrl.trim()) return;
    wsClient.send('set_media', { roomId, mediaUrl });
    setMediaUrl('');
  };

  const handlePlay = () => {
    if (isHost && videoPlayerRef.current?.player) {
      videoPlayerRef.current.player.play();
    }
    wsClient.send('play', { roomId });
  };

  const handlePause = () => {
    if (isHost && videoPlayerRef.current?.player) {
      videoPlayerRef.current.player.pause();
    }
    wsClient.send('pause', { roomId });
  };

  const handleSeek = (position: number) => {
    if (isHost && videoPlayerRef.current?.player) {
      videoPlayerRef.current.player.seek(position);
    }
    wsClient.send('seek', { roomId, position });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    wsClient.send('chat_message', { roomId, text: newMessage });
    setNewMessage('');
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
    }
  };

  const handleVoiceStateChange = (enabled: boolean, muted: boolean) => {
    // Update current participant's voice state
    if (currentParticipant) {
      setCurrentParticipant({
        ...currentParticipant,
        voice: { enabled, muted },
      });
      // Also update in participants list
      setParticipants((prev) =>
        prev.map((p) =>
          p.odId === currentParticipant.odId
            ? { ...p, voice: { enabled, muted } }
            : p
        )
      );
      // Notify server of voice state change
      wsClient.send('update_nickname', {
        nickname: currentParticipant.nickname,
        voiceEnabled: enabled,
        voiceMuted: muted,
      });
    }
  };

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
              &larr; Back
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
            <>
              <VideoPlayer
                ref={videoPlayerRef}
                playbackState={playbackState}
                isHost={isHost}
                onPlayerReady={handlePlayerReady}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onError={handlePlayerError}
              />
              <PlayerControls
                isPlaying={playbackState.isPlaying}
                isHost={isHost}
                currentTime={currentTime}
                duration={duration}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onChangeVideo={() => setShowMediaInput(true)}
              />
            </>
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
        </div>

        {/* Media URL input modal */}
        <MediaInputModal
          isOpen={showMediaInput}
          mediaUrl={mediaUrl}
          onMediaUrlChange={setMediaUrl}
          onSubmit={handleSetMedia}
          onClose={() => setShowMediaInput(false)}
        />
      </div>

      {/* Sidebar - Chat and participants */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <ParticipantsList participants={participants} />
        <VoiceChat
          wsClient={wsClient}
          participants={participants}
          currentParticipantId={currentParticipant?.odId || ''}
          onVoiceStateChange={handleVoiceStateChange}
        />
        <ChatPanel
          messages={chatMessages}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

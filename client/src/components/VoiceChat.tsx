import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCManager } from '../services/WebRTCManager';
import { WSClient } from '../services/WSClient';
import type { Participant } from '../types';

interface VoiceChatProps {
  wsClient: WSClient;
  participants: Participant[];
  currentParticipantId: string;
  onVoiceStateChange?: (enabled: boolean, muted: boolean) => void;
}

interface AudioLevel {
  peerId: string;
  level: number;
}

export function VoiceChat({
  wsClient,
  participants,
  currentParticipantId,
  onVoiceStateChange,
}: VoiceChatProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<AudioLevel[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());

  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Initialize WebRTC manager
  useEffect(() => {
    webrtcManagerRef.current = new WebRTCManager(wsClient);
    webrtcManagerRef.current.setClientId(currentParticipantId);

    // Setup event handlers
    webrtcManagerRef.current.on('onPeerConnected', (peerId, stream) => {
      console.log(`Voice peer connected: ${peerId}`);
      setConnectedPeers((prev) => new Set([...prev, peerId]));
      playPeerAudio(peerId, stream);
    });

    webrtcManagerRef.current.on('onPeerDisconnected', (peerId) => {
      console.log(`Voice peer disconnected: ${peerId}`);
      setConnectedPeers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(peerId);
        return newSet;
      });
      stopPeerAudio(peerId);
    });

    webrtcManagerRef.current.on('onError', (err) => {
      console.error('WebRTC error:', err);
      setError(err.message);
    });

    webrtcManagerRef.current.on('onLocalStreamReady', () => {
      // Connect to all existing participants with voice enabled
      participants
        .filter((p) => p.id !== currentParticipantId && p.voice.enabled)
        .forEach((p) => {
          webrtcManagerRef.current?.connectToPeer(p.odId);
        });
    });

    return () => {
      webrtcManagerRef.current?.destroy();
      stopAllAudio();
    };
  }, [wsClient, currentParticipantId]);

  // Connect to new participants when they enable voice
  useEffect(() => {
    if (!isEnabled || !webrtcManagerRef.current) return;

    participants
      .filter((p) => p.id !== currentParticipantId && p.voice.enabled)
      .forEach((p) => {
        if (!connectedPeers.has(p.odId)) {
          webrtcManagerRef.current?.connectToPeer(p.odId);
        }
      });
  }, [participants, isEnabled, currentParticipantId, connectedPeers]);

  const playPeerAudio = useCallback((peerId: string, stream: MediaStream) => {
    // Create audio element for peer
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    (audioElement as HTMLMediaElement & { playsInline: boolean }).playsInline = true;
    audioElementsRef.current.set(peerId, audioElement);

    // Create audio analyser for visual feedback
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analysersRef.current.set(peerId, analyser);

    // Start audio level monitoring if not already running
    if (!animationFrameRef.current) {
      startAudioLevelMonitoring();
    }
  }, []);

  const stopPeerAudio = useCallback((peerId: string) => {
    const audioElement = audioElementsRef.current.get(peerId);
    if (audioElement) {
      audioElement.srcObject = null;
      audioElement.remove();
      audioElementsRef.current.delete(peerId);
    }

    analysersRef.current.delete(peerId);

    // Stop monitoring if no more peers
    if (analysersRef.current.size === 0 && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    audioElementsRef.current.forEach((_, peerId) => {
      stopPeerAudio(peerId);
    });

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopPeerAudio]);

  const startAudioLevelMonitoring = useCallback(() => {
    const updateLevels = () => {
      const levels: AudioLevel[] = [];

      analysersRef.current.forEach((analyser, peerId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = average / 255;

        levels.push({ peerId, level: normalizedLevel });
      });

      setAudioLevels(levels);
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    animationFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const handleEnableVoice = async () => {
    if (!webrtcManagerRef.current) return;

    setIsConnecting(true);
    setError(null);

    try {
      await webrtcManagerRef.current.enableVoice();
      setIsEnabled(true);
      setIsMuted(true);
      onVoiceStateChange?.(true, true);
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisableVoice = () => {
    if (!webrtcManagerRef.current) return;

    webrtcManagerRef.current.disableVoice();
    setIsEnabled(false);
    setIsMuted(true);
    setConnectedPeers(new Set());
    stopAllAudio();
    onVoiceStateChange?.(false, true);
  };

  const handleToggleMute = () => {
    if (!webrtcManagerRef.current) return;

    const newMuted = webrtcManagerRef.current.toggleMute();
    setIsMuted(newMuted);
    onVoiceStateChange?.(true, newMuted);
  };

  const getAudioLevel = (odId: string): number => {
    return audioLevels.find((l) => l.peerId === odId)?.level ?? 0;
  };

  const participantsWithVoice = participants.filter((p) => p.voice.enabled);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">Voice Chat</h3>
        <div className="flex gap-2">
          {isEnabled ? (
            <>
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-lg transition-colors ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOffIcon className="w-5 h-5" />
                ) : (
                  <MicIcon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleDisableVoice}
                className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                title="Leave voice chat"
              >
                <PhoneOffIcon className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={handleEnableVoice}
              disabled={isConnecting}
              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              title="Join voice chat"
            >
              {isConnecting ? (
                <LoadingIcon className="w-5 h-5 animate-spin" />
              ) : (
                <HeadphonesIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {isEnabled && (
        <div className="space-y-2">
          {participantsWithVoice.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-2">
              No one else is in voice chat
            </p>
          ) : (
            participantsWithVoice
              .filter((p) => p.id !== currentParticipantId)
              .map((participant) => {
                const audioLevel = getAudioLevel(participant.odId);
                const isConnected = connectedPeers.has(participant.odId);

                return (
                  <div
                    key={participant.odId}
                    className="flex items-center gap-3 py-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium relative ${
                        isConnected ? 'bg-purple-500/30' : 'bg-white/10'
                      }`}
                      style={{
                        boxShadow:
                          audioLevel > 0.1
                            ? `0 0 ${audioLevel * 20}px ${audioLevel * 10}px rgba(168, 85, 247, ${audioLevel})`
                            : 'none',
                      }}
                    >
                      <span className="text-white">
                        {participant.nickname.charAt(0).toUpperCase()}
                      </span>
                      {participant.voice.muted && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <MicOffIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {participant.nickname}
                      </p>
                      <p className="text-white/40 text-xs">
                        {isConnected ? 'Connected' : 'Connecting...'}
                      </p>
                    </div>
                    {audioLevel > 0.1 && (
                      <div className="flex gap-0.5 h-4">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all ${
                              audioLevel > (i + 1) * 0.15
                                ? 'bg-purple-400'
                                : 'bg-white/20'
                            }`}
                            style={{
                              height: `${Math.min(100, (i + 1) * 20)}%`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {!isEnabled && (
        <p className="text-white/40 text-sm text-center">
          Click the headphones to join voice chat
        </p>
      )}
    </div>
  );
}

// Icon components
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth="4" opacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default VoiceChat;

export interface RoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  media: MediaInfo | null;
  playback: PlaybackState;
  participants: Map<string, Participant>;
  settings: RoomSettings;
}

export interface MediaInfo {
  type: 'youtube' | 'vk' | 'direct';
  source: string;
  duration: number;
  title?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  offset: number;
  serverTimestamp: number;
  rate: number;
}

export interface RoomSettings {
  isPrivate: boolean;
  passwordHash?: string; // Hashed password using bcrypt
  maxParticipants: number;
}

export interface Participant {
  id: string;
  odId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
  voice: {
    enabled: boolean;
    muted: boolean;
  };
}

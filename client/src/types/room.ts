export interface Room {
  roomId: string;
  createdAt: number;
  hostId: string;
}

export interface RoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  media: MediaInfo | null;
  playback: PlaybackState;
  settings: RoomSettings;
}

export interface MediaInfo {
  type: 'youtube' | 'vk' | 'file' | 'url';
  source: string;
  duration: number;
  title?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  offset: number;
  serverTimestamp: number;
  rate: number;
  mediaUrl?: string;
  mediaType?: 'youtube' | 'vk' | 'direct';
}

export interface RoomSettings {
  isPrivate: boolean;
  password?: string;
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

export interface ChatMessage {
  id: string;
  senderId: string;
  nickname: string;
  text: string;
  type: 'user' | 'system';
  timestamp: number;
}

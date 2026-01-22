import { RoomState, Participant, MediaInfo } from './room';

export type WSMessageType =
  | 'create_room'
  | 'room_created'
  | 'join_room'
  | 'room_joined'
  | 'room_state'
  | 'play'
  | 'pause'
  | 'seek'
  | 'set_rate'
  | 'playback_state'
  | 'set_media'
  | 'media_set'
  | 'chat_message'
  | 'update_nickname'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_updated'
  | 'webrtc_signal'
  | 'transfer_host'
  | 'host_changed'
  | 'ping'
  | 'pong'
  | 'error';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp?: number;
}

// Client -> Server payloads
export interface CreateRoomPayload {
  nickname: string;
}

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
  password?: string;
}

export interface PlayPayload {
  roomId: string;
}

export interface PausePayload {
  roomId: string;
}

export interface SeekPayload {
  roomId: string;
  position: number;
}

export interface SetRatePayload {
  roomId: string;
  rate: number;
}

export interface SetMediaPayload {
  roomId: string;
  mediaUrl: string;
}

export interface ChatMessagePayload {
  roomId: string;
  text: string;
}

export interface UpdateNicknamePayload {
  nickname: string;
}

export interface TransferHostPayload {
  targetId: string;
}

export interface WebRTCSignalPayload {
  targetId: string;
  signal: unknown;
}

export interface PingPayload {
  clientTime: number;
}

// Server -> Client payloads
export interface RoomCreatedPayload {
  roomId: string;
}

export interface RoomJoinedPayload {
  clientId: string;
  roomState: Omit<RoomState, 'participants'>;
  participants: Participant[];
}

export interface RoomStatePayload {
  room: {
    roomId: string;
    createdAt: number;
    hostId: string;
  };
  participants: Participant[];
  playbackState: PlaybackStatePayload;
}

export interface PlaybackStatePayload {
  isPlaying: boolean;
  offset: number;
  serverTimestamp: number;
  rate: number;
  mediaUrl?: string;
  mediaType?: 'youtube' | 'vk' | 'direct';
}

export interface ChatMessageBroadcast {
  id: string;
  senderId: string;
  nickname: string;
  text: string;
  type: 'user' | 'system';
  timestamp: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ParticipantJoinedPayload {
  participant: Participant;
}

export interface ParticipantLeftPayload {
  odId: string;
}

export interface HostChangedPayload {
  newHostId: string;
}

export interface MediaSetPayload {
  mediaUrl: string;
  mediaType: 'youtube' | 'vk' | 'direct';
}

export interface PongPayload {
  clientTime: number;
  serverTime: number;
}

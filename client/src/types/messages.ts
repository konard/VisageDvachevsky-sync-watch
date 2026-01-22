import type { RoomState, Participant, ChatMessage } from './room';

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

export interface PlaybackCommandPayload {
  roomId: string;
  command: 'play' | 'pause' | 'seek' | 'setRate';
  value?: number;
}

export interface SetMediaPayload {
  roomId: string;
  mediaUrl: string;
}

export interface ChatMessagePayload {
  roomId: string;
  text: string;
}

// Server -> Client payloads
export interface RoomCreatedPayload {
  roomId: string;
}

export interface RoomJoinedPayload {
  clientId: string;
  roomState: RoomState;
  participants: Participant[];
}

export interface PlaybackUpdatePayload {
  isPlaying: boolean;
  offset: number;
  rate: number;
  serverTimestamp: number;
}

export interface ChatMessageBroadcast extends ChatMessage {}

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

import Peer from 'simple-peer';
import type { Instance as PeerInstance, SignalData } from 'simple-peer';
import { WSClient } from './WSClient';

export interface PeerConnection {
  peerId: string;
  peer: PeerInstance;
  stream?: MediaStream;
}

export interface WebRTCEvents {
  onPeerConnected: (peerId: string, stream: MediaStream) => void;
  onPeerDisconnected: (peerId: string) => void;
  onError: (error: Error) => void;
  onLocalStreamReady: (stream: MediaStream) => void;
}

export class WebRTCManager {
  private wsClient: WSClient;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private clientId: string = '';
  private events: Partial<WebRTCEvents> = {};
  private isMuted: boolean = true;
  private isEnabled: boolean = false;

  constructor(wsClient: WSClient) {
    this.wsClient = wsClient;
    this.setupSignaling();
  }

  setClientId(clientId: string): void {
    this.clientId = clientId;
  }

  on<K extends keyof WebRTCEvents>(event: K, handler: WebRTCEvents[K]): void {
    this.events[event] = handler;
  }

  off<K extends keyof WebRTCEvents>(event: K): void {
    delete this.events[event];
  }

  private setupSignaling(): void {
    this.wsClient.on('webrtc_signal', (data) => {
      const { senderId, signal } = data as { senderId: string; signal: SignalData };
      this.handleSignal(senderId, signal);
    });
  }

  private handleSignal(senderId: string, signal: SignalData): void {
    let peerConnection = this.peers.get(senderId);

    if (!peerConnection) {
      // Create a new peer for incoming connection (we're not the initiator)
      peerConnection = this.createPeer(senderId, false);
    }

    try {
      peerConnection.peer.signal(signal);
    } catch (error) {
      console.error(`Error signaling peer ${senderId}:`, error);
    }
  }

  async enableVoice(): Promise<void> {
    if (this.isEnabled) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Start muted by default
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      this.isEnabled = true;
      this.isMuted = true;

      this.events.onLocalStreamReady?.(this.localStream);
    } catch (error) {
      console.error('Failed to get user media:', error);
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  disableVoice(): void {
    if (!this.isEnabled) return;

    // Stop all tracks
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;

    // Close all peer connections
    this.peers.forEach((peerConnection) => {
      peerConnection.peer.destroy();
    });
    this.peers.clear();

    this.isEnabled = false;
    this.isMuted = true;
  }

  toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    return this.isMuted;
  }

  setMuted(muted: boolean): void {
    if (!this.localStream) return;

    this.isMuted = muted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  isEnabledState(): boolean {
    return this.isEnabled;
  }

  connectToPeer(peerId: string): void {
    if (this.peers.has(peerId) || peerId === this.clientId) return;
    if (!this.localStream) {
      console.warn('Cannot connect to peer: local stream not available');
      return;
    }

    // Only the peer with a "greater" ID initiates to avoid duplicate connections
    const shouldInitiate = this.clientId > peerId;
    this.createPeer(peerId, shouldInitiate);
  }

  disconnectFromPeer(peerId: string): void {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection) {
      peerConnection.peer.destroy();
      this.peers.delete(peerId);
      this.events.onPeerDisconnected?.(peerId);
    }
  }

  private createPeer(peerId: string, initiator: boolean): PeerConnection {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream: this.localStream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    const peerConnection: PeerConnection = {
      peerId,
      peer,
    };

    peer.on('signal', (signal) => {
      // Send signal through WebSocket
      this.wsClient.send('webrtc_signal', {
        targetId: peerId,
        signal,
      });
    });

    peer.on('stream', (stream) => {
      peerConnection.stream = stream;
      this.events.onPeerConnected?.(peerId, stream);
    });

    peer.on('connect', () => {
      console.log(`Peer connected: ${peerId}`);
    });

    peer.on('close', () => {
      console.log(`Peer disconnected: ${peerId}`);
      this.peers.delete(peerId);
      this.events.onPeerDisconnected?.(peerId);
    });

    peer.on('error', (error) => {
      console.error(`Peer error (${peerId}):`, error);
      this.peers.delete(peerId);
      this.events.onError?.(error);
    });

    this.peers.set(peerId, peerConnection);
    return peerConnection;
  }

  getPeerStream(peerId: string): MediaStream | undefined {
    return this.peers.get(peerId)?.stream;
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  destroy(): void {
    this.disableVoice();
    this.wsClient.off('webrtc_signal', this.handleSignal as any);
  }
}

// Test WebSocket server functionality
// Run with: node --experimental-websocket experiments/test-ws-server.js

const WS_URL = 'ws://localhost:3001';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TestClient {
  constructor(name) {
    this.name = name;
    this.ws = null;
    this.messages = [];
    this.roomId = null;
    this.clientId = null;
    this.messageResolvers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log(`[${this.name}] Connected`);
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(`[${this.name}] Received:`, message.type, JSON.stringify(message.payload).substring(0, 100));
        this.messages.push(message);

        if (message.type === 'room_created') {
          this.roomId = message.payload.roomId;
        }
        if (message.type === 'room_state') {
          const participant = message.payload.participants.find(p => p.nickname === this.name);
          if (participant) {
            this.clientId = participant.odId;
          }
        }

        // Notify any waiting resolvers
        this.messageResolvers.forEach(resolver => resolver(message));
      };

      this.ws.onerror = (error) => {
        console.log(`[${this.name}] Error:`, error.message || error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log(`[${this.name}] Disconnected`);
      };
    });
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = { type, payload };
      console.log(`[${this.name}] Sending:`, type);
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getLastMessageOfType(type) {
    return [...this.messages].reverse().find(m => m.type === type);
  }

  clearMessages() {
    this.messages = [];
  }

  waitForMessage(type, timeout = 2000) {
    return new Promise((resolve, reject) => {
      // Check if already received
      const existing = this.getLastMessageOfType(type);
      if (existing) {
        resolve(existing);
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${type} message`));
      }, timeout);

      const resolver = (message) => {
        if (message.type === type) {
          clearTimeout(timer);
          this.messageResolvers = this.messageResolvers.filter(r => r !== resolver);
          resolve(message);
        }
      };

      this.messageResolvers.push(resolver);
    });
  }
}

async function testChatFunctionality() {
  console.log('\n=== Testing Chat Functionality ===\n');

  const client1 = new TestClient('Host');
  const client2 = new TestClient('Guest');

  try {
    // Client 1 connects and creates room
    await client1.connect();
    client1.send('create_room', { nickname: 'Host' });
    await delay(500);

    const roomId = client1.roomId;
    console.log(`Room created: ${roomId}`);

    if (!roomId) {
      throw new Error('Room was not created');
    }

    // Client 2 connects and joins room
    await client2.connect();
    client2.send('join_room', { roomId, nickname: 'Guest' });
    await delay(500);

    // Check if client2 got room_joined
    const joinedMessage = client2.getLastMessageOfType('room_joined');
    if (!joinedMessage) {
      throw new Error('Client 2 did not receive room_joined message');
    }
    console.log('Client 2 joined room successfully');

    // Client 1 sends a chat message
    client1.clearMessages();
    client2.clearMessages();
    client1.send('chat_message', { roomId, text: 'Hello from Host!' });
    await delay(500);

    // Check if client2 received the chat message
    const chatMessage = client2.getLastMessageOfType('chat_message');
    if (!chatMessage) {
      throw new Error('Client 2 did not receive chat message');
    }
    console.log('Chat message received:', chatMessage.payload.text);

    // Client 2 sends a chat message
    client1.clearMessages();
    client2.clearMessages();
    client2.send('chat_message', { roomId, text: 'Hello from Guest!' });
    await delay(500);

    // Check if client1 received the chat message
    const chatMessage2 = client1.getLastMessageOfType('chat_message');
    if (!chatMessage2) {
      throw new Error('Client 1 did not receive chat message from Guest');
    }
    console.log('Chat message from Guest received:', chatMessage2.payload.text);

    console.log('\n=== Chat Functionality: PASSED ===\n');
    return true;
  } catch (error) {
    console.error('\n=== Chat Functionality: FAILED ===');
    console.error('Error:', error.message);
    return false;
  } finally {
    client1.close();
    client2.close();
  }
}

async function testWebRTCSignaling() {
  console.log('\n=== Testing WebRTC Signaling ===\n');

  const client1 = new TestClient('Peer1');
  const client2 = new TestClient('Peer2');

  try {
    // Client 1 creates room
    await client1.connect();
    client1.send('create_room', { nickname: 'Peer1' });
    await delay(500);

    const roomId = client1.roomId;
    console.log(`Room created: ${roomId}`);

    // Client 2 joins room
    await client2.connect();
    client2.send('join_room', { roomId, nickname: 'Peer2' });
    await delay(500);

    // Get client IDs from room state
    const state1 = client1.getLastMessageOfType('room_state');
    const state2 = client2.getLastMessageOfType('room_state');

    if (!state1 || !state2) {
      throw new Error('Did not receive room state');
    }

    const client1Id = client1.clientId;
    const client2Id = client2.clientId;

    console.log(`Client 1 ID: ${client1Id}`);
    console.log(`Client 2 ID: ${client2Id}`);

    // Client 1 sends WebRTC signal to Client 2
    client2.clearMessages();
    const testSignal = {
      type: 'offer',
      sdp: 'test-sdp-data'
    };

    client1.send('webrtc_signal', {
      targetId: client2Id,
      signal: testSignal
    });
    await delay(500);

    // Check if client2 received the WebRTC signal
    const webrtcMessage = client2.getLastMessageOfType('webrtc_signal');
    if (!webrtcMessage) {
      throw new Error('Client 2 did not receive webrtc_signal');
    }

    console.log('WebRTC signal received:', {
      senderId: webrtcMessage.payload.senderId,
      signalType: webrtcMessage.payload.signal.type
    });

    if (webrtcMessage.payload.senderId !== client1Id) {
      throw new Error('Sender ID mismatch');
    }

    console.log('\n=== WebRTC Signaling: PASSED ===\n');
    return true;
  } catch (error) {
    console.error('\n=== WebRTC Signaling: FAILED ===');
    console.error('Error:', error.message);
    return false;
  } finally {
    client1.close();
    client2.close();
  }
}

async function testPlaybackSync() {
  console.log('\n=== Testing Playback Sync ===\n');

  const host = new TestClient('Host');
  const viewer = new TestClient('Viewer');

  try {
    // Host creates room
    await host.connect();
    host.send('create_room', { nickname: 'Host' });
    await delay(500);

    const roomId = host.roomId;
    console.log(`Room created: ${roomId}`);

    // Viewer joins
    await viewer.connect();
    viewer.send('join_room', { roomId, nickname: 'Viewer' });
    await delay(500);

    // Host sets media
    viewer.clearMessages();
    host.send('set_media', { roomId, mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    await delay(500);

    const mediaSetMessage = viewer.getLastMessageOfType('media_set');
    if (!mediaSetMessage) {
      throw new Error('Viewer did not receive media_set message');
    }
    console.log('Media set:', mediaSetMessage.payload.mediaUrl);

    // Host plays
    viewer.clearMessages();
    host.send('play', { roomId });
    await delay(500);

    const playbackMessage = viewer.getLastMessageOfType('playback_state');
    if (!playbackMessage) {
      throw new Error('Viewer did not receive playback_state message');
    }
    console.log('Playback state:', { isPlaying: playbackMessage.payload.isPlaying });

    if (!playbackMessage.payload.isPlaying) {
      throw new Error('Expected isPlaying to be true');
    }

    // Host pauses
    viewer.clearMessages();
    host.send('pause', { roomId });
    await delay(500);

    const pauseMessage = viewer.getLastMessageOfType('playback_state');
    if (!pauseMessage) {
      throw new Error('Viewer did not receive pause message');
    }
    console.log('Playback state after pause:', { isPlaying: pauseMessage.payload.isPlaying });

    if (pauseMessage.payload.isPlaying) {
      throw new Error('Expected isPlaying to be false');
    }

    console.log('\n=== Playback Sync: PASSED ===\n');
    return true;
  } catch (error) {
    console.error('\n=== Playback Sync: FAILED ===');
    console.error('Error:', error.message);
    return false;
  } finally {
    host.close();
    viewer.close();
  }
}

async function main() {
  console.log('Testing SyncWatch WebSocket Server\n');

  const results = {
    chat: await testChatFunctionality(),
    webrtc: await testWebRTCSignaling(),
    playback: await testPlaybackSync()
  };

  console.log('\n========== TEST RESULTS ==========');
  console.log('Chat Functionality:', results.chat ? 'PASSED' : 'FAILED');
  console.log('WebRTC Signaling:', results.webrtc ? 'PASSED' : 'FAILED');
  console.log('Playback Sync:', results.playback ? 'PASSED' : 'FAILED');
  console.log('===================================\n');

  const allPassed = Object.values(results).every(r => r);
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

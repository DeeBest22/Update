// Enhanced WebRTC utilities for production deployment
import { getWebRTCConfig, createConnectionWithRetry } from './webrtc-config.js';
import { ConnectionDiagnostics } from './connection-diagnostics.js';

export class EnhancedWebRTC {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map();
    this.localStream = null;
    this.diagnostics = new ConnectionDiagnostics();
    this.connectionRetries = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    // Run diagnostics
    await this.diagnostics.checkNetworkConnectivity();
    
    const recommendations = this.diagnostics.getRecommendations();
    if (recommendations.length > 0) {
      console.warn('WebRTC Setup Issues:', recommendations);
    }

    // Get user media with enhanced constraints
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }

  async createPeerConnection(targetSocketId, iceServers) {
    try {
      const pc = await createConnectionWithRetry(iceServers, this.maxRetries);
      
      // Add local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }

      // Enhanced event handlers
      pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          this.socket.emit('ice-candidate', {
            target: targetSocketId,
            candidate: event.candidate
          });
        }
      });

      pc.addEventListener('track', (event) => {
        console.log('Received remote track:', event.track.kind);
        this.handleRemoteTrack(targetSocketId, event);
      });

      pc.addEventListener('iceconnectionstatechange', () => {
        this.handleConnectionStateChange(targetSocketId, pc);
      });

      pc.addEventListener('connectionstatechange', () => {
        console.log(`Connection state with ${targetSocketId}:`, pc.connectionState);
      });

      this.peerConnections.set(targetSocketId, pc);
      return pc;
    } catch (error) {
      console.error(`Failed to create peer connection with ${targetSocketId}:`, error);
      throw error;
    }
  }

  async handleOffer(data) {
    const { offer, sender } = data;
    
    try {
      let pc = this.peerConnections.get(sender);
      if (!pc) {
        pc = await this.createPeerConnection(sender, getWebRTCConfig().iceServers);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        target: sender,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      this.handleConnectionError(sender, error);
    }
  }

  async handleAnswer(data) {
    const { answer, sender } = data;
    
    try {
      const pc = this.peerConnections.get(sender);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      this.handleConnectionError(sender, error);
    }
  }

  async handleICECandidate(data) {
    const { candidate, sender } = data;
    
    try {
      const pc = this.peerConnections.get(sender);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async createOffer(targetSocketId) {
    try {
      let pc = this.peerConnections.get(targetSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(targetSocketId, getWebRTCConfig().iceServers);
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        target: targetSocketId,
        offer: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      this.handleConnectionError(targetSocketId, error);
    }
  }

  handleConnectionStateChange(targetSocketId, pc) {
    const state = pc.iceConnectionState;
    console.log(`ICE connection state with ${targetSocketId}:`, state);

    switch (state) {
      case 'connected':
      case 'completed':
        console.log(`✅ Successfully connected to ${targetSocketId}`);
        this.connectionRetries.delete(targetSocketId);
        break;
        
      case 'disconnected':
        console.log(`⚠️ Disconnected from ${targetSocketId}, attempting reconnection...`);
        this.attemptReconnection(targetSocketId);
        break;
        
      case 'failed':
        console.log(`❌ Connection failed with ${targetSocketId}`);
        this.handleConnectionError(targetSocketId, new Error('ICE connection failed'));
        break;
        
      case 'closed':
        console.log(`🔒 Connection closed with ${targetSocketId}`);
        this.peerConnections.delete(targetSocketId);
        break;
    }
  }

  async attemptReconnection(targetSocketId) {
    const retryCount = this.connectionRetries.get(targetSocketId) || 0;
    
    if (retryCount >= this.maxRetries) {
      console.error(`Max reconnection attempts reached for ${targetSocketId}`);
      return;
    }

    this.connectionRetries.set(targetSocketId, retryCount + 1);
    
    setTimeout(async () => {
      try {
        console.log(`Attempting reconnection ${retryCount + 1}/${this.maxRetries} with ${targetSocketId}`);
        
        // Close existing connection
        const existingPc = this.peerConnections.get(targetSocketId);
        if (existingPc) {
          existingPc.close();
          this.peerConnections.delete(targetSocketId);
        }
        
        // Create new connection
        await this.createOffer(targetSocketId);
      } catch (error) {
        console.error(`Reconnection attempt failed:`, error);
      }
    }, this.retryDelay * (retryCount + 1));
  }

  handleConnectionError(targetSocketId, error) {
    console.error(`Connection error with ${targetSocketId}:`, error);
    
    // Emit connection failed event
    this.socket.emit('connection-failed', {
      targetSocketId,
      error: error.message
    });
    
    // Attempt reconnection
    this.attemptReconnection(targetSocketId);
  }

  handleRemoteTrack(targetSocketId, event) {
    const [remoteStream] = event.streams;
    
    // Find or create video element for this participant
    let videoElement = document.getElementById(`video-${targetSocketId}`);
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.id = `video-${targetSocketId}`;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = false; // Don't mute remote videos
      document.getElementById('participants-container')?.appendChild(videoElement);
    }
    
    videoElement.srcObject = remoteStream;
  }

  closePeerConnection(targetSocketId) {
    const pc = this.peerConnections.get(targetSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetSocketId);
    }
    
    // Remove video element
    const videoElement = document.getElementById(`video-${targetSocketId}`);
    if (videoElement) {
      videoElement.remove();
    }
    
    this.connectionRetries.delete(targetSocketId);
  }

  cleanup() {
    // Close all peer connections
    this.peerConnections.forEach((pc, targetSocketId) => {
      this.closePeerConnection(targetSocketId);
    });
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}
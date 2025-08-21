// Enhanced Screen Share with Computer Audio Integration
// This script integrates with existing screen sharing to add computer audio

class ScreenShareWithAudio {
  constructor(socket, meetingId) {
    this.socket = socket;
    this.meetingId = meetingId;
    this.screenAudioShare = new ScreenAudioShare();
    this.isScreenSharing = false;
    this.currentScreenStream = null;
    this.peerConnections = new Map();
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for computer audio toggle from UI
    document.addEventListener('toggle-computer-audio', (event) => {
      this.toggleComputerAudio(event.detail.enabled);
    });

    // Listen for screen share events
    this.socket.on('screen-share-started', (data) => {
      if (data.participantId !== this.socket.id) {
        this.handleRemoteScreenShare(data);
      }
    });

    this.socket.on('computer-audio-toggled', (data) => {
      this.handleComputerAudioToggle(data);
    });

    this.socket.on('computer-audio-level-update', (data) => {
      this.handleComputerAudioLevel(data);
    });
  }

  // Start screen sharing with computer audio
  async startScreenShareWithAudio() {
    try {
      // Get screen with computer audio
      const result = await this.screenAudioShare.getScreenWithAudio();
      
      this.currentScreenStream = result.screenStream;
      this.isScreenSharing = true;

      // Notify server about screen share with audio info
      this.socket.emit('start-screen-share', {
        streamId: this.currentScreenStream.id,
        hasComputerAudio: result.hasAudio
      });

      // Add screen share to peer connections
      this.addScreenShareToPeers(result.screenStream, result.audioStream);

      // Set up computer audio level monitoring if available
      if (result.hasAudio) {
        this.startAudioLevelMonitoring();
      }

      // Handle screen share end
      this.currentScreenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      console.log('Screen share with computer audio started');
      return true;

    } catch (error) {
      console.error('Error starting screen share with audio:', error);
      
      // Fallback to regular screen share without audio
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        this.currentScreenStream = screenStream;
        this.isScreenSharing = true;
        
        this.socket.emit('start-screen-share', {
          streamId: screenStream.id,
          hasComputerAudio: false
        });
        
        this.addScreenShareToPeers(screenStream, null);
        
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          this.stopScreenShare();
        });
        
        console.log('Screen share started without computer audio');
        return true;
        
      } catch (fallbackError) {
        console.error('Error starting screen share:', fallbackError);
        return false;
      }
    }
  }

  // Stop screen sharing
  stopScreenShare() {
    if (this.currentScreenStream) {
      this.currentScreenStream.getTracks().forEach(track => track.stop());
      this.currentScreenStream = null;
    }

    this.screenAudioShare.stopAudioSharing();
    this.isScreenSharing = false;

    // Remove screen share from peer connections
    this.removeScreenShareFromPeers();

    // Notify server
    this.socket.emit('stop-screen-share');

    console.log('Screen share stopped');
  }

  // Toggle computer audio during screen share
  async toggleComputerAudio(enabled) {
    if (!this.isScreenSharing) {
      console.warn('Cannot toggle computer audio - not screen sharing');
      return;
    }

    try {
      if (enabled) {
        // Try to add computer audio to existing screen share
        const result = await this.screenAudioShare.getScreenWithAudio();
        
        if (result.hasAudio) {
          // Add audio tracks to existing peer connections
          this.addAudioToPeers(result.audioStream);
          this.startAudioLevelMonitoring();
        }
      } else {
        // Remove computer audio
        this.removeAudioFromPeers();
        this.screenAudioShare.stopAudioSharing();
      }

      // Notify server about the toggle
      this.socket.emit('toggle-computer-audio', { enabled });

    } catch (error) {
      console.error('Error toggling computer audio:', error);
    }
  }

  // Add screen share to peer connections
  addScreenShareToPeers(screenStream, audioStream) {
    this.peerConnections.forEach((pc, peerId) => {
      // Add video track
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        const videoSender = pc.addTrack(videoTrack, screenStream);
        console.log(`Added screen video track to peer ${peerId}`);
      }

      // Add audio track if available
      if (audioStream) {
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          const audioSender = pc.addTrack(audioTrack, audioStream);
          console.log(`Added computer audio track to peer ${peerId}`);
        }
      }
    });
  }

  // Add audio to existing peer connections
  addAudioToPeers(audioStream) {
    if (!audioStream) return;

    this.peerConnections.forEach((pc, peerId) => {
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        const audioSender = pc.addTrack(audioTrack, audioStream);
        console.log(`Added computer audio track to peer ${peerId}`);
      }
    });
  }

  // Remove screen share from peer connections
  removeScreenShareFromPeers() {
    this.peerConnections.forEach((pc, peerId) => {
      const senders = pc.getSenders();
      senders.forEach(sender => {
        if (sender.track && sender.track.kind === 'video' && 
            sender.track.label.includes('screen')) {
          pc.removeTrack(sender);
          console.log(`Removed screen track from peer ${peerId}`);
        }
        if (sender.track && sender.track.kind === 'audio' && 
            sender.track.label.includes('system')) {
          pc.removeTrack(sender);
          console.log(`Removed computer audio track from peer ${peerId}`);
        }
      });
    });
  }

  // Remove audio from peer connections
  removeAudioFromPeers() {
    this.peerConnections.forEach((pc, peerId) => {
      const senders = pc.getSenders();
      senders.forEach(sender => {
        if (sender.track && sender.track.kind === 'audio' && 
            sender.track.label.includes('system')) {
          pc.removeTrack(sender);
          console.log(`Removed computer audio track from peer ${peerId}`);
        }
      });
    });
  }

  // Start monitoring computer audio levels
  startAudioLevelMonitoring() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
    }

    this.audioLevelInterval = setInterval(() => {
      const level = this.screenAudioShare.getAudioLevel();
      if (level > 0) {
        this.socket.emit('computer-audio-level', { level });
      }
    }, 100); // Check every 100ms
  }

  // Handle remote screen share
  handleRemoteScreenShare(data) {
    console.log(`Remote screen share started by ${data.participantName}`);
    
    if (data.hasComputerAudio) {
      console.log('Remote screen share includes computer audio');
      // Show indicator that computer audio is being shared
      this.showComputerAudioIndicator(data.participantId, true);
    }
  }

  // Handle computer audio toggle from remote participant
  handleComputerAudioToggle(data) {
    console.log(`${data.participantName} ${data.enabled ? 'enabled' : 'disabled'} computer audio`);
    this.showComputerAudioIndicator(data.participantId, data.enabled);
  }

  // Handle computer audio level updates
  handleComputerAudioLevel(data) {
    // Update audio level indicator for the participant
    this.updateAudioLevelIndicator(data.participantId, data.level);
  }

  // Show/hide computer audio indicator
  showComputerAudioIndicator(participantId, enabled) {
    const participantElement = document.querySelector(`[data-participant-id="${participantId}"]`);
    if (participantElement) {
      const indicator = participantElement.querySelector('.computer-audio-indicator') || 
                       this.createComputerAudioIndicator();
      
      if (enabled) {
        indicator.style.display = 'block';
        indicator.title = 'Sharing computer audio';
      } else {
        indicator.style.display = 'none';
      }
      
      if (!participantElement.contains(indicator)) {
        participantElement.appendChild(indicator);
      }
    }
  }

  // Create computer audio indicator element
  createComputerAudioIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'computer-audio-indicator';
    indicator.innerHTML = '🔊';
    indicator.style.cssText = `
      position: absolute;
      top: 5px;
      right: 25px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10;
    `;
    return indicator;
  }

  // Update audio level indicator
  updateAudioLevelIndicator(participantId, level) {
    const indicator = document.querySelector(`[data-participant-id="${participantId}"] .computer-audio-indicator`);
    if (indicator) {
      const opacity = 0.5 + (level * 0.5); // Vary opacity based on audio level
      indicator.style.opacity = opacity;
    }
  }

  // Add peer connection for WebRTC
  addPeerConnection(peerId, peerConnection) {
    this.peerConnections.set(peerId, peerConnection);
  }

  // Remove peer connection
  removePeerConnection(peerId) {
    this.peerConnections.delete(peerId);
  }

  // Cleanup
  destroy() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
    }
    
    this.stopScreenShare();
    this.peerConnections.clear();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenShareWithAudio;
} else {
  window.ScreenShareWithAudio = ScreenShareWithAudio;
}
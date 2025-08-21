// Screen Audio Share Handler
// Handles computer audio sharing during screen sharing

class ScreenAudioShare {
  constructor() {
    this.audioStream = null;
    this.isAudioSharing = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  // Get computer audio stream with screen share
  async getScreenWithAudio() {
    try {
      // Request screen share with audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false // This is key for computer audio
        }
      });

      // Check if audio track is available
      const audioTracks = screenStream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log('Computer audio is available for sharing');
        this.audioStream = new MediaStream(audioTracks);
        this.isAudioSharing = true;
        
        // Set up audio processing
        this.setupAudioProcessing();
        
        return {
          screenStream,
          audioStream: this.audioStream,
          hasAudio: true
        };
      } else {
        console.log('No computer audio available');
        return {
          screenStream,
          audioStream: null,
          hasAudio: false
        };
      }
    } catch (error) {
      console.error('Error getting screen with audio:', error);
      throw error;
    }
  }

  // Set up audio processing for computer audio
  setupAudioProcessing() {
    if (!this.audioStream) return;

    try {
      // Create audio context for processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create source from audio stream
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0; // Full volume for computer audio
      
      // Connect nodes
      source.connect(gainNode);
      
      // Create destination for output
      const destination = this.audioContext.createMediaStreamDestination();
      gainNode.connect(destination);
      
      // Update audio stream with processed audio
      this.audioStream = destination.stream;
      
      console.log('Audio processing setup complete');
    } catch (error) {
      console.error('Error setting up audio processing:', error);
    }
  }

  // Get combined stream (screen + computer audio)
  getCombinedStream(screenStream) {
    if (!this.audioStream || !this.isAudioSharing) {
      return screenStream;
    }

    // Create combined stream with video from screen and audio from computer
    const combinedStream = new MediaStream();
    
    // Add video tracks from screen
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    // Add audio tracks from computer audio
    this.audioStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track);
    });
    
    return combinedStream;
  }

  // Stop computer audio sharing
  stopAudioSharing() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
      });
      this.audioStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.isAudioSharing = false;
    this.audioChunks = [];
    
    console.log('Computer audio sharing stopped');
  }

  // Check if computer audio is supported
  static isSupported() {
    return navigator.mediaDevices && 
           navigator.mediaDevices.getDisplayMedia && 
           window.MediaStream;
  }

  // Get audio level for visualization
  getAudioLevel() {
    if (!this.audioContext || !this.audioStream) return 0;

    try {
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      
      return sum / dataArray.length / 255; // Normalize to 0-1
    } catch (error) {
      console.error('Error getting audio level:', error);
      return 0;
    }
  }

  // Enable/disable computer audio during screen share
  toggleComputerAudio(enable) {
    if (enable && !this.isAudioSharing) {
      // Try to get computer audio if not already sharing
      this.getScreenWithAudio().catch(console.error);
    } else if (!enable && this.isAudioSharing) {
      // Stop computer audio sharing
      this.stopAudioSharing();
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenAudioShare;
} else {
  window.ScreenAudioShare = ScreenAudioShare;
}
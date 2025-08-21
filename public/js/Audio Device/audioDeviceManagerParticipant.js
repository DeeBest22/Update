class AudioDeviceManager {
  constructor() {
    this.audioDevices = [];
    this.selectedDeviceId = null;
    this.currentStream = null;
    this.microphoneSelect = null;
    this.testStream = null;
    this.testAudioContext = null;
    this.testInterval = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedAudioBlob = null;
    this.testTimeout = null;
    this.maxTestDuration = 5000; // 5 seconds
    
    this.init();
  }

  async init() {
    // Find the microphone dropdown in the settings
    this.microphoneSelect = document.querySelector('#audio .setting-item select.dropdown');
    
    if (!this.microphoneSelect) {
      console.error('Microphone dropdown not found');
      return;
    }

    // Request permission to access media devices
    await this.requestPermissions();
    
    // Load available devices
    await this.loadAudioDevices();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Monitor device changes
    this.monitorDeviceChanges();

    // Load saved device preference
    this.loadSavedDevice();
  }

  async requestPermissions() {
    try {
      // Request microphone permission to enumerate devices
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('Could not get microphone permission:', error);
    }
  }

  async loadAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      this.populateDeviceDropdown();
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  }

  populateDeviceDropdown() {
    if (!this.microphoneSelect) return;

    // Clear existing options
    this.microphoneSelect.innerHTML = '';

    if (this.audioDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No microphones found';
      option.disabled = true;
      this.microphoneSelect.appendChild(option);
      return;
    }

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'Default Microphone';
    this.microphoneSelect.appendChild(defaultOption);

    // Add each available device
    this.audioDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      
      // Use device label if available, otherwise create a generic name
      if (device.label) {
        option.textContent = device.label;
      } else {
        option.textContent = `Microphone ${index + 1}`;
      }
      
      this.microphoneSelect.appendChild(option);
    });

    // Set the currently selected device
    if (this.selectedDeviceId) {
      this.microphoneSelect.value = this.selectedDeviceId;
    }
  }

  setupEventListeners() {
    if (!this.microphoneSelect) return;

    this.microphoneSelect.addEventListener('change', async (event) => {
      const selectedDeviceId = event.target.value;
      await this.selectDevice(selectedDeviceId);
    });

    // Set up microphone test button
    this.setupMicrophoneTest();
  }

  setupMicrophoneTest() {
    const testButton = document.querySelector('.test-btn-mic');
    
    if (testButton) {
      testButton.addEventListener('click', () => {
        const buttonText = testButton.textContent.trim();
        
        if (buttonText === 'Stop Test') {
          this.stopMicrophoneTest();
        } else if (buttonText === 'Play Recording') {
          this.playRecording();
        } else {
          this.testMicrophone();
        }
      });
    }
  }

  async selectDevice(deviceId) {
    try {
      this.selectedDeviceId = deviceId === 'default' ? null : deviceId;
      
      // Update the WebRTC manager with the new device
      if (window.hostMeetingInstance && window.hostMeetingInstance.webrtc) {
        await this.updateWebRTCDevice(deviceId);
      }
      
      // Store the selection in localStorage for persistence
      localStorage.setItem('selectedMicrophoneId', deviceId);
      
      console.log('Selected microphone device:', deviceId);
      
      // Show success message
      this.showDeviceChangeNotification();
      
    } catch (error) {
      console.error('Error selecting microphone device:', error);
      this.showErrorNotification('Failed to switch microphone device');
    }
  }

  async updateWebRTCDevice(deviceId) {
    const webrtc = window.hostMeetingInstance.webrtc;
    
    // Stop current stream
    if (webrtc.localStream) {
      webrtc.localStream.getAudioTracks().forEach(track => track.stop());
    }

    // Create constraints for the new device
    const constraints = {
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    // Get new stream with selected device
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Update the local stream
    webrtc.localStream = newStream;
    
    // Update all peer connections with the new audio track
    const audioTrack = newStream.getAudioTracks()[0];
    
    for (const [socketId, peerConnection] of webrtc.peerConnections) {
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'audio'
      );
      
      if (sender) {
        await sender.replaceTrack(audioTrack);
      }
    }

    // Update local video element
    const localVideo = document.querySelector(`[data-socket-id="${webrtc.socket.id}"] .video-frame`);
    if (localVideo) {
      localVideo.srcObject = newStream;
    }

    // Restart audio level monitoring with new stream
    if (webrtc.startAudioLevelMonitoring) {
      webrtc.startAudioLevelMonitoring();
    }
  }

  monitorDeviceChanges() {
    // Listen for device changes (when devices are plugged/unplugged)
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      console.log('Audio devices changed, reloading...');
      await this.loadAudioDevices();
    });
  }

  showDeviceChangeNotification() {
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('Microphone device changed successfully', 'success');
    } else {
      console.log('Microphone device changed successfully');
    }
  }

  showErrorNotification(message) {
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast(message, 'error');
    } else {
      console.error(message);
    }
  }

  // Method to get the currently selected device
  getSelectedDevice() {
    return this.selectedDeviceId;
  }

  // Method to test the selected microphone
  async testMicrophone() {
    try {
      const testButton = document.querySelector('.test-btn-mic');
      const audioMeter = document.querySelector('.audio-meter-mic .meter-bar-mic');
      
      if (!audioMeter) {
        console.error('Audio meter not found');
        this.showErrorNotification('Audio meter not found');
        return;
      }

      // Update button text
      if (testButton) {
        testButton.textContent = 'Stop Test';
        testButton.classList.add('testing');
      }
      
      // Clear previous recording
      this.recordedChunks = [];
      this.recordedAudioBlob = null;

      const constraints = {
        audio: {
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up MediaRecorder for recording
      this.mediaRecorder = new MediaRecorder(this.testStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.recordedAudioBlob = new Blob(this.recordedChunks, {
          type: 'audio/webm;codecs=opus'
        });

        // Change button to "Play Recording" after recording is complete
        if (testButton) {
          testButton.textContent = 'Play Recording';
          testButton.classList.remove('testing');
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
      
      // Create audio context for testing
      this.testAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = this.testAudioContext.createAnalyser();
      const microphone = this.testAudioContext.createMediaStreamSource(this.testStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      // Start continuous monitoring
      this.testInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1 range
        
        // Update audio meter
        audioMeter.style.width = `${normalizedLevel * 100}%`;
        
        // Add visual feedback based on level
        if (normalizedLevel > 0.7) {
          audioMeter.style.backgroundColor = '#ef4444'; // Red for high levels
        } else if (normalizedLevel > 0.3) {
          audioMeter.style.backgroundColor = '#22c55e'; // Green for good levels
        } else {
          audioMeter.style.backgroundColor = '#64748b'; // Gray for low levels
        }
      }, 50);

      // Auto-stop after 5 seconds
      this.testTimeout = setTimeout(() => {
        this.stopMicrophoneTest();
      }, this.maxTestDuration);

      console.log('Microphone test started');
      
    } catch (error) {
      console.error('Error testing microphone:', error);
      this.showErrorNotification('Failed to test microphone: ' + error.message);
      this.stopMicrophoneTest();
    }
  }

  stopMicrophoneTest() {
    const testButton = document.querySelector('.test-btn-mic');
    const audioMeter = document.querySelector('.audio-meter-mic .meter-bar-mic');
    
    // Clear the auto-stop timeout
    if (this.testTimeout) {
      clearTimeout(this.testTimeout);
      this.testTimeout = null;
    }

    // Stop the test interval
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }

    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Stop the test stream
    if (this.testStream) {
      this.testStream.getTracks().forEach(track => track.stop());
      this.testStream = null;
    }

    // Close audio context
    if (this.testAudioContext) {
      this.testAudioContext.close();
      this.testAudioContext = null;
    }

    // Reset UI
    if (testButton) {
      // Only reset to "Test Microphone" if we don't have a recording
      if (!this.recordedAudioBlob) {
        testButton.textContent = 'Test Microphone';
      } else {
        testButton.textContent = 'Play Recording';
      }
      testButton.classList.remove('testing');
    }

    if (audioMeter) {
      audioMeter.style.width = '0%';
      audioMeter.style.backgroundColor = '#64748b';
    }

    console.log('Microphone test stopped');
  }

  async playRecording() {
    if (!this.recordedAudioBlob) {
      this.showErrorNotification('No recording available to play');
      return;
    }

    try {
      const testButton = document.querySelector('.test-btn-mic');
      
      // Create audio element and play the recording
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(this.recordedAudioBlob);
      audio.src = audioUrl;
      
      // Update button state
      if (testButton) {
        testButton.textContent = 'Play Recording...';
        testButton.disabled = true;
      }
      
      // Play the audio
      await audio.play();
      
      // Reset button when playback ends
      audio.onended = () => {
        if (testButton) {
          testButton.textContent = 'Test Microphone';
          testButton.disabled = false;
        }
        // Clear the recording so user can test again
        this.recordedAudioBlob = null;
        this.recordedChunks = [];
        URL.revokeObjectURL(audioUrl);
      };
      
      // Handle playback errors
      audio.onerror = () => {
        if (testButton) {
          testButton.textContent = 'Test Microphone';
          testButton.disabled = false;
        }
        // Clear the recording on error
        this.recordedAudioBlob = null;
        this.recordedChunks = [];
        URL.revokeObjectURL(audioUrl);
        this.showErrorNotification('Failed to play recording');
      };
      
      console.log('Playing recorded audio');
      
    } catch (error) {
      console.error('Error playing recording:', error);
      this.showErrorNotification('Failed to play recording: ' + error.message);
      
      const testButton = document.querySelector('.test-btn-mic');
      if (testButton) {
        testButton.textContent = 'Test Microphone';
        testButton.disabled = false;
      }
      // Clear the recording on error
      this.recordedAudioBlob = null;
      this.recordedChunks = [];
    }
  }

  // Load saved device preference
  loadSavedDevice() {
    const savedDeviceId = localStorage.getItem('selectedMicrophoneId');
    if (savedDeviceId && this.microphoneSelect) {
      this.microphoneSelect.value = savedDeviceId;
      this.selectedDeviceId = savedDeviceId === 'default' ? null : savedDeviceId;
    }
  }

  // Clean up method
  destroy() {
    this.stopMicrophoneTest();
    
    // Clear timeout
    if (this.testTimeout) {
      clearTimeout(this.testTimeout);
      this.testTimeout = null;
    }
    
    // Clean up recorded data
    this.recordedChunks = [];
    this.recordedAudioBlob = null;
    
    // Remove event listeners
    if (this.microphoneSelect) {
      this.microphoneSelect.removeEventListener('change', this.selectDevice);
    }


    // Remove device change listener
    navigator.mediaDevices.removeEventListener('devicechange', this.loadAudioDevices);
  }
}

// Initialize the audio device manager when the DOM is ready
function initializeAudioDeviceManager() {
  if (window.audioDeviceManager) {
    window.audioDeviceManager.destroy();
  }
  window.audioDeviceManager = new AudioDeviceManager();
}

// Multiple initialization strategies to ensure it works with different loading scenarios
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAudioDeviceManager);
} else {
  // DOM is already loaded
  setTimeout(initializeAudioDeviceManager, 100);
}

// Also initialize when the settings modal or audio controls are shown
document.addEventListener('click', (event) => {
  if (event.target.matches('[data-modal="settings"]') || 
      event.target.closest('[data-modal="settings"]')) {
    setTimeout(initializeAudioDeviceManager, 500);
  }
});

// Export for use in other modules
window.AudioDeviceManager = AudioDeviceManager;
window.initializeAudioDeviceManager = initializeAudioDeviceManager;
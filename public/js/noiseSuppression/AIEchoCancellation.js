class AIEchoCancellation {
  constructor() {
    this.isEnabled = false;
    this.audioContext = null;
    this.sourceNode = null;
    this.destinationNode = null;
    this.echoCancellerNode = null;
    this.originalStream = null;
    this.processedStream = null;
    this.webrtcManager = null;
    
    // Echo cancellation parameters
    this.bufferSize = 4096;
    this.sampleRate = 44100;
    this.delayBuffers = [];
    this.maxDelayMs = 500; // Maximum echo delay to cancel
    this.adaptiveFilters = [];
    this.learningRate = 0.01;
    this.convergenceThreshold = 0.001;
    
    // Noise gate parameters
    this.noiseGateThreshold = -50; // dB
    this.noiseGateRatio = 10;
    
    // Spectral subtraction parameters
    this.noiseProfile = null;
    this.spectralFloor = 0.1;
    
    console.log('AI Echo Cancellation System initialized');
  }

  async initialize(webrtcManager) {
    try {
      this.webrtcManager = webrtcManager;
      
      // Create audio context with optimal settings
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });
      
      // Initialize delay buffers for different echo delays
      this.initializeDelayBuffers();
      
      // Initialize adaptive filters
      this.initializeAdaptiveFilters();
      
      console.log('AI Echo Cancellation initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Echo Cancellation:', error);
      return false;
    }
  }

  initializeDelayBuffers() {
    const maxSamples = Math.ceil((this.maxDelayMs / 1000) * this.sampleRate);
    const numDelayLines = 8; // Multiple delay lines for different echo paths
    
    this.delayBuffers = [];
    for (let i = 0; i < numDelayLines; i++) {
      this.delayBuffers.push(new Float32Array(maxSamples));
    }
  }

  initializeAdaptiveFilters() {
    const filterLength = 512; // Length of adaptive filter
    const numFilters = this.delayBuffers.length;
    
    this.adaptiveFilters = [];
    for (let i = 0; i < numFilters; i++) {
      this.adaptiveFilters.push({
        coefficients: new Float32Array(filterLength),
        inputBuffer: new Float32Array(filterLength),
        outputBuffer: new Float32Array(filterLength),
        errorBuffer: new Float32Array(filterLength),
        stepSize: this.learningRate
      });
    }
  }

  async enable() {
    if (this.isEnabled || !this.webrtcManager || !this.webrtcManager.localStream) {
      return false;
    }

    try {
      console.log('Enabling AI Echo Cancellation...');
      
      // Store original stream
      this.originalStream = this.webrtcManager.localStream;
      
      // Create source node from original stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.originalStream);
      
      // Create script processor for AI echo cancellation
      this.echoCancellerNode = this.audioContext.createScriptProcessor(
        this.bufferSize, 
        1, // mono input
        1  // mono output
      );
      
      // Set up the AI processing chain
      this.echoCancellerNode.onaudioprocess = (event) => {
        this.processAudio(event);
      };
      
      // Create destination for processed audio
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Connect the audio processing chain
      this.sourceNode.connect(this.echoCancellerNode);
      this.echoCancellerNode.connect(this.destinationNode);
      
      // Create new processed stream
      this.processedStream = this.destinationNode.stream;
      
      // Add original video track to processed stream
      const videoTrack = this.originalStream.getVideoTracks()[0];
      if (videoTrack) {
        this.processedStream.addTrack(videoTrack);
      }
      
      // Replace stream in WebRTC manager
      await this.replaceStreamInPeerConnections();
      
      // Update local video element
      this.updateLocalVideoSource();
      
      this.isEnabled = true;
      console.log('AI Echo Cancellation enabled successfully');
      
      // Start noise profiling for the first few seconds
      this.startNoiseProfiler();
      
      return true;
    } catch (error) {
      console.error('Failed to enable AI Echo Cancellation:', error);
      await this.disable();
      return false;
    }
  }

  async disable() {
    if (!this.isEnabled) {
      return;
    }

    try {
      console.log('Disabling AI Echo Cancellation...');
      
      // Disconnect audio nodes
      if (this.sourceNode) {
        this.sourceNode.disconnect();
      }
      if (this.echoCancellerNode) {
        this.echoCancellerNode.disconnect();
      }
      
      // Restore original stream in peer connections
      if (this.originalStream) {
        await this.restoreOriginalStreamInPeerConnections();
        this.updateLocalVideoSource(this.originalStream);
      }
      
      // Clean up
      this.sourceNode = null;
      this.echoCancellerNode = null;
      this.destinationNode = null;
      this.processedStream = null;
      
      this.isEnabled = false;
      console.log('AI Echo Cancellation disabled successfully');
    } catch (error) {
      console.error('Failed to disable AI Echo Cancellation:', error);
    }
  }

  processAudio(event) {
    const inputBuffer = event.inputBuffer.getChannelData(0);
    const outputBuffer = event.outputBuffer.getChannelData(0);
    
    // Apply multi-stage AI echo cancellation
    this.applyAIEchoCancellation(inputBuffer, outputBuffer);
  }

  applyAIEchoCancellation(input, output) {
    const bufferLength = input.length;
    
    // Stage 1: Adaptive Echo Cancellation
    const echoEstimate = this.adaptiveEchoCancellation(input);
    
    // Stage 2: Spectral Subtraction for residual noise
    const spectrallyProcessed = this.spectralSubtraction(input, echoEstimate);
    
    // Stage 3: Dynamic Noise Gate
    const gatedOutput = this.dynamicNoiseGate(spectrallyProcessed);
    
    // Stage 4: Post-processing enhancement
    const enhancedOutput = this.postProcessingEnhancement(gatedOutput);
    
    // Copy to output buffer
    for (let i = 0; i < bufferLength; i++) {
      output[i] = enhancedOutput[i];
    }
  }

  adaptiveEchoCancellation(input) {
    const bufferLength = input.length;
    const echoEstimate = new Float32Array(bufferLength);
    
    // Process each adaptive filter
    for (let filterIndex = 0; filterIndex < this.adaptiveFilters.length; filterIndex++) {
      const filter = this.adaptiveFilters[filterIndex];
      const delayBuffer = this.delayBuffers[filterIndex];
      const delayInSamples = Math.floor((filterIndex + 1) * 50); // Different delays for each filter
      
      // Update input buffer for this filter
      this.updateFilterInputBuffer(filter, input, delayInSamples);
      
      // Compute filter output (echo estimate)
      const filterOutput = this.computeFilterOutput(filter);
      
      // Add to total echo estimate
      for (let i = 0; i < bufferLength; i++) {
        echoEstimate[i] += filterOutput[i];
      }
      
      // Compute error signal (desired - estimated)
      const errorSignal = new Float32Array(bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        errorSignal[i] = input[i] - echoEstimate[i];
      }
      
      // Update filter coefficients using NLMS algorithm
      this.updateFilterCoefficients(filter, errorSignal);
    }
    
    return echoEstimate;
  }

  updateFilterInputBuffer(filter, input, delay) {
    const bufferLength = input.length;
    const inputBuffer = filter.inputBuffer;
    
    // Shift existing samples
    for (let i = inputBuffer.length - 1; i >= bufferLength; i--) {
      inputBuffer[i] = inputBuffer[i - bufferLength];
    }
    
    // Add new samples with delay
    for (let i = 0; i < bufferLength; i++) {
      const delayedIndex = i - delay;
      inputBuffer[i] = delayedIndex >= 0 ? input[delayedIndex] : 0;
    }
  }

  computeFilterOutput(filter) {
    const outputLength = this.bufferSize;
    const output = new Float32Array(outputLength);
    const coefficients = filter.coefficients;
    const inputBuffer = filter.inputBuffer;
    
    // Convolution of coefficients with input buffer
    for (let i = 0; i < outputLength; i++) {
      let sum = 0;
      for (let j = 0; j < coefficients.length && i + j < inputBuffer.length; j++) {
        sum += coefficients[j] * inputBuffer[i + j];
      }
      output[i] = sum;
    }
    
    return output;
  }

  updateFilterCoefficients(filter, errorSignal) {
    const coefficients = filter.coefficients;
    const inputBuffer = filter.inputBuffer;
    const stepSize = filter.stepSize;
    
    // Compute input power for normalization
    let inputPower = 0;
    for (let i = 0; i < inputBuffer.length; i++) {
      inputPower += inputBuffer[i] * inputBuffer[i];
    }
    inputPower = Math.max(inputPower, 1e-10); // Avoid division by zero
    
    // NLMS coefficient update
    const normalizedStepSize = stepSize / (inputPower + 1e-10);
    
    for (let i = 0; i < coefficients.length; i++) {
      for (let j = 0; j < errorSignal.length; j++) {
        if (i + j < inputBuffer.length) {
          coefficients[i] += normalizedStepSize * errorSignal[j] * inputBuffer[i + j];
        }
      }
    }
    
    // Apply coefficient constraints to prevent instability
    for (let i = 0; i < coefficients.length; i++) {
      coefficients[i] = Math.max(-1, Math.min(1, coefficients[i]));
    }
  }

  spectralSubtraction(input, echoEstimate) {
    const bufferLength = input.length;
    const output = new Float32Array(bufferLength);
    
    // Simple spectral subtraction implementation
    // In a full implementation, this would use FFT
    for (let i = 0; i < bufferLength; i++) {
      const residual = input[i] - echoEstimate[i];
      
      // Apply spectral floor to prevent over-subtraction
      const magnitude = Math.abs(residual);
      const phase = residual >= 0 ? 1 : -1;
      
      if (this.noiseProfile) {
        const noiseLevel = this.estimateNoiseLevel(i);
        const subtractedMagnitude = Math.max(
          magnitude - noiseLevel * 2, 
          magnitude * this.spectralFloor
        );
        output[i] = subtractedMagnitude * phase;
      } else {
        output[i] = residual;
      }
    }
    
    return output;
  }

  dynamicNoiseGate(input) {
    const bufferLength = input.length;
    const output = new Float32Array(bufferLength);
    
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = Math.abs(input[i]);
      const amplitudeDb = 20 * Math.log10(amplitude + 1e-10);
      
      let gateReduction = 1.0;
      
      if (amplitudeDb < this.noiseGateThreshold) {
        // Apply noise gate
        const excessDb = this.noiseGateThreshold - amplitudeDb;
        const reductionDb = excessDb / this.noiseGateRatio;
        gateReduction = Math.pow(10, -reductionDb / 20);
      }
      
      // Smooth gate transitions
      gateReduction = this.smoothGateTransition(gateReduction, i);
      
      output[i] = input[i] * gateReduction;
    }
    
    return output;
  }

  smoothGateTransition(targetReduction, index) {
    // Simple smoothing - in practice, you'd use a more sophisticated approach
    const smoothingFactor = 0.1;
    const currentReduction = this.lastGateReduction || targetReduction;
    const smoothedReduction = currentReduction + smoothingFactor * (targetReduction - currentReduction);
    this.lastGateReduction = smoothedReduction;
    return smoothedReduction;
  }

  postProcessingEnhancement(input) {
    const bufferLength = input.length;
    const output = new Float32Array(bufferLength);
    
    // Apply voice enhancement
    for (let i = 0; i < bufferLength; i++) {
      let sample = input[i];
      
      // High-pass filter to remove low-frequency rumble
      sample = this.highPassFilter(sample, i);
      
      // Dynamic range compression for voice clarity
      sample = this.dynamicRangeCompression(sample);
      
      // Final output limiting
      output[i] = Math.max(-1, Math.min(1, sample));
    }
    
    return output;
  }

  highPassFilter(sample, index) {
    // Simple high-pass filter implementation
    const cutoff = 80; // Hz
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);
    
    if (!this.hpFilterState) {
      this.hpFilterState = { lastInput: 0, lastOutput: 0 };
    }
    
    const output = alpha * (this.hpFilterState.lastOutput + sample - this.hpFilterState.lastInput);
    
    this.hpFilterState.lastInput = sample;
    this.hpFilterState.lastOutput = output;
    
    return output;
  }

  dynamicRangeCompression(sample) {
    const threshold = 0.7;
    const ratio = 4.0;
    const amplitude = Math.abs(sample);
    
    if (amplitude > threshold) {
      const excess = amplitude - threshold;
      const compressedExcess = excess / ratio;
      const compressedAmplitude = threshold + compressedExcess;
      return (sample >= 0 ? 1 : -1) * compressedAmplitude;
    }
    
    return sample;
  }

  startNoiseProfiler() {
    console.log('Starting noise profiling...');
    this.noiseProfileSamples = [];
    this.noiseProfilingActive = true;
    
    // Stop profiling after 3 seconds
    setTimeout(() => {
      this.finishNoiseProfiler();
    }, 3000);
  }

  finishNoiseProfiler() {
    if (this.noiseProfileSamples && this.noiseProfileSamples.length > 0) {
      this.noiseProfile = this.computeNoiseProfile(this.noiseProfileSamples);
      console.log('Noise profiling completed');
    }
    this.noiseProfilingActive = false;
  }

  computeNoiseProfile(samples) {
    // Compute average noise characteristics
    const profile = {
      averageLevel: 0,
      maxLevel: 0,
      spectralCharacteristics: new Float32Array(256)
    };
    
    let sum = 0;
    let max = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const amplitude = Math.abs(samples[i]);
      sum += amplitude;
      max = Math.max(max, amplitude);
    }
    
    profile.averageLevel = sum / samples.length;
    profile.maxLevel = max;
    
    return profile;
  }

  estimateNoiseLevel(index) {
    if (!this.noiseProfile) return 0;
    return this.noiseProfile.averageLevel;
  }

  async replaceStreamInPeerConnections() {
    if (!this.webrtcManager || !this.processedStream) return;
    
    const audioTrack = this.processedStream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    // Replace audio track in all peer connections
    for (const [socketId, peerConnection] of this.webrtcManager.peerConnections) {
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'audio'
      );
      
      if (sender) {
        try {
          await sender.replaceTrack(audioTrack);
          console.log(`Replaced audio track for peer ${socketId} with AI processed audio`);
        } catch (error) {
          console.error(`Failed to replace audio track for peer ${socketId}:`, error);
        }
      }
    }
    
    // Update local stream reference
    this.webrtcManager.localStream = this.processedStream;
  }

  async restoreOriginalStreamInPeerConnections() {
    if (!this.webrtcManager || !this.originalStream) return;
    
    const audioTrack = this.originalStream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    // Restore original audio track in all peer connections
    for (const [socketId, peerConnection] of this.webrtcManager.peerConnections) {
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'audio'
      );
      
      if (sender) {
        try {
          await sender.replaceTrack(audioTrack);
          console.log(`Restored original audio track for peer ${socketId}`);
        } catch (error) {
          console.error(`Failed to restore audio track for peer ${socketId}:`, error);
        }
      }
    }
    
    // Restore local stream reference
    this.webrtcManager.localStream = this.originalStream;
  }

  updateLocalVideoSource(stream) {
    const localVideo = document.querySelector(`[data-socket-id="${this.webrtcManager.socket.id}"] .video-frame`);
    if (localVideo && stream) {
      localVideo.srcObject = stream;
    }
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      isEnabled: this.isEnabled,
      audioContext: this.audioContext ? {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
        currentTime: this.audioContext.currentTime
      } : null,
      adaptiveFilters: this.adaptiveFilters.map(filter => ({
        convergence: this.calculateFilterConvergence(filter),
        energy: this.calculateFilterEnergy(filter)
      }))
    };
  }

  calculateFilterConvergence(filter) {
    let energy = 0;
    for (let i = 0; i < filter.coefficients.length; i++) {
      energy += filter.coefficients[i] * filter.coefficients[i];
    }
    return Math.sqrt(energy);
  }

  calculateFilterEnergy(filter) {
    let energy = 0;
    for (let i = 0; i < filter.errorBuffer.length; i++) {
      energy += filter.errorBuffer[i] * filter.errorBuffer[i];
    }
    return energy / filter.errorBuffer.length;
  }
}

// Integration script for the meeting host application
class EchoCancellationIntegration {
  constructor() {
    this.echoCancellation = new AIEchoCancellation();
    this.isInitialized = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeIntegration();
    });
    
    // Also try to initialize if DOM is already ready
    if (document.readyState === 'loading') {
      // Do nothing, DOMContentLoaded will fire
    } else {
      // DOM is already ready
      setTimeout(() => this.initializeIntegration(), 1000);
    }
  }

  async initializeIntegration() {
    try {
      // Wait for the host meeting instance to be available
      await this.waitForHostMeeting();
      
      // Initialize echo cancellation with WebRTC manager
      const success = await this.echoCancellation.initialize(window.hostMeetingInstance.webrtc);
      
      if (success) {
        this.setupToggleButton();
        this.isInitialized = true;
        console.log('Echo Cancellation Integration initialized successfully');
      } else {
        console.error('Failed to initialize echo cancellation');
      }
    } catch (error) {
      console.error('Error initializing echo cancellation integration:', error);
    }
  }

  async waitForHostMeeting() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.hostMeetingInstance && window.hostMeetingInstance.webrtc) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  setupToggleButton() {
    // Find the echo cancellation toggle button
    const toggleButtons = document.querySelectorAll('.setting-item input[type="checkbox"]');
    let echoCancellationToggle = null;
    
    // Look for the echo cancellation toggle by checking parent text content
    toggleButtons.forEach(toggle => {
      const settingItem = toggle.closest('.setting-item');
      if (settingItem && settingItem.textContent.includes('Enable Echo Cancellation')) {
        echoCancellationToggle = toggle;
      }
    });
    
    if (echoCancellationToggle) {
      echoCancellationToggle.addEventListener('change', async (event) => {
        const isEnabled = event.target.checked;
        await this.toggleEchoCancellation(isEnabled);
      });
      
      console.log('Echo cancellation toggle button found and configured');
    } else {
      console.warn('Echo cancellation toggle button not found');
      // Create a fallback mechanism or notification
      this.createFallbackToggle();
    }
  }

  createFallbackToggle() {
    // Create a temporary toggle button for testing
    const fallbackButton = document.createElement('button');
    fallbackButton.textContent = 'Toggle AI Echo Cancellation';
    fallbackButton.style.position = 'fixed';
    fallbackButton.style.top = '10px';
    fallbackButton.style.right = '10px';
    fallbackButton.style.zIndex = '9999';
    fallbackButton.style.padding = '10px';
    fallbackButton.style.backgroundColor = '#007bff';
    fallbackButton.style.color = 'white';
    fallbackButton.style.border = 'none';
    fallbackButton.style.borderRadius = '5px';
    fallbackButton.style.cursor = 'pointer';
    
    let isEnabled = false;
    fallbackButton.addEventListener('click', async () => {
      isEnabled = !isEnabled;
      await this.toggleEchoCancellation(isEnabled);
      fallbackButton.textContent = `AI Echo Cancellation: ${isEnabled ? 'ON' : 'OFF'}`;
      fallbackButton.style.backgroundColor = isEnabled ? '#28a745' : '#007bff';
    });
    
    document.body.appendChild(fallbackButton);
    console.log('Fallback echo cancellation toggle created');
  }

  async toggleEchoCancellation(enabled) {
    if (!this.isInitialized) {
      console.warn('Echo cancellation not initialized yet');
      return;
    }

    try {
      if (enabled) {
        const success = await this.echoCancellation.enable();
        if (success) {
          this.showNotification('Echo Cancellation enabled', 'success');
          console.log('Echo Cancellation enabled successfully');
        } else {
          this.showNotification('Failed to enable AI Echo Cancellation', 'error');
          // Reset toggle if failed
          this.resetToggle(false);
        }
      } else {
        await this.echoCancellation.disable();
        this.showNotification('Echo Cancellation disabled', 'info');
        console.log('Echo Cancellation disabled');
      }
    } catch (error) {
      console.error('Error toggling echo cancellation:', error);
      this.showNotification('Error toggling AI Echo Cancellation', 'error');
      this.resetToggle(!enabled);
    }
  }

  resetToggle(state) {
    const toggleButtons = document.querySelectorAll('.setting-item input[type="checkbox"]');
    toggleButtons.forEach(toggle => {
      const settingItem = toggle.closest('.setting-item');
      if (settingItem && settingItem.textContent.includes('Enable Echo Cancellation')) {
        toggle.checked = state;
      }
    });
  }

  showNotification(message, type = 'info') {
    // Use existing toast system if available
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast(message, type);
    } else {
      // Fallback notification
      console.log(`${type.toUpperCase()}: ${message}`);
      alert(message);
    }
  }

  // Performance monitoring method
  getStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }
    
    return {
      status: 'initialized',
      enabled: this.echoCancellation.isEnabled,
      performance: this.echoCancellation.getPerformanceMetrics()
    };
  }
}

// Auto-initialize when script loads
const echoCancellationIntegration = new EchoCancellationIntegration();

// Make it globally accessible for debugging
window.echoCancellationSystem = {
  integration: echoCancellationIntegration,
  echoCancellation: echoCancellationIntegration.echoCancellation,
  getStatus: () => echoCancellationIntegration.getStatus()
};
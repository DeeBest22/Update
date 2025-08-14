class AINoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Advanced noise suppression parameters
    this.frameSize = 1024;
    this.hopSize = 512;
    this.sampleRate = 44100;
    this.bufferSize = 4096;
    
    // Spectral analysis buffers
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Noise profile and estimation
    this.noiseProfile = new Float32Array(this.frameSize / 2 + 1);
    this.speechProfile = new Float32Array(this.frameSize / 2 + 1);
    this.noiseFloor = new Float32Array(this.frameSize / 2 + 1);
    this.smoothedSpectrum = new Float32Array(this.frameSize / 2 + 1);
    
    // Advanced filters
    this.spectralGate = new Float32Array(this.frameSize / 2 + 1);
    this.wienerGain = new Float32Array(this.frameSize / 2 + 1);
    this.adaptiveGain = new Float32Array(this.frameSize / 2 + 1);
    
    // Analysis windows and FFT setup
    this.hannWindow = this.createHannWindow(this.frameSize);
    this.fftBuffer = new Float32Array(this.frameSize * 2);
    this.magnitudeSpectrum = new Float32Array(this.frameSize / 2 + 1);
    this.phaseSpectrum = new Float32Array(this.frameSize / 2 + 1);
    
    // Adaptive parameters
    this.noiseUpdateRate = 0.95;
    this.speechUpdateRate = 0.85;
    this.gateThreshold = 0.3;
    this.maxAttenuation = 0.05;
    this.frameCount = 0;
    this.isNoiseSuppressionEnabled = true;
    
    // Voice activity detection
    this.vadThreshold = 0.02;
    this.vadFrames = 0;
    this.speechFrames = 0;
    this.totalEnergy = 0;
    this.previousEnergy = 0;
    
    // Frequency band analysis (for intelligent processing)
    this.frequencyBands = this.createFrequencyBands();
    this.bandEnergies = new Float32Array(this.frequencyBands.length);
    this.bandNoiseFloor = new Float32Array(this.frequencyBands.length);
    
    // Initialize noise floor estimation
    this.noiseProfile.fill(0.001);
    this.noiseFloor.fill(0.001);
    
    // Advanced smoothing filters
    this.energySmoothing = 0.9;
    this.spectralSmoothingFactor = 0.8;
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'toggle') {
        this.isNoiseSuppressionEnabled = event.data.enabled;
      }
    };
  }
  
  createHannWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }
  
  createFrequencyBands() {
    // Define frequency bands for intelligent processing
    // Low: 0-500Hz, Mid-Low: 500-1500Hz, Mid: 1500-4000Hz, High: 4000Hz+
    const bands = [];
    const nyquist = this.sampleRate / 2;
    const binSize = nyquist / (this.frameSize / 2);
    
    const frequencies = [0, 500, 1500, 4000, nyquist];
    for (let i = 0; i < frequencies.length - 1; i++) {
      bands.push({
        startBin: Math.floor(frequencies[i] / binSize),
        endBin: Math.floor(frequencies[i + 1] / binSize),
        weight: i === 1 || i === 2 ? 1.2 : 1.0 // Boost speech frequencies
      });
    }
    return bands;
  }
  
  // Advanced FFT implementation (simplified)
  performFFT(buffer, size) {
    // Copy input to FFT buffer with window
    for (let i = 0; i < size; i++) {
      this.fftBuffer[i * 2] = buffer[i] * this.hannWindow[i];
      this.fftBuffer[i * 2 + 1] = 0;
    }
    
    // Simplified FFT (in practice, you'd use a more efficient implementation)
    this.simpleFFT(this.fftBuffer, size);
    
    // Extract magnitude and phase
    for (let i = 0; i <= size / 2; i++) {
      const real = this.fftBuffer[i * 2];
      const imag = this.fftBuffer[i * 2 + 1];
      this.magnitudeSpectrum[i] = Math.sqrt(real * real + imag * imag);
      this.phaseSpectrum[i] = Math.atan2(imag, real);
    }
  }
  
  simpleFFT(buffer, size) {
    // Bit-reversal
    let j = 0;
    for (let i = 1; i < size; i++) {
      let bit = size >> 1;
      while (j & bit) {
        j ^= bit;
        bit >>= 1;
      }
      j ^= bit;
      
      if (i < j) {
        [buffer[i * 2], buffer[j * 2]] = [buffer[j * 2], buffer[i * 2]];
        [buffer[i * 2 + 1], buffer[j * 2 + 1]] = [buffer[j * 2 + 1], buffer[i * 2 + 1]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= size; len *= 2) {
      const wlen = -2 * Math.PI / len;
      const wreal = Math.cos(wlen);
      const wimag = Math.sin(wlen);
      
      for (let i = 0; i < size; i += len) {
        let wr = 1;
        let wi = 0;
        
        for (let j = 0; j < len / 2; j++) {
          const u_idx = (i + j) * 2;
          const v_idx = (i + j + len / 2) * 2;
          
          const ur = buffer[u_idx];
          const ui = buffer[u_idx + 1];
          const vr = buffer[v_idx] * wr - buffer[v_idx + 1] * wi;
          const vi = buffer[v_idx] * wi + buffer[v_idx + 1] * wr;
          
          buffer[u_idx] = ur + vr;
          buffer[u_idx + 1] = ui + vi;
          buffer[v_idx] = ur - vr;
          buffer[v_idx + 1] = ui - vi;
          
          const tmp_wr = wr * wreal - wi * wimag;
          wi = wr * wimag + wi * wreal;
          wr = tmp_wr;
        }
      }
    }
  }
  
  performIFFT(size) {
    // Reconstruct complex spectrum from magnitude and phase
    for (let i = 0; i <= size / 2; i++) {
      const magnitude = this.magnitudeSpectrum[i];
      const phase = this.phaseSpectrum[i];
      this.fftBuffer[i * 2] = magnitude * Math.cos(phase);
      this.fftBuffer[i * 2 + 1] = magnitude * Math.sin(phase);
    }
    
    // Mirror for negative frequencies
    for (let i = 1; i < size / 2; i++) {
      this.fftBuffer[(size - i) * 2] = this.fftBuffer[i * 2];
      this.fftBuffer[(size - i) * 2 + 1] = -this.fftBuffer[i * 2 + 1];
    }
    
    // Conjugate for IFFT
    for (let i = 0; i < size; i++) {
      this.fftBuffer[i * 2 + 1] = -this.fftBuffer[i * 2 + 1];
    }
    
    this.simpleFFT(this.fftBuffer, size);
    
    // Conjugate and normalize
    const scale = 1.0 / size;
    for (let i = 0; i < size; i++) {
      this.outputBuffer[i] = this.fftBuffer[i * 2] * scale * this.hannWindow[i];
    }
  }
  
  detectVoiceActivity(spectrum) {
    let totalEnergy = 0;
    let speechBandEnergy = 0;
    
    // Calculate energy in speech frequency bands (300Hz - 3400Hz)
    const speechStartBin = Math.floor(300 * this.frameSize / this.sampleRate);
    const speechEndBin = Math.floor(3400 * this.frameSize / this.sampleRate);
    
    for (let i = 0; i < spectrum.length; i++) {
      const energy = spectrum[i] * spectrum[i];
      totalEnergy += energy;
      
      if (i >= speechStartBin && i <= speechEndBin) {
        speechBandEnergy += energy;
      }
    }
    
    // Voice activity detection based on energy and spectral characteristics
    const isVoiceActive = speechBandEnergy > this.vadThreshold && 
                         speechBandEnergy / totalEnergy > 0.3;
    
    // Update counters
    if (isVoiceActive) {
      this.speechFrames++;
    } else {
      this.vadFrames++;
    }
    
    return isVoiceActive;
  }
  
  updateNoiseProfile(spectrum, isVoiceActive) {
    if (!isVoiceActive) {
      // Update noise profile during silence
      for (let i = 0; i < spectrum.length; i++) {
        this.noiseProfile[i] = this.noiseUpdateRate * this.noiseProfile[i] + 
                              (1 - this.noiseUpdateRate) * spectrum[i];
        this.noiseFloor[i] = Math.min(this.noiseFloor[i] * 1.001, spectrum[i]);
      }
    } else {
      // Update speech profile during voice activity
      for (let i = 0; i < spectrum.length; i++) {
        this.speechProfile[i] = this.speechUpdateRate * this.speechProfile[i] + 
                               (1 - this.speechUpdateRate) * spectrum[i];
      }
    }
  }
  
  calculateSpectralGate(spectrum) {
    for (let i = 0; i < spectrum.length; i++) {
      // Advanced spectral gating with adaptive thresholding
      const snr = spectrum[i] / (this.noiseProfile[i] + 1e-10);
      const adaptiveThreshold = this.gateThreshold * (1 + Math.log(i + 1) * 0.1);
      
      if (snr > adaptiveThreshold) {
        // Speech detected - calculate Wiener filter gain
        const noiseVariance = this.noiseProfile[i] * this.noiseProfile[i];
        const speechVariance = Math.max(spectrum[i] * spectrum[i] - noiseVariance, 
                                       noiseVariance * 0.1);
        this.wienerGain[i] = speechVariance / (speechVariance + noiseVariance);
        this.spectralGate[i] = Math.max(this.wienerGain[i], this.maxAttenuation);
      } else {
        // Noise detected - apply strong attenuation
        this.spectralGate[i] = this.maxAttenuation;
      }
      
      // Smooth the gate to avoid artifacts
      this.spectralGate[i] = this.spectralSmoothingFactor * this.spectralGate[i] + 
                            (1 - this.spectralSmoothingFactor) * 
                            (i > 0 ? this.spectralGate[i - 1] : this.spectralGate[i]);
    }
  }
  
  applyFrequencyBandProcessing(spectrum) {
    // Calculate energy in each frequency band
    for (let bandIdx = 0; bandIdx < this.frequencyBands.length; bandIdx++) {
      const band = this.frequencyBands[bandIdx];
      let bandEnergy = 0;
      
      for (let i = band.startBin; i <= band.endBin; i++) {
        bandEnergy += spectrum[i] * spectrum[i];
      }
      
      this.bandEnergies[bandIdx] = bandEnergy;
      
      // Update band noise floor
      if (this.vadFrames > this.speechFrames * 2) {
        this.bandNoiseFloor[bandIdx] = 0.9 * this.bandNoiseFloor[bandIdx] + 
                                      0.1 * bandEnergy;
      }
      
      // Apply band-specific processing
      const bandSNR = bandEnergy / (this.bandNoiseFloor[bandIdx] + 1e-10);
      const bandGain = Math.min(band.weight, Math.max(0.1, bandSNR / 10));
      
      for (let i = band.startBin; i <= band.endBin; i++) {
        this.spectralGate[i] *= bandGain;
      }
    }
  }
  
  applyNoiseSuppression(spectrum) {
    const isVoiceActive = this.detectVoiceActivity(spectrum);
    this.updateNoiseProfile(spectrum, isVoiceActive);
    this.calculateSpectralGate(spectrum);
    this.applyFrequencyBandProcessing(spectrum);
    
    // Apply the spectral gate
    for (let i = 0; i < spectrum.length; i++) {
      this.magnitudeSpectrum[i] = spectrum[i] * this.spectralGate[i];
    }
  }
  
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input[0] || !this.isNoiseSuppressionEnabled) {
      // Bypass processing if disabled or no input
      if (input && input[0] && output && output[0]) {
        output[0].set(input[0]);
      }
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    const blockSize = inputChannel.length;
    
    // Process each sample
    for (let i = 0; i < blockSize; i++) {
      this.inputBuffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex++;
      
      // Process when buffer is full
      if (this.bufferIndex >= this.frameSize) {
        // Perform FFT analysis
        this.performFFT(this.inputBuffer, this.frameSize);
        
        // Apply AI noise suppression
        this.applyNoiseSuppression(this.magnitudeSpectrum);
        
        // Reconstruct signal
        this.performIFFT(this.frameSize);
        
        // Overlap-add output
        for (let j = 0; j < this.frameSize; j++) {
          if (j < blockSize) {
            outputChannel[j] = this.outputBuffer[j];
          }
        }
        
        // Shift buffer for overlap
        for (let j = 0; j < this.hopSize; j++) {
          this.inputBuffer[j] = this.inputBuffer[j + this.hopSize];
        }
        this.bufferIndex = this.hopSize;
        this.frameCount++;
      }
    }
    
    // If no processing occurred, copy input to output
    if (this.bufferIndex < this.frameSize) {
      outputChannel.set(inputChannel);
    }
    
    return true;
  }
}

// Register the processor
registerProcessor('ai-noise-suppression-processor', AINoiseSuppressionProcessor);

// Main Noise Suppression Manager Class
class AINoiseSuppressionManager {
  constructor(webrtcManager) {
    this.webrtcManager = webrtcManager;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.gainNode = null;
    this.destinationStream = null;
    this.isEnabled = true;
    this.isInitialized = false;
    
    // Performance monitoring
    this.processingLatency = 0;
    this.cpuUsage = 0;
    
    this.init();
  }
  
  async init() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });
      
      // Load the audio worklet
      const workletCode = this.getWorkletCode();
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletURL = URL.createObjectURL(blob);
      
      await this.audioContext.audioWorklet.addModule(workletURL);
      
      // Clean up URL
      URL.revokeObjectURL(workletURL);
      
      console.log('AI Noise Suppression initialized successfully');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize AI Noise Suppression:', error);
      this.isInitialized = false;
    }
  }
  
  getWorkletCode() {
    // Return the processor code as a string for dynamic loading
    return `
      ${AINoiseSuppressionProcessor.toString()}
      registerProcessor('ai-noise-suppression-processor', AINoiseSuppressionProcessor);
    `;
  }
  
  async applyToStream(inputStream) {
    if (!this.isInitialized || !inputStream) {
      return inputStream;
    }
    
    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create source from input stream
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
      
      // Create the AI noise suppression processor
      this.processorNode = new AudioWorkletNode(
        this.audioContext, 
        'ai-noise-suppression-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          channelCountMode: 'explicit',
          channelInterpretation: 'speakers'
        }
      );
      
      // Create gain node for additional control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // Connect the audio graph
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.gainNode);
      
      // Create destination stream
      this.destinationStream = this.audioContext.createMediaStreamDestination();
      this.gainNode.connect(this.destinationStream);
      
      // Copy video tracks from original stream
      const processedStream = new MediaStream();
      
      // Add processed audio track
      this.destinationStream.stream.getAudioTracks().forEach(track => {
        processedStream.addTrack(track);
      });
      
      // Add original video tracks
      inputStream.getVideoTracks().forEach(track => {
        processedStream.addTrack(track);
      });
      
      console.log('AI Noise Suppression applied to stream');
      return processedStream;
      
    } catch (error) {
      console.error('Failed to apply noise suppression:', error);
      return inputStream;
    }
  }
  
  toggle(enabled) {
    this.isEnabled = enabled;
    
    if (this.processorNode) {
      this.processorNode.port.postMessage({
        type: 'toggle',
        enabled: enabled
      });
    }
    
    console.log(`AI Noise Suppression ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  setIntensity(level) {
    // Level: 0-100
    const normalizedLevel = Math.max(0, Math.min(100, level)) / 100;
    
    if (this.processorNode) {
      this.processorNode.port.postMessage({
        type: 'setIntensity',
        level: normalizedLevel
      });
    }
  }
  
  getPerformanceMetrics() {
    return {
      latency: this.processingLatency,
      cpuUsage: this.cpuUsage,
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized
    };
  }
  
  dispose() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.destinationStream = null;
    this.isInitialized = false;
  }
}

// Integration with existing meeting system
class NoiseSuppressionIntegration {
  constructor() {
    this.noiseSuppressionManager = null;
    this.originalWebRTCManager = null;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initializeNoiseSuppressionToggle();
    });
    
    // If DOM is already ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeNoiseSuppressionToggle();
      });
    } else {
      this.initializeNoiseSuppressionToggle();
    }
  }
  
  initializeNoiseSuppressionToggle() {
    // Find the noise suppression toggle
    const noiseSuppressionToggle = document.querySelector(
      '.setting-item:has(span:contains("Noise Suppression")) input[type="checkbox"]'
    );
    
    // Alternative selector if the above doesn't work
    if (!noiseSuppressionToggle) {
      const settingItems = document.querySelectorAll('.setting-item');
      let toggle = null;
      
      settingItems.forEach(item => {
        const span = item.querySelector('span');
        if (span && span.textContent.trim() === 'Noise Suppression') {
          toggle = item.querySelector('input[type="checkbox"]');
        }
      });
      
      if (toggle) {
        this.bindToggleEvents(toggle);
      } else {
        // Create a MutationObserver to wait for the element
        this.observeForToggle();
      }
    } else {
      this.bindToggleEvents(noiseSuppressionToggle);
    }
  }
  
  observeForToggle() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const toggle = node.querySelector ?
                node.querySelector('.setting-item span:contains("Noise Suppression")') : null;
              
              if (toggle) {
                const checkbox = toggle.closest('.setting-item')?.querySelector('input[type="checkbox"]');
                if (checkbox) {
                  this.bindToggleEvents(checkbox);
                  observer.disconnect();
                }
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stop observing after 10 seconds
    setTimeout(() => observer.disconnect(), 10000);
  }
  
  bindToggleEvents(toggle) {
    if (!toggle) return;
    
    // Initialize noise suppression manager
    this.initializeNoiseSuppression();
    
    toggle.addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      this.toggleNoiseSuppression(isEnabled);
      
      // Show user feedback
      this.showNoiseSuppressionFeedback(isEnabled);
    });
    
    // Set initial state
    this.toggleNoiseSuppression(toggle.checked);
  }
  
  async initializeNoiseSuppression() {
    if (this.noiseSuppressionManager) return;
    
    // Wait for WebRTC manager to be available
    let attempts = 0;
    while (!window.hostMeetingInstance?.webrtc && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.hostMeetingInstance?.webrtc) {
      this.originalWebRTCManager = window.hostMeetingInstance.webrtc;
      this.noiseSuppressionManager = new AINoiseSuppressionManager(this.originalWebRTCManager);
      
      // Enhance the WebRTC manager with noise suppression
      this.enhanceWebRTCWithNoiseSuppression();
    }
  }
  
  enhanceWebRTCWithNoiseSuppression() {
    if (!this.originalWebRTCManager || !this.noiseSuppressionManager) return;
    
    // Override the initialize method to apply noise suppression
    const originalInitialize = this.originalWebRTCManager.initialize.bind(this.originalWebRTCManager);
    
    this.originalWebRTCManager.initialize = async function() {
      const result = await originalInitialize();
      
      if (result && this.localStream) {
        // Apply noise suppression to the local stream
        try {
          const processedStream = await window.noiseSuppressionIntegration
            .noiseSuppressionManager.applyToStream(this.localStream);
          
          if (processedStream !== this.localStream) {
            // Replace the local stream with the processed one
            this.localStream = processedStream;
            console.log('Local stream enhanced with AI noise suppression');
          }
        } catch (error) {
          console.error('Failed to apply noise suppression to local stream:', error);
        }
      }
      
      return result;
    };
  }
  
  toggleNoiseSuppression(enabled) {
    if (this.noiseSuppressionManager) {
      this.noiseSuppressionManager.toggle(enabled);
    }
  }
  
  showNoiseSuppressionFeedback(enabled) {
    // Create or update status indicator
    let indicator = document.getElementById('noiseSuppressionIndicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'noiseSuppressionIndicator';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${enabled ? '#10b981' : '#ef4444'};
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(indicator);
    }
    
    indicator.style.background = enabled ? '#10b981' : '#ef4444';
    indicator.innerHTML = `
      <i class="fas fa-${enabled ? 'shield-alt' : 'shield-alt'}" style="margin-right: 8px;"></i>
      AI Noise Suppression ${enabled ? 'ON' : 'OFF'}
    `;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }, 3000);
    
    // Also show toast notification if available
    if (window.hostMeetingInstance?.showToast) {
      window.hostMeetingInstance.showToast(
        `AI Noise Suppression ${enabled ? 'enabled' : 'disabled'}`,
        'info'
      );
    }
  }
}

// Initialize the integration
window.noiseSuppressionIntegration = new NoiseSuppressionIntegration();

// Export for external use if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AINoiseSuppressionManager,
    NoiseSuppressionIntegration
  };
}
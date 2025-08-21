class AINoiseSuppressionEngine {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.scriptProcessor = null;
    this.isActive = false;
    this.isInitialized = false;
    
    // Balanced noise suppression parameters - preserving speech
    this.config = {
      // Conservative spectral subtraction
      spectralFloor: 0.15, // Higher floor to preserve speech
      overSubtractionFactor: 1.5, // Reduced from 4.0
      spectralSubtractionAlpha: 1.2, // Reduced from 3.0
      
      // Speech preservation
      speechFreqMin: 85, // Hz - lower to catch deeper voices
      speechFreqMax: 8000, // Hz - higher to preserve speech clarity
      speechProtectionFactor: 0.8, // Protect speech frequencies
      
      // Adaptive filtering - more conservative
      adaptiveThreshold: 0.03, // Increased threshold
      noiseEstimationRate: 0.95, // Slower noise learning
      speechPresenceProbability: 0.3, // Lower threshold for speech detection
      
      // Gentler noise gate
      gateThreshold: -55, // dB - more sensitive
      gateRatio: 3, // Reduced from 10
      gateAttack: 0.01, // 10ms - slower
      gateRelease: 0.2, // 200ms - slower release
      
      // Conservative Wiener filtering
      wienerAlpha: 0.85, // Reduced from 0.98
      minGain: 0.3, // Increased from 0.1
      maxGain: 1.2, // Slight boost allowed
      
      // Voice activity detection - more sensitive
      vadThreshold: 0.25, // Lower threshold
      vadSmoothingFactor: 0.85, // Less smoothing
      
      // Targeted environmental noise profiles
      fanNoiseProfile: new Float32Array(512),
      doorSlamProfile: new Float32Array(512),
      keyboardProfile: new Float32Array(512),
      backgroundHumProfile: new Float32Array(512)
    };

    // Initialize targeted noise profiles
    this.initializeNoiseProfiles();
    
    // Buffers for analysis
    this.noiseSpectrum = new Float32Array(512);
    this.speechSpectrum = new Float32Array(512);
    this.previousSpectrum = new Float32Array(512);
    this.smoothedSpectrum = new Float32Array(512);
    
    // Voice activity detection
    this.vadHistory = new Array(5).fill(1); // Start assuming speech
    this.speechPresence = 1.0; // Start with high speech presence
    this.speechEnergyHistory = new Array(10).fill(0);
    
    // Adaptive learning - slower and more conservative
    this.learningRate = 0.005; // Reduced from 0.01
    this.noiseFloorHistory = new Array(50).fill(0);
    
    // Speech protection
    this.speechEnergyThreshold = 0.001;
    this.isSpeechActive = true;
    
    console.log('🎤 Balanced AI Noise Suppression Engine initialized');
  }

  initializeNoiseProfiles() {
    // Fan noise (very specific low frequency targeting)
    for (let i = 0; i < 512; i++) {
      const freq = (i / 512) * 22050;
      if (freq < 120) {
        // Target very low frequency fan rumble
        this.config.fanNoiseProfile[i] = 0.6;
      } else if (freq > 120 && freq < 300) {
        // Gentle reduction in low-mid range
        this.config.fanNoiseProfile[i] = 0.2;
      } else {
        // Don't touch speech frequencies
        this.config.fanNoiseProfile[i] = 0.0;
      }
    }

    // Door slam (specific transient pattern, avoid speech range)
    for (let i = 0; i < 512; i++) {
      const freq = (i / 512) * 22050;
      if (freq < 200 || freq > 4000) {
        // Target frequencies outside main speech range
        this.config.doorSlamProfile[i] = 0.4;
      } else {
        // Minimal impact on speech frequencies
        this.config.doorSlamProfile[i] = 0.1;
      }
    }

    // Keyboard typing (high frequency only)
    for (let i = 0; i < 512; i++) {
      const freq = (i / 512) * 22050;
      if (freq > 6000) {
        // Target only very high frequencies
        this.config.keyboardProfile[i] = 0.5;
      } else {
        this.config.keyboardProfile[i] = 0.0;
      }
    }

    // Background hum (very specific frequency targeting)
    for (let i = 0; i < 512; i++) {
      const freq = (i / 512) * 22050;
      let hum = 0;
      
      // Very narrow targeting of 50Hz/60Hz harmonics
      const targetFreqs = [50, 60, 100, 120, 150, 180, 240, 300];
      for (let targetFreq of targetFreqs) {
        if (Math.abs(freq - targetFreq) < 3) {
          hum = 0.7;
          break;
        }
      }
      
      this.config.backgroundHumProfile[i] = hum;
    }
  }

  async initialize(mediaStream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create processing chain
      this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.gainNode = this.audioContext.createGain();
      
      // Configure for balanced analysis
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.3; // More smoothing
      this.analyserNode.minDecibels = -80;
      this.analyserNode.maxDecibels = -10;

      // Create script processor
      this.scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      // Connect chain
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.gainNode);

      // Main processing - much more conservative
      this.scriptProcessor.onaudioprocess = (event) => {
        this.processAudioConservatively(event);
      };

      // Create output
      const destination = this.audioContext.createMediaStreamDestination();
      this.gainNode.connect(destination);

      this.outputStream = destination.stream;
      this.isInitialized = true;
      this.isActive = true;

      console.log('✅ Balanced AI Noise Suppression activated - Speech Protected');
      return this.outputStream;

    } catch (error) {
      console.error('❌ Failed to initialize noise suppression:', error);
      return mediaStream;
    }
  }

  processAudioConservatively(event) {
    if (!this.isActive) return;

    const inputBuffer = event.inputBuffer.getChannelData(0);
    const outputBuffer = event.outputBuffer.getChannelData(0);
    const bufferSize = inputBuffer.length;

    // Calculate input energy
    let inputEnergy = 0;
    for (let i = 0; i < bufferSize; i++) {
      inputEnergy += inputBuffer[i] * inputBuffer[i];
    }
    inputEnergy = Math.sqrt(inputEnergy / bufferSize);

    // Get frequency data
    const frequencyData = new Float32Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getFloatFrequencyData(frequencyData);

    // Convert to linear scale
    const spectrum = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
      spectrum[i] = Math.max(Math.pow(10, frequencyData[i] / 20), 1e-6);
    }

    // Enhanced Voice Activity Detection
    const speechIndicators = this.detectSpeechActivity(spectrum, inputEnergy);
    
    // Update speech presence with stronger bias toward speech
    this.speechPresence = Math.max(0.3, // Minimum speech presence
      this.config.vadSmoothingFactor * this.speechPresence + 
      (1 - this.config.vadSmoothingFactor) * speechIndicators.overallSpeechScore
    );

    // Very conservative noise estimation - only during clear non-speech
    this.updateNoiseEstimationConservatively(spectrum, this.speechPresence);

    // Apply gentle noise suppression only to specific frequencies
    const suppressionGains = this.calculateTargetedSuppression(spectrum);

    // Process audio with speech protection
    for (let i = 0; i < bufferSize; i++) {
      let sample = inputBuffer[i];
      
      // Apply very gentle processing
      sample = this.applyGentleProcessing(sample, inputEnergy, this.speechPresence);
      
      outputBuffer[i] = sample;
    }

    this.previousSpectrum.set(spectrum);
  }

  detectSpeechActivity(spectrum, energy) {
    // Multiple speech indicators
    const indicators = {
      energyLevel: Math.min(energy * 1000, 1.0), // Raw energy
      speechBandEnergy: 0,
      spectralBalance: 0,
      overallSpeechScore: 0
    };

    // Speech band energy (85Hz - 8000Hz)
    const speechStartBin = Math.floor(85 * spectrum.length / 22050);
    const speechEndBin = Math.floor(8000 * spectrum.length / 22050);
    
    let speechEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      if (i >= speechStartBin && i <= speechEndBin) {
        speechEnergy += spectrum[i];
      }
    }

    indicators.speechBandEnergy = speechEnergy / (speechEndBin - speechStartBin);
    indicators.spectralBalance = speechEnergy / (totalEnergy + 1e-10);

    // Bias heavily toward detecting speech
    indicators.overallSpeechScore = Math.max(
      indicators.energyLevel * 0.4,
      indicators.spectralBalance * 0.6,
      0.3 // Minimum score - assume speech unless clearly noise
    );

    return indicators;
  }

  updateNoiseEstimationConservatively(spectrum, speechPresence) {
    // Only update noise estimate during very clear non-speech periods
    if (speechPresence < 0.2) {
      const verySlowLearningRate = 0.001;
      
      for (let i = 0; i < spectrum.length; i++) {
        // Only update if significantly below current estimate
        if (spectrum[i] < this.noiseSpectrum[i] * 0.8) {
          this.noiseSpectrum[i] = (1 - verySlowLearningRate) * this.noiseSpectrum[i] + 
                                  verySlowLearningRate * spectrum[i];
        }
        
        // Maintain reasonable noise floor
        this.noiseSpectrum[i] = Math.max(this.noiseSpectrum[i], 1e-5);
      }
    }
  }

  calculateTargetedSuppression(spectrum) {
    const gains = new Float32Array(spectrum.length);
    
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i / spectrum.length) * 22050;
      let suppression = 1.0; // Default: no suppression
      
      // Only apply suppression to specific problematic frequencies
      // and only when we're confident it's not speech
      
      if (this.speechPresence < 0.4) {
        // Fan noise suppression (very low frequencies only)
        if (this.config.fanNoiseProfile[i] > 0.3) {
          const fanSuppressionFactor = Math.min(0.7, this.config.fanNoiseProfile[i]);
          suppression *= (1 - fanSuppressionFactor * 0.5);
        }
        
        // Background hum (specific frequencies only)
        if (this.config.backgroundHumProfile[i] > 0.5) {
          suppression *= 0.6;
        }
        
        // High frequency noise (keyboards, etc.)
        if (freq > 6000 && this.config.keyboardProfile[i] > 0.3) {
          suppression *= 0.7;
        }
      }
      
      // Always preserve speech frequency range during any speech activity
      if (this.speechPresence > 0.3 && freq >= 85 && freq <= 8000) {
        suppression = Math.max(suppression, 0.8); // Minimal suppression in speech range
      }
      
      gains[i] = suppression;
    }
    
    return gains;
  }

  applyGentleProcessing(sample, inputEnergy, speechPresence) {
    // Very gentle processing that preserves speech
    
    // Light noise gate only during clear silence
    if (inputEnergy < 0.001 && speechPresence < 0.2) {
      const gateReduction = Math.max(0.3, inputEnergy * 1000);
      sample *= gateReduction;
    }
    
    // Adaptive gain - boost during speech, gentle reduction during noise
    let adaptiveGain = 1.0;
    if (speechPresence > 0.5) {
      adaptiveGain = 1.1; // Slight speech boost
    } else if (speechPresence < 0.2) {
      adaptiveGain = 0.8; // Gentle noise reduction
    }
    
    sample *= adaptiveGain;
    
    // Very soft limiting
    if (Math.abs(sample) > 0.98) {
      sample = Math.sign(sample) * (0.98 + 0.02 * Math.tanh((Math.abs(sample) - 0.98) * 10));
    }
    
    return sample;
  }

  destroy() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isActive = false;
    this.isInitialized = false;
    
    console.log('🔇 AI Noise Suppression deactivated');
  }
}

// Safer integration class
class NoiseSuppressionIntegrator {
  constructor() {
    this.noiseEngine = null;
    this.originalGetUserMedia = null;
    this.isIntegrated = false;
    this.bypassNextCall = false;
  }

  async integrate() {
    if (this.isIntegrated) return;

    try {
      this.originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        console.log('🎤 Intercepting getUserMedia for balanced noise suppression...');
        
        // Get original stream first
        const originalStream = await this.originalGetUserMedia(constraints);
        
        // Test if we can process audio safely
        if (constraints && constraints.audio && originalStream.getAudioTracks().length > 0) {
          try {
            const processedStream = await this.applyNoiseSuppressionSafely(originalStream);
            
            // Verify the processed stream has audio
            if (processedStream && processedStream.getAudioTracks().length > 0) {
              console.log('✅ Audio enhanced with balanced noise suppression');
              return processedStream;
            } else {
              console.log('⚠️ Processed stream invalid, using original');
              return originalStream;
            }
          } catch (error) {
            console.warn('⚠️ Noise suppression failed, using original audio:', error);
            return originalStream;
          }
        }
        
        return originalStream;
      };

      this.isIntegrated = true;
      console.log('✅ Balanced AI Noise Suppression integrated successfully');
      
    } catch (error) {
      console.error('❌ Failed to integrate noise suppression:', error);
    }
  }

  async applyNoiseSuppressionSafely(mediaStream) {
    try {
      // Create conservative noise suppression
      this.noiseEngine = new AINoiseSuppressionEngine();
      
      // Test processing with a timeout
      const processingPromise = this.noiseEngine.initialize(mediaStream);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), 5000)
      );
      
      const processedStream = await Promise.race([processingPromise, timeoutPromise]);
      
      if (processedStream && processedStream !== mediaStream) {
        // Verify audio tracks exist and are active
        const audioTracks = processedStream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
          // Create enhanced stream with original video
          const videoTracks = mediaStream.getVideoTracks();
          const enhancedStream = new MediaStream([
            ...audioTracks,
            ...videoTracks
          ]);
          
          // Cleanup original audio tracks
          mediaStream.getAudioTracks().forEach(track => track.stop());
          
          return enhancedStream;
        }
      }
      
      throw new Error('Invalid processed stream');
      
    } catch (error) {
      console.warn('Noise suppression processing failed:', error);
      if (this.noiseEngine) {
        this.noiseEngine.destroy();
        this.noiseEngine = null;
      }
      return mediaStream;
    }
  }

  restore() {
    if (this.originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
      this.originalGetUserMedia = null;
    }
    
    if (this.noiseEngine) {
      this.noiseEngine.destroy();
      this.noiseEngine = null;
    }
    
    this.isIntegrated = false;
    console.log('🔄 Noise suppression integration restored');
  }
}

// Auto-initialize with safety checks
const noiseSuppressionIntegrator = new NoiseSuppressionIntegrator();

// Wait for DOM and user interaction before initializing
function initializeWhenSafe() {
  // Only initialize if we haven't already and if we're in a secure context
  if (!noiseSuppressionIntegrator.isIntegrated && 
      window.isSecureContext && 
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia) {
    
    noiseSuppressionIntegrator.integrate();
  }
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWhenSafe);
} else {
  setTimeout(initializeWhenSafe, 1000); // Small delay to ensure everything is loaded
}

// Fallback initialization
window.addEventListener('load', () => {
  setTimeout(initializeWhenSafe, 2000);
});

// Export for manual control
window.NoiseSuppressionIntegrator = noiseSuppressionIntegrator;
window.AINoiseSuppressionEngine = AINoiseSuppressionEngine;

console.log('🚀 Balanced AI Noise Suppression System loaded - Speech Protected');
// Enhanced WebRTC configuration for production deployment
export const getWebRTCConfig = () => {
  return {
    iceServers: [
      // Google STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Additional reliable STUN servers
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.nextcloud.com:443' },
      { urls: 'stun:stun.sipgate.net:3478' },
      { urls: 'stun:stun.ekiga.net' },
      
      // Multiple TURN server providers for better reliability
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:relay1.expressturn.com:3478',
        username: 'ef3I7ZYQ1XQZAHK32F',
        credential: 'lL2xX9qQCkH6QzRU'
      },
      {
        urls: 'turn:a.relay.metered.ca:80',
        username: 'a40c38b0e78216200d619b80',
        credential: 'dvWS61aEZmhNcJaS'
      },
      {
        urls: 'turn:a.relay.metered.ca:80?transport=tcp',
        username: 'a40c38b0e78216200d619b80',
        credential: 'dvWS61aEZmhNcJaS'
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username: 'a40c38b0e78216200d619b80',
        credential: 'dvWS61aEZmhNcJaS'
      },
      {
        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
        username: 'a40c38b0e78216200d619b80',
        credential: 'dvWS61aEZmhNcJaS'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
  };
};

// Enhanced peer connection configuration
export const createPeerConnection = (iceServers) => {
  const config = {
    iceServers: iceServers || getWebRTCConfig().iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
  };

  const pc = new RTCPeerConnection(config);
  
  // Enhanced connection monitoring
  pc.addEventListener('iceconnectionstatechange', () => {
    console.log('ICE connection state:', pc.iceConnectionState);
    
    if (pc.iceConnectionState === 'failed') {
      console.log('ICE connection failed, attempting restart...');
      pc.restartIce();
    }
  });

  pc.addEventListener('connectionstatechange', () => {
    console.log('Connection state:', pc.connectionState);
  });

  pc.addEventListener('icegatheringstatechange', () => {
    console.log('ICE gathering state:', pc.iceGatheringState);
  });

  return pc;
};

// Connection retry logic
export const createConnectionWithRetry = async (iceServers, maxRetries = 3) => {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const pc = createPeerConnection(iceServers);
      
      // Wait for ICE gathering to complete or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('ICE gathering timeout'));
        }, 10000);
        
        pc.addEventListener('icegatheringstatechange', () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        });
        
        // Start gathering by creating a dummy offer
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
      });
      
      return pc;
    } catch (error) {
      console.error(`Connection attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
  
  throw new Error('Failed to establish connection after multiple retries');
};
// Connection diagnostics and troubleshooting utilities
export class ConnectionDiagnostics {
  constructor() {
    this.diagnostics = {
      iceServers: [],
      connectivity: {},
      errors: []
    };
  }

  async testICEServers(iceServers) {
    console.log('Testing ICE servers connectivity...');
    const results = [];

    for (const server of iceServers) {
      try {
        const result = await this.testSingleICEServer(server);
        results.push({ server, result, status: 'success' });
      } catch (error) {
        results.push({ server, error: error.message, status: 'failed' });
        console.warn('ICE server test failed:', server, error);
      }
    }

    this.diagnostics.iceServers = results;
    return results;
  }

  async testSingleICEServer(server) {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({ iceServers: [server] });
      const timeout = setTimeout(() => {
        pc.close();
        reject(new Error('Timeout'));
      }, 5000);

      pc.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          clearTimeout(timeout);
          pc.close();
          resolve(event.candidate);
        }
      });

      pc.addEventListener('icecandidateerror', (event) => {
        clearTimeout(timeout);
        pc.close();
        reject(new Error(`ICE candidate error: ${event.errorText}`));
      });

      // Create offer to start ICE gathering
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(reject);
    });
  }

  async checkNetworkConnectivity() {
    const tests = [
      this.testHTTPS(),
      this.testWebSocket(),
      this.testSTUN(),
      this.testTURN()
    ];

    const results = await Promise.allSettled(tests);
    this.diagnostics.connectivity = {
      https: results[0].status === 'fulfilled' ? results[0].value : false,
      websocket: results[1].status === 'fulfilled' ? results[1].value : false,
      stun: results[2].status === 'fulfilled' ? results[2].value : false,
      turn: results[3].status === 'fulfilled' ? results[3].value : false
    };

    return this.diagnostics.connectivity;
  }

  async testHTTPS() {
    return location.protocol === 'https:' || location.hostname === 'localhost';
  }

  async testWebSocket() {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
      } catch {
        resolve(false);
      }
    });
  }

  async testSTUN() {
    try {
      const result = await this.testSingleICEServer({ urls: 'stun:stun.l.google.com:19302' });
      return !!result;
    } catch {
      return false;
    }
  }

  async testTURN() {
    try {
      const result = await this.testSingleICEServer({
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      });
      return !!result;
    } catch {
      return false;
    }
  }

  logDiagnostics() {
    console.group('🔍 WebRTC Connection Diagnostics');
    console.log('Protocol:', location.protocol);
    console.log('Host:', location.host);
    console.log('User Agent:', navigator.userAgent);
    console.log('Connectivity Tests:', this.diagnostics.connectivity);
    console.log('ICE Server Tests:', this.diagnostics.iceServers);
    console.groupEnd();
  }

  getRecommendations() {
    const recommendations = [];

    if (!this.diagnostics.connectivity.https && location.hostname !== 'localhost') {
      recommendations.push('⚠️ HTTPS is required for WebRTC in production. Please use HTTPS.');
    }

    if (!this.diagnostics.connectivity.websocket) {
      recommendations.push('⚠️ WebSocket connection failed. Check firewall settings.');
    }

    if (!this.diagnostics.connectivity.stun) {
      recommendations.push('⚠️ STUN server connectivity issues. Check network restrictions.');
    }

    if (!this.diagnostics.connectivity.turn) {
      recommendations.push('⚠️ TURN server connectivity issues. NAT traversal may fail.');
    }

    const failedICEServers = this.diagnostics.iceServers.filter(s => s.status === 'failed');
    if (failedICEServers.length > 0) {
      recommendations.push(`⚠️ ${failedICEServers.length} ICE servers are not accessible.`);
    }

    return recommendations;
  }
}

// Auto-run diagnostics in development
if (process.env.NODE_ENV === 'development') {
  window.runConnectionDiagnostics = async () => {
    const diagnostics = new ConnectionDiagnostics();
    await diagnostics.checkNetworkConnectivity();
    
    // Test with a subset of ICE servers
    const testServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
    ];
    
    await diagnostics.testICEServers(testServers);
    diagnostics.logDiagnostics();
    
    const recommendations = diagnostics.getRecommendations();
    if (recommendations.length > 0) {
      console.warn('🔧 Recommendations:', recommendations);
    }
    
    return diagnostics;
  };
}
// Deployment environment checks and fixes
export class DeploymentChecker {
  constructor() {
    this.checks = [];
    this.fixes = [];
  }

  async runAllChecks() {
    console.log('🔍 Running deployment checks...');
    
    await this.checkHTTPS();
    await this.checkWebRTC();
    await this.checkSocketIO();
    await this.checkICEServers();
    
    this.logResults();
    return {
      checks: this.checks,
      fixes: this.fixes,
      allPassed: this.checks.every(check => check.passed)
    };
  }

  async checkHTTPS() {
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    
    this.checks.push({
      name: 'HTTPS Protocol',
      passed: isHTTPS,
      message: isHTTPS ? 'HTTPS is enabled' : 'HTTPS is required for WebRTC in production'
    });

    if (!isHTTPS) {
      this.fixes.push('Enable HTTPS on your web server. WebRTC requires secure contexts in production.');
    }
  }

  async checkWebRTC() {
    const hasWebRTC = !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    this.checks.push({
      name: 'WebRTC Support',
      passed: hasWebRTC,
      message: hasWebRTC ? 'WebRTC is supported' : 'WebRTC is not supported in this browser'
    });

    if (!hasWebRTC) {
      this.fixes.push('Use a modern browser that supports WebRTC (Chrome, Firefox, Safari, Edge).');
    }
  }

  async checkSocketIO() {
    const hasSocketIO = typeof io !== 'undefined';
    
    this.checks.push({
      name: 'Socket.IO',
      passed: hasSocketIO,
      message: hasSocketIO ? 'Socket.IO is loaded' : 'Socket.IO is not loaded'
    });

    if (!hasSocketIO) {
      this.fixes.push('Ensure Socket.IO client library is properly loaded.');
    }
  }

  async checkICEServers() {
    try {
      // Test basic STUN server connectivity
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const testPassed = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        pc.addEventListener('icecandidate', (event) => {
          if (event.candidate) {
            clearTimeout(timeout);
            resolve(true);
          }
        });

        pc.createOffer().then(offer => pc.setLocalDescription(offer));
      });

      pc.close();

      this.checks.push({
        name: 'ICE Server Connectivity',
        passed: testPassed,
        message: testPassed ? 'ICE servers are accessible' : 'ICE servers may be blocked'
      });

      if (!testPassed) {
        this.fixes.push('Check firewall settings and ensure STUN/TURN servers are accessible.');
      }
    } catch (error) {
      this.checks.push({
        name: 'ICE Server Connectivity',
        passed: false,
        message: `ICE server test failed: ${error.message}`
      });
      
      this.fixes.push('ICE server connectivity test failed. Check network configuration.');
    }
  }

  logResults() {
    console.group('📋 Deployment Check Results');
    
    this.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    });

    if (this.fixes.length > 0) {
      console.group('🔧 Recommended Fixes');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Auto-run checks in production
if (typeof window !== 'undefined') {
  window.runDeploymentChecks = async () => {
    const checker = new DeploymentChecker();
    return await checker.runAllChecks();
  };

  // Run checks automatically when page loads
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      window.runDeploymentChecks();
    }, 1000);
  });
}
class MeetingStatsManager {
  constructor() {
    this.socket = null;
    this.statsContainer = null;
    this.isInitialized = false;
    this.currentStats = null;
    this.updateInterval = null;
  }

  // Initialize the stats manager
  init(socket) {
    this.socket = socket;
    this.statsContainer = document.querySelector('.stats-grid');
    
    if (!this.statsContainer) {
      console.warn('Stats container not found');
      return;
    }

    this.setupSocketListeners();
    this.loadInitialStats();
    this.startPeriodicUpdates();
    this.isInitialized = true;
    
    console.log('Meeting Stats Manager initialized');
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('stats-updated', (data) => {
      console.log('Stats updated:', data);
      this.updateStatsDisplay(data);
    });

    this.socket.on('stats-error', (error) => {
      console.error('Stats error:', error);
      this.showError('Failed to update statistics');
    });
  }

  // Load initial statistics
  async loadInitialStats() {
    try {
      const response = await fetch('/api/meeting-stats');
      const data = await response.json();
      
      if (data.success) {
        this.currentStats = data.stats;
        this.updateStatsDisplay(data.stats);
      } else {
        throw new Error(data.error || 'Failed to load statistics');
      }
    } catch (error) {
      console.error('Error loading initial stats:', error);
      this.showError('Failed to load statistics');
    }
  }

  // Update the stats display
  updateStatsDisplay(stats) {
    if (!this.statsContainer || !stats) return;

    // Update Total Calls
    this.updateStatCard('total-calls', {
      number: stats.totalCalls.value,
      change: stats.totalCalls.change,
      changeType: stats.totalCalls.changeType
    });

    // Update Call Duration
    this.updateStatCard('call-duration', {
      number: stats.totalDuration.value,
      change: stats.totalDuration.change,
      changeType: stats.totalDuration.changeType
    });



 
    // Add animation effect
    this.animateStatsUpdate();
  }

  // Update individual stat card
  updateStatCard(cardType, data) {
    const cardSelectors = {
      'total-calls': '.stat-card.primary',
      'call-duration': '.stat-card.success',
      'participants': '.stat-card.warning',
      'meetings-scheduled': '.stat-card.info'
    };

    const card = this.statsContainer.querySelector(cardSelectors[cardType]);
    if (!card) return;

    const numberElement = card.querySelector('.stat-number');
    const changeElement = card.querySelector('.stat-change');

    if (numberElement) {
      numberElement.textContent = data.number;
    }

    if (changeElement) {
      // Update change text and icon
      const icon = changeElement.querySelector('i');
      const changeText = this.getChangeText(data.change, data.changeType);
      
      changeElement.className = `stat-change ${data.changeType}`;
      
      if (icon) {
        icon.className = this.getChangeIcon(data.changeType);
      }
      
      // Update text content (preserve icon)
      const textNode = Array.from(changeElement.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE);
      
      if (textNode) {
        textNode.textContent = changeText;
      } else {
        changeElement.appendChild(document.createTextNode(changeText));
      }
    }
  }

  // Get change text based on percentage
  getChangeText(change, changeType) {
    if (changeType === 'neutral' || change === 0) {
      return ' Same as last month';
    }
    
    const sign = change > 0 ? '+' : '';
    return ` ${sign}${change}% from last month`;
  }

  // Get appropriate icon for change type
  getChangeIcon(changeType) {
    switch (changeType) {
      case 'positive':
        return 'fas fa-arrow-up';
      case 'negative':
        return 'fas fa-arrow-down';
      case 'neutral':
      default:
        return 'fas fa-minus';
    }
  }

  // Animate stats update
  animateStatsUpdate() {
    const statNumbers = this.statsContainer.querySelectorAll('.stat-number');
    
    statNumbers.forEach(element => {
      element.style.transform = 'scale(1.05)';
      element.style.transition = 'transform 0.3s ease';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 300);
    });
  }

  // Record meeting start
  recordMeetingStart(meetingId, meetingTitle = 'Video Call', isScheduled = false) {
    if (!this.socket) return;

    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.socket.emit('meeting-started', {
      userId,
      meetingId,
      meetingTitle,
      isScheduled
    });
  }

  // Record meeting end
  recordMeetingEnd(meetingId, participantCount = 1) {
    if (!this.socket) return;

    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.socket.emit('meeting-ended', {
      userId,
      meetingId,
      participantCount
    });
  }

  // Get current user ID (you may need to adjust this based on your auth system)
  getCurrentUserId() {
    // This should be implemented based on how you store user info
    // For example, from a global variable, localStorage, or data attribute
    return window.currentUserId || localStorage.getItem('userId') || null;
  }

  // Start periodic stats updates
  startPeriodicUpdates() {
    // Update stats every 5 minutes
    this.updateInterval = setInterval(() => {
      this.loadInitialStats();
    }, 5 * 60 * 1000);
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Show error message
  showError(message) {
    // You can implement a toast notification or other error display
    console.error('Stats Error:', message);
    
    // Optional: Show a temporary error indicator
    const errorIndicator = document.createElement('div');
    errorIndicator.className = 'stats-error';
    errorIndicator.textContent = message;
    errorIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(errorIndicator);
    
    // Animate in
    setTimeout(() => {
      errorIndicator.style.opacity = '1';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      errorIndicator.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(errorIndicator);
      }, 300);
    }, 3000);
  }

  // Refresh stats manually
  async refreshStats() {
    await this.loadInitialStats();
  }

  // Get current stats
  getCurrentStats() {
    return this.currentStats;
  }

  // Cleanup
  destroy() {
    this.stopPeriodicUpdates();
    
    if (this.socket) {
      this.socket.off('stats-updated');
      this.socket.off('stats-error');
    }
    
    this.isInitialized = false;
  }
}

// Create global instance
window.MeetingStatsManager = MeetingStatsManager;

// Auto-initialize if socket is available
document.addEventListener('DOMContentLoaded', () => {
  // Wait for socket to be available
  const checkSocket = () => {
    if (window.socket) {
      const statsManager = new MeetingStatsManager();
      statsManager.init(window.socket);
      window.meetingStatsManager = statsManager;
    } else {
      setTimeout(checkSocket, 100);
    }
  };
  
  checkSocket();
});
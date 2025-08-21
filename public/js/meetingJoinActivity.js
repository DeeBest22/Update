// Meeting Activity Tracker for Participants (meetingJoin.html)
class ParticipantActivityTracker {
  constructor() {
    this.userId = null;
    this.meetingId = null;
    this.meetingName = 'Meeting';
    this.joinTime = null;
    this.socket = null;
    this.isTracking = false;
    
    this.init();
  }

  async init() {
    try {
      // Get user data
      await this.loadUserData();
      
      // Get meeting ID from URL
      this.meetingId = this.getMeetingIdFromUrl();
      
      // Get initial meeting name from URL params or default
      this.meetingName = this.getMeetingNameFromUrl() || 'Meeting';
      
      // Initialize socket connection
      this.initializeSocket();
      
      // Track join time
      this.joinTime = new Date();
      
      // Start tracking
      this.startTracking();
      
      // Setup event listeners for meeting name changes
      this.setupMeetingNameListener();
      
      // Setup beforeunload listener to track when user leaves
      this.setupBeforeUnloadListener();
      
      console.log('Participant activity tracker initialized');
      
    } catch (error) {
      console.error('Error initializing participant activity tracker:', error);
    }
  }

  async loadUserData() {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        this.userId = data.user.id || data.user._id;
        console.log('User ID loaded for activity tracking:', this.userId);
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  }

  getMeetingIdFromUrl() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1];
  }

  getMeetingNameFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('name') || urlParams.get('meetingName');
  }

  initializeSocket() {
    // Use existing socket connection if available, otherwise create new one
    if (window.io && typeof window.io === 'function') {
      this.socket = window.io();
    } else if (window.socket) {
      this.socket = window.socket;
    } else {
      console.warn('Socket.IO not available, activity tracking may not work properly');
      return;
    }

    // Join user-specific room for activity updates
    if (this.userId) {
      this.socket.emit('join-user-room', this.userId);
    }
  }

  startTracking() {
    if (!this.userId || !this.meetingId || this.isTracking) {
      return;
    }

    this.isTracking = true;
    
    // Emit participant joined event to server
    if (this.socket) {
      this.socket.emit('participant-joined-meeting', {
        meetingId: this.meetingId,
        meetingName: this.meetingName,
        userId: this.userId,
        isHost: false,
        joinTime: this.joinTime.toISOString()
      });
    }
    
    console.log(`Started tracking participant activity for meeting: ${this.meetingName}`);
  }

  setupMeetingNameListener() {
    // Listen for meeting name changes in the DOM
    const titleElement = document.querySelector('.meeting-title');
    if (titleElement) {
      // Create a MutationObserver to watch for title changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const newName = titleElement.textContent || titleElement.innerText;
            if (newName && newName.trim() !== this.meetingName) {
              console.log(`Meeting name changed from "${this.meetingName}" to "${newName.trim()}"`);
              this.meetingName = newName.trim();
            }
          }
        });
      });

      observer.observe(titleElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    // Also listen for direct meeting name updates via custom events
    window.addEventListener('meetingNameUpdated', (event) => {
      if (event.detail && event.detail.newName) {
        console.log(`Meeting name updated via event: ${event.detail.newName}`);
        this.meetingName = event.detail.newName;
      }
    });
  }

  setupBeforeUnloadListener() {
    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      this.trackParticipantLeave();
    });

    // Also track when user navigates away
    window.addEventListener('pagehide', () => {
      this.trackParticipantLeave();
    });

    // Track visibility changes (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // User might be leaving, but don't track yet as they might come back
        console.log('Page hidden, user might be leaving');
      }
    });
  }

  trackParticipantLeave() {
    if (!this.isTracking || !this.userId || !this.meetingId) {
      return;
    }

    const leaveTime = new Date();
    const duration = Math.round((leaveTime - this.joinTime) / (1000 * 60));

    console.log(`Tracking participant leave: ${this.meetingName}, Duration: ${duration} minutes`);

    // Send leave event to server
    if (this.socket) {
      this.socket.emit('participant-left-meeting', {
        meetingId: this.meetingId,
        userId: this.userId,
        finalMeetingName: this.meetingName,
        duration: duration,
        joinTime: this.joinTime.toISOString(),
        leaveTime: leaveTime.toISOString()
      });
    }

    // Mark as no longer tracking to prevent duplicate calls
    this.isTracking = false;
  }

  // Method to manually update meeting name (can be called from meetingJoin.html)
  updateMeetingName(newName) {
    if (newName && newName.trim() !== this.meetingName) {
      console.log(`Manually updating meeting name from "${this.meetingName}" to "${newName.trim()}"`);
      this.meetingName = newName.trim();
    }
  }

  // Method to manually trigger leave tracking (for end meeting button)
  manualLeave() {
    this.trackParticipantLeave();
  }
}

// Initialize the activity tracker when DOM is loaded
let participantActivityTracker;
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on meeting join pages
  if (window.location.pathname.includes('/join/')) {
    participantActivityTracker = new ParticipantActivityTracker();
    
    // Make it globally accessible
    window.participantActivityTracker = participantActivityTracker;
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParticipantActivityTracker;
}
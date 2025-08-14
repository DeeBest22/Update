// Enhanced meeting join functionality with activity tracking integration
// This script enhances the existing meetingJoin.html functionality

(function() {
  'use strict';

  // Enhanced meeting management for participants
  class EnhancedParticipantMeeting {
    constructor() {
      this.originalMeetingInstance = null;
      this.activityTracker = null;
      this.meetingName = 'Meeting';
      this.isInitialized = false;
      
      this.init();
    }

    init() {
      // Wait for existing meeting system to initialize
      this.waitForMeetingSystem();
    }

    waitForMeetingSystem() {
      const checkInterval = setInterval(() => {
        // Check if the original meeting system is available
        if (window.participantMeeting || window.meetingInstance) {
          this.originalMeetingInstance = window.participantMeeting || window.meetingInstance;
          this.activityTracker = window.participantActivityTracker;
          
          clearInterval(checkInterval);
          this.enhanceMeetingSystem();
        }
      }, 500);

      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.isInitialized) {
          console.warn('Original meeting system not found, activity tracking may be limited');
        }
      }, 10000);
    }

    enhanceMeetingSystem() {
      if (!this.originalMeetingInstance) {
        console.warn('No original meeting instance found');
        return;
      }

      console.log('Enhancing meeting system with activity tracking');

      // Hook into meeting name changes
      this.hookIntoMeetingNameChanges();
      
      // Hook into end meeting functionality
      this.hookIntoEndMeeting();
      
      // Hook into socket events
      this.hookIntoSocketEvents();
      
      this.isInitialized = true;
    }

    hookIntoMeetingNameChanges() {
      // Override the original meeting name update method if it exists
      if (this.originalMeetingInstance.updateMeetingName) {
        const originalUpdateName = this.originalMeetingInstance.updateMeetingName.bind(this.originalMeetingInstance);
        
        this.originalMeetingInstance.updateMeetingName = (newName) => {
          console.log(`Meeting name being updated to: ${newName}`);
          
          // Update activity tracker
          if (this.activityTracker) {
            this.activityTracker.updateMeetingName(newName);
          }
          
          // Call original method
          return originalUpdateName(newName);
        };
      }

      // Monitor DOM changes for meeting title
      this.observeMeetingTitleChanges();
    }

    observeMeetingTitleChanges() {
      const titleSelectors = [
        '.meeting-title',
        '#meetingTitle', 
        '.meeting-name',
        '[data-meeting-name]'
      ];

      titleSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const newName = element.textContent || element.innerText;
                if (newName && newName.trim() !== this.meetingName) {
                  this.meetingName = newName.trim();
                  console.log(`Meeting name observed change: ${this.meetingName}`);
                  
                  if (this.activityTracker) {
                    this.activityTracker.updateMeetingName(this.meetingName);
                  }
                }
              }
            });
          });

          observer.observe(element, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      });
    }

    hookIntoEndMeeting() {
      // Find end meeting button
      const endButtonSelectors = [
        '#endCallBtn',
        '#endMeetingBtn',
        '.end-call-btn',
        '.end-meeting-btn',
        '[onclick*="endMeeting"]',
        '[onclick*="leaveMeeting"]'
      ];

      endButtonSelectors.forEach(selector => {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`Found end meeting button: ${selector}`);
          
          // Add click listener
          button.addEventListener('click', () => {
            console.log('End meeting clicked - triggering activity tracking');
            
            if (this.activityTracker) {
              this.activityTracker.manualLeave();
            }
          }, { capture: true }); // Use capture to ensure it runs first
        }
      });

      // Override existing end meeting functions if they exist
      if (window.endMeeting && typeof window.endMeeting === 'function') {
        const originalEndMeeting = window.endMeeting;
        
        window.endMeeting = (...args) => {
          console.log('endMeeting function called - tracking activity');
          
          if (this.activityTracker) {
            this.activityTracker.manualLeave();
          }
          
          return originalEndMeeting.apply(this, args);
        };
      }

      if (window.leaveMeeting && typeof window.leaveMeeting === 'function') {
        const originalLeaveMeeting = window.leaveMeeting;
        
        window.leaveMeeting = (...args) => {
          console.log('leaveMeeting function called - tracking activity');
          
          if (this.activityTracker) {
            this.activityTracker.manualLeave();
          }
          
          return originalLeaveMeeting.apply(this, args);
        };
      }
    }

    hookIntoSocketEvents() {
      if (!this.originalMeetingInstance.socket) {
        console.warn('No socket found in original meeting instance');
        return;
      }

      const socket = this.originalMeetingInstance.socket;

      // Listen for meeting name updates from server
      socket.on('meeting-name-updated', (data) => {
        console.log('Meeting name updated from server:', data.newName);
        
        if (data.newName) {
          this.meetingName = data.newName;
          
          if (this.activityTracker) {
            this.activityTracker.updateMeetingName(data.newName);
          }
        }
      });

      // Listen for meeting end events
      socket.on('meeting-ended', () => {
        console.log('Meeting ended event received from server');
        
        if (this.activityTracker) {
          this.activityTracker.manualLeave();
        }
      });

      // Listen for host disconnect
      socket.on('host-disconnected', () => {
        console.log('Host disconnected - tracking participant leave');
        
        if (this.activityTracker) {
          this.activityTracker.manualLeave();
        }
      });
    }

    // Method to manually update meeting name
    updateMeetingName(newName) {
      if (newName && newName.trim()) {
        this.meetingName = newName.trim();
        
        if (this.activityTracker) {
          this.activityTracker.updateMeetingName(this.meetingName);
        }
      }
    }

    // Method to get current meeting name
    getCurrentMeetingName() {
      // Try to get from DOM first
      const titleElement = document.querySelector('.meeting-title') || 
                          document.querySelector('#meetingTitle') ||
                          document.querySelector('.meeting-name');
      
      if (titleElement) {
        const domName = titleElement.textContent || titleElement.innerText;
        if (domName && domName.trim()) {
          this.meetingName = domName.trim();
        }
      }
      
      return this.meetingName;
    }
  }

  // Initialize enhanced meeting system
  window.enhancedParticipantMeeting = new EnhancedParticipantMeeting();

  // Make functions globally available
  window.updateParticipantMeetingName = function(newName) {
    if (window.enhancedParticipantMeeting) {
      window.enhancedParticipantMeeting.updateMeetingName(newName);
    }
  };

  window.getCurrentParticipantMeetingName = function() {
    if (window.enhancedParticipantMeeting) {
      return window.enhancedParticipantMeeting.getCurrentMeetingName();
    }
    return 'Meeting';
  };

})();
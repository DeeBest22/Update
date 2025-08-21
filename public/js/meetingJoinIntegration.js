// Integration script for meetingJoin.html to work with activity tracking
// This script should be included in meetingJoin.html to integrate with the existing meeting functionality

(function() {
  'use strict';

  // Wait for the page to load and the meeting system to initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other scripts to initialize
    setTimeout(initializeActivityIntegration, 1000);
  });

  function initializeActivityIntegration() {
    console.log('Initializing activity integration for meeting join page');

    // Hook into existing meeting name changes
    hookIntoMeetingNameChanges();
    
    // Hook into existing end meeting functionality
    hookIntoEndMeetingButton();
    
    // Hook into existing socket events if available
    hookIntoSocketEvents();
  }

  function hookIntoMeetingNameChanges() {
    // Look for meeting title element and observe changes
    const titleSelectors = [
      '.meeting-title',
      '#meetingTitle',
      '.meeting-name',
      '[data-meeting-title]',
      'h1', 
      'h2'
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
      titleElement = document.querySelector(selector);
      if (titleElement) {
        console.log(`Found meeting title element: ${selector}`);
        break;
      }
    }

    if (titleElement) {
      // Create observer for title changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const newTitle = titleElement.textContent || titleElement.innerText;
            if (newTitle && newTitle.trim()) {
              console.log(`Meeting title changed to: ${newTitle.trim()}`);
              
              // Update activity tracker if available
              if (window.participantActivityTracker) {
                window.participantActivityTracker.updateMeetingName(newTitle.trim());
              }
              
              // Dispatch custom event
              window.dispatchEvent(new CustomEvent('meetingNameUpdated', {
                detail: { newName: newTitle.trim() }
              }));
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

    // Also listen for input changes on editable title elements
    const editableTitleInputs = document.querySelectorAll('input[type="text"]');
    editableTitleInputs.forEach(input => {
      if (input.placeholder && input.placeholder.toLowerCase().includes('meeting')) {
        input.addEventListener('input', (e) => {
          const newTitle = e.target.value.trim();
          if (newTitle && window.participantActivityTracker) {
            window.participantActivityTracker.updateMeetingName(newTitle);
          }
        });
      }
    });
  }

  function hookIntoEndMeetingButton() {
    // Look for end meeting button
    const endButtonSelectors = [
      '#endCallBtn',
      '#endMeetingBtn',
      '.end-call-btn',
      '.end-meeting-btn',
      '[data-action="end-meeting"]',
      'button[onclick*="end"]',
      'button[onclick*="leave"]'
    ];

    let endButton = null;
    for (const selector of endButtonSelectors) {
      endButton = document.querySelector(selector);
      if (endButton) {
        console.log(`Found end meeting button: ${selector}`);
        break;
      }
    }

    if (endButton) {
      // Store original click handler
      const originalOnClick = endButton.onclick;
      
      // Override click handler
      endButton.onclick = function(event) {
        console.log('End meeting button clicked - tracking participant leave');
        
        // Track participant leave before ending
        if (window.participantActivityTracker) {
          window.participantActivityTracker.manualLeave();
        }
        
        // Call original handler if it exists
        if (originalOnClick) {
          return originalOnClick.call(this, event);
        }
      };

      // Also add event listener as backup
      endButton.addEventListener('click', function() {
        if (window.participantActivityTracker) {
          window.participantActivityTracker.manualLeave();
        }
      }, { once: true });
    }

    // Look for leave meeting buttons as well
    const leaveButtonSelectors = [
      '#leaveBtn',
      '#leaveMeetingBtn',
      '.leave-btn',
      '.leave-meeting-btn',
      '[data-action="leave-meeting"]'
    ];

    for (const selector of leaveButtonSelectors) {
      const leaveButton = document.querySelector(selector);
      if (leaveButton) {
        console.log(`Found leave meeting button: ${selector}`);
        
        leaveButton.addEventListener('click', function() {
          console.log('Leave meeting button clicked - tracking participant leave');
          if (window.participantActivityTracker) {
            window.participantActivityTracker.manualLeave();
          }
        }, { once: true });
      }
    }
  }

  function hookIntoSocketEvents() {
    // Try to access existing socket connection
    let socket = null;
    
    // Check various ways socket might be available
    if (window.socket) {
      socket = window.socket;
    } else if (window.io && typeof window.io === 'function') {
      socket = window.io();
    } else if (window.participantMeeting && window.participantMeeting.socket) {
      socket = window.participantMeeting.socket;
    }

    if (socket) {
      console.log('Found existing socket connection for activity integration');
      
      // Listen for meeting name updates from server
      socket.on('meeting-name-updated', (data) => {
        console.log('Meeting name updated from server:', data.newName);
        if (window.participantActivityTracker && data.newName) {
          window.participantActivityTracker.updateMeetingName(data.newName);
        }
      });

      // Listen for meeting end events
      socket.on('meeting-ended', () => {
        console.log('Meeting ended event received');
        if (window.participantActivityTracker) {
          window.participantActivityTracker.manualLeave();
        }
      });

      // Listen for disconnect events
      socket.on('disconnect', () => {
        console.log('Socket disconnected - tracking participant leave');
        if (window.participantActivityTracker) {
          window.participantActivityTracker.manualLeave();
        }
      });
    } else {
      console.warn('No socket connection found for activity integration');
    }
  }

  // Utility function to find and monitor meeting name changes
  function monitorMeetingNameChanges() {
    // Check for meeting name changes every 2 seconds as fallback
    setInterval(() => {
      const titleElement = document.querySelector('.meeting-title') || 
                          document.querySelector('#meetingTitle') ||
                          document.querySelector('.meeting-name');
      
      if (titleElement && window.participantActivityTracker) {
        const currentTitle = titleElement.textContent || titleElement.innerText;
        if (currentTitle && currentTitle.trim()) {
          window.participantActivityTracker.updateMeetingName(currentTitle.trim());
        }
      }
    }, 2000);
  }

  // Start monitoring as backup
  setTimeout(monitorMeetingNameChanges, 3000);

})();
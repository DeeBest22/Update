// Add these properties to the ParticipantMeeting class constructor
// Add this line in the constructor after other properties:
this.screenShareDisabled = false;

// Function to disable screen sharing for all participants
function disableScreenShare() {
  // Set the global flag
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.screenShareDisabled = true;
  }
  
  // Disable the screen share button visually
  const screenShareBtn = document.getElementById('screenShareBtn');
  if (screenShareBtn) {
    screenShareBtn.disabled = true;
    screenShareBtn.classList.add('disabled');
    screenShareBtn.title = 'Screen sharing disabled by host';
    
    // Add visual indicator
    const icon = screenShareBtn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-desktop';
      icon.style.opacity = '0.5';
    }
  }
  
  // Stop any active screen sharing
  if (window.hostMeetingInstance && window.hostMeetingInstance.webrtc.isScreenSharing) {
    window.hostMeetingInstance.webrtc.stopScreenShare();
    screenShareBtn.setAttribute('data-active', 'false');
    
    // Emit event to notify server
    if (window.hostMeetingInstance.socket) {
      window.hostMeetingInstance.socket.emit('stop-screen-share');
    }
  }
  
  // Emit event to server to disable screen sharing for all participants
  if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
    window.hostMeetingInstance.socket.emit('disable-screen-share');
  }
  
  console.log('Screen sharing has been disabled');
  
  // Show toast notification
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.showToast('Screen sharing disabled for all participants', 'info');
  }
}

// Function to enable screen sharing for all participants
function enableScreenShare() {
  // Clear the global flag
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.screenShareDisabled = false;
  }
  
  // Enable the screen share button visually
  const screenShareBtn = document.getElementById('screenShareBtn');
  if (screenShareBtn) {
    screenShareBtn.disabled = false;
    screenShareBtn.classList.remove('disabled');
    screenShareBtn.title = 'Share screen';
    
    // Remove visual indicator
    const icon = screenShareBtn.querySelector('i');
    if (icon) {
      icon.style.opacity = '1';
    }
  }
  
  // Emit event to server to enable screen sharing for all participants
  if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
    window.hostMeetingInstance.socket.emit('enable-screen-share');
  }
  
  console.log('Screen sharing has been enabled');
  
  // Show toast notification
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.showToast('Screen sharing enabled for all participants', 'success');
  }
}

// Modified toggleScreenShare function - replace the existing one
async function toggleScreenShare(button) {
  // Check if screen sharing is disabled
  if (window.hostMeetingInstance && window.hostMeetingInstance.screenShareDisabled) {
    window.hostMeetingInstance.showToast('Screen Share Disabled by Meeting Host', 'error');
    return;
  }
  
  const isActive = button.getAttribute('data-active') === 'true';
  
  if (isActive) {
    await window.hostMeetingInstance.webrtc.stopScreenShare();
    button.setAttribute('data-active', 'false');
    window.hostMeetingInstance.socket.emit('stop-screen-share');
  } else {
    try {
      await window.hostMeetingInstance.webrtc.startScreenShare();
      button.setAttribute('data-active', 'true');
      window.hostMeetingInstance.socket.emit('start-screen-share', { streamId: 'screen' });
    } catch (error) {
      console.error('Failed to start screen share:', error);
      window.hostMeetingInstance.showToast('Failed to start screen sharing', 'error');
    }
  }
}

// Socket event listeners to add to the setupSocketListeners function
// Add these to the ParticipantMeeting class's setupSocketListeners method:

/*
this.socket.on('screen-share-disabled', () => {
  console.log('Screen sharing disabled by host');
  this.screenShareDisabled = true;
  
  const screenShareBtn = document.getElementById('screenShareBtn');
  if (screenShareBtn) {
    screenShareBtn.disabled = true;
    screenShareBtn.classList.add('disabled');
    screenShareBtn.title = 'Screen sharing disabled by host';
    
    const icon = screenShareBtn.querySelector('i');
    if (icon) {
      icon.style.opacity = '0.5';
    }
  }
  
  // Stop any active screen sharing
  if (this.webrtc.isScreenSharing) {
    this.webrtc.stopScreenShare();
    screenShareBtn.setAttribute('data-active', 'false');
  }
  
  this.showToast('Screen Share Disabled by Meeting Host', 'info');
});

this.socket.on('screen-share-enabled', () => {
  console.log('Screen sharing enabled by host');
  this.screenShareDisabled = false;
  
  const screenShareBtn = document.getElementById('screenShareBtn');
  if (screenShareBtn) {
    screenShareBtn.disabled = false;
    screenShareBtn.classList.remove('disabled');
    screenShareBtn.title = 'Share screen';
    
    const icon = screenShareBtn.querySelector('i');
    if (icon) {
      icon.style.opacity = '1';
    }
  }
  
  this.showToast('Screen sharing enabled by host', 'success');
});
*/

// CSS styles to add for disabled state
const disabledScreenShareCSS = `
<style>
.screen-share-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #374151 !important;
}

.screen-share-btn.disabled:hover {
  background-color: #374151 !important;
  transform: none !important;
}

.toast.error {
  background-color: #dc2626;
  color: white;
}

.toast.info {
  background-color: #2563eb;
  color: white;
}
</style>
`;

// Inject CSS if not already present
if (!document.querySelector('#screen-share-control-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'screen-share-control-styles';
  styleElement.textContent = `
    .screen-share-btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: #374151 !important;
    }
    
    .screen-share-btn.disabled:hover {
      background-color: #374151 !important;
      transform: none !important;
    }
    
    .toast.error {
      background-color: #dc2626;
      color: white;
    }
    
    .toast.info {
      background-color: #2563eb;
      color: white;
    }
  `;
  document.head.appendChild(styleElement);
}

// Make functions globally available
window.disableScreenShare = disableScreenShare;
window.enableScreenShare = enableScreenShare;


const socket = io();
        const shareButton = document.getElementById('shareButton');
        const stopButton = document.getElementById('stopButton');
        const statusDisplay = document.getElementById('statusDisplay');
        const connectionStatus = document.getElementById('connectionStatus');
        const functionLog = document.getElementById('functionLog');

        let isScreenSharingEnabled = true;
        let isCurrentlySharing = false;

        // Join as participant when connected
        socket.on('connect', () => {
            socket.emit('join-as-participant');
            connectionStatus.textContent = 'Connected to server';
            connectionStatus.className = 'connection-status connected';
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Disconnected from server';
            connectionStatus.className = 'connection-status disconnected';
        });

        // Listen for screen sharing state changes from host
        socket.on('screen-sharing-state', (data) => {
            isScreenSharingEnabled = data.enabled;
            
            if (data.enabled) {
                enableScreenShare();
            } else {
                disableScreenShare();
            }
        });

      
 
        // Initialize button states
        stopButton.disabled = true;
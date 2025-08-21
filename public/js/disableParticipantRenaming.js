// Add this property to the ParticipantMeeting class constructor in meetingJoin.js
// Add this line in the constructor after other properties:
// this.renameDisabled = false;

// Function to disable participant renaming for all participants
function disableRename() {
  // Set the global flag
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.renameDisabled = true;
  }
  
  // Disable the name change button visually
  const changeNameBtn = document.querySelector('.change-name-btn');
  if (changeNameBtn) {
    changeNameBtn.disabled = true;
    changeNameBtn.classList.add('disabled');
    changeNameBtn.title = 'Renaming disabled by host';
    changeNameBtn.style.opacity = '0.5';
    changeNameBtn.style.cursor = 'not-allowed';
  }
  
  // Disable the name input field
  const nameInput = document.getElementById('partiticpantName');
  if (nameInput) {
    nameInput.disabled = true;
    nameInput.style.opacity = '0.7';
    nameInput.style.cursor = 'not-allowed';
    nameInput.title = 'Renaming disabled by host';
  }
  
  // Emit event to server to disable renaming for all participants
  if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
    window.hostMeetingInstance.socket.emit('disable-rename', {
      permissions: { allowRename: false }
    });
  }
  
  console.log('Participant renaming has been disabled');
  
  // Show toast notification
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.showToast('Participant renaming disabled for all participants', 'info');
  }
}

// Function to enable participant renaming for all participants
function enableRename() {
  // Clear the global flag
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.renameDisabled = false;
  }
  
  // Enable the name change button visually
  const changeNameBtn = document.querySelector('.change-name-btn');
  if (changeNameBtn) {
    changeNameBtn.disabled = false;
    changeNameBtn.classList.remove('disabled');
    changeNameBtn.title = 'Change your name';
    changeNameBtn.style.opacity = '1';
    changeNameBtn.style.cursor = 'pointer';
  }
  
  // Enable the name input field
  const nameInput = document.getElementById('partiticpantName');
  if (nameInput) {
    nameInput.disabled = false;
    nameInput.style.opacity = '1';
    nameInput.style.cursor = 'text';
    nameInput.title = 'Enter your name';
  }
  
  // Emit event to server to enable renaming for all participants
  if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
    window.hostMeetingInstance.socket.emit('enable-rename', {
      permissions: { allowRename: true }
    });
  }
  
  console.log('Participant renaming has been enabled');
  
  // Show toast notification
  if (window.hostMeetingInstance) {
    window.hostMeetingInstance.showToast('Participant renaming enabled for all participants', 'success');
  }
}

// Modified changeName function for ParticipantRenamer class
// This should replace the existing changeName method in renamingParticipant.js
function modifiedChangeName() {
  // Check if renaming is disabled
  if (window.hostMeetingInstance && window.hostMeetingInstance.renameDisabled) {
    if (window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('Renaming Disabled by Meeting Host', 'error');
    }
    return;
  }
  
  const nameInput = document.getElementById('partiticpantName');
  if (!nameInput) {
    console.error('Name input element not found');
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('Name input not found', 'error');
    }
    return;
  }
  
  const newName = nameInput.value.trim();
  const currentName = window.hostMeetingInstance ? window.hostMeetingInstance.userName : window.myName;
  
  // Validate the new name
  if (!newName) {
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('Please enter a valid name', 'error');
    }
    nameInput.focus();
    return;
  }
  
  if (newName.length > 50) {
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('Name is too long (max 50 characters)', 'error');
    }
    nameInput.focus();
    return;
  }
  
  if (newName === currentName) {
    if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
      window.hostMeetingInstance.showToast('That is already your current name', 'info');
    }
    return;
  }
  
  // Check if name is already taken by another participant
  if (window.hostMeetingInstance && window.hostMeetingInstance.participants) {
    const existingParticipant = Array.from(window.hostMeetingInstance.participants.values())
      .find(p => p.name.toLowerCase() === newName.toLowerCase() && p.socketId !== window.hostMeetingInstance.socket.id);
      
    if (existingParticipant) {
      if (window.hostMeetingInstance.showToast) {
        window.hostMeetingInstance.showToast('This name is already taken by another participant', 'error');
      }
      nameInput.focus();
      return;
    }
  }
  
  // Determine if user is host and send appropriate event
  const isHost = window.hostMeetingInstance && window.hostMeetingInstance.isHost;
  
  if (isHost) {
    // Host renaming themselves
    console.log('Sending host rename request:', { newName });
    window.hostMeetingInstance.socket.emit('host-rename-self', {
      newName: newName
    });
  } else {
    // Regular participant renaming themselves
    console.log('Sending participant rename request:', { newName });
    window.hostMeetingInstance.socket.emit('rename-participant', {
      newName: newName
    });
  }
  
  // Show loading state
  if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
    window.hostMeetingInstance.showToast('Changing name...', 'info');
  }
}

// Enhanced socket listener for rename permission updates
// Add this to the setupSocketListeners method in renamingParticipant.js
function enhancedRenamePermissionListener() {
  if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
    window.hostMeetingInstance.socket.on('rename-disabled', (data) => {
      console.log('Rename disabled by host:', data);
      
      // Set the flag
      if (window.hostMeetingInstance) {
        window.hostMeetingInstance.renameDisabled = true;
      }
      
      // Disable UI elements
      const changeNameBtn = document.querySelector('.change-name-btn');
      if (changeNameBtn) {
        changeNameBtn.disabled = true;
        changeNameBtn.classList.add('disabled');
        changeNameBtn.title = 'Renaming disabled by host';
        changeNameBtn.style.opacity = '0.5';
        changeNameBtn.style.cursor = 'not-allowed';
      }
      
      const nameInput = document.getElementById('partiticpantName');
      if (nameInput) {
        nameInput.disabled = true;
        nameInput.style.opacity = '0.7';
        nameInput.style.cursor = 'not-allowed';
        nameInput.title = 'Renaming disabled by host';
      }
      
      // Show toast notification
      if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
        window.hostMeetingInstance.showToast('Renaming Disabled by Meeting Host', 'info');
      }
    });

    window.hostMeetingInstance.socket.on('rename-enabled', (data) => {
      console.log('Rename enabled by host:', data);
      
      // Clear the flag
      if (window.hostMeetingInstance) {
        window.hostMeetingInstance.renameDisabled = false;
      }
      
      // Enable UI elements
      const changeNameBtn = document.querySelector('.change-name-btn');
      if (changeNameBtn) {
        changeNameBtn.disabled = false;
        changeNameBtn.classList.remove('disabled');
        changeNameBtn.title = 'Change your name';
        changeNameBtn.style.opacity = '1';
        changeNameBtn.style.cursor = 'pointer';
      }
      
      const nameInput = document.getElementById('partiticpantName');
      if (nameInput) {
        nameInput.disabled = false;
        nameInput.style.opacity = '1';
        nameInput.style.cursor = 'text';
        nameInput.title = 'Enter your name';
      }
      
      // Show toast notification
      if (window.hostMeetingInstance && window.hostMeetingInstance.showToast) {
        window.hostMeetingInstance.showToast('Renaming enabled by host', 'success');
      }
    });
  }
}

// CSS styles for disabled state
const disabledRenameCSS = `
<style>
.change-name-btn.disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: none;
  background-color: #6b7280 !important;
}

.change-name-btn.disabled:hover {
  background-color: #6b7280 !important;
  transform: none !important;
}

#partiticpantName:disabled {
  opacity: 0.7 !important;
  cursor: not-allowed !important;
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
}

#partiticpantName:disabled::placeholder {
  color: #9ca3af !important;
}
</style>
`;

// Inject CSS if not already present
if (!document.querySelector('#rename-control-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'rename-control-styles';
  styleElement.textContent = `
    .change-name-btn.disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      pointer-events: none;
      background-color: #6b7280 !important;
    }
    
    .change-name-btn.disabled:hover {
      background-color: #6b7280 !important;
      transform: none !important;
    }
    
    #partiticpantName:disabled {
      opacity: 0.7 !important;
      cursor: not-allowed !important;
      background-color: #f3f4f6 !important;
      color: #6b7280 !important;
    }
    
    #partiticpantName:disabled::placeholder {
      color: #9ca3af !important;
    }
  `;
  document.head.appendChild(styleElement);
}

// Make functions globally available
window.disableRename = disableRename;
window.enableRename = enableRename;

// Initialize the enhanced rename permission listener
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the meeting instance to be ready
  const waitForInstance = () => {
    if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
      enhancedRenamePermissionListener();
      console.log('Enhanced rename permission listener initialized');
    } else {
      setTimeout(waitForInstance, 500);
    }
  };
  waitForInstance();
});

// Auto-initialize if DOM is already loaded
if (document.readyState !== 'loading') {
  const waitForInstance = () => {
    if (window.hostMeetingInstance && window.hostMeetingInstance.socket) {
      enhancedRenamePermissionListener();
      console.log('Enhanced rename permission listener initialized');
    } else {
      setTimeout(waitForInstance, 500);
    }
  };
  waitForInstance();
}

    const socket = io();
       

        // Socket connection events
        socket.on('connect', () => {
         
            socket.emit('participantConnected');
        });

       

     

        // Handle renaming toggle from host - THIS IS THE KEY FUNCTIONALITY
        socket.on('renamingToggled', (allowRenaming) => {
            renamingAllowed = allowRenaming;
            
            if (allowRenaming) {
                enableRename(); // Called automatically when toggled ON
            } else {
                disableRename(); // Called automatically when toggled OFF
            }
            updateUIBasedOnSettings();
        });

       

     

        // Handle name change button click
    

        // Handle name change result
      

        // Utility functions
        function showStatusMessage(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message status-${type}`;
            statusMessage.style.display = 'block';
            statusMessage.classList.add('fade-in');
            
            setTimeout(() => {
                hideStatusMessage();
            }, 3000);
        }

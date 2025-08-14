/**
 * Meeting Display Settings Controller
 * External script to control meeting display settings like maximum visible participants
 */

class MeetingDisplaySettings {
  constructor() {
    this.hostMeetingInstance = null;
    this.initialized = false;
    this.init();
  }

  init() {
    // Wait for the host meeting instance to be available
    this.waitForHostInstance();
  }

  waitForHostInstance() {
    const checkInstance = () => {
      if (window.hostMeetingInstance) {
        this.hostMeetingInstance = window.hostMeetingInstance;
        this.setupSettingsControls();
        this.initialized = true;
        console.log('Meeting Display Settings initialized');
      } else {
        // Keep checking every 500ms until the instance is available
        setTimeout(checkInstance, 500);
      }
    };
    checkInstance();
  }

  setupSettingsControls() {
    // Find the maximum visible participants dropdown
    const maxParticipantsDropdown = this.findMaxParticipantsDropdown();
    
    if (maxParticipantsDropdown) {
      // Set current value
      this.setCurrentValue(maxParticipantsDropdown);
      
      // Add event listener for instant updates
      maxParticipantsDropdown.addEventListener('change', (e) => {
        this.updateMaxParticipants(parseInt(e.target.value));
      });
      
      console.log('Max participants dropdown control attached');
    } else {
      console.warn('Max participants dropdown not found, retrying...');
      // Retry after 1 second if dropdown not found
      setTimeout(() => this.setupSettingsControls(), 1000);
    }
  }

  findMaxParticipantsDropdown() {
    // Look for the dropdown by searching for the setting item with "Maximum Visible Participants" text
    const settingItems = document.querySelectorAll('.setting-item');
    
    for (let item of settingItems) {
      const spanText = item.querySelector('span');
      if (spanText && spanText.textContent.includes('Maximum Visible Participants')) {
        return item.querySelector('select.dropdown, .dropdown');
      }
    }
    
    // Alternative search methods
    const dropdowns = document.querySelectorAll('select.dropdown, .dropdown');
    for (let dropdown of dropdowns) {
      // Check if dropdown has options with values 9 and 15
      const options = dropdown.querySelectorAll('option');
      const values = Array.from(options).map(opt => opt.textContent.trim());
      if (values.includes('9') && values.includes('15')) {
        return dropdown;
      }
    }
    
    return null;
  }

  setCurrentValue(dropdown) {
    if (!this.hostMeetingInstance) return;
    
    // Get current maxParticipantsPerSet value
    const currentValue = this.hostMeetingInstance.maxParticipantsPerSet || 15;
    
    // Set dropdown to current value
    const options = dropdown.querySelectorAll('option');
    for (let option of options) {
      if (parseInt(option.textContent.trim()) === currentValue) {
        option.selected = true;
        break;
      }
    }
  }

  updateMaxParticipants(newValue) {
    if (!this.hostMeetingInstance) {
      console.error('Host meeting instance not available');
      return;
    }

    const oldValue = this.hostMeetingInstance.maxParticipantsPerSet;
    
    // Update the maximum participants per set
    this.hostMeetingInstance.maxParticipantsPerSet = newValue;
    
    // Also update maxSidebarParticipants to maintain consistency
    // Use a reasonable ratio for sidebar view
    this.hostMeetingInstance.maxSidebarParticipants = Math.min(newValue, 5);
    
    // Reset current sets to first page when changing limits
    this.hostMeetingInstance.currentGridSet = 0;
    this.hostMeetingInstance.currentSidebarSet = 0;
    
    // Instantly re-render participants with new settings
    this.hostMeetingInstance.renderParticipants();
    
    // Show feedback to user
    this.showSettingUpdateFeedback(oldValue, newValue);
    
    console.log(`Max participants updated from ${oldValue} to ${newValue}`);
  }

  showSettingUpdateFeedback(oldValue, newValue) {
    // Create a temporary feedback element
    const feedback = document.createElement('div');
    feedback.className = 'setting-feedback';
    feedback.innerHTML = `
      <i class="fas fa-check-circle"></i>
      Maximum visible participants updated to ${newValue}
    `;
    
    // Style the feedback element
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
      feedback.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      feedback.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 3000);
  }

  // Public method to manually update max participants
  setMaxParticipants(value) {
    const dropdown = this.findMaxParticipantsDropdown();
    if (dropdown) {
      dropdown.value = value.toString();
      this.updateMaxParticipants(value);
    }
  }

  // Public method to get current max participants
  getMaxParticipants() {
    return this.hostMeetingInstance ? this.hostMeetingInstance.maxParticipantsPerSet : null;
  }

  // Method to add additional dropdown options dynamically
  addDropdownOption(value, text = null) {
    const dropdown = this.findMaxParticipantsDropdown();
    if (dropdown) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text || value.toString();
      dropdown.appendChild(option);
      console.log(`Added dropdown option: ${value}`);
    }
  }

  // Method to validate and ensure proper integration
  validateIntegration() {
    const checks = {
      hostInstanceExists: !!window.hostMeetingInstance,
      dropdownFound: !!this.findMaxParticipantsDropdown(),
      controllerInitialized: this.initialized
    };
    
    console.log('Integration validation:', checks);
    return Object.values(checks).every(check => check);
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for the main script to initialize
  setTimeout(() => {
    window.meetingDisplaySettings = new MeetingDisplaySettings();
  }, 1000);
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, event listener above will handle it
} else {
  // DOM is already loaded
  setTimeout(() => {
    if (!window.meetingDisplaySettings) {
      window.meetingDisplaySettings = new MeetingDisplaySettings();
    }
  }, 1000);
}

// Expose utility functions globally for manual control
window.setMaxVisibleParticipants = function(value) {
  if (window.meetingDisplaySettings) {
    window.meetingDisplaySettings.setMaxParticipants(value);
  } else {
    console.warn('Meeting display settings not initialized yet');
  }
};

window.getMaxVisibleParticipants = function() {
  if (window.meetingDisplaySettings) {
    return window.meetingDisplaySettings.getMaxParticipants();
  }
  return null;
};

// Debug helper
window.validateMeetingSettings = function() {
  if (window.meetingDisplaySettings) {
    return window.meetingDisplaySettings.validateIntegration();
  }
  return false;
};
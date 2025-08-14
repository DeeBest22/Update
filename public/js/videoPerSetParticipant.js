/**
 * Grid Settings Controller
 * External script to control videosPerSet property in the meeting application
 * Works with existing HTML dropdown element
 */

class GridSettingsController {
  constructor() {
    this.defaultVideosPerSet = 15;
    this.settingsKey = 'meeting_grid_settings';
    this.meetingInstance = null;
    this.dropdownElement = null;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    // Load saved settings
    this.loadSettings();
    
    // Find and setup the dropdown
    this.setupDropdown();
    
    // Wait for meeting instance to be available
    this.waitForMeetingInstance();
  }

  setupDropdown() {
    this.dropdownElement = document.getElementById('videosPerSetDropdown');
    
    if (!this.dropdownElement) {
      console.warn('Grid settings dropdown not found. Expected element with id "videosPerSetDropdown"');
      return;
    }

    // Set the current value if it exists in options
    const currentValueOption = this.dropdownElement.querySelector(`option[value="${this.defaultVideosPerSet}"]`);
    if (currentValueOption) {
      this.dropdownElement.value = this.defaultVideosPerSet.toString();
    } else {
      // If saved value doesn't exist in options, use the first option as default
      const firstOption = this.dropdownElement.querySelector('option');
      if (firstOption) {
        this.defaultVideosPerSet = parseInt(firstOption.value);
        this.dropdownElement.value = firstOption.value;
      }
    }

    // Add event listener
    this.dropdownElement.addEventListener('change', (e) => {
      this.updateVideosPerSet(e.target.value);
    });

    console.log('Grid settings dropdown initialized with value:', this.defaultVideosPerSet);
  }

  waitForMeetingInstance() {
    const checkForInstance = () => {
      // Check for either window.hostMeetingInstance or window.hostMeeting
      this.meetingInstance = window.hostMeetingInstance || window.hostMeeting;
      
      if (this.meetingInstance) {
        console.log('Meeting instance found, applying grid settings');
        this.applySettingsToMeeting();
      } else {
        // Keep checking every 500ms until instance is available
        setTimeout(checkForInstance, 500);
      }
    };
    
    checkForInstance();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        const settings = JSON.parse(saved);
        this.defaultVideosPerSet = settings.videosPerSet || 15;
      }
    } catch (error) {
      console.warn('Could not load grid settings:', error);
    }
  }

  saveSettings() {
    try {
      const settings = {
        videosPerSet: this.defaultVideosPerSet,
        timestamp: Date.now()
      };
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch (error) {
      console.warn('Could not save grid settings:', error);
    }
  }

  applySettingsToMeeting() {
    if (this.meetingInstance) {
      const oldValue = this.meetingInstance.videosPerSet;
      this.meetingInstance.videosPerSet = this.defaultVideosPerSet;
      
      console.log(`Updated videosPerSet from ${oldValue} to ${this.defaultVideosPerSet}`);
      
      // If we're in grid view, refresh the display
      if (this.meetingInstance.currentView === 'grid') {
        this.meetingInstance.renderParticipants();
      }
    }
  }

  updateVideosPerSet(newValue) {
    const parsedValue = parseInt(newValue);
    if (isNaN(parsedValue) || parsedValue < 1) {
      console.warn('Invalid videosPerSet value:', newValue);
      return;
    }

    this.defaultVideosPerSet = parsedValue;
    this.saveSettings();
    this.applySettingsToMeeting();
    
    console.log(`Grid settings updated to ${parsedValue} participants`);
    
    // Show toast notification if meeting instance has the method
    if (this.meetingInstance && typeof this.meetingInstance.showToast === 'function') {
      this.meetingInstance.showToast(`Maximum visible participants set to ${parsedValue}`);
    }
  }

  // Public API methods
  getCurrentSetting() {
    return this.defaultVideosPerSet;
  }

  setVideosPerSet(value) {
    const parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue < 1) {
      console.warn('Invalid videosPerSet value:', value);
      return;
    }

    // Update dropdown if the value exists as an option
    if (this.dropdownElement) {
      const option = this.dropdownElement.querySelector(`option[value="${parsedValue}"]`);
      if (option) {
        this.dropdownElement.value = parsedValue.toString();
        this.updateVideosPerSet(parsedValue);
      } else {
        console.warn(`Value ${parsedValue} not available in dropdown options`);
      }
    } else {
      // If dropdown not found, just update the setting
      this.updateVideosPerSet(parsedValue);
    }
  }

  // Console-friendly methods
  showCurrentSettings() {
    console.group('🎛️ Grid Settings');
    console.log('Current videosPerSet:', this.defaultVideosPerSet);
    console.log('Dropdown element:', this.dropdownElement ? 'Found' : 'Not found');
    console.log('Meeting instance:', this.meetingInstance ? 'Connected' : 'Not found');
    if (this.meetingInstance) {
      console.log('Current view:', this.meetingInstance.currentView);
      console.log('Participants count:', this.meetingInstance.participants?.size || 0);
    }
    if (this.dropdownElement) {
      const availableOptions = Array.from(this.dropdownElement.querySelectorAll('option')).map(opt => opt.value);
      console.log('Available options:', availableOptions);
    }
    console.groupEnd();
  }

  getAvailableOptions() {
    if (!this.dropdownElement) {
      return [];
    }
    return Array.from(this.dropdownElement.querySelectorAll('option')).map(opt => parseInt(opt.value));
  }
}

// Initialize the controller
const gridSettings = new GridSettingsController();

// Make it globally accessible for console use
window.gridSettings = gridSettings;

// Console helper functions
window.setGridSize = function(size) {
  gridSettings.setVideosPerSet(size);
  console.log(`Grid size set to ${size}`);
};

window.getGridSize = function() {
  const current = gridSettings.getCurrentSetting();
  console.log(`Current grid size: ${current}`);
  return current;
};

window.showGridSettings = function() {
  gridSettings.showCurrentSettings();
};

window.getAvailableGridSizes = function() {
  const options = gridSettings.getAvailableOptions();
  console.log('Available grid sizes:', options);
  return options;
};

console.log('Grid Settings Controller loaded. Use window.gridSettings to access programmatically.');
console.log('Console commands: setGridSize(n), getGridSize(), showGridSettings(), getAvailableGridSizes()');
// Meeting Name Management Module
class MeetingNameManager {
    constructor(hostMeetingInstance) {
        this.hostInstance = hostMeetingInstance;
        this.meetingName = '';
    }

    // Initialize meeting name from URL or set default
    async initializeMeetingName() {
        // Get meeting name from URL parameters or use default
        const urlParams = new URLSearchParams(window.location.search);
        const urlMeetingName = urlParams.get('name');
        
        // Check if there's a custom meeting name from the modal
        const customMeetingName = this.getCustomMeetingNameFromModal();
        
        if (customMeetingName) {
            this.meetingName = customMeetingName;
            console.log('Using custom meeting name from modal:', this.meetingName);
        } else if (urlMeetingName) {
            this.meetingName = urlMeetingName.trim();
            console.log('Using URL meeting name:', this.meetingName);
        } else {
            this.meetingName = `${this.hostInstance.userName}'s Meeting`;
            console.log('Using default meeting name:', this.meetingName);
        }
        
        // Update meeting title if element exists
        const meetingTitleEl = document.querySelector('.meeting-title, #meetingTitle');
        if (meetingTitleEl) {
            meetingTitleEl.textContent = this.meetingName;
        }
        
        return this.meetingName;
    }

    // Update meeting name
    updateMeetingName(newName) {
        const trimmedName = newName.trim();
        if (!trimmedName) return;
        
        this.meetingName = trimmedName;
        console.log('Meeting name updated to:', this.meetingName);
        
        // Update the UI immediately
        const meetingTitleEl = document.querySelector('.meeting-title, #meetingTitle');
        if (meetingTitleEl) {
            meetingTitleEl.textContent = this.meetingName;
        }
        
        // CRITICAL: Notify server about name change so it updates socket.meetingData
        this.hostInstance.socket.emit('meeting-name-changed', {
            meetingId: this.hostInstance.meetingId,
            newName: this.meetingName,
            userId: this.hostInstance.userId
        });
        
        // Show confirmation to user
        this.hostInstance.showToast('Meeting renamed successfully', 'success');
    }

    // Update meeting title in UI
    updateMeetingTitle() {
        const meetingTitleEl = document.getElementById('meetingTitle');
        if (meetingTitleEl) {
            meetingTitleEl.textContent = this.meetingName;
        }
    }

    // Enable meeting name editing
    enableMeetingNameEdit() {
        const meetingTitleEl = document.getElementById('meetingTitle');
        if (!meetingTitleEl) return;
        
        // Make it editable
        meetingTitleEl.contentEditable = true;
        meetingTitleEl.style.cursor = 'text';
        meetingTitleEl.style.padding = '4px 8px';
        meetingTitleEl.style.border = '1px dashed #ccc';
        
        // Add event listeners
        meetingTitleEl.addEventListener('blur', () => {
            const newName = meetingTitleEl.textContent.trim();
            if (newName && newName !== this.meetingName) {
                this.updateMeetingName(newName);
            }
            
            // Remove edit styling
            meetingTitleEl.contentEditable = false;
            meetingTitleEl.style.cursor = 'pointer';
            meetingTitleEl.style.border = 'none';
        });
        
        meetingTitleEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                meetingTitleEl.blur(); // Trigger the blur event
            }
            if (e.key === 'Escape') {
                meetingTitleEl.textContent = this.meetingName; // Reset to original
                meetingTitleEl.blur();
            }
        });
        
        // Select all text for easy editing
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(meetingTitleEl);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Sync meeting name from UI
    syncMeetingNameFromUI() {
        const meetingTitleEl = document.querySelector('.meeting-title, #meetingTitle');
        if (meetingTitleEl) {
            const displayedName = meetingTitleEl.textContent.trim();
            if (displayedName && displayedName !== this.meetingName) {
                console.log('Auto-syncing meeting name from UI:', displayedName);
                this.meetingName = displayedName;
            }
        }
    }

    // Handle meeting name updated from server
    handleMeetingNameUpdated(data) {
        console.log('Meeting name updated by host:', data);
        this.meetingName = data.newName;
        this.updateMeetingTitle();
        this.hostInstance.showToast(`Meeting renamed to "${data.newName}"`);
    }

    // Get final meeting name for meeting end
    getFinalMeetingName() {
        // Get the absolute final meeting name from UI
        const currentMeetingTitleEl = document.querySelector('.meeting-title, #meetingTitle');
        const finalMeetingName = currentMeetingTitleEl ? 
            currentMeetingTitleEl.textContent.trim() : 
            this.meetingName;
        
        // Update our stored meeting name to match final UI state
        if (finalMeetingName && finalMeetingName !== this.meetingName) {
            this.meetingName = finalMeetingName;
            console.log('Final meeting name synchronized:', this.meetingName);
        }
        
        return this.meetingName;
    }
    
    // Get custom meeting name from modal input
    getCustomMeetingNameFromModal() {
        const meetingNameInput = document.getElementById('meetingNameInput');
        if (meetingNameInput && meetingNameInput.value.trim()) {
            return meetingNameInput.value.trim();
        }
        return null;
    }
    
    // Set meeting name from modal before starting meeting
    setMeetingNameFromModal() {
        const customName = this.getCustomMeetingNameFromModal();
        if (customName) {
            this.updateMeetingName(customName);
            return true;
        }
        return false;
    }

    // Show meeting info with current name
    updateMeetingInfoDisplay() {
        // Update meeting name from current UI state before showing
        this.updateMeetingTitle();
        
        // Add current meeting name to the modal (if there's a field for it)
        const meetingNameDisplay = document.getElementById('displayMeetingName');
        if (meetingNameDisplay) {
            meetingNameDisplay.textContent = this.meetingName;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetingNameManager;
} else {
    window.MeetingNameManager = MeetingNameManager;
}
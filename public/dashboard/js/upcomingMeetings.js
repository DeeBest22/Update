class UpcomingMeetings {
    constructor() {
        this.meetings = [];
        this.user = null;
        this.apiBaseUrl = this.detectApiUrl();
        this.socket = null;
        this.initializeElements();
        this.initializeSocket();
        this.loadUserData();
        this.loadMeetings();
        this.startAutoRefresh();
        
        console.log(`🌐 API Base URL: ${this.apiBaseUrl}`);
    }

    detectApiUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (protocol === 'file:' || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        
        return port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Socket connected for upcoming meetings');
            });

            this.socket.on('meeting-scheduled', (data) => {
                console.log('New meeting scheduled:', data);
                this.loadMeetings(); // Refresh the meetings list
            });

            this.socket.on('meeting-deleted', (data) => {
                console.log('Meeting deleted:', data);
                this.loadMeetings(); // Refresh the meetings list
            });

            this.socket.on('disconnect', () => {
                console.log('Socket disconnected');
            });

        } catch (error) {
            console.error('Error initializing socket:', error);
        }
    }

    initializeElements() {
        this.gmailInfo = document.getElementById('gmailInfo');
        this.gmailText = document.getElementById('gmailText');
        this.loadingContainer = document.getElementById('loadingContainer');
        this.meetingsContainer = document.getElementById('meetingsContainer');
        this.emptyState = document.getElementById('emptyState');
        this.errorState = document.getElementById('errorState');
        this.errorMessage = document.getElementById('errorMessage');
    }

    async loadUserData() {
        try {
            console.log('🔄 Loading user data...');
            
            // Try persistent session endpoint first
            let response = await fetch(`${this.apiBaseUrl}/api/auth/status`, {
                method: 'GET',
                credentials: 'include',
                headers: { 
                    'Accept': 'application/json',
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('❌ User not authenticated, redirecting to login...');
                    this.clearSession();
                    window.location.href = '/login';
                    return;
                }
                
                console.log('🔄 Auth status failed, trying regular user endpoint...');
                response = await fetch(`${this.apiBaseUrl}/api/user`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        console.log('❌ User not authenticated, redirecting to login...');
                        this.clearSession();
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('✅ User data loaded:', data);
            
            // Handle response format
            if (data.success && data.user) {
                this.user = data.user;
            } else if (data.user) {
                this.user = data.user;
            } else {
                this.user = data;
            }
            
            this.updateGmailInfo();

        } catch (error) {
            console.error('❌ Error loading user data:', error);
            this.showGmailError();
            
            if (error.message.includes('401')) {
                this.clearSession();
                window.location.href = '/login';
            }
        }
    }

    updateGmailInfo() {
        if (!this.user) return;

        if (this.gmailInfo) {
            this.gmailInfo.classList.remove('loading');
        }
        if (this.gmailText) {
            this.gmailText.textContent = this.user.email;
        }
        
        console.log('✅ Gmail info updated:', this.user.email);
    }

    showGmailError() {
        if (this.gmailInfo) {
            this.gmailInfo.classList.remove('loading');
        }
        if (this.gmailText) {
            this.gmailText.textContent = 'Error loading email';
        }
    }

    async loadMeetings() {
        try {
            console.log('🔄 Loading meetings...');
            this.showLoading();

            let response = await fetch(`${this.apiBaseUrl}/api/meetings`, {
                method: 'GET',
                credentials: 'include',
                headers: { 
                    'Accept': 'application/json',
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('❌ User not authenticated');
                    this.clearSession();
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Meetings loaded:', data);
            
            this.meetings = data.meetings || [];
            this.renderMeetings();

        } catch (error) {
            console.error('❌ Error loading meetings:', error);
            this.showError(error.message);
            
            if (error.message.includes('401')) {
                this.clearSession();
                window.location.href = '/login';
            }
        }
    }

    getAuthHeader() {
        return '';
    }

    clearSession() {
        document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        localStorage.removeItem('userSession');
        localStorage.removeItem('newMeetingScheduled');
    }

    renderMeetings() {
        this.hideAllStates();

        if (this.meetings.length === 0) {
            if (this.emptyState) {
                this.emptyState.style.display = 'block';
            }
            return;
        }

        if (this.meetingsContainer) {
            this.meetingsContainer.style.display = 'block';
            this.meetingsContainer.innerHTML = this.meetings.map(meeting => this.createMeetingCard(meeting)).join('');
        }
        
        console.log(`✅ Rendered ${this.meetings.length} meetings`);
    }

    createMeetingCard(meeting) {
        const meetingDate = new Date(`${meeting.date}T00:00:00`);
        const now = new Date();
        const isToday = meetingDate.toDateString() === now.toDateString();
        const isTomorrow = meetingDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        let dateText;
        if (isToday) {
            dateText = 'Today';
        } else if (isTomorrow) {
            dateText = 'Tomorrow';
        } else {
            dateText = meetingDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        // Format time
        const [hours, minutes] = meeting.time.split(':');
        const hour24 = parseInt(hours);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const timeText = `${hour12}:${minutes} ${ampm}`;

        // Create participant count
        const allParticipants = [meeting.scheduler, ...meeting.participants];
        const remainingCount = Math.max(0, allParticipants.length - 4);

        const participantCountBadge = remainingCount > 0 ? 
            `<span class="participant-count">+${remainingCount}</span>` : '';

        return `
            <div class="meeting-card" data-meeting-id="${meeting.id}">
                <div class="meeting-time">
                    <div class="meeting-date">${dateText}</div>
                    <div class="meeting-hour">${timeText}</div>
                </div>
                <div class="meeting-content">
                    <h4>${this.escapeHtml(meeting.title)}</h4>
                    <p>${meeting.description ? this.escapeHtml(meeting.description) : 'No description provided'}</p>
                    <div class="meeting-participants">
                        ${participantCountBadge}
                    </div>
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-primary" onclick="joinMeeting('${meeting.id}')">
                        <i class="fas fa-video"></i> Start Meeting
                    </button>
                    <button class="btn btn-danger" onclick="deleteMeeting('${meeting.id}', '${this.escapeHtml(meeting.title)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        this.hideAllStates();
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'flex';
        }
    }

    showError(message) {
        this.hideAllStates();
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
        }
        if (this.errorState) {
            this.errorState.style.display = 'block';
        }
    }

    hideAllStates() {
        if (this.loadingContainer) {
            this.loadingContainer.style.display = 'none';
        }
        if (this.meetingsContainer) {
            this.meetingsContainer.style.display = 'none';
        }
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
        if (this.errorState) {
            this.errorState.style.display = 'none';
        }
    }

    startAutoRefresh() {
        // Refresh meetings every 30 seconds
        setInterval(() => {
            this.loadMeetings();
        }, 30000);

        console.log('🔄 Auto-refresh enabled (30s interval)');
    }

    // Public method for manual refresh
    refresh() {
        this.loadMeetings();
    }
}

// Global functions for meeting actions
function joinMeeting(meetingId) {
    const meeting = upcomingMeetings.meetings.find(m => m.id === meetingId);
    if (meeting) {
        console.log('🎥 Joining meeting:', meeting.title);
        alert(`Joining meeting: ${meeting.title}\n\nIn a real implementation, this would open your video conferencing platform.`);
    }
}

async function deleteMeeting(meetingId, meetingTitle) {
    const confirmed = confirm(`Are you sure you want to delete the meeting "${meetingTitle}"?\n\nThis action cannot be undone and you will no longer receive notifications for this meeting.`);
    
    if (!confirmed) {
        return;
    }

    try {
        console.log('🗑️ Deleting meeting:', meetingTitle);
        
        const deleteBtn = document.querySelector(`[onclick*="deleteMeeting('${meetingId}'"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        }

        const response = await fetch(`${upcomingMeetings.apiBaseUrl}/api/meetings/${meetingId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 
                'Accept': 'application/json',
                'Authorization': upcomingMeetings.getAuthHeader()
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('❌ User not authenticated');
                upcomingMeetings.clearSession();
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Meeting deleted:', data);
        
        alert(`Meeting "${meetingTitle}" has been deleted successfully.\n\nYou will no longer receive notifications for this meeting.`);
        
        upcomingMeetings.refresh();

    } catch (error) {
        console.error('❌ Error deleting meeting:', error);
        alert(`Failed to delete meeting: ${error.message}\n\nPlease try again.`);
        
        const deleteBtn = document.querySelector(`[onclick*="deleteMeeting('${meetingId}'"]`);
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }
    }
}

function viewMeetingDetails(meetingId) {
    const meeting = upcomingMeetings.meetings.find(m => m.id === meetingId);
    if (meeting) {
        console.log('📋 Viewing meeting details:', meeting.title);
        
        const participants = [meeting.scheduler, ...meeting.participants];
        const participantList = participants.map(p => `• ${p.name} (${p.email})`).join('\n');
        
        const details = `Meeting Details:
        
Title: ${meeting.title}
Date: ${new Date(meeting.date + 'T00:00:00').toLocaleDateString()}
Time: ${meeting.time}
Duration: ${meeting.duration} minutes
Description: ${meeting.description || 'No description'}

Participants (${participants.length}):
${participantList}`;
        
        alert(details);
    }
}

function refreshMeetings() {
    if (window.upcomingMeetings) {
        upcomingMeetings.refresh();
    }
}

// Initialize the application
let upcomingMeetings;
document.addEventListener('DOMContentLoaded', () => {
    try {
        upcomingMeetings = new UpcomingMeetings();
        console.log('🚀 Upcoming Meetings initialized successfully');
        
        window.upcomingMeetings = upcomingMeetings;
    } catch (error) {
        console.error('❌ Failed to initialize Upcoming Meetings:', error);
    }
});

// Listen for storage events to detect new meetings from other tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'newMeetingScheduled') {
        console.log('🔔 New meeting detected from another tab, refreshing...');
        if (upcomingMeetings) {
            upcomingMeetings.refresh();
        }
        localStorage.removeItem('newMeetingScheduled');
    }
});
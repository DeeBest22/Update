
        class UpcomingMeetings {
            constructor() {
                this.meetings = [];
                this.user = null;
                this.apiBaseUrl = this.detectApiUrl();
                this.initializeElements();
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
                    
                    const response = await fetch(`${this.apiBaseUrl}/api/user`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            console.log('❌ User not authenticated, redirecting to login...');
                            window.location.href = '/login';
                            return;
                        }
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('✅ User data loaded:', data.user);
                    
                    this.user = data.user;
                    this.updateGmailInfo();

                } catch (error) {
                    console.error('❌ Error loading user data:', error);
                    this.showGmailError();
                }
            }

            updateGmailInfo() {
                if (!this.user) return;

                this.gmailInfo.classList.remove('loading');
                this.gmailText.textContent = this.user.email;
                
                console.log('✅ Gmail info updated:', this.user.email);
            }

            showGmailError() {
                this.gmailInfo.classList.remove('loading');
                this.gmailText.textContent = 'Error loading email';
            }

            async loadMeetings() {
                try {
                    console.log('🔄 Loading meetings...');
                    this.showLoading();

                    const response = await fetch(`${this.apiBaseUrl}/api/meetings`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            console.log('❌ User not authenticated');
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
                }
            }

            renderMeetings() {
                this.hideAllStates();

                if (this.meetings.length === 0) {
                    this.emptyState.style.display = 'block';
                    return;
                }

                this.meetingsContainer.style.display = 'block';
                this.meetingsContainer.innerHTML = this.meetings.map(meeting => this.createMeetingCard(meeting)).join('');
                
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

                // Create participant images
                const allParticipants = [meeting.scheduler, ...meeting.participants];
                const visibleParticipants = allParticipants.slice(0, 4);
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
                    </div><br>
                `;
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            showLoading() {
                this.hideAllStates();
                this.loadingContainer.style.display = 'flex';
            }

            showError(message) {
                this.hideAllStates();
                this.errorMessage.textContent = message;
                this.errorState.style.display = 'block';
            }

            hideAllStates() {
                this.loadingContainer.style.display = 'none';
                this.meetingsContainer.style.display = 'none';
                this.emptyState.style.display = 'none';
                this.errorState.style.display = 'none';
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
                // In a real implementation, this would open the video call
                alert(`Joining meeting: ${meeting.title}\n\nIn a real implementation, this would open your video conferencing platform.`);
            }
        }

        async function deleteMeeting(meetingId, meetingTitle) {
            // Confirm deletion
            const confirmed = confirm(`Are you sure you want to delete the meeting "${meetingTitle}"?\n\nThis action cannot be undone and you will no longer receive notifications for this meeting.`);
            
            if (!confirmed) {
                return;
            }

            try {
                console.log('🗑️ Deleting meeting:', meetingTitle);
                
                // Show loading state on the delete button
                const deleteBtn = document.querySelector(`[onclick*="deleteMeeting('${meetingId}'"]`);
                if (deleteBtn) {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                }

                const response = await fetch(`${upcomingMeetings.apiBaseUrl}/api/meetings/${meetingId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        console.log('❌ User not authenticated');
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ Meeting deleted:', data);
                
                // Show success message
                alert(`Meeting "${meetingTitle}" has been deleted successfully.\n\nYou will no longer receive notifications for this meeting.`);
                
                // Refresh the meetings list
                upcomingMeetings.refresh();

            } catch (error) {
                console.error('❌ Error deleting meeting:', error);
                alert(`Failed to delete meeting: ${error.message}\n\nPlease try again.`);
                
                // Reset button state
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
                
                // Make it available globally for debugging
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
 
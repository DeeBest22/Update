// Participant Meeting Activity Tracker
class ParticipantMeetingTracker {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.meetingId = null;
        this.meetingName = null;
        this.sessionId = null;
        this.joinTime = null;
        this.isTracking = false;
        this.heartbeatInterval = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadUserData();
            this.extractMeetingInfo();
            this.initializeSocket();
            this.setupEventListeners();
            this.startMeetingTracking();
            this.setupHeartbeat();
            this.setupBeforeUnloadHandler();
            
            console.log('Participant meeting tracker initialized');
        } catch (error) {
            console.error('Error initializing participant tracker:', error);
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                console.log('Participant tracker - User loaded:', this.currentUser.name);
            } else if (response.status === 401) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    extractMeetingInfo() {
        // Extract meeting ID from URL
        const pathParts = window.location.pathname.split('/');
        this.meetingId = pathParts[pathParts.length - 1];
        
        // Get meeting name from page title or default
        this.meetingName = document.title.includes('Video Call') ? 
            'Video Call Meeting' : 
            document.title.replace(' - Video Call App', '');
        
        this.sessionId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.joinTime = new Date();
        
        console.log('Meeting info extracted:', {
            meetingId: this.meetingId,
            meetingName: this.meetingName,
            sessionId: this.sessionId
        });
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Participant tracker socket connected');
                if (this.currentUser) {
                    this.socket.emit('join-user-room', this.currentUser.id);
                }
            });

            // Listen for meeting name changes
            this.socket.on('meeting-name-updated', (data) => {
                if (data.meetingId === this.meetingId && data.newName) {
                    console.log('Meeting name updated to:', data.newName);
                    this.meetingName = data.newName;
                    
                    // Update page title
                    document.title = `${data.newName} - Video Call App`;
                    
                    // Update any meeting title elements on the page
                    const titleElements = document.querySelectorAll('.meeting-title');
                    titleElements.forEach(el => {
                        el.textContent = data.newName;
                    });
                }
            });

            this.socket.on('disconnect', () => {
                console.log('Participant tracker socket disconnected');
            });

        } catch (error) {
            console.error('Error initializing socket for participant tracker:', error);
        }
    }

    setupEventListeners() {
        // Listen for end call button clicks
        const endCallBtn = document.querySelector('.end-call-btn');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                this.handleMeetingExit('normal_exit');
            });
        }

        // Listen for meeting title changes (if there's a title input)
        const titleInputs = document.querySelectorAll('input[type="text"]');
        titleInputs.forEach(input => {
            if (input.placeholder && input.placeholder.toLowerCase().includes('meeting')) {
                input.addEventListener('input', (e) => {
                    if (e.target.value.trim()) {
                        this.meetingName = e.target.value.trim();
                        console.log('Meeting name updated via input:', this.meetingName);
                    }
                });
            }
        });

        // Listen for any meeting name changes in the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const titleElements = document.querySelectorAll('.meeting-title, h1, h2');
                    titleElements.forEach(el => {
                        const text = el.textContent.trim();
                        if (text && text !== this.meetingName && 
                            !text.includes('Video Call') && 
                            !text.includes('Dashboard') &&
                            text.length > 3) {
                            console.log('Meeting name detected from DOM:', text);
                            this.meetingName = text;
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    async startMeetingTracking() {
        if (!this.currentUser || !this.meetingId || this.isTracking) {
            return;
        }

        try {
            const response = await fetch('/api/meeting-activity/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meetingName: this.meetingName,
                    meetingId: this.meetingId,
                    isHost: false, // This is always false for participants
                    sessionId: this.sessionId
                })
            });

            if (response.ok) {
                this.isTracking = true;
                console.log('Started tracking participant meeting:', this.meetingName);
                
                // Emit socket event for real-time tracking
                if (this.socket) {
                    this.socket.emit('participant-joined-meeting', {
                        meetingId: this.meetingId,
                        meetingName: this.meetingName,
                        userId: this.currentUser.id,
                        sessionId: this.sessionId
                    });
                }
            } else {
                console.error('Failed to start meeting tracking:', response.status);
            }
        } catch (error) {
            console.error('Error starting meeting tracking:', error);
        }
    }

    setupHeartbeat() {
        // Send heartbeat every 30 seconds to keep session alive
        this.heartbeatInterval = setInterval(() => {
            if (this.isTracking && this.socket && this.socket.connected) {
                this.socket.emit('meeting-heartbeat', {
                    meetingId: this.meetingId,
                    userId: this.currentUser?.id,
                    meetingName: this.meetingName,
                    sessionId: this.sessionId
                });
            }
        }, 30000);
    }

    setupBeforeUnloadHandler() {
        // Handle tab close/refresh
        window.addEventListener('beforeunload', () => {
            this.handleMeetingExit('tab_close');
        });

        // Handle page visibility changes (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // User switched tabs or minimized window
                this.sendHeartbeat();
            }
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => {
            this.handleMeetingExit('navigation');
        });
    }

    sendHeartbeat() {
        if (this.socket && this.socket.connected && this.isTracking) {
            this.socket.emit('meeting-heartbeat', {
                meetingId: this.meetingId,
                userId: this.currentUser?.id,
                meetingName: this.meetingName,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });
        }
    }

    async handleMeetingExit(exitType = 'normal_exit') {
        if (!this.isTracking) {
            return;
        }

        console.log(`Handling meeting exit: ${exitType}`);
        
        try {
            const endTime = new Date();
            const duration = Math.round((endTime - this.joinTime) / (1000 * 60));

            // Save activity to database
            const response = await fetch('/api/meeting-activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meetingName: this.meetingName,
                    meetingId: this.meetingId,
                    status: 'completed',
                    duration: Math.max(1, duration), // Minimum 1 minute
                    participantCount: 1,
                    startTime: this.joinTime.toISOString(),
                    endTime: endTime.toISOString(),
                    isHost: false,
                    joinTime: this.joinTime.toISOString(),
                    leaveTime: endTime.toISOString(),
                    finalMeetingName: this.meetingName,
                    sessionId: this.sessionId
                })
            });

            if (response.ok) {
                console.log(`Meeting activity saved: ${this.meetingName} (${duration} minutes)`);
            }

            // Emit socket event
            if (this.socket && this.socket.connected) {
                this.socket.emit('participant-left-meeting', {
                    meetingId: this.meetingId,
                    meetingName: this.meetingName,
                    userId: this.currentUser?.id,
                    sessionId: this.sessionId,
                    duration,
                    exitType
                });
            }

            this.isTracking = false;
            
            // Clear heartbeat
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }

        } catch (error) {
            console.error('Error handling meeting exit:', error);
        }
    }

    // Method to update meeting name during the meeting
    updateMeetingName(newName) {
        if (newName && newName.trim() && newName.trim() !== this.meetingName) {
            const oldName = this.meetingName;
            this.meetingName = newName.trim();
            
            console.log(`Meeting name changed from "${oldName}" to "${this.meetingName}"`);
            
            // Emit socket event
            if (this.socket && this.socket.connected) {
                this.socket.emit('meeting-name-changed', {
                    meetingId: this.meetingId,
                    newName: this.meetingName,
                    userId: this.currentUser?.id,
                    sessionId: this.sessionId
                });
            }
        }
    }

    // Method to manually end meeting (for exit button)
    async exitMeeting() {
        await this.handleMeetingExit('manual_exit');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1000);
    }
}

// Make it globally available
window.ParticipantMeetingTracker = ParticipantMeetingTracker;
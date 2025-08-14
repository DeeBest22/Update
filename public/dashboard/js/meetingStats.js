// Meeting Statistics Dashboard JavaScript
class MeetingStatsManager {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.stats = null;
        this.init();
    }

    async init() {
        try {
            await this.loadUserData();
            await this.loadStats();
            this.initializeSocket();
            this.setupEventListeners();
            console.log('Meeting stats manager initialized');
        } catch (error) {
            console.error('Error initializing meeting stats:', error);
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                console.log('User data loaded:', this.currentUser);
            } else if (response.status === 401) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/meeting-stats');
            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats;
                this.updateStatsDisplay();
                console.log('Stats loaded:', this.stats);
            } else {
                console.error('Failed to load stats:', response.status);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay() {
        if (!this.stats) return;

        // Update total calls
        const totalCallsElement = document.querySelector('.stat-card.primary .stat-number');
        if (totalCallsElement) {
            totalCallsElement.textContent = this.stats.totalCalls.value;
        }

        const totalCallsChange = document.querySelector('.stat-card.primary .stat-change');
        if (totalCallsChange) {
            const change = this.stats.totalCalls.change;
            const icon = change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';
            const className = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
            
            totalCallsChange.className = `stat-change ${className}`;
            totalCallsChange.innerHTML = `
                <i class="fas ${icon}"></i>
                ${Math.abs(change)}%
            `;
        }

        // Update total duration
        const totalDurationElement = document.querySelector('.stat-card.success .stat-number');
        if (totalDurationElement) {
            totalDurationElement.textContent = this.stats.totalDuration.value;
        }

        const totalDurationChange = document.querySelector('.stat-card.success .stat-change');
        if (totalDurationChange) {
            const change = this.stats.totalDuration.change;
            const icon = change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';
            const className = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
            
            totalDurationChange.className = `stat-change ${className}`;
            totalDurationChange.innerHTML = `
                <i class="fas ${icon}"></i>
                ${Math.abs(change)}%
            `;
        }

        // Update meetings scheduled
        const meetingsScheduledElement = document.querySelector('.stat-card.info .stat-number');
        if (meetingsScheduledElement) {
            meetingsScheduledElement.textContent = this.stats.meetingsScheduled.value;
        }

        console.log('Stats display updated');
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Socket connected for stats');
                if (this.currentUser) {
                    this.socket.emit('join-user-room', this.currentUser.id);
                }
            });

            this.socket.on('stats-updated', (data) => {
                console.log('Stats updated via socket:', data);
                if (data.stats) {
                    this.stats = data.stats;
                    this.updateStatsDisplay();
                }
            });

            this.socket.on('activity-updated', (data) => {
                console.log('Activity updated, refreshing stats:', data);
                // Reload stats when new activity is recorded
                this.loadStats();
            });

        } catch (error) {
            console.error('Error initializing socket for stats:', error);
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here
        console.log('Event listeners set up for meeting stats');
    }

    // Method to manually record meeting activity (for testing)
    async recordMeetingActivity(action, meetingData) {
        try {
            const response = await fetch('/api/meeting-stats/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    ...meetingData
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats;
                this.updateStatsDisplay();
                console.log('Meeting activity recorded:', data);
            }
        } catch (error) {
            console.error('Error recording meeting activity:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
        window.meetingStatsManager = new MeetingStatsManager();
    }
});
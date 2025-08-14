// Recent Activity Manager for Dashboard
class RecentActivityManager {
    constructor() {
        this.activities = [];
        this.socket = null;
        this.currentUser = null;
        this.activityContainer = document.getElementById('activityList');
        this.init();
    }

    async init() {
        try {
            await this.loadUserData();
            await this.loadActivities();
            this.initializeSocket();
            this.startPeriodicRefresh();
            console.log('Recent Activity Manager initialized');
        } catch (error) {
            console.error('Error initializing recent activity manager:', error);
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
            } else if (response.status === 401) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadActivities() {
        try {
            const response = await fetch('/api/recent-activities');
            if (response.ok) {
                const data = await response.json();
                this.activities = data.activities || [];
                this.renderActivities();
            } else {
                console.error('Failed to load activities:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            this.showError();
        }
    }

    initializeSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Socket connected for recent activities');
                if (this.currentUser) {
                    this.socket.emit('join-user-room', this.currentUser.id);
                }
            });

            this.socket.on('activity-updated', (data) => {
                console.log('Activity updated via socket:', data);
                this.loadActivities(); // Refresh activities
            });

        } catch (error) {
            console.error('Error initializing socket for activities:', error);
        }
    }

    renderActivities() {
        if (!this.activityContainer) return;

        if (this.activities.length === 0) {
            this.activityContainer.innerHTML = `
                <div class="activity-empty">
                    <i class="fas fa-calendar-times"></i>
                    <span>No recent activities</span>
                </div>
            `;
            return;
        }

        const activitiesHtml = this.activities.map(activity => {
            const timeAgo = this.getTimeAgo(new Date(activity.createdAt));
            const statusIcon = this.getStatusIcon(activity.status);
            const roleText = activity.isHost ? 'Hosted' : 'Joined';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.status}">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            ${roleText}: ${this.escapeHtml(activity.finalMeetingName || activity.meetingName)}
                        </div>
                        <div class="activity-meta">
                            <span class="activity-duration">
                                <i class="fas fa-clock"></i>
                                ${activity.duration ? `${activity.duration} min` : 'Duration unknown'}
                            </span>
                            <span class="activity-participants">
                                <i class="fas fa-users"></i>
                                ${activity.participantCount || 1} participant${(activity.participantCount || 1) !== 1 ? 's' : ''}
                            </span>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                    <div class="activity-status">
                        <span class="status-badge ${activity.status}">${activity.status}</span>
                        ${activity.isHost ? '<span class="role-badge host">Host</span>' : '<span class="role-badge participant">Participant</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.activityContainer.innerHTML = activitiesHtml;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'completed': return 'fa-check-circle';
            case 'in-progress': return 'fa-play-circle';
            case 'scheduled': return 'fa-calendar-check';
            case 'cancelled': return 'fa-times-circle';
            case 'missed': return 'fa-exclamation-circle';
            default: return 'fa-circle';
        }
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError() {
        if (this.activityContainer) {
            this.activityContainer.innerHTML = `
                <div class="activity-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to load activities</span>
                </div>
            `;
        }
    }

    startPeriodicRefresh() {
        // Refresh activities every 30 seconds
        setInterval(() => {
            this.loadActivities();
        }, 30000);
    }

    // Method to manually refresh activities
    refresh() {
        this.loadActivities();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
        window.recentActivityManager = new RecentActivityManager();
    }
});
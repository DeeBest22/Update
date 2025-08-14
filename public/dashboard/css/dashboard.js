    // Dashboard Application JavaScript
class VideoCallDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeCounters();
        this.updateDateTime();
        this.startRealTimeUpdates();
    }

    bindEvents() {
        // Navigation events
        this.bindNavigation();
        
        // Modal events
        this.bindModals();
        
        // Quick action events
        this.bindQuickActions();
        
        // Search functionality
        this.bindSearch();
        
        // User menu events
        this.bindUserMenu();
        
        // Responsive events
        this.bindResponsiveEvents();
    }

    bindNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const contentSections = document.querySelectorAll('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const sectionId = item.dataset.section;
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Show corresponding section
                contentSections.forEach(section => {
                    section.classList.remove('active');
                });
                
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                    this.currentSection = sectionId;
                }
                
                // Close mobile sidebar
                this.closeMobileSidebar();
                
                // Add smooth transition effect
                this.addSectionTransition();
            });
        });
    }

    bindModals() {
        const startCallBtn = document.getElementById('startCallBtn');
        const callModal = document.getElementById('callModal');
        const modalClose = document.querySelector('.modal-close');

        if (startCallBtn && callModal) {
            startCallBtn.addEventListener('click', () => {
                this.openModal('callModal');
            });
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.closeModal('callModal');
            });
        }

        // Close modal on backdrop click
        if (callModal) {
            callModal.addEventListener('click', (e) => {
                if (e.target === callModal) {
                    this.closeModal('callModal');
                }
            });
        }

        // Handle call option selection
        const callOptions = document.querySelectorAll('.call-option');
        callOptions.forEach(option => {
            option.addEventListener('click', () => {
                callOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Add selection animation
                option.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    option.style.transform = 'scale(1)';
                }, 150);
            });
        });
    }

    bindQuickActions() {
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const actionTitle = btn.querySelector('.action-title').textContent;
                this.handleQuickAction(actionTitle);
                
                // Add click animation
                btn.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 150);
            });
        });

        // Meeting action buttons
        const meetingBtns = document.querySelectorAll('.meeting-actions .btn');
        meetingBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.textContent.trim();
                this.handleMeetingAction(action);
            });
        });
    }

    bindSearch() {
        const searchInput = document.querySelector('.search-input');
        
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });

            searchInput.addEventListener('focus', () => {
                searchInput.parentElement.classList.add('focused');
            });

            searchInput.addEventListener('blur', () => {
                searchInput.parentElement.classList.remove('focused');
            });
        }
    }

    bindUserMenu() {
        const userMenu = document.getElementById('userMenu');
        const notificationBtn = document.getElementById('notificationBtn');
        
        if (userMenu) {
            userMenu.addEventListener('click', () => {
                this.toggleUserDropdown();
            });
        }

        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    bindResponsiveEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Mobile menu toggle (if you add a hamburger menu)
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }
    }

    // Modal Methods
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add entrance animation
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.transform = 'scale(0.9)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modalContent.style.transform = 'scale(1)';
                modalContent.style.opacity = '1';
                modalContent.style.transition = 'all 0.3s ease-out';
            }, 10);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.transform = 'scale(0.9)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }, 200);
        }
    }

    // Action Handlers
    handleQuickAction(actionTitle) {
        const actions = {
            'Start Instant Call': () => this.startInstantCall(),
            'Schedule Meeting': () => this.scheduleMeeting(),
            'Share Screen': () => this.shareScreen(),
            'Audio Only': () => this.startAudioCall()
        };

        const action = actions[actionTitle];
        if (action) {
            action();
        }

        // Show notification
        this.showNotification(`${actionTitle} initiated`, 'success');
    }

    handleMeetingAction(action) {
        const actions = {
            'Join': () => this.joinMeeting(),
            'Details': () => this.showMeetingDetails()
        };

        const actionMethod = actions[action];
        if (actionMethod) {
            actionMethod();
        }
    }

    handleSearch(query) {
        if (query.length > 2) {
            // Simulate search functionality
            console.log(`Searching for: ${query}`);
            // Here you would implement actual search logic
        }
    }

    // Feature Methods
    startInstantCall() {
        this.openModal('callModal');
    }

    scheduleMeeting() {
        this.showNotification('Meeting scheduler opened', 'info');
        // Here you would open a meeting scheduler interface
    }

    shareScreen() {
        this.showNotification('Screen sharing initiated', 'success');
        // Here you would implement screen sharing logic
    }

    startAudioCall() {
        this.showNotification('Audio call started', 'success');
        // Here you would implement audio call logic
    }

    joinMeeting() {
        this.showNotification('Joining meeting...', 'info');
        // Here you would implement meeting join logic
    }

    showMeetingDetails() {
        this.showNotification('Meeting details displayed', 'info');
        // Here you would show meeting details modal
    }

    // Utility Methods
    initializeCounters() {
        // Animate stat numbers on page load
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const finalValue = stat.textContent;
            const isTime = finalValue.includes('h') || finalValue.includes('m');
            
            if (!isTime && !isNaN(parseInt(finalValue))) {
                this.animateCounter(stat, parseInt(finalValue));
            }
        });
    }

    animateCounter(element, target) {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 40);
    }

    updateDateTime() {
        // Update any time-based elements
        const now = new Date();
        const timeElements = document.querySelectorAll('[data-time]');
        
        timeElements.forEach(element => {
            const format = element.dataset.time;
            if (format === 'relative') {
                element.textContent = this.getRelativeTime(now);
            }
        });
    }

    getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minutes ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    }

    startRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateDateTime();
            this.updateActivityFeed();
        }, 30000); // Update every 30 seconds
    }

    updateActivityFeed() {
        // Simulate new activity
        if (Math.random() > 0.8) {
            this.addNewActivity();
        }
    }

    addNewActivity() {
        const activities = [
            'New call request received',
            'Meeting reminder: Team standup in 15 minutes',
            'Screen sharing session ended',
            'Contact added to favorites'
        ];

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        this.showNotification(randomActivity, 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Position notification
        const notifications = document.querySelectorAll('.notification');
        const index = notifications.length - 1;
        notification.style.top = `${20 + (index * 80)}px`;
        notification.style.right = '20px';

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);

        // Bind close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Add entrance animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    removeNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                this.repositionNotifications();
            }
        }, 300);
    }

    repositionNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach((notification, index) => {
            notification.style.top = `${20 + (index * 80)}px`;
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check',
            error: 'exclamation-triangle',
            warning: 'exclamation',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    // Responsive Methods
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('mobile-open');
    }

    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.remove('mobile-open');
    }

    handleResize() {
        const width = window.innerWidth;
        
        if (width > 768) {
            this.closeMobileSidebar();
        }
        
        // Adjust grid layouts based on screen size
        this.adjustLayouts();
    }

    adjustLayouts() {
        const statsGrid = document.querySelector('.stats-grid');
        const dashboardGrid = document.querySelector('.dashboard-grid');
        
        if (window.innerWidth < 768) {
            statsGrid?.classList.add('mobile');
            dashboardGrid?.classList.add('mobile');
        } else {
            statsGrid?.classList.remove('mobile');
            dashboardGrid?.classList.remove('mobile');
        }
    }

    addSectionTransition() {
        const mainContent = document.querySelector('.main-content');
        mainContent.style.opacity = '0.7';
        
        setTimeout(() => {
            mainContent.style.opacity = '1';
            mainContent.style.transition = 'opacity 0.3s ease-in-out';
        }, 100);
    }

    toggleUserDropdown() {
        // Placeholder for user dropdown functionality
        this.showNotification('User menu clicked', 'info');
    }

    showNotifications() {
        // Placeholder for notifications panel
        this.showNotification('Notifications panel opened', 'info');
    }
}

// CSS for notifications (to be added dynamically)
const notificationStyles = `
.notification {
    position: fixed;
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
    min-width: 320px;
    z-index: 10000;
    transform: translateX(400px);
    opacity: 0;
    transition: all 0.3s ease-out;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.notification.show {
    transform: translateX(0);
    opacity: 1;
}

.notification.hide {
    transform: translateX(400px);
    opacity: 0;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.notification-success {
    border-left: 4px solid #10b981;
}

.notification-error {
    border-left: 4px solid #ef4444;
}

.notification-warning {
    border-left: 4px solid #f59e0b;
}

.notification-info {
    border-left: 4px solid #06b6d4;
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease-in-out;
}

.notification-close:hover {
    background: #f1f5f9;
    color: #64748b;
}
`;

// Add notification styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoCallDashboard();
});

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to cards
    const cards = document.querySelectorAll('.stat-card, .dashboard-card, .meeting-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add click effects to buttons
    const buttons = document.querySelectorAll('.btn, .quick-action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });

    // Simulate real-time status updates
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        setInterval(() => {
            statusIndicator.classList.toggle('pulse');
        }, 3000);
    }

    // Add loading states to action buttons
    const actionButtons = document.querySelectorAll('.btn-primary');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.innerHTML = this.dataset.originalText || 'Start Call';
                }, 2000);
            }
        });
    });
});
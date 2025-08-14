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

    
});

        // Authentication and User Management
        class AuthManager {
            constructor() {
                this.currentUser = null;
                this.init();
            }

            async init() {
                await this.loadUserData();
                this.bindAuthEvents();
            }

            async loadUserData() {
                try {
                    const response = await fetch('/api/user', {
                        method: 'GET',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.currentUser = data.user;
                        this.updateUI();
                    } else {
                        // Not authenticated, redirect to login
                        console.log('User not authenticated, redirecting to login');
                        window.location.href = '/login';
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                    // Show error message or redirect to login
                    window.location.href = '/login';
                }
            }

            updateUI() {
                if (!this.currentUser) return;

                // Update header user info
                const userName = document.getElementById('userName');
                const userEmail = document.getElementById('userEmail');
                const userAvatar = document.getElementById('userAvatar');
                const welcomeMessage = document.getElementById('welcomeMessage');

                // Update dropdown info
                const dropdownName = document.getElementById('dropdownName');
                const dropdownEmail = document.getElementById('dropdownEmail');
                const dropdownAvatar = document.getElementById('dropdownAvatar');
                const authProvider = document.getElementById('authProvider');
                const dropdownProvider = document.getElementById('dropdownProvider');

                if (userName) userName.textContent = this.currentUser.name;
                if (userEmail) userEmail.textContent = this.currentUser.email;
                if (welcomeMessage) {
                    const firstName = this.currentUser.name.split(' ')[0];
                    welcomeMessage.textContent = `Welcome back, ${firstName}! Here's your call activity overview.`;
                }

                // Update avatars
                if (this.currentUser.profilePicture) {
                    if (userAvatar) userAvatar.src = this.currentUser.profilePicture;
                    if (dropdownAvatar) dropdownAvatar.src = this.currentUser.profilePicture;
                } else {
                    // Generate avatar from initials
                    const initials = this.getInitials(this.currentUser.name);
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=3b82f6&color=fff&size=128`;
                    if (userAvatar) userAvatar.src = avatarUrl;
                    if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
                }

                // Update dropdown info
                if (dropdownName) dropdownName.textContent = this.currentUser.name;
                if (dropdownEmail) dropdownEmail.textContent = this.currentUser.email;
                
                // Update auth provider info
                if (authProvider && dropdownProvider) {
                    const provider = this.currentUser.authProvider || 'local';
                    authProvider.textContent = provider === 'google' ? 'Google' : 'Email';
                    
                    // Update provider styling
                    dropdownProvider.className = `dropdown-provider ${provider}`;
                    
                    // Update icon
                    const providerIcon = dropdownProvider.querySelector('i');
                    if (providerIcon) {
                        if (provider === 'google') {
                            providerIcon.className = 'fab fa-google';
                        } else {
                            providerIcon.className = 'fas fa-envelope';
                        }
                    }
                }

                // Remove loading state
                const userMenu = document.getElementById('userMenu');
                if (userMenu) userMenu.classList.remove('loading');
            }

            getInitials(name) {
                return name.split(' ').map(word => word[0]).join('').toUpperCase();
            }

            bindAuthEvents() {
                // User menu dropdown toggle
                const userMenu = document.getElementById('userMenu');
                const userDropdown = document.getElementById('userDropdown');
                const dropdownArrow = document.getElementById('dropdownArrow');

                if (userMenu && userDropdown) {
                    userMenu.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleUserDropdown();
                    });

                    // Close dropdown when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!userMenu.contains(e.target)) {
                            userDropdown.classList.remove('show');
                            if (dropdownArrow) dropdownArrow.style.transform = 'rotate(0deg)';
                        }
                    });
                }

                // Dropdown menu items
                document.getElementById('profileSettings')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Profile settings opened', 'info');
                });

                document.getElementById('accountSettings')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Account settings opened', 'info');
                });

                document.getElementById('privacySettings')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Privacy settings opened', 'info');
                });

                document.getElementById('helpSupport')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showNotification('Help & Support opened', 'info');
                });

                // Logout functionality
                const logoutBtn = document.getElementById('logoutBtn');
                const logoutModal = document.getElementById('logoutModal');
                const logoutModalClose = document.getElementById('logoutModalClose');
                const cancelLogout = document.getElementById('cancelLogout');
                const confirmLogout = document.getElementById('confirmLogout');

                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLogoutModal();
                    });
                }

                if (logoutModalClose) {
                    logoutModalClose.addEventListener('click', () => {
                        this.hideLogoutModal();
                    });
                }

                if (cancelLogout) {
                    cancelLogout.addEventListener('click', () => {
                        this.hideLogoutModal();
                    });
                }

                if (confirmLogout) {
                    confirmLogout.addEventListener('click', () => {
                        this.logout();
                    });
                }

                // Close modal on backdrop click
                if (logoutModal) {
                    logoutModal.addEventListener('click', (e) => {
                        if (e.target === logoutModal) {
                            this.hideLogoutModal();
                        }
                    });
                }
            }

            toggleUserDropdown() {
                const userDropdown = document.getElementById('userDropdown');
                const dropdownArrow = document.getElementById('dropdownArrow');
                
                if (userDropdown) {
                    const isShown = userDropdown.classList.contains('show');
                    userDropdown.classList.toggle('show');
                    
                    if (dropdownArrow) {
                        dropdownArrow.style.transform = isShown ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                }
            }

            showLogoutModal() {
                const logoutModal = document.getElementById('logoutModal');
                if (logoutModal) {
                    logoutModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }

            hideLogoutModal() {
                const logoutModal = document.getElementById('logoutModal');
                if (logoutModal) {
                    logoutModal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            }

            async logout() {
                try {
                    const confirmLogout = document.getElementById('confirmLogout');
                    if (confirmLogout) {
                        confirmLogout.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                        confirmLogout.disabled = true;
                    }

                    const response = await fetch('/api/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        this.showNotification('Logged out successfully', 'success');
                        
                        // Clear user data
                        this.currentUser = null;
                        
                        // Redirect to login after a short delay
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1000);
                    } else {
                        throw new Error('Logout failed');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    this.showNotification('Logout failed. Please try again.', 'error');
                    
                    const confirmLogout = document.getElementById('confirmLogout');
                    if (confirmLogout) {
                        confirmLogout.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                        confirmLogout.disabled = false;
                    }
                }
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

            // Public method to get current user
            getCurrentUser() {
                return this.currentUser;
            }

            // Public method to refresh user data
            async refreshUserData() {
                await this.loadUserData();
            }
        }

        // Initialize authentication when DOM is loaded
        let authManager;
        document.addEventListener('DOMContentLoaded', () => {
            authManager = new AuthManager();
        });

        // Export for use in other scripts
        window.AuthManager = AuthManager;

        
        



    // Dashboard functionality
let currentUser = null;
let socketActivity = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize socketActivity connection
        socketActivity = io();
        
        // Load user data
        await loadUserData();
        
        // Load recent activities
        await loadRecentActivities();
        
        // Load meeting statistics
        await loadMeetingStats();
        
        // Setup real-time updates
        setupRealtimeUpdates();
        
        // Setup settings
        setupSettings();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to load dashboard data');
    }
});

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Update UI with user data
        updateUserProfile(currentUser);
        
        // Join user-specific room for real-time updates
        if (socketActivity && currentUser) {
            socketActivity.emit('join-user-room', currentUser.id);
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Redirect to login if not authenticated
        window.location.href = '/login';
    }
}

// Update user profile in header
function updateUserProfile(user) {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl && user.profilePicture) {
        userAvatarEl.src = user.profilePicture;
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const response = await fetch('/api/recent-activities');
        if (!response.ok) {
            throw new Error('Failed to fetch recent activities');
        }
        
        const data = await response.json();
        displayRecentActivities(data.activities);
        
    } catch (error) {
        console.error('Error loading recent activities:', error);
        showActivityError();
    }
}

// Display recent activities
function displayRecentActivities(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-empty">
                <i class="fas fa-calendar-times"></i>
                <span>No recent activities</span>
            </div>
        `;
        return;
    }
    
    activityList.innerHTML = activities.map(activity => {
        const timeAgo = getTimeAgo(new Date(activity.createdAt));
        const statusIcon = getStatusIcon(activity.status);
        const statusClass = activity.status;
        
        return `
            <div class="activity-item">
                <div class="activity-avatar">
                    <img src="${activity.userId?.profilePicture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'}" alt="User">
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.meetingName}</div>
                    <div class="activity-time">${timeAgo}</div>
                    ${activity.duration ? `<div class="activity-duration">${activity.duration} minutes</div>` : ''}
                </div>
                <div class="activity-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                </div>
            </div>
        `;
    }).join('');
}

// Get status icon based on activity status
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return 'fas fa-check';
        case 'scheduled':
            return 'fas fa-calendar';
        case 'missed':
            return 'fas fa-times';
        case 'cancelled':
            return 'fas fa-ban';
        default:
            return 'fas fa-circle';
    }
}

// Get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Show activity loading error
function showActivityError() {
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = `
            <div class="activity-error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Failed to load activities</span>
                <button class="btn btn-sm btn-text" onclick="loadRecentActivities()">Retry</button>
            </div>
        `;
    }
}

// Load meeting statistics
async function loadMeetingStats() {
    try {
        const response = await fetch('/api/meeting-stats');
        if (response.ok) {
            const data = await response.json();
            updateMeetingStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading meeting stats:', error);
    }
}

// Update meeting statistics display
function updateMeetingStats(stats) {
    const totalMeetingsEl = document.getElementById('totalMeetings');
    const totalHoursEl = document.getElementById('totalHours');
    const avgDurationEl = document.getElementById('avgDuration');
    
    if (totalMeetingsEl) totalMeetingsEl.textContent = stats?.totalMeetings || 0;
    if (totalHoursEl) totalHoursEl.textContent = `${Math.round((stats?.totalMinutes || 0) / 60)}h`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats?.averageDuration || 0)}m`;
}

// Setup real-time updates
function setupRealtimeUpdates() {
    if (!socketActivity) return;
    
    // Listen for activity updates
    socketActivity.on('activity-updated', (data) => {
        console.log('Activity updated:', data);
        
        if (data.type === 'meeting-completed') {
            // Reload activities to show the new one
            loadRecentActivities();
            
            // Update stats
            loadMeetingStats();
            
            // Show notification
            showNotification(`Meeting "${data.activity.meetingName}" completed`, 'success');
        }
    });
    
    // Listen for meeting stats updates
    socketActivity.on('stats-updated', (data) => {
        updateMeetingStats(data.stats);
    });
}

// Setup settings toggles
function setupSettings() {
    const cameraToggle = document.getElementById('cameraToggle');
    const micToggle = document.getElementById('micToggle');
    const notificationToggle = document.getElementById('notificationToggle');
    
    // Load saved settings
    if (cameraToggle) {
        cameraToggle.checked = localStorage.getItem('defaultCamera') !== 'false';
        cameraToggle.addEventListener('change', () => {
            localStorage.setItem('defaultCamera', cameraToggle.checked);
        });
    }
    
    if (micToggle) {
        micToggle.checked = localStorage.getItem('defaultMic') !== 'false';
        micToggle.addEventListener('change', () => {
            localStorage.setItem('defaultMic', micToggle.checked);
        });
    }
    
    if (notificationToggle) {
        notificationToggle.checked = localStorage.getItem('notifications') !== 'false';
        notificationToggle.addEventListener('change', () => {
            localStorage.setItem('notifications', notificationToggle.checked);
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notifications are enabled
    if (localStorage.getItem('notifications') === 'false') {
        return;
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show error message
function showError(message) {
    showNotification(message, 'error');
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
}

// Add activity item dynamically (for real-time updates)
function addActivityItem(activity) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Remove loading or empty state
    const loading = activityList.querySelector('.activity-loading, .activity-empty');
    if (loading) {
        loading.remove();
    }
    
    const timeAgo = getTimeAgo(new Date(activity.createdAt));
    const statusIcon = getStatusIcon(activity.status);
    const statusClass = activity.status;
    
    const activityHTML = `
        <div class="activity-item activity-new">
            <div class="activity-avatar">
                <img src="${currentUser?.profilePicture || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'}" alt="User">
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.meetingName}</div>
                <div class="activity-time">${timeAgo}</div>
                ${activity.duration ? `<div class="activity-duration">${activity.duration} minutes</div>` : ''}
            </div>
            <div class="activity-status ${statusClass}">
                <i class="${statusIcon}"></i>
            </div>
        </div>
    `;
    
    
    // Add to top of list
    activityList.insertAdjacentHTML('afterbegin', activityHTML);
    
    // Remove the 'new' class after animation
    setTimeout(() => {
        const newItem = activityList.querySelector('.activity-new');
        if (newItem) {
            newItem.classList.remove('activity-new');
        }
    }, 1000);
}

        const socket = io();
   window.socket = socket; // Make socket globally available
        
        socket.on('connect', () => {

            console.log('Connected to server');
        });
        
        // Set current user ID for stats tracking
        fetch('/api/user')
            .then(response => response.json())
            .then(data => {
                if (data.user) {
                    window.currentUserId = data.user.id;
                }
            })
            .catch(error => console.error('Error fetching user data:', error));
        

   
        let meetingId = null;
        let hostUrl = null;
        let joinUrl = null;
        let participantsName = [];

        // Load user information when page loads
        document.addEventListener('DOMContentLoaded', async function() {
            await loadUserInfo();
            await generateMeetingId();
            document.getElementById('titleInput').focus();
        });

        // Load current user information
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user');
                const data = await response.json();
                
                if (data.user) {
                    currentUser = data.user;
                    document.getElementById('hostName').textContent = currentUser.name;
                    
                    // Set user avatar initials
                    const initials = currentUser.name.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);
                    document.getElementById('userAvatar').textContent = initials;
                    
                    // Set default meeting title
                    const defaultTitle = `${currentUser.name}'s Meeting`;
                    document.getElementById('titleInput').value = defaultTitle;
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Error loading user info:', error);
                showError('Failed to load user information');
            }
        }

        // Generate meeting ID and URLs
        async function generateMeetingId() {
            try {
                const response = await fetch('/api/create-meeting', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (response.ok) {
                    meetingId = data.meetingId;
                    hostUrl = data.hostUrl;
                    joinUrl = `${window.location.origin}/join/${meetingId}`;
                    
                    console.log('Meeting ID generated:', meetingId);
                } else {
                    throw new Error(data.error || 'Failed to generate meeting ID');
                }
            } catch (error) {
                console.error('Error generating meeting ID:', error);
                showError('Failed to generate meeting details');
            }
        }

        // Handle email input keypress
        function handleEmailKeyPress(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                addParticipant();
            }
        }

        // Add participant function
        function addParticipant() {
            const emailInput = document.getElementById('emailInput');
            const email = emailInput.value.trim();
            
            if (!email) {
                showError('Please enter an email address');
                return;
            }
            
            if (!isValidEmail(email)) {
                showError('Please enter a valid email address');
                return;
            }
            
            if (participantsName.includes(email)) {
                showError('This participant is already added');
                return;
            }
            
            participantsName.push(email);
            emailInput.value = '';
            updateparticipantsNameList();
            hideError();
        }

        // Remove participant function
        function removeParticipant(email) {
            participantsName = participantsName.filter(p => p !== email);
            updateparticipantsNameList();
        }

        // Update participantsName list display
        function updateparticipantsNameList() {
            const participantsNameList = document.getElementById('participantsNameList');
            const participantsNameCount = document.getElementById('participantsNameCount');
            const emptyState = document.getElementById('emptyState');
            
            // Update count
            const count = participantsName.length;
            participantsNameCount.textContent = `${count} participant${count !== 1 ? 's' : ''} added`;
            
            if (participantsName.length === 0) {
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            
            participantsNameList.innerHTML = participantsName.map(email => `
                <div class="participant-item">
                    <span class="participant-email">${email}</span>
                    <button type="button" class="remove-participant" onclick="removeParticipant('${email}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }

        // Email validation
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        // Create meeting function
        async function createMeeting() {
            const meetingTitle = document.getElementById('titleInput').value.trim();
            
            if (!meetingTitle) {
                showError('Please enter a meeting title');
                return;
            }

            if (meetingTitle.length > 100) {
                showError('Meeting title is too long (max 100 characters)');
                return;
            }
            
            if (!meetingId) {
                showError('Meeting details not ready. Please refresh the page.');
                return;
            }
            
            await startMeeting(meetingTitle);
        }

        // Start meeting with custom title
        async function startMeeting(meetingTitle) {
            showLoading(true);
            hideError();
            
            try {
                // Create the meeting URL with the custom title
                const meetingUrl = `${hostUrl}?name=${encodeURIComponent(meetingTitle)}`;
                
                showSuccess(`Starting meeting "${meetingTitle}"...`);
                
                // TODO: Send invitations to participantsName if any were added
                if (participantsName.length > 0) {
                    console.log('participantsName to invite:', participantsName);
                    // You can implement email invitation logic here
                }
                
                // Redirect to meeting room after a short delay
                setTimeout(() => {
                    window.location.href = meetingUrl;
                }, 1000);
                
            } catch (error) {
                console.error('Error starting meeting:', error);
                showError(error.message || 'Failed to start meeting. Please try again.');
                showLoading(false);
            }
        }

        // Close modal function
        function closeModalPopMeeting() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/dashboard';
            }
        }

        // Show error message
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Hide success message if shown
            document.getElementById('successMessage').style.display = 'none';
        }

        // Hide error message
        function hideError() {
            document.getElementById('errorMessage').style.display = 'none';
        }

        // Show success message
        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            
            // Hide error message if shown
            document.getElementById('errorMessage').style.display = 'none';
        }

        // Show/hide loading state
        function showLoading(show) {
            const spinner = document.getElementById('loadingSpinner');
            const btnText = document.getElementById('btnText');
            const videoIcon = document.getElementById('videoIcon');
            const startBtn = document.getElementById('startMeetingBtn');
            
            if (show) {
                spinner.style.display = 'inline-block';
                videoIcon.style.display = 'none';
                btnText.textContent = 'Starting Meeting...';
                startBtn.disabled = true;
            } else {
                spinner.style.display = 'none';
                videoIcon.style.display = 'inline-block';
                btnText.textContent = 'Start Meeting';
                startBtn.disabled = false;
            }
        }

        // Handle Enter key on title input
        document.getElementById('titleInput').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                createMeeting();
            }
        });

        // Real-time validation for meeting title
        document.getElementById('titleInput').addEventListener('input', function(event) {
            const meetingTitle = event.target.value;
            
            if (meetingTitle.length > 100) {
                showError('Meeting title is too long (max 100 characters)');
            } else {
                hideError();
            }
        });

        // Handle escape key to close modal
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModalPopMeeting();
            }
        });

        // Prevent closing modal when clicking inside the modal
        document.querySelector('.ModalPopMeeting').addEventListener('click', function(event) {
            event.stopPropagation();
        });

        // Close modal when clicking overlay
        document.getElementById('ModalPopMeetingOverlay').addEventListener('click', function(event) {
            if (event.target === this) {
                closeModalPopMeeting();
            }
        });
let userAvatar = document.getElementById('userAvatar');
userAvatar.innerHTML = `<img src="${user.profilePicture}" alt="User Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;

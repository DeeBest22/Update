 
        class MeetingCreator {
            constructor() {
                this.form = document.getElementById('conferenceForm');
                this.titleInput = document.getElementById('conferenceTitle');
                this.emailInput = document.getElementById('contactInput');
                this.addBtn = document.getElementById('addContactBtn');
                this.participantsContainer = document.getElementById('attendeeChips');
                this.submitBtn = document.getElementById('launchConferenceBtn');
                this.dismissBtn = document.getElementById('dismissDialog');
                this.dismissControl = document.getElementById('dismissControl');
                
                this.participants = [];
                this.isCreating = false;
                
                this.init();
            }
            
            init() {
                this.bindEvents();
                this.setDefaultMeetingName();
                this.titleInput.focus();
            }
            
            async setDefaultMeetingName() {
                try {
                    const response = await fetch('/api/user');
                    const data = await response.json();
                    if (data.user && data.user.name) {
                        this.titleInput.value = `${data.user.name}'s Meeting`;
                        this.titleInput.dispatchEvent(new Event('input'));
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    this.titleInput.value = "New Meeting";
                    this.titleInput.dispatchEvent(new Event('input'));
                }
            }
            
            bindEvents() {
                // Form submission
                this.form.addEventListener('submit', (e) => this.handleSubmit(e));
                
                // Add participant
                this.addBtn.addEventListener('click', () => this.addParticipant());
                this.emailInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addParticipant();
                    }
                });
                
                // Dismiss buttons
                this.dismissBtn.addEventListener('click', () => this.dismiss());
                this.dismissControl.addEventListener('click', () => this.dismiss());
                
                // Click outside to dismiss
                document.getElementById('dialogBackdrop').addEventListener('click', (e) => {
                    if (e.target === e.currentTarget) {
                        this.dismiss();
                    }
                });
                
                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.dismiss();
                    }
                });
                
                // Input validation
                this.titleInput.addEventListener('input', () => this.validateTitle());
                this.emailInput.addEventListener('input', () => this.validateEmail());
            }
            
            validateTitle() {
                const titleError = document.getElementById('titleError');
                const title = this.titleInput.value.trim();
                
                if (!title) {
                    this.showError(titleError, 'Meeting title is required');
                    return false;
                } else if (title.length > 100) {
                    this.showError(titleError, 'Meeting title is too long (max 100 characters)');
                    return false;
                } else {
                    this.hideError(titleError);
                    return true;
                }
            }
            
            validateEmail() {
                const emailError = document.getElementById('emailError');
                const email = this.emailInput.value.trim();
                
                if (email && !this.isValidEmail(email)) {
                    this.showError(emailError, 'Please enter a valid email address');
                    return false;
                } else {
                    this.hideError(emailError);
                    return true;
                }
            }
            
            isValidEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }
            
            showError(element, message) {
                element.textContent = message;
                element.style.display = 'block';
            }
            
            hideError(element) {
                element.style.display = 'none';
            }
            
            addParticipant() {
                const email = this.emailInput.value.trim();
                
                if (!email) {
                    this.emailInput.focus();
                    return;
                }
                
                if (!this.isValidEmail(email)) {
                    this.showError(document.getElementById('emailError'), 'Please enter a valid email address');
                    this.emailInput.focus();
                    return;
                }
                
                if (this.participants.includes(email)) {
                    this.showError(document.getElementById('emailError'), 'This participant is already added');
                    this.emailInput.focus();
                    return;
                }
                
                this.participants.push(email);
                this.renderParticipants();
                this.emailInput.value = '';
                this.hideError(document.getElementById('emailError'));
                this.emailInput.focus();
            }
            
            removeParticipant(email) {
                this.participants = this.participants.filter(p => p !== email);
                this.renderParticipants();
            }
            
            renderParticipants() {
                if (this.participants.length === 0) {
                    this.participantsContainer.innerHTML = '<span style="color: #6b7280; font-style: italic;">No participants added yet</span>';
                    return;
                }
                
                const html = this.participants.map(email => `
                    <div class="participant-tag">
                        ${this.getEmailName(email)}
                        <button type="button" class="remove-participant" onclick="meetingCreator.removeParticipant('${email}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
                
                this.participantsContainer.innerHTML = html;
            }
            
            getEmailName(email) {
                return email.split('@')[0];
            }
            
            async handleSubmit(e) {
                e.preventDefault();
                
                if (this.isCreating) return;
                
                // Validate form
                const isTitleValid = this.validateTitle();
                const isEmailValid = this.validateEmail();
                
                if (!isTitleValid || !isEmailValid) {
                    return;
                }
                
                const meetingTitle = this.titleInput.value.trim();
                
                if (!meetingTitle) {
                    this.showError(document.getElementById('titleError'), 'Meeting title is required');
                    this.titleInput.focus();
                    return;
                }
                
                this.isCreating = true;
                this.updateSubmitButton(true);
                
                try {
                    // Create meeting
                    const response = await fetch('/api/create-meeting', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            meetingName: meetingTitle,
                            participants: this.participants
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to create meeting');
                    }
                    
                    const data = await response.json();
                    
                    // Store meeting creation info in sessionStorage for auto video stop
                    sessionStorage.setItem('autoStopVideo', 'true');
                    sessionStorage.setItem('fromCreateForm', 'true');
                    
                    // Redirect to host page with meeting name
                    const hostUrl = `/host/${data.meetingId}?name=${encodeURIComponent(meetingTitle)}`;
                    window.location.href = hostUrl;
                    
                } catch (error) {
                    console.error('Error creating meeting:', error);
                    this.showError(document.getElementById('titleError'), 'Failed to create meeting. Please try again.');
                    this.isCreating = false;
                    this.updateSubmitButton(false);
                }
            }
            
            updateSubmitButton(loading) {
                if (loading) {
                    this.submitBtn.disabled = true;
                    this.submitBtn.innerHTML = `
                        <div class="loading-spinner"></div>
                        Creating Meeting...
                    `;
                } else {
                    this.submitBtn.disabled = false;
                    this.submitBtn.innerHTML = `
                        <i class="fas fa-video"></i>
                        Start Meeting
                    `;
                }
            }
            
            dismiss() {
                if (this.isCreating) return;
                
                // Navigate back to dashboard or previous page
                if (document.referrer && document.referrer !== window.location.href) {
                    window.history.back();
                } else {
                    window.location.href = '/dashboard';
                }
            }
        }
        
        // Initialize when DOM is loaded
        let meetingCreator;
        document.addEventListener('DOMContentLoaded', () => {
            meetingCreator = new MeetingCreator();
        });
        
        // Make meetingCreator globally accessible for onclick handlers
        window.meetingCreator = meetingCreator;

   let selectedEmails = [];

        // DOM elements
        const shareScreenBtn = document.getElementById('shareScreenBtn');
        const meetingPopup = document.getElementById('meetingPopup');
        const closePopup = document.getElementById('closePopup');
        const emailInputShare = document.getElementById('emailInputShare');
        const addEmailBtn = document.getElementById('addEmailBtn');
        const selectedEmailsContainer = document.getElementById('selectedEmails');
        const errorMessage = document.getElementById('errorMessage');
        const startMeetingBtn = document.getElementById('startMeetingBtn');

        // Utility functions
        function getInitials(name) {
            return name.split(' ').map(word => word[0]).join('').toUpperCase();
        }

        function showPopup() {
            meetingPopup.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function hidePopup() {
            meetingPopup.classList.remove('active');
            document.body.style.overflow = '';
        }

        function isValidGmail(email) {
            const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
            return gmailRegex.test(email);
        }

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            setTimeout(() => {
                errorMessage.classList.remove('show');
            }, 3000);
        }

        function addEmail() {
            const email = emailInputShare.value.trim();
            
            if (!email) {
                showError('Please enter an email address');
                return;
            }
            
            if (!isValidGmail(email)) {
                showError('Please enter a valid Gmail address');
                return;
            }
            
            if (selectedEmails.includes(email)) {
                showError('This email is already added');
                return;
            }
            
            selectedEmails.push(email);
            renderSelectedEmails();
            emailInputShare.value = '';
        }

        function removeEmail(email) {
            selectedEmails = selectedEmails.filter(e => e !== email);
            renderSelectedEmails();
        }

        function renderSelectedEmails() {
            selectedEmailsContainer.innerHTML = '';
            selectedEmails.forEach(email => {
                const chip = document.createElement('div');
                chip.className = 'email-chip';
                const name = email.split('@')[0];
                chip.innerHTML = `
                    <div class="chip-avatar">${getInitials(name)}</div>
                    <span class="email-text">${email}</span>
                    <button class="remove-chip" onclick="removeEmail('${email}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                selectedEmailsContainer.appendChild(chip);
            });
        }

        // Event listeners
        shareScreenBtn.addEventListener('click', showPopup);
        closePopup.addEventListener('click', hidePopup);

        meetingPopup.addEventListener('click', (e) => {
            if (e.target === meetingPopup) {
                hidePopup();
            }
        });

        addEmailBtn.addEventListener('click', addEmail);

        emailInputShare.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addEmail();
            }
        });

        emailInputShare.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            const isValid = isValidGmail(searchTerm);
            addEmailBtn.disabled = !isValid || searchTerm.trim() === '';
            
            if (errorMessage.classList.contains('show') && isValid) {
                errorMessage.classList.remove('show');
            }
        });

        startMeetingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const meetingTitle = document.getElementById('meetingTitle').value;
            const btnContent = startMeetingBtn.querySelector('.btn-content');
            
            // Show loading state
            btnContent.innerHTML = '<div class="loading"></div><span>Starting Meeting...</span>';
            startMeetingBtn.disabled = true;
            
            // Simulate meeting creation
            setTimeout(() => {
                let message = `Meeting "${meetingTitle}" started successfully!`;
                if (selectedEmails.length > 0) {
                    message += `\n\nInvited participants:\n${selectedEmails.map(email => `• ${email}`).join('\n')}`;
                }
                alert(message);
                
                // Reset form
                btnContent.innerHTML = '<i class="fas fa-play"></i><span>Start Meeting</span>';
                startMeetingBtn.disabled = false;
                hidePopup();
                
                // Reset selected emails
                selectedEmails = [];
                renderSelectedEmails();
            }, 2000);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && meetingPopup.classList.contains('active')) {
                hidePopup();
            }
        });

        // Make removeEmail function global for onclick handlers
        window.removeEmail = removeEmail;

        // Initialize
        renderSelectedEmails();
        
        // Set initial button state
        addEmailBtn.disabled = true;
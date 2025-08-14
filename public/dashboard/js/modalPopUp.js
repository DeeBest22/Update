  let participants = [];

        function openModalPopMeeting() {
            document.getElementById('ModalPopMeetingOverlay').classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('titleInput').focus();
        }

        function closeModalPopMeeting() {
            document.getElementById('ModalPopMeetingOverlay').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function handleEmailKeyPress(event) {
            if (event.key === 'Enter') {
                addParticipant();
            }
        }

        function addParticipant() {
            const emailInput = document.getElementById('emailInput');
            const email = emailInput.value.trim().toLowerCase();
            
            if (!email) {
                emailInput.focus();
                return;
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                emailInput.focus();
                return;
            }

            // Check for duplicates
            if (participants.includes(email)) {
                alert('This participant is already added');
                emailInput.value = '';
                emailInput.focus();
                return;
            }

            participants.push(email);
            emailInput.value = '';
            emailInput.focus();
            updateParticipantsList();
        }

        function removeParticipant(email) {
            participants = participants.filter(p => p !== email);
            updateParticipantsList();
        }

        function updateParticipantsList() {
            const participantsList = document.getElementById('participantsList');
            const emptyState = document.getElementById('emptyState');
            const participantsCount = document.getElementById('participantsCount');
            const startMeetingBtn = document.getElementById('startMeetingBtn');

            // Update count
            participantsCount.textContent = `${participants.length} participant${participants.length !== 1 ? 's' : ''} added`;

            if (participants.length === 0) {
                participantsList.innerHTML = `
                    <div class="empty-state" id="emptyState">
                        <i class="fas fa-user-plus"></i>
                        <p>No participants added yet.<br>Enter email addresses above to get started.</p>
                    </div>
                `;
            } else {
                participantsList.innerHTML = participants.map(email => `
                    <div class="participant-item">
                        <div class="participant-info">
                            <div class="participant-avatar">
                                ${email.charAt(0).toUpperCase()}
                            </div>
                            <span class="participant-email">${email}</span>
                        </div>
                        <button class="remove-btn" onclick="removeParticipant('${email}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
            }
        }

        function startMeeting() {
            const titleInput = document.getElementById('titleInput');
            const meetingTitle = titleInput.value.trim() || 'Untitled Meeting';
            
            // Here you would integrate with your actual meeting service
            console.log('Starting meeting:', {
                title: meetingTitle,
                participants: participants
            });
            
            // Show a success message
            let message = `Meeting "${meetingTitle}" started!`;
            if (participants.length > 0) {
                message += `\n\nInvitations sent to:\n${participants.join('\n')}`;
            } else {
                message += '\n\nStarting instant meeting without participants.';
            }
            alert(message);
            
            // Reset and close ModalPopMeeting
            participants = [];
            titleInput.value = '';
            updateParticipantsList();
            closeModalPopMeeting();
        }

        // Close ModalPopMeeting when clicking outside
        document.getElementById('ModalPopMeetingOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModalPopMeeting();
            }
        });

        // Close ModalPopMeeting with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.getElementById('ModalPopMeetingOverlay').classList.contains('active')) {
                closeModalPopMeeting();
            }
        });

        // Initialize the UI
        updateParticipantsList();
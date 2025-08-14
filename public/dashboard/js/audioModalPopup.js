
        // Hardcoded Gmail contacts for autocomplete
        const gmailContacts = [
            'john.doe@gmail.com',
            'jane.smith@gmail.com',
            'michael.johnson@gmail.com',
            'sarah.wilson@gmail.com',
            'david.brown@gmail.com',
            'emily.davis@gmail.com',
            'chris.miller@gmail.com',
            'amanda.garcia@gmail.com',
            'robert.martinez@gmail.com',
            'lisa.anderson@gmail.com'
        ];

        // Store added audioParticipants
        let audioParticipants = [];

        // DOM Elements
        const audioOnlyBtn = document.getElementById('audioOnlyBtn');
        const dialogBackdrop = document.getElementById('dialogBackdrop');
        const dismissDialog = document.getElementById('dismissDialog');
        const dismissControl = document.getElementById('dismissControl');
        const conferenceForm = document.getElementById('conferenceForm');
        const conferenceTitle = document.getElementById('conferenceTitle');
        const contactInput = document.getElementById('contactInput');
        const contactOptions = document.getElementById('contactOptions');
        const addContactBtn = document.getElementById('addContactBtn');
        const attendeeChips = document.getElementById('attendeeChips');
        const launchConferenceBtn = document.getElementById('launchConferenceBtn');

        // Modal Control Functions
        function openAudioModal() {
            dialogBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
            conferenceTitle.focus();
        }

        function dismissDialogFunc() {
            dialogBackdrop.classList.remove('active');
            document.body.style.overflow = 'auto';
            clearForm();
        }

        function clearForm() {
            conferenceTitle.value = '';
            contactInput.value = '';
            audioParticipants = [];
            renderaudioParticipants();
            hideSuggestions();
        }

        // Email Autocomplete Functions
        function showSuggestions(query) {
            if (!query.trim()) {
                hideSuggestions();
                return;
            }

            const filteredContacts = gmailContacts.filter(email => 
                email.toLowerCase().includes(query.toLowerCase()) &&
                !audioParticipants.includes(email)
            );

            if (filteredContacts.length === 0) {
                hideSuggestions();
                return;
            }

            contactOptions.innerHTML = filteredContacts
                .map(email => `<div class="suggestion-item" data-email="${email}">${email}</div>`)
                .join('');
            
            contactOptions.classList.add('show');
        }

        function hideSuggestions() {
            contactOptions.classList.remove('show');
            setTimeout(() => {
                contactOptions.innerHTML = '';
            }, 300);
        }

        function selectSuggestion(email) {
            contactInput.value = email;
            hideSuggestions();
            addContactBtn.focus();
        }

        // Participant Management Functions
        function addParticipantAudio() {
            const email = contactInput.value.trim();
            
            if (!email) {
                return;
            }

            if (!isValidEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }

            if (audioParticipants.includes(email)) {
                alert('This participant has already been added');
                return;
            }

            audioParticipants.push(email);
            contactInput.value = '';
            renderaudioParticipants();
            hideSuggestions();
            contactInput.focus();
        }

        function removeParticipant(email) {
            audioParticipants = audioParticipants.filter(p => p !== email);
            renderaudioParticipants();
        }

        function renderaudioParticipants() {
            if (audioParticipants.length === 0) {
                attendeeChips.innerHTML = '<span style="color: rgba(255, 255, 255, 0.5); font-style: italic;">No audioParticipants added yet</span>';
                return;
            }

            attendeeChips.innerHTML = audioParticipants
                .map(email => `
                    <div class="participant-tag">
                        <span>${email}</span>
                        <button type="button" class="remove-tag-btn" onclick="removeParticipant('${email}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
        }

        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        // Event Listeners
        audioOnlyBtn.addEventListener('click', openAudioModal);
        dismissDialog.addEventListener('click', dismissDialogFunc);
        dismissControl.addEventListener('click', dismissDialogFunc);

        // Close modal when clicking outside
        dialogBackdrop.addEventListener('click', (e) => {
            if (e.target === dialogBackdrop) {
                dismissDialogFunc();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dialogBackdrop.classList.contains('active')) {
                dismissDialogFunc();
            }
        });

        // Email input autocomplete
        contactInput.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });

        contactInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addParticipantAudio();
            }
        });

        // Email suggestions click handling
        contactOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                selectSuggestion(e.target.dataset.email);
            }
        });

        // Add email button
        addContactBtn.addEventListener('click', addParticipantAudio);

      

        // Initialize
        renderaudioParticipants();

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!contactInput.contains(e.target) && !contactOptions.contains(e.target)) {
                hideSuggestions();
            }
        });

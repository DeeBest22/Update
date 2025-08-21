const socketRename = io();
       
      

        // socketRename connection events
        socketRename.on('connect', () => {
           
            socketRename.emit('hostConnected');
        });

        // Handle settings update from server
        socketRename.on('settingsUpdate', (settings) => {
            renamingToggle.checked = settings.allowRenaming;
            updateStatusIndicator(settings.allowRenaming);
        });

     

        // Handle toggle changes
        renamingToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            
            // Update UI immediately
            updateStatusIndicator(isEnabled);
            
            // Send to server
            socketRename.emit('toggleRenaming', isEnabled);
        });

        // Update status indicator
        function updateStatusIndicator(isEnabled) {
            if (isEnabled) {
              
            } else {
              
            }
        }

        // Initialize status
        updateStatusIndicator(renamingToggle.checked);

        // Handle participant name changes
        socketRename.on('participantNameChanged', (data) => {
            // Could show a notification or log here if needed
            // But keeping it silent as requested
        });
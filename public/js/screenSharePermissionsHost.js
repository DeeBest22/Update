   const screenShareSocket = io();
        const toggle = document.getElementById('screenSharingToggle');
        // Join as host when connected
        screenShareSocket.on('connect', () => {
            screenShareSocket.emit('join-as-host');
            });
           // Handle toggle changes
        toggle.addEventListener('change', function() {
            const isEnabled = this.checked;
          // Emit to server
            screenShareSocket.emit('toggle-screen-sharing', { enabled: isEnabled });
        });
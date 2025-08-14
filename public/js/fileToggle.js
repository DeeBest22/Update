// Add this JavaScript to connect your toggle button to the file permission system

document.addEventListener('DOMContentLoaded', function() {
    // Get the file sharing toggle checkbox - find it by looking for the setting item with "File Sharing" text
    const fileSharingSettingItem = Array.from(document.querySelectorAll('.setting-item')).find(item => 
        item.textContent.includes('File Sharing')
    );
    
    const fileSharingToggle = fileSharingSettingItem ? fileSharingSettingItem.querySelector('input[type="checkbox"]') : null;
    
    if (!fileSharingToggle) {
        console.error('File sharing toggle not found');
        return;
    }

    // Initialize toggle state from server
    initializeToggleState();
    
    // Add event listener to the toggle
    fileSharingToggle.addEventListener('change', handleToggleChange);

    async function initializeToggleState() {
        try {
            const response = await fetch('/api/file-sharing-status');
            const data = await response.json();
            
            // Update toggle to match server state
            fileSharingToggle.checked = data.enabled;
        } catch (error) {
            console.error('Error getting initial file sharing status:', error);
            // Default to enabled if we can't get status
            fileSharingToggle.checked = true;
        }
    }

    async function handleToggleChange(event) {
        const isEnabled = event.target.checked;
        
        try {
            // Send toggle request to server
            const response = await fetch('/api/file-sharing-toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled: isEnabled })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                // Revert toggle if request failed
                event.target.checked = !isEnabled;
                console.error('Failed to toggle file sharing:', data.error);
                showNotification('Failed to update file sharing setting', 'error');
                return;
            }
            
            // Update toggle to match server response
            event.target.checked = data.enabled;
            
            // Show confirmation
            const message = data.enabled ? 'File sharing enabled' : 'File sharing disabled';
            showNotification(message, 'success');
            
            console.log(`File sharing ${data.enabled ? 'enabled' : 'disabled'}`);
            
        } catch (error) {
            // Revert toggle if request failed
            event.target.checked = !isEnabled;
            console.error('Error toggling file sharing:', error);
            showNotification('Error updating file sharing setting', 'error');
        }
    }

    // Optional: Listen for real-time updates via Socket.IO if available
    if (typeof io !== 'undefined') {
        const socket = io();
        
        // Listen for permission changes from other clients/sources
        socket.on('file-sharing-permission-changed', (data) => {
            fileSharingToggle.checked = data.enabled;
            const message = data.enabled ? 'File sharing enabled' : 'File sharing disabled';
            showNotification(message, 'info');
        });
        
        // Get initial status via socket
        socket.on('file-sharing-permission-status', (data) => {
            fileSharingToggle.checked = data.enabled;
        });
        
        // Request current permission status
        socket.emit('get-file-sharing-permission');
    }

    // Helper function for notifications (reuse from fileShare.js or create simple version)
    function showNotification(message, type = 'info') {
        // Check if the notification function from fileShare.js is available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Simple fallback notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
});
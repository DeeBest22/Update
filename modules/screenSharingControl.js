// modules/screenSharingControl.js

/**
 * Screen Sharing Control Module
 * Handles screen sharing permissions and state management
 */

// Store current screen sharing state
let screenSharingEnabled = true;

/**
 * Setup screen sharing control functionality
 * @param {Express} app - Express application instance
 * @param {SocketIO} io - Socket.IO instance
 * @returns {Object} API object with socket handlers
 */
export function setupScreenSharingControl(app, io) {
    console.log('Setting up screen sharing control module...');

    /**
     * Setup socket handlers for screen sharing control
     * @param {Socket} socket - Individual socket connection
     * @returns {Object} Cleanup handlers
     */
    const setupSocketHandlers = (socket) => {
        // Handle host joining
        socket.on('join-as-host', () => {
            socket.join('hosts');
            console.log(`Host joined: ${socket.id}`);
            
            // Send current screen sharing state to host
            socket.emit('screen-sharing-state', { enabled: screenSharingEnabled });
        });

        // Handle participant joining
        socket.on('join-as-participant', () => {
            socket.join('participants');
            console.log(`Participant joined: ${socket.id}`);
            
            // Send current screen sharing state to new participant
            socket.emit('screen-sharing-state', { enabled: screenSharingEnabled });
        });

        // Handle screen sharing toggle from host
        socket.on('toggle-screen-sharing', (data) => {
            // Verify the socket is in the hosts room for security
            if (!socket.rooms.has('hosts')) {
                console.log('Unauthorized screen sharing toggle attempt from:', socket.id);
                socket.emit('error', { message: 'Unauthorized: Only hosts can toggle screen sharing' });
                return;
            }

            screenSharingEnabled = data.enabled;
            console.log(`Screen sharing toggled by ${socket.id}:`, screenSharingEnabled ? 'ON' : 'OFF');
            
            // Broadcast to all participants and hosts
            io.to('participants').emit('screen-sharing-state', { enabled: screenSharingEnabled });
            io.to('hosts').emit('screen-sharing-state', { enabled: screenSharingEnabled });
            
            // Log the change for auditing purposes
            console.log(`Screen sharing is now ${screenSharingEnabled ? 'enabled' : 'disabled'}`);
        });

        // Handle getting current screen sharing state
        socket.on('get-screen-sharing-state', () => {
            socket.emit('screen-sharing-state', { enabled: screenSharingEnabled });
        });

        // Cleanup function for disconnect
        const handleDisconnect = () => {
            // No specific cleanup needed for screen sharing control
            // The socket will automatically leave all rooms
            console.log(`Screen sharing control cleanup for socket: ${socket.id}`);
        };

        return { handleDisconnect };
    };

    // API endpoints for screen sharing control (if needed)
    
    // Get current screen sharing state
    app.get('/api/screen-sharing/state', (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        res.json({ 
            enabled: screenSharingEnabled,
            timestamp: new Date().toISOString()
        });
    });

    // Toggle screen sharing state (REST endpoint for hosts)
    app.post('/api/screen-sharing/toggle', (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // In a real application, you'd check if the user has host privileges
        // For now, we'll allow any authenticated user
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid enabled value. Must be boolean.' });
        }

        screenSharingEnabled = enabled;
        console.log(`Screen sharing toggled via API by user ${req.session.userId}:`, screenSharingEnabled ? 'ON' : 'OFF');
        
        // Broadcast to all connected clients
        io.to('participants').emit('screen-sharing-state', { enabled: screenSharingEnabled });
        io.to('hosts').emit('screen-sharing-state', { enabled: screenSharingEnabled });

        res.json({ 
            success: true, 
            enabled: screenSharingEnabled,
            message: `Screen sharing ${screenSharingEnabled ? 'enabled' : 'disabled'}`,
            timestamp: new Date().toISOString()
        });
    });

    // Return the API object
    return {
        setupSocketHandlers,
        getScreenSharingState: () => screenSharingEnabled,
        setScreenSharingState: (enabled) => {
            screenSharingEnabled = enabled;
            io.to('participants').emit('screen-sharing-state', { enabled: screenSharingEnabled });
            io.to('hosts').emit('screen-sharing-state', { enabled: screenSharingEnabled });
        }
    };
}
// modules/chatControl.js
export function setupChatControl(app, io) {
    // Store chat state
    let chatEnabled = true;
    const connectedClients = new Set();

    // API Routes for chat control
    app.get('/api/chat/status', (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        res.json({ 
            enabled: chatEnabled,
            connectedClients: connectedClients.size
        });
    });

    app.post('/api/chat/toggle', (req, res) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { enabled } = req.body;
        if (typeof enabled === 'boolean') {
            chatEnabled = enabled;
            console.log(`Chat ${chatEnabled ? 'enabled' : 'disabled'} by user ${req.session.userId}`);
            
            // Broadcast to all connected clients
            io.emit('chatStateUpdate', { enabled: chatEnabled });
            
            res.json({ 
                success: true, 
                enabled: chatEnabled,
                message: `Chat ${chatEnabled ? 'enabled' : 'disabled'} successfully`
            });
        } else {
            res.status(400).json({ error: 'Invalid enabled value. Must be boolean.' });
        }
    });

    // Socket.IO handlers
    const setupSocketHandlers = (socket) => {
        // Add client to connected set
        connectedClients.add(socket.id);
        
        // Send current chat state to newly connected client
        socket.emit('chatStateUpdate', { enabled: chatEnabled });
        
        // Handle chat toggle from host via socket
        socket.on('toggleChat', (data) => {
            // Verify this is a legitimate toggle request
            if (typeof data.enabled === 'boolean') {
                chatEnabled = data.enabled;
                console.log(`Chat ${chatEnabled ? 'enabled' : 'disabled'} by socket ${socket.id}`);
                
                // Broadcast to all connected clients
                io.emit('chatStateUpdate', { enabled: chatEnabled });
                
                // Send confirmation back to the requester
                socket.emit('chatToggleConfirm', { 
                    success: true, 
                    enabled: chatEnabled 
                });
            } else {
                socket.emit('chatToggleError', { 
                    error: 'Invalid enabled value. Must be boolean.' 
                });
            }
        });

        // Handle request for current chat state
        socket.on('getChatState', () => {
            socket.emit('chatStateUpdate', { enabled: chatEnabled });
        });

        // Return disconnect handler
        const handleDisconnect = () => {
            connectedClients.delete(socket.id);
            console.log(`Chat control: Client ${socket.id} disconnected. Active clients: ${connectedClients.size}`);
        };

        return { handleDisconnect };
    };

    // Return API object with methods for external access
    return {
        setupSocketHandlers,
        getChatState: () => ({ enabled: chatEnabled, connectedClients: connectedClients.size }),
        setChatState: (enabled) => {
            if (typeof enabled === 'boolean') {
                chatEnabled = enabled;
                io.emit('chatStateUpdate', { enabled: chatEnabled });
                return true;
            }
            return false;
        },
        getConnectedClientsCount: () => connectedClients.size
    };
}
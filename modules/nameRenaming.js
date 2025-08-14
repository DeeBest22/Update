// modules/nameRenaming.js

/**
 * Name Renaming Module
 * Handles participant name renaming functionality
 */

class NameRenamingManager {
  constructor() {
    this.renamingEnabled = true;
    this.participantNames = new Map(); // Store participant names by socket ID
  }

  /**
   * Toggle name renaming functionality
   * @param {boolean} enabled - Whether name renaming should be enabled
   */
  toggleRenaming(enabled) {
    this.renamingEnabled = enabled;
    console.log('Name renaming toggled:', enabled ? 'ON' : 'OFF');
  }

  /**
   * Check if name renaming is currently enabled
   * @returns {boolean} Current renaming state
   */
  isRenamingEnabled() {
    return this.renamingEnabled;
  }

  /**
   * Set a participant's name
   * @param {string} socketId - Socket ID of the participant
   * @param {string} name - New name for the participant
   */
  setParticipantName(socketId, name) {
    this.participantNames.set(socketId, name);
  }

  /**
   * Get a participant's name
   * @param {string} socketId - Socket ID of the participant
   * @returns {string|null} Participant's name or null if not found
   */
  getParticipantName(socketId) {
    return this.participantNames.get(socketId) || null;
  }

  /**
   * Remove a participant
   * @param {string} socketId - Socket ID of the participant to remove
   */
  removeParticipant(socketId) {
    this.participantNames.delete(socketId);
  }

  /**
   * Get all participants with their names
   * @returns {Array} Array of participant objects
   */
  getAllParticipants() {
    const participants = [];
    for (const [socketId, name] of this.participantNames) {
      participants.push({ socketId, name });
    }
    return participants;
  }
}

// Create a singleton instance
const nameRenamingManager = new NameRenamingManager();

/**
 * Setup Name Renaming functionality
 * @param {Express} app - Express application instance
 * @param {SocketIO} io - Socket.IO server instance
 * @returns {Object} API object with manager and socket handlers
 */
export function setupNameRenaming(app, io) {
  
  // API Routes for name renaming management
  app.get('/api/name-renaming/status', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
      enabled: nameRenamingManager.isRenamingEnabled(),
      participants: nameRenamingManager.getAllParticipants()
    });
  });

  app.post('/api/name-renaming/toggle', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enabled value' });
    }

    nameRenamingManager.toggleRenaming(enabled);
    
    // Broadcast to all participants
    io.to('participants').emit('name-renaming-state', { enabled });
    
    res.json({ 
      success: true, 
      enabled: nameRenamingManager.isRenamingEnabled() 
    });
  });

  app.post('/api/name-renaming/set-name', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { socketId, name } = req.body;
    if (!socketId || !name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid socketId or name' });
    }

    nameRenamingManager.setParticipantName(socketId, name.trim());
    
    // Notify all participants about name change
    io.emit('participant-name-changed', { 
      socketId, 
      name: name.trim() 
    });
    
    res.json({ success: true });
  });

  /**
   * Setup socket handlers for name renaming
   * @param {Socket} socket - Individual socket connection
   * @returns {Object} Cleanup handlers
   */
  function setupSocketHandlers(socket) {
    
    // Handle host joining
    socket.on('join-as-host', (data) => {
      socket.join('hosts');
      console.log('Host joined for name renaming:', socket.id);
      
      // Send current state to host
      socket.emit('name-renaming-state', { 
        enabled: nameRenamingManager.isRenamingEnabled() 
      });
      
      // Send participant list to host
      socket.emit('participants-list', {
        participants: nameRenamingManager.getAllParticipants()
      });
    });

    // Handle participant joining
    socket.on('join-as-participant', (data) => {
      socket.join('participants');
      console.log('Participant joined for name renaming:', socket.id);
      
      // Set initial name if provided
      if (data && data.name) {
        nameRenamingManager.setParticipantName(socket.id, data.name);
      }
      
      // Send current name renaming state to new participant
      socket.emit('name-renaming-state', { 
        enabled: nameRenamingManager.isRenamingEnabled() 
      });
      
      // Notify hosts about new participant
      io.to('hosts').emit('participant-joined', {
        socketId: socket.id,
        name: nameRenamingManager.getParticipantName(socket.id) || 'Anonymous'
      });
    });

    // Handle name renaming toggle from host
    socket.on('toggle-name-renaming', (data) => {
      // Verify this is from a host
      if (!socket.rooms.has('hosts')) {
        socket.emit('error', { message: 'Only hosts can toggle name renaming' });
        return;
      }

      const enabled = data && typeof data.enabled === 'boolean' ? data.enabled : false;
      nameRenamingManager.toggleRenaming(enabled);
      
      // Broadcast to all participants
      io.to('participants').emit('name-renaming-state', { enabled });
      
      // Confirm to hosts
      io.to('hosts').emit('name-renaming-toggled', { enabled });
    });

    // Handle participant name change request
    socket.on('change-name', (data) => {
      if (!nameRenamingManager.isRenamingEnabled()) {
        socket.emit('name-change-rejected', { 
          message: 'Name renaming is currently disabled' 
        });
        return;
      }

      if (!data || !data.name || typeof data.name !== 'string') {
        socket.emit('name-change-rejected', { 
          message: 'Invalid name provided' 
        });
        return;
      }

      const newName = data.name.trim();
      if (newName.length === 0 || newName.length > 50) {
        socket.emit('name-change-rejected', { 
          message: 'Name must be between 1 and 50 characters' 
        });
        return;
      }

      // Update participant name
      const oldName = nameRenamingManager.getParticipantName(socket.id);
      nameRenamingManager.setParticipantName(socket.id, newName);
      
      // Confirm name change to participant
      socket.emit('name-changed', { 
        oldName: oldName || 'Anonymous',
        newName: newName 
      });
      
      // Notify all other participants and hosts
      socket.broadcast.emit('participant-name-changed', {
        socketId: socket.id,
        oldName: oldName || 'Anonymous',
        newName: newName
      });
      
      console.log(`Participant ${socket.id} changed name from "${oldName || 'Anonymous'}" to "${newName}"`);
    });

    // Handle participant requesting current name
    socket.on('get-my-name', () => {
      const currentName = nameRenamingManager.getParticipantName(socket.id);
      socket.emit('current-name', { 
        name: currentName || 'Anonymous' 
      });
    });

    // Cleanup function
    function handleDisconnect() {
      const participantName = nameRenamingManager.getParticipantName(socket.id);
      nameRenamingManager.removeParticipant(socket.id);
      
      // Notify hosts about participant leaving
      io.to('hosts').emit('participant-left', {
        socketId: socket.id,
        name: participantName || 'Anonymous'
      });
      
      console.log(`Participant ${socket.id} (${participantName || 'Anonymous'}) disconnected from name renaming`);
    }

    return { handleDisconnect };
  }

  return {
    manager: nameRenamingManager,
    setupSocketHandlers,
    // Expose additional methods for integration
    isRenamingEnabled: () => nameRenamingManager.isRenamingEnabled(),
    toggleRenaming: (enabled) => {
      nameRenamingManager.toggleRenaming(enabled);
      io.to('participants').emit('name-renaming-state', { enabled });
    },
    getParticipantName: (socketId) => nameRenamingManager.getParticipantName(socketId),
    setParticipantName: (socketId, name) => {
      nameRenamingManager.setParticipantName(socketId, name);
      io.emit('participant-name-changed', { socketId, name });
    }
  };
}
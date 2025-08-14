// modules/participantControl.js
import express from 'express';

// Store meeting settings globally
let meetingSettings = {
  allowRenaming: true
};

// Store participant data
let participants = new Map();

export function setupParticipantControl(app, io) {
  // API Routes for participant control
  
  // Get current meeting settings
  app.get('/api/participant-settings', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(meetingSettings);
  });

  // Update meeting settings (host only)
  app.post('/api/participant-settings', express.json(), (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { allowRenaming } = req.body;
    
    if (typeof allowRenaming === 'boolean') {
      meetingSettings.allowRenaming = allowRenaming;
      
      // Broadcast to all participants
      io.to('participants').emit('renamingToggled', allowRenaming);
      
      res.json({ success: true, settings: meetingSettings });
    } else {
      res.status(400).json({ error: 'Invalid settings data' });
    }
  });

  // Get participants list (host only)
  app.get('/api/participants', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const participantsList = Array.from(participants.values());
    res.json(participantsList);
  });

  // Setup socket handlers
  const setupSocketHandlers = (socket) => {
    // Handle host page connections
    socket.on('hostConnected', () => {
      socket.join('hosts');
      console.log('Host connected for participant control:', socket.id);
      // Send current settings to host
      socket.emit('settingsUpdate', meetingSettings);
      
      // Send current participants list
      const participantsList = Array.from(participants.values());
      socket.emit('participantsList', participantsList);
    });

    // Handle join page connections
    socket.on('participantConnected', (participantData = {}) => {
      socket.join('participants');
      console.log('Participant connected for control:', socket.id);
      
      // Store participant data
      const participant = {
        socketId: socket.id,
        name: participantData.name || `Participant ${socket.id.substr(0, 6)}`,
        joinedAt: new Date(),
        ...participantData
      };
      participants.set(socket.id, participant);
      
      // Send current settings to participant
      socket.emit('settingsUpdate', meetingSettings);
      socket.emit('renamingToggled', meetingSettings.allowRenaming);
      
      // Notify hosts of new participant
      io.to('hosts').emit('participantJoined', participant);
      io.to('hosts').emit('participantsList', Array.from(participants.values()));
    });

    // Handle toggle changes from host
    socket.on('toggleRenaming', (allowRenaming) => {
      meetingSettings.allowRenaming = allowRenaming;
      console.log('Renaming setting changed to:', allowRenaming);
      
      // Broadcast to all participants
      io.to('participants').emit('renamingToggled', allowRenaming);
      
      // Confirm to host
      socket.emit('settingsUpdate', meetingSettings);
    });

    // Handle participant name changes (if allowed)
    socket.on('changeName', (newName) => {
      if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
        socket.emit('nameChangeResult', { 
          success: false, 
          message: 'Invalid name provided' 
        });
        return;
      }

      const trimmedName = newName.trim();
      
      if (meetingSettings.allowRenaming) {
        // Update participant data
        const participant = participants.get(socket.id);
        if (participant) {
          participant.name = trimmedName;
          participants.set(socket.id, participant);
        }
        
        socket.emit('nameChangeResult', { 
          success: true, 
          name: trimmedName 
        });
        
        // Broadcast to hosts that a name was changed
        io.to('hosts').emit('participantNameChanged', { 
          socketId: socket.id, 
          name: trimmedName,
          participant: participant
        });
        
        // Update participants list for hosts
        io.to('hosts').emit('participantsList', Array.from(participants.values()));
      } else {
        socket.emit('nameChangeResult', { 
          success: false, 
          message: 'Renaming is disabled by the meeting host' 
        });
      }
    });

    // Handle host kicking participants
    socket.on('kickParticipant', (socketId) => {
      if (participants.has(socketId)) {
        const participant = participants.get(socketId);
        
        // Remove from participants
        participants.delete(socketId);
        
        // Disconnect the participant
        const participantSocket = io.sockets.sockets.get(socketId);
        if (participantSocket) {
          participantSocket.emit('kicked', { message: 'You have been removed from the meeting' });
          participantSocket.disconnect(true);
        }
        
        // Update hosts
        io.to('hosts').emit('participantKicked', { socketId, participant });
        io.to('hosts').emit('participantsList', Array.from(participants.values()));
        
        console.log('Participant kicked:', socketId, participant?.name);
      }
    });

    // Handle host muting/unmuting participants
    socket.on('muteParticipant', (data) => {
      const { socketId, muted } = data;
      const participantSocket = io.sockets.sockets.get(socketId);
      
      if (participantSocket) {
        participantSocket.emit('forceMute', { muted });
        
        // Update participant data
        const participant = participants.get(socketId);
        if (participant) {
          participant.muted = muted;
          participants.set(socketId, participant);
        }
        
        // Notify hosts
        io.to('hosts').emit('participantMuted', { socketId, muted, participant });
        io.to('hosts').emit('participantsList', Array.from(participants.values()));
        
        console.log('Participant', muted ? 'muted' : 'unmuted', ':', socketId);
      }
    });

    // Cleanup function for disconnect
    const handleDisconnect = () => {
      if (participants.has(socket.id)) {
        const participant = participants.get(socket.id);
        participants.delete(socket.id);
        
        // Notify hosts of participant leaving
        io.to('hosts').emit('participantLeft', { socketId: socket.id, participant });
        io.to('hosts').emit('participantsList', Array.from(participants.values()));
        
        console.log('Participant disconnected from control:', socket.id, participant?.name);
      }
    };

    return { handleDisconnect };
  };

  return {
    setupSocketHandlers,
    getMeetingSettings: () => meetingSettings,
    getParticipants: () => participants,
    updateMeetingSettings: (newSettings) => {
      Object.assign(meetingSettings, newSettings);
      return meetingSettings;
    }
  };
}
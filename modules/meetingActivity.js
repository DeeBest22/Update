// Enhanced meetingActivity.js - Fixed version with robust participant tracking
import mongoose from 'mongoose';

// Meeting Activity Schema
const meetingActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingName: { type: String, required: true },
  meetingId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'scheduled', 'missed', 'cancelled', 'in-progress'], 
    default: 'completed' 
  },
  duration: { type: Number }, // Duration in minutes
  participantCount: { type: Number, default: 1 },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  isHost: { type: Boolean, default: false },
  joinTime: { type: Date },
  leaveTime: { type: Date },
  finalMeetingName: { type: String },
  sessionId: { type: String }, // Track socket session
  lastSeen: { type: Date, default: Date.now }, // Track last activity
  createdAt: { type: Date, default: Date.now }
});

const MeetingActivity = mongoose.model('MeetingActivity', meetingActivitySchema);

// Active meeting sessions tracking
const activeMeetingSessions = new Map(); // socketId -> meetingData

// Setup meeting activity tracking
export const setupMeetingActivity = (app, io) => {
  
  // API endpoint to get recent activities for a user (limited to 4 most recent)
  app.get('/api/recent-activities', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      
      const activities = await MeetingActivity
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate('userId', 'firstName lastName email profilePicture');
      
      res.json({ activities });
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ error: 'Failed to fetch recent activities' });
    }
  });

  // API endpoint to manually save meeting activity (for immediate tracking)
  app.post('/api/meeting-activity', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { 
        meetingName, 
        meetingId, 
        status, 
        duration, 
        participantCount, 
        startTime, 
        endTime, 
        isHost, 
        joinTime, 
        leaveTime, 
        finalMeetingName,
        sessionId 
      } = req.body;
      
      if (!meetingName || !meetingId) {
        return res.status(400).json({ error: 'Meeting name and ID are required' });
      }
      
      // Check if activity already exists for this session
      const existingActivity = await MeetingActivity.findOne({
        userId,
        meetingId,
        sessionId: sessionId || 'unknown',
        status: { $in: ['in-progress', 'completed'] }
      });

      if (existingActivity) {
        // Update existing activity
        existingActivity.finalMeetingName = finalMeetingName || meetingName;
        existingActivity.endTime = endTime ? new Date(endTime) : new Date();
        existingActivity.leaveTime = leaveTime ? new Date(leaveTime) : new Date();
        existingActivity.status = status || 'completed';
        existingActivity.duration = duration || Math.round((existingActivity.endTime - existingActivity.startTime) / (1000 * 60));
        existingActivity.lastSeen = new Date();
        
        await existingActivity.save();
        
        console.log(`Updated existing activity: ${existingActivity.finalMeetingName} (${existingActivity.duration} minutes)`);
        
        // Emit update
        io.to(`user_${userId}`).emit('activity-updated', {
          type: 'meeting-updated',
          activity: {
            id: existingActivity._id,
            meetingName: existingActivity.finalMeetingName,
            status: existingActivity.status,
            duration: existingActivity.duration,
            participantCount: existingActivity.participantCount,
            isHost: existingActivity.isHost,
            createdAt: existingActivity.createdAt
          }
        });
        
        return res.json({ message: 'Meeting activity updated successfully', activityId: existingActivity._id });
      }
      
      // Create new activity
      const activity = new MeetingActivity({
        userId,
        meetingName,
        meetingId,
        status: status || 'completed',
        duration,
        participantCount: participantCount || 1,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        isHost: isHost || false,
        joinTime: joinTime ? new Date(joinTime) : null,
        leaveTime: leaveTime ? new Date(leaveTime) : null,
        finalMeetingName: finalMeetingName || meetingName,
        sessionId: sessionId || 'unknown',
        lastSeen: new Date()
      });
      
      await activity.save();
      
      // Emit to user's socket for real-time updates
      io.to(`user_${userId}`).emit('activity-updated', {
        type: 'meeting-completed',
        activity: {
          id: activity._id,
          meetingName: activity.finalMeetingName || activity.meetingName,
          status: activity.status,
          duration: activity.duration,
          participantCount: activity.participantCount,
          isHost: activity.isHost,
          createdAt: activity.createdAt
        }
      });
      
      res.json({ message: 'Meeting activity saved successfully', activityId: activity._id });
    } catch (error) {
      console.error('Error saving meeting activity:', error);
      res.status(500).json({ error: 'Failed to save meeting activity' });
    }
  });

  // API endpoint to start tracking a meeting session
  app.post('/api/meeting-activity/start', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { meetingName, meetingId, isHost, sessionId } = req.body;
      
      if (!meetingName || !meetingId) {
        return res.status(400).json({ error: 'Meeting name and ID are required' });
      }
      
      // Create in-progress activity
      const activity = new MeetingActivity({
        userId,
        meetingName,
        meetingId,
        status: 'in-progress',
        startTime: new Date(),
        joinTime: new Date(),
        isHost: isHost || false,
        sessionId: sessionId || 'unknown',
        lastSeen: new Date()
      });
      
      await activity.save();
      
      console.log(`Started tracking meeting: ${meetingName} for user ${userId}, isHost: ${isHost}`);
      
      res.json({ message: 'Meeting tracking started', activityId: activity._id });
    } catch (error) {
      console.error('Error starting meeting tracking:', error);
      res.status(500).json({ error: 'Failed to start meeting tracking' });
    }
  });

  // API endpoint to update meeting name during session
  app.post('/api/meeting-activity/update-name', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { meetingId, newName, sessionId } = req.body;
      
      if (!meetingId || !newName) {
        return res.status(400).json({ error: 'Meeting ID and new name are required' });
      }
      
      // Update the in-progress activity
      const activity = await MeetingActivity.findOne({
        userId,
        meetingId,
        sessionId: sessionId || 'unknown',
        status: 'in-progress'
      });

      if (activity) {
        activity.finalMeetingName = newName.trim();
        activity.lastSeen = new Date();
        await activity.save();
        
        console.log(`Updated meeting name to: ${newName} for meeting ${meetingId}`);
      }
      
      res.json({ message: 'Meeting name updated successfully' });
    } catch (error) {
      console.error('Error updating meeting name:', error);
      res.status(500).json({ error: 'Failed to update meeting name' });
    }
  });

  // Cleanup function to finalize abandoned sessions
  const cleanupAbandonedSessions = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const abandonedSessions = await MeetingActivity.find({
        status: 'in-progress',
        lastSeen: { $lt: fiveMinutesAgo }
      });

      for (const session of abandonedSessions) {
        const endTime = session.lastSeen;
        const duration = Math.round((endTime - session.startTime) / (1000 * 60));
        
        session.status = 'completed';
        session.endTime = endTime;
        session.leaveTime = endTime;
        session.duration = duration;
        
        await session.save();
        
        console.log(`Cleaned up abandoned session: ${session.finalMeetingName || session.meetingName} (${duration} minutes)`);
        
        // Emit update to user if they're connected
        io.to(`user_${session.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: session._id,
            meetingName: session.finalMeetingName || session.meetingName,
            status: session.status,
            duration: session.duration,
            participantCount: session.participantCount,
            isHost: session.isHost,
            createdAt: session.createdAt
          }
        });
      }
      
      if (abandonedSessions.length > 0) {
        console.log(`Cleaned up ${abandonedSessions.length} abandoned meeting sessions`);
      }
    } catch (error) {
      console.error('Error cleaning up abandoned sessions:', error);
    }
  };

  // Run cleanup every 2 minutes
  setInterval(cleanupAbandonedSessions, 2 * 60 * 1000);

  // Socket handlers for real-time meeting tracking
  const setupSocketHandlers = (socket) => {
    // Join user-specific room for activity updates
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined user room: user_${userId}`);
    });

    // Handle meeting start - for both hosts and participants
    socket.on('meeting-started', async (data) => {
      try {
        const { meetingId, meetingName, userId, isHost } = data;
        
        if (!userId || !meetingId || !meetingName) {
          console.log('Missing required data for meeting-started');
          return;
        }

        // Store in active sessions map
        activeMeetingSessions.set(socket.id, {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(),
          joinTime: new Date(),
          participantCount: 1,
          isHost: isHost || false,
          sessionId: socket.id,
          lastSeen: new Date()
        });

        // Create in-progress activity in database
        const activity = new MeetingActivity({
          userId,
          meetingName,
          meetingId,
          status: 'in-progress',
          startTime: new Date(),
          joinTime: new Date(),
          isHost: isHost || false,
          sessionId: socket.id,
          lastSeen: new Date()
        });
        
        await activity.save();
        
        console.log(`Meeting started tracking: ${meetingName} (${meetingId}) by user ${userId}, isHost: ${isHost}`);
      } catch (error) {
        console.error('Error handling meeting start:', error);
      }
    });

    // Handle participant joining existing meeting
    socket.on('participant-joined-meeting', async (data) => {
      try {
        const { meetingId, meetingName, userId } = data;
        
        if (!userId || !meetingId || !meetingName) {
          console.log('Missing required data for participant-joined-meeting');
          return;
        }

        // Store in active sessions map
        activeMeetingSessions.set(socket.id, {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(), // Meeting start time (will be updated)
          joinTime: new Date(), // When this participant joined
          participantCount: 1,
          isHost: false,
          sessionId: socket.id,
          lastSeen: new Date()
        });

        // Create in-progress activity in database
        const activity = new MeetingActivity({
          userId,
          meetingName,
          meetingId,
          status: 'in-progress',
          startTime: new Date(), // This represents when they joined
          joinTime: new Date(),
          isHost: false,
          sessionId: socket.id,
          lastSeen: new Date()
        });
        
        await activity.save();
        
        console.log(`Participant joined tracking: ${meetingName} (${meetingId}) by user ${userId}`);
      } catch (error) {
        console.error('Error handling participant join:', error);
      }
    });

    // Handle meeting name changes during the meeting
    socket.on('meeting-name-changed', async (data) => {
      try {
        const { meetingId, newName, userId } = data;
        
        if (!meetingId || !newName) {
          console.log('Missing data for meeting-name-changed');
          return;
        }

        // Update active session
        const sessionData = activeMeetingSessions.get(socket.id);
        if (sessionData && sessionData.meetingId === meetingId) {
          sessionData.meetingName = newName;
          sessionData.finalMeetingName = newName;
          sessionData.lastSeen = new Date();
          activeMeetingSessions.set(socket.id, sessionData);
        }

        // Update database activity
        await MeetingActivity.updateOne(
          { 
            meetingId, 
            sessionId: socket.id,
            status: 'in-progress'
          },
          { 
            finalMeetingName: newName,
            lastSeen: new Date()
          }
        );
        
        console.log(`Meeting name updated to: ${newName} for meeting ${meetingId}`);
      } catch (error) {
        console.error('Error handling meeting name change:', error);
      }
    });

    // Handle heartbeat to track active sessions
    socket.on('meeting-heartbeat', async (data) => {
      try {
        const { meetingId, userId, meetingName } = data;
        
        // Update last seen time
        const sessionData = activeMeetingSessions.get(socket.id);
        if (sessionData) {
          sessionData.lastSeen = new Date();
          if (meetingName && meetingName !== sessionData.meetingName) {
            sessionData.finalMeetingName = meetingName;
          }
          activeMeetingSessions.set(socket.id, sessionData);
        }

        // Update database
        await MeetingActivity.updateOne(
          { 
            meetingId, 
            userId,
            sessionId: socket.id,
            status: 'in-progress'
          },
          { 
            lastSeen: new Date(),
            ...(meetingName && { finalMeetingName: meetingName })
          }
        );
      } catch (error) {
        console.error('Error handling meeting heartbeat:', error);
      }
    });

    // Handle explicit meeting end - for hosts
    socket.on('meeting-ended', async (data) => {
      try {
        const sessionData = activeMeetingSessions.get(socket.id);
        if (!sessionData) {
          console.log('No session data found for meeting-ended');
          return;
        }

        const endTime = new Date();
        const duration = Math.round((endTime - sessionData.startTime) / (1000 * 60));
        const finalMeetingName = (data && data.meetingName && data.meetingName.trim()) 
          ? data.meetingName.trim() 
          : sessionData.finalMeetingName || sessionData.meetingName;

        // Update database activity
        await MeetingActivity.updateOne(
          { 
            userId: sessionData.userId,
            meetingId: sessionData.meetingId,
            sessionId: socket.id,
            status: 'in-progress'
          },
          {
            status: 'completed',
            endTime,
            leaveTime: endTime,
            duration,
            finalMeetingName,
            lastSeen: endTime
          }
        );

        // Remove from active sessions
        activeMeetingSessions.delete(socket.id);
        
        // Emit update
        io.to(`user_${sessionData.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: sessionData.meetingId,
            meetingName: finalMeetingName,
            status: 'completed',
            duration,
            participantCount: sessionData.participantCount,
            isHost: sessionData.isHost,
            createdAt: new Date()
          }
        });

        console.log(`Meeting ended: ${finalMeetingName} (${duration} minutes), isHost: ${sessionData.isHost}`);
        
      } catch (error) {
        console.error('Error saving meeting activity on end:', error);
      }
    });

    // Handle explicit participant leave
    socket.on('participant-left-meeting', async (data) => {
      try {
        const sessionData = activeMeetingSessions.get(socket.id);
        if (!sessionData) {
          console.log('No session data found for participant-left-meeting');
          return;
        }

        const endTime = new Date();
        const duration = Math.round((endTime - sessionData.joinTime) / (1000 * 60));
        const finalMeetingName = (data && data.meetingName && data.meetingName.trim()) 
          ? data.meetingName.trim() 
          : sessionData.finalMeetingName || sessionData.meetingName;

        // Update database activity
        await MeetingActivity.updateOne(
          { 
            userId: sessionData.userId,
            meetingId: sessionData.meetingId,
            sessionId: socket.id,
            status: 'in-progress'
          },
          {
            status: 'completed',
            endTime,
            leaveTime: endTime,
            duration,
            finalMeetingName,
            lastSeen: endTime
          }
        );

        // Remove from active sessions
        activeMeetingSessions.delete(socket.id);
        
        // Emit update
        io.to(`user_${sessionData.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: sessionData.meetingId,
            meetingName: finalMeetingName,
            status: 'completed',
            duration,
            participantCount: sessionData.participantCount,
            isHost: sessionData.isHost,
            createdAt: new Date()
          }
        });

        console.log(`Participant left: ${finalMeetingName} (${duration} minutes)`);
        
      } catch (error) {
        console.error('Error saving participant meeting activity:', error);
      }
    });

    // Handle disconnect - CRITICAL for tab closures
    const handleDisconnect = async () => {
      try {
        const sessionData = activeMeetingSessions.get(socket.id);
        if (!sessionData) {
          return;
        }

        console.log('Handling disconnect for socket:', socket.id);

        const endTime = new Date();
        const duration = Math.round((endTime - sessionData.joinTime) / (1000 * 60));
        const finalMeetingName = sessionData.finalMeetingName || sessionData.meetingName;

        // Update database activity
        const updateResult = await MeetingActivity.updateOne(
          { 
            userId: sessionData.userId,
            meetingId: sessionData.meetingId,
            sessionId: socket.id,
            status: 'in-progress'
          },
          {
            status: 'completed',
            endTime,
            leaveTime: endTime,
            duration,
            finalMeetingName,
            lastSeen: endTime
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`Meeting activity saved on disconnect: ${finalMeetingName} (${duration} minutes), isHost: ${sessionData.isHost}`);
          
          // Emit update
          io.to(`user_${sessionData.userId}`).emit('activity-updated', {
            type: 'meeting-completed',
            activity: {
              id: sessionData.meetingId,
              meetingName: finalMeetingName,
              status: 'completed',
              duration,
              participantCount: sessionData.participantCount,
              isHost: sessionData.isHost,
              createdAt: new Date()
            }
          });
        }

        // Remove from active sessions
        activeMeetingSessions.delete(socket.id);
        
      } catch (error) {
        console.error('Error saving meeting activity on disconnect:', error);
      }
    };

    return { handleDisconnect };
  };

  // Enhanced cleanup function that runs periodically
  const enhancedCleanup = async () => {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const staleSessions = await MeetingActivity.find({
        status: 'in-progress',
        lastSeen: { $lt: tenMinutesAgo }
      });

      for (const session of staleSessions) {
        const endTime = session.lastSeen;
        const duration = Math.round((endTime - session.joinTime) / (1000 * 60));
        
        session.status = 'completed';
        session.endTime = endTime;
        session.leaveTime = endTime;
        session.duration = Math.max(1, duration); // Minimum 1 minute
        
        await session.save();
        
        console.log(`Auto-completed stale session: ${session.finalMeetingName || session.meetingName} (${duration} minutes)`);
        
        // Emit update
        io.to(`user_${session.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: session._id,
            meetingName: session.finalMeetingName || session.meetingName,
            status: session.status,
            duration: session.duration,
            participantCount: session.participantCount,
            isHost: session.isHost,
            createdAt: session.createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error in enhanced cleanup:', error);
    }
  };

  // Run enhanced cleanup every 5 minutes
  setInterval(enhancedCleanup, 5 * 60 * 1000);

  console.log('✅ Meeting Activity module initialized with enhanced tracking');

  return { setupSocketHandlers, MeetingActivity, activeMeetingSessions };
};

export { MeetingActivity };
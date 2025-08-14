// Enhanced meetingActivity.js - Updated version with participant tracking
import mongoose from 'mongoose';

// Meeting Activity Schema
const meetingActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meetingName: { type: String, required: true },
  meetingId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'scheduled', 'missed', 'cancelled'], 
    default: 'completed' 
  },
  duration: { type: Number }, // Duration in minutes
  participantCount: { type: Number, default: 1 },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  isHost: { type: Boolean, default: false },
  joinTime: { type: Date }, // NEW: Track when participant joined
  leaveTime: { type: Date }, // NEW: Track when participant left
  finalMeetingName: { type: String }, // NEW: Store the final meeting name
  createdAt: { type: Date, default: Date.now }
});

const MeetingActivity = mongoose.model('MeetingActivity', meetingActivitySchema);

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

  // API endpoint to save meeting activity
  app.post('/api/meeting-activity', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { meetingName, meetingId, status, duration, participantCount, startTime, endTime, isHost, joinTime, leaveTime, finalMeetingName } = req.body;
      
      if (!meetingName || !meetingId) {
        return res.status(400).json({ error: 'Meeting name and ID are required' });
      }
      
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
        finalMeetingName: finalMeetingName || meetingName
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

  // Socket handlers for real-time meeting tracking
  const setupSocketHandlers = (socket) => {
    // Join user-specific room for activity updates
    socket.on('join-user-room', (userId) => {
      socket.join(`user_${userId}`);
    });

    // Handle meeting start for both hosts and participants
    socket.on('meeting-started', async (data) => {
      try {
        const { meetingId, meetingName, userId, isHost } = data;
        
        if (!userId || !meetingId || !meetingName) {
          return;
        }

        // Store meeting start data in socket for later use
        socket.meetingData = {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(),
          joinTime: new Date(), // NEW: Track join time for participants
          participantCount: 1,
          isHost: isHost || false,
          activitySaved: false
        };
        
        console.log(`Meeting started: ${meetingName} (${meetingId}) by user ${userId}, isHost: ${isHost}`);
      } catch (error) {
        console.error('Error handling meeting start:', error);
      }
    });

    // NEW: Handle participant joining existing meeting
    socket.on('participant-joined-meeting', async (data) => {
      try {
        const { meetingId, meetingName, userId } = data;
        
        if (!userId || !meetingId || !meetingName) {
          return;
        }

        // Store meeting data for participants who join after meeting started
        socket.meetingData = {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(), // This will be overridden with actual join time
          joinTime: new Date(),
          participantCount: 1,
          isHost: false,
          activitySaved: false
        };
        
        console.log(`Participant joined meeting: ${meetingName} (${meetingId}) by user ${userId}`);
      } catch (error) {
        console.error('Error handling participant join:', error);
      }
    });

    // Handle meeting name changes during the meeting
    socket.on('meeting-name-changed', async (data) => {
      try {
        const { meetingId, newName, userId } = data;
        
        if (socket.meetingData && socket.meetingData.meetingId === meetingId) {
          const oldName = socket.meetingData.meetingName;
          socket.meetingData.meetingName = newName;
          socket.meetingData.finalMeetingName = newName; // Store as final name
          console.log(`Meeting name updated from "${oldName}" to "${newName}" for meeting ${meetingId}`);
        }
      } catch (error) {
        console.error('Error handling meeting name change:', error);
      }
    });

    // NEW: Handle participant leaving meeting (for non-hosts)
    socket.on('participant-left-meeting', async (data) => {
      try {
        const { meetingId, meetingName, userId, duration, joinTime, leaveTime } = data;
        
        if (!userId || !meetingId) {
          console.log('Missing required data for participant-left-meeting');
          return;
        }

        // Use the final meeting name from the client or stored name
        const finalMeetingName = (meetingName && meetingName.trim()) 
          ? meetingName.trim() 
          : (socket.meetingData ? socket.meetingData.finalMeetingName || socket.meetingData.meetingName : 'Meeting');
        
        const startTime = joinTime ? new Date(joinTime) : (socket.meetingData ? socket.meetingData.joinTime : new Date());
        const endTime = leaveTime ? new Date(leaveTime) : new Date();
        const calculatedDuration = duration || Math.round((endTime - startTime) / (1000 * 60));

        console.log(`Participant left meeting. Final name: "${finalMeetingName}", Duration: ${calculatedDuration} minutes`);

        const activity = new MeetingActivity({
          userId: userId,
          meetingName: finalMeetingName,
          meetingId: meetingId,
          status: 'completed',
          duration: calculatedDuration,
          participantCount: socket.meetingData ? socket.meetingData.participantCount : 1,
          startTime: startTime,
          endTime: endTime,
          joinTime: startTime,
          leaveTime: endTime,
          isHost: false,
          finalMeetingName: finalMeetingName
        });

        await activity.save();
        
        // Emit to user's socket for real-time updates
        io.to(`user_${userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: activity._id,
            meetingName: activity.finalMeetingName,
            status: activity.status,
            duration: activity.duration,
            participantCount: activity.participantCount,
            isHost: activity.isHost,
            createdAt: activity.createdAt
          }
        });

        console.log(`Participant activity saved: ${finalMeetingName} (${calculatedDuration} minutes)`);
        
        // Clear meeting data
        socket.meetingData = null;
        
      } catch (error) {
        console.error('Error saving participant meeting activity:', error);
      }
    });

    // Handle meeting end - for hosts
    socket.on('meeting-ended', async (data) => {
      try {
        if (!socket.meetingData) {
          console.log('No meeting data found for ended meeting');
          return;
        }

        // Prevent duplicate saves
        if (socket.meetingData.activitySaved) {
          console.log('Meeting activity already saved, skipping duplicate');
          return;
        }

        const endTime = new Date();
        const duration = Math.round((endTime - socket.meetingData.startTime) / (1000 * 60));

        // Use the final meeting name (from client data or stored name)
        const finalMeetingName = (data && data.meetingName && data.meetingName.trim()) 
          ? data.meetingName.trim() 
          : socket.meetingData.finalMeetingName || socket.meetingData.meetingName;
        
        console.log(`Meeting ended. Final name: "${finalMeetingName}"`);
        console.log('Duration:', duration, 'minutes');

        const activity = new MeetingActivity({
          userId: socket.meetingData.userId,
          meetingName: finalMeetingName,
          meetingId: socket.meetingData.meetingId,
          status: 'completed',
          duration,
          participantCount: socket.meetingData.participantCount || 1,
          startTime: socket.meetingData.startTime,
          endTime,
          joinTime: socket.meetingData.joinTime || socket.meetingData.startTime,
          leaveTime: endTime,
          isHost: socket.meetingData.isHost || false,
          finalMeetingName: finalMeetingName
        });

        await activity.save();
        
        // Mark as saved to prevent duplicates
        socket.meetingData.activitySaved = true;
        
        // Emit to user's socket for real-time updates
        io.to(`user_${socket.meetingData.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: activity._id,
            meetingName: activity.finalMeetingName,
            status: activity.status,
            duration: activity.duration,
            participantCount: activity.participantCount,
            isHost: activity.isHost,
            createdAt: activity.createdAt
          }
        });

        console.log(`Meeting activity saved: ${finalMeetingName} (${duration} minutes), isHost: ${socket.meetingData.isHost}`);
        
        // Clear meeting data after saving
        setTimeout(() => {
          socket.meetingData = null;
        }, 1000);
        
      } catch (error) {
        console.error('Error saving meeting activity on end:', error);
      }
    });

    // Handle disconnect - only save if meeting wasn't properly ended
    const handleDisconnect = async () => {
      try {
        // Only save if meeting data exists, wasn't properly ended, and activity wasn't already saved
        if (socket.meetingData && !socket.meetingData.activitySaved) {
          const endTime = new Date();
          const duration = Math.round((endTime - socket.meetingData.startTime) / (1000 * 60));

          console.log('Saving meeting activity on unexpected disconnect...');

          const activity = new MeetingActivity({
            userId: socket.meetingData.userId,
            meetingName: socket.meetingData.finalMeetingName || socket.meetingData.meetingName,
            meetingId: socket.meetingData.meetingId,
            status: 'completed',
            duration,
            participantCount: socket.meetingData.participantCount || 1,
            startTime: socket.meetingData.startTime,
            endTime,
            joinTime: socket.meetingData.joinTime || socket.meetingData.startTime,
            leaveTime: endTime,
            isHost: socket.meetingData.isHost || false,
            finalMeetingName: socket.meetingData.finalMeetingName || socket.meetingData.meetingName
          });

          await activity.save();
          
          // Mark as saved
          socket.meetingData.activitySaved = true;
          
          console.log(`Meeting activity saved on disconnect: ${socket.meetingData.finalMeetingName || socket.meetingData.meetingName} (${duration} minutes), isHost: ${socket.meetingData.isHost}`);
          
          // Emit real-time update
          io.to(`user_${socket.meetingData.userId}`).emit('activity-updated', {
            type: 'meeting-completed',
            activity: {
              id: activity._id,
              meetingName: activity.finalMeetingName,
              status: activity.status,
              duration: activity.duration,
              participantCount: activity.participantCount,
              isHost: activity.isHost,
              createdAt: activity.createdAt
            }
          });
        } else if (socket.meetingData && socket.meetingData.activitySaved) {
          console.log('Meeting activity already saved, skipping disconnect save');
        }
      } catch (error) {
        console.error('Error saving meeting activity on disconnect:', error);
      }
    };

    return { handleDisconnect };
  };

  return { setupSocketHandlers, MeetingActivity };
};

export { MeetingActivity };
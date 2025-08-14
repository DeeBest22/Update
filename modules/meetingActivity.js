// Enhanced meetingActivity.js - Updated version
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
  isHost: { type: Boolean, default: false }, // NEW: Track if user was the host
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
      const { meetingName, meetingId, status, duration, participantCount, startTime, endTime, isHost } = req.body;
      
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
        isHost: isHost || false // NEW: Store if user was host
      });
      
      await activity.save();
      
      // Emit to user's socket for real-time updates
      io.to(`user_${userId}`).emit('activity-updated', {
        type: 'meeting-completed',
        activity: {
          id: activity._id,
          meetingName: activity.meetingName,
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
          participantCount: 1,
          isHost: isHost || false, // NEW: Track host status
          activitySaved: false // Flag to prevent duplicate saves
        };
        
        console.log(`Meeting started: ${meetingName} (${meetingId}) by user ${userId}, isHost: ${isHost}`);
      } catch (error) {
        console.error('Error handling meeting start:', error);
      }
    });

    // Handle meeting name changes during the meeting
    socket.on('meeting-name-changed', async (data) => {
      try {
        const { meetingId, newName, userId } = data;
        
        if (socket.meetingData && socket.meetingData.meetingId === meetingId) {
          const oldName = socket.meetingData.meetingName;
          socket.meetingData.meetingName = newName; // Update stored name
          console.log(`Meeting name updated from "${oldName}" to "${newName}" for meeting ${meetingId}`);
          
          // Broadcast to all participants in the meeting
          socket.broadcast.to(meetingId).emit('meeting-name-updated', {
            newName,
            changedBy: userId
          });
        }
      } catch (error) {
        console.error('Error handling meeting name change:', error);
      }
    });

    // NEW: Handle participant join (for non-hosts)
    socket.on('participant-joined-meeting', async (data) => {
      try {
        const { meetingId, meetingName, userId } = data;
        
        if (!userId || !meetingId || !meetingName) {
          return;
        }

        // Store meeting start data for participants
        socket.meetingData = {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(),
          participantCount: 1,
          isHost: false, // Participants are not hosts
          activitySaved: false
        };
        
        console.log(`Participant joined meeting: ${meetingName} (${meetingId}) by user ${userId}`);
      } catch (error) {
        console.error('Error handling participant join:', error);
      }
    });

    // Handle participant join
    socket.on('participant-joined', (data) => {
      if (socket.meetingData) {
        socket.meetingData.participantCount = (socket.meetingData.participantCount || 1) + 1;
      }
    });

    // Handle participant leave
    socket.on('participant-left', (data) => {
      if (socket.meetingData && socket.meetingData.participantCount > 1) {
        socket.meetingData.participantCount -= 1;
      }
    });

    // ENHANCED: Handle participant joining meeting (track when participant joins)
    socket.on('participant-joined-meeting', async (data) => {
      try {
        const { meetingId, meetingName, userId, isHost } = data;
        
        if (!userId || !meetingId || !meetingName) {
          console.log('Missing required data for participant-joined-meeting');
          return;
        }

        // Store meeting start data for participants
        socket.meetingData = {
          meetingId,
          meetingName,
          userId,
          startTime: new Date(),
          participantCount: 1,
          isHost: isHost || false, // Participants are not hosts
          activitySaved: false
        };
        
        console.log(`Participant joined meeting: ${meetingName} (${meetingId}) by user ${userId}`);
      } catch (error) {
        console.error('Error handling participant join:', error);
      }
    });

    // ENHANCED: Handle participant leaving meeting (when participant leaves/exits)
    socket.on('participant-left-meeting', async (data) => {
      try {
        const { meetingId, userId, finalMeetingName, duration, leaveTime } = data;
        
        if (!userId || !meetingId) {
          console.log('Missing required data for participant-left-meeting');
          return;
        }

        // Prevent duplicate saves
        if (socket.meetingData && socket.meetingData.activitySaved) {
          console.log('Meeting activity already saved, skipping duplicate');
          return;
        }

        // Use the final meeting name from the client (latest name) or fallback to stored name
        const actualMeetingName = (finalMeetingName && finalMeetingName.trim()) 
          ? finalMeetingName.trim() 
          : (socket.meetingData ? socket.meetingData.meetingName : 'Meeting');
        
        const startTime = socket.meetingData ? socket.meetingData.startTime : new Date();
        const endTime = leaveTime ? new Date(leaveTime) : new Date();
        const calculatedDuration = duration || Math.round((endTime - startTime) / (1000 * 60));

        console.log(`Participant left meeting. Final name: "${actualMeetingName}", Duration: ${calculatedDuration} minutes`);

        const activity = new MeetingActivity({
          userId: userId,
          meetingName: actualMeetingName,
          meetingId: meetingId,
          status: 'completed',
          duration: calculatedDuration,
          participantCount: socket.meetingData ? socket.meetingData.participantCount : 1,
          startTime: startTime,
          endTime: endTime,
          isHost: false // User is leaving as participant, not host
        });

        await activity.save();
        
        // Mark as saved to prevent duplicates
        if (socket.meetingData) {
          socket.meetingData.activitySaved = true;
        }
        
        // Emit to user's socket for real-time updates
        io.to(`user_${userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: activity._id,
            meetingName: actualMeetingName,
            status: activity.status,
            duration: activity.duration,
            participantCount: activity.participantCount,
            isHost: activity.isHost,
            createdAt: activity.createdAt
          }
        });

        console.log(`Participant activity saved: ${actualMeetingName} (${calculatedDuration} minutes)`);
        
        // Clear meeting data after saving
        setTimeout(() => {
          socket.meetingData = null;
        }, 1000);
        
      } catch (error) {
        console.error('Error saving participant meeting activity:', error);
      }
    });

    // MAIN FIX: Handle meeting end - only save activity here, not in disconnect
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

        // Use the final meeting name (from client data with priority to finalMeetingName)
        const finalMeetingName = (data && data.finalMeetingName && data.finalMeetingName.trim()) 
          ? data.finalMeetingName.trim() 
          : (data && data.meetingName && data.meetingName.trim()) 
            ? data.meetingName.trim() 
            : socket.meetingData.meetingName;
        
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
          isHost: socket.meetingData.isHost || false // NEW: Store host status
        });

        await activity.save();
        
        // Mark as saved to prevent duplicates
        socket.meetingData.activitySaved = true;
        
        // Emit to user's socket for real-time updates
        io.to(`user_${socket.meetingData.userId}`).emit('activity-updated', {
          type: 'meeting-completed',
          activity: {
            id: activity._id,
            meetingName: activity.meetingName,
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

    // MODIFIED: Only save on disconnect if meeting wasn't properly ended
    const handleDisconnect = async () => {
      try {
        // Only save if meeting data exists, wasn't properly ended, and activity wasn't already saved
        if (socket.meetingData && !socket.meetingData.activitySaved) {
          const endTime = new Date();
          const duration = Math.round((endTime - socket.meetingData.startTime) / (1000 * 60));

          console.log('Saving meeting activity on unexpected disconnect...');

          const activity = new MeetingActivity({
            userId: socket.meetingData.userId,
            meetingName: socket.meetingData.meetingName, // Use current stored name
            meetingId: socket.meetingData.meetingId,
            status: 'completed',
            duration,
            participantCount: socket.meetingData.participantCount || 1,
            startTime: socket.meetingData.startTime,
            endTime,
            isHost: socket.meetingData.isHost || false // NEW: Store host status
          });

          await activity.save();
          
          // Mark as saved
          socket.meetingData.activitySaved = true;
          
          console.log(`Meeting activity saved on disconnect: ${socket.meetingData.meetingName} (${duration} minutes), isHost: ${socket.meetingData.isHost}`);
          
          // Emit real-time update
          io.to(`user_${socket.meetingData.userId}`).emit('activity-updated', {
            type: 'meeting-completed',
            activity: {
              id: activity._id,
              meetingName: activity.meetingName,
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
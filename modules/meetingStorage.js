import mongoose from 'mongoose';

// Meeting Schema for persistent storage
const meetingSchema = new mongoose.Schema({
  // Meeting identification
  meetingId: { type: String, required: true, unique: true },
  
  // Meeting details
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true }, // YYYY-MM-DD format
  time: { type: String, required: true }, // HH:MM format
  duration: { type: Number, required: true }, // in minutes
  
  // User information
  schedulerEmail: { type: String, required: true },
  schedulerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Participants
  participants: [{
    email: { type: String, required: true },
    name: { type: String, default: '' },
    profilePicture: { type: String, default: '' }
  }],
  
  // Meeting status
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'cancelled', 'missed'], 
    default: 'scheduled' 
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Meeting datetime for easy querying
  meetingDateTime: { type: Date, required: true },
  
  // Notification tracking
  notificationsSent: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false }
});

// Indexes for better query performance
meetingSchema.index({ schedulerId: 1, meetingDateTime: 1 });
meetingSchema.index({ schedulerEmail: 1, status: 1 });
meetingSchema.index({ meetingDateTime: 1, status: 1 });
meetingSchema.index({ 'participants.email': 1 });

// Update the updatedAt field before saving
meetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const PersistentMeeting = mongoose.model('PersistentMeeting', meetingSchema);

// Helper function to convert meeting data to database format
function convertToDbFormat(meetingData, userId = null) {
  const meetingDateTime = new Date(`${meetingData.date}T${meetingData.time}:00`);
  
  return {
    meetingId: meetingData.id || `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: meetingData.title,
    description: meetingData.description || '',
    date: meetingData.date,
    time: meetingData.time,
    duration: parseInt(meetingData.duration),
    schedulerEmail: meetingData.schedulerEmail || meetingData.scheduler?.email,
    schedulerId: userId,
    participants: (meetingData.participants || []).map(p => ({
      email: p.email,
      name: p.name || '',
      profilePicture: p.profilePicture || ''
    })),
    meetingDateTime: meetingDateTime,
    status: meetingData.status || 'scheduled'
  };
}

// Helper function to convert database format to frontend format
function convertToFrontendFormat(dbMeeting) {
  return {
    id: dbMeeting.meetingId,
    title: dbMeeting.title,
    description: dbMeeting.description,
    date: dbMeeting.date,
    time: dbMeeting.time,
    duration: dbMeeting.duration,
    schedulerEmail: dbMeeting.schedulerEmail,
    scheduler: {
      email: dbMeeting.schedulerEmail,
      name: dbMeeting.schedulerEmail.split('@')[0], // Fallback name
      profilePicture: ''
    },
    participants: dbMeeting.participants || [],
    status: dbMeeting.status,
    createdAt: dbMeeting.createdAt,
    meetingDateTime: dbMeeting.meetingDateTime
  };
}

// Setup persistent meetings functionality
export function setupPersistentMeetings(app, io) {
  
  // Store a new meeting in the database
  async function storeMeeting(meetingData, userId = null) {
    try {
      const dbMeetingData = convertToDbFormat(meetingData, userId);
      
      // Check if meeting already exists
      const existingMeeting = await PersistentMeeting.findOne({ 
        meetingId: dbMeetingData.meetingId 
      });
      
      if (existingMeeting) {
        console.log(`Meeting ${dbMeetingData.meetingId} already exists, updating...`);
        Object.assign(existingMeeting, dbMeetingData);
        await existingMeeting.save();
        return existingMeeting;
      }
      
      const newMeeting = new PersistentMeeting(dbMeetingData);
      await newMeeting.save();
      
      console.log(`✅ Meeting stored in database: ${newMeeting.title} (${newMeeting.meetingId})`);
      return newMeeting;
      
    } catch (error) {
      console.error('❌ Error storing meeting in database:', error);
      throw error;
    }
  }
  
  // Get meetings for a specific user
  async function getUserMeetings(userId, userEmail) {
    try {
      const now = new Date();
      
      // Find meetings where user is scheduler or participant
      const meetings = await PersistentMeeting.find({
        $and: [
          {
            $or: [
              { schedulerId: userId },
              { schedulerEmail: userEmail },
              { 'participants.email': userEmail }
            ]
          },
          { meetingDateTime: { $gt: now } }, // Only future meetings
          { status: 'scheduled' }
        ]
      }).sort({ meetingDateTime: 1 });
      
      return meetings.map(convertToFrontendFormat);
      
    } catch (error) {
      console.error('❌ Error retrieving user meetings:', error);
      throw error;
    }
  }
  
  // Delete a meeting from database
  async function deleteMeeting(meetingId, userId, userEmail) {
    try {
      const meeting = await PersistentMeeting.findOne({ 
        meetingId: meetingId,
        $or: [
          { schedulerId: userId },
          { schedulerEmail: userEmail }
        ]
      });
      
      if (!meeting) {
        throw new Error('Meeting not found or you do not have permission to delete it');
      }
      
      await PersistentMeeting.deleteOne({ meetingId: meetingId });
      console.log(`🗑️ Meeting deleted from database: ${meeting.title} (${meetingId})`);
      
      return meeting;
      
    } catch (error) {
      console.error('❌ Error deleting meeting from database:', error);
      throw error;
    }
  }
  
  // Clean up past meetings (run periodically)
  async function cleanupPastMeetings() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await PersistentMeeting.updateMany(
        { 
          meetingDateTime: { $lt: oneDayAgo },
          status: 'scheduled'
        },
        { 
          status: 'completed'
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🧹 Marked ${result.modifiedCount} past meetings as completed`);
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up past meetings:', error);
    }
  }
  
  // API Routes
  
  // Get user's meetings from database
  app.get('/api/meetings/persistent', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const userEmail = req.user?.email || req.session.userEmail;
      
      if (!userEmail) {
        // Try to get email from user document
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        req.session.userEmail = user.email;
      }
      
      const meetings = await getUserMeetings(userId, userEmail || req.session.userEmail);
      
      res.json({
        success: true,
        meetings: meetings,
        total: meetings.length
      });
      
    } catch (error) {
      console.error('❌ Error fetching persistent meetings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch meetings',
        message: error.message 
      });
    }
  });
  
  // Store a meeting in database
  app.post('/api/meetings/persistent', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const meetingData = req.body;
      
      const storedMeeting = await storeMeeting(meetingData, userId);
      
      // Emit real-time update to user's sockets
      io.to(`user_${userId}`).emit('meeting-stored', {
        meeting: convertToFrontendFormat(storedMeeting)
      });
      
      res.json({
        success: true,
        message: 'Meeting stored successfully',
        meeting: convertToFrontendFormat(storedMeeting)
      });
      
    } catch (error) {
      console.error('❌ Error storing meeting:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to store meeting',
        message: error.message 
      });
    }
  });
  
  // Delete a meeting from database
  app.delete('/api/meetings/persistent/:meetingId', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const userEmail = req.user?.email || req.session.userEmail;
      const meetingId = req.params.meetingId;
      
      const deletedMeeting = await deleteMeeting(meetingId, userId, userEmail);
      
      // Emit real-time update to user's sockets
      io.to(`user_${userId}`).emit('meeting-deleted', {
        meetingId: meetingId,
        title: deletedMeeting.title
      });
      
      res.json({
        success: true,
        message: 'Meeting deleted successfully',
        deletedMeeting: {
          id: deletedMeeting.meetingId,
          title: deletedMeeting.title
        }
      });
      
    } catch (error) {
      console.error('❌ Error deleting meeting:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete meeting',
        message: error.message 
      });
    }
  });
  
  // Sync in-memory meetings to database (for migration)
  app.post('/api/meetings/sync-to-db', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const { meetings } = req.body;
      
      if (!Array.isArray(meetings)) {
        return res.status(400).json({ error: 'Meetings array is required' });
      }
      
      const syncedMeetings = [];
      
      for (const meeting of meetings) {
        try {
          const storedMeeting = await storeMeeting(meeting, userId);
          syncedMeetings.push(convertToFrontendFormat(storedMeeting));
        } catch (error) {
          console.error(`Failed to sync meeting ${meeting.id}:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `Synced ${syncedMeetings.length} meetings to database`,
        syncedMeetings: syncedMeetings
      });
      
    } catch (error) {
      console.error('❌ Error syncing meetings to database:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync meetings',
        message: error.message 
      });
    }
  });
  
  // Health check for persistent meetings
  app.get('/api/meetings/persistent/health', async (req, res) => {
    try {
      const totalMeetings = await PersistentMeeting.countDocuments();
      const scheduledMeetings = await PersistentMeeting.countDocuments({ status: 'scheduled' });
      const upcomingMeetings = await PersistentMeeting.countDocuments({ 
        meetingDateTime: { $gt: new Date() },
        status: 'scheduled'
      });
      
      res.json({
        success: true,
        status: 'healthy',
        statistics: {
          totalMeetings,
          scheduledMeetings,
          upcomingMeetings
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting persistent meetings health:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Health check failed',
        message: error.message 
      });
    }
  });
  
  // Socket.IO handlers
  const setupSocketHandlers = (socket) => {
    // Join user-specific room for real-time updates
    socket.on('join-persistent-meetings', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined persistent meetings room for user ${userId}`);
    });
    
    // Handle disconnect
    const handleDisconnect = () => {
      console.log(`Socket ${socket.id} disconnected from persistent meetings`);
    };
    
    return { handleDisconnect };
  };
  
  // Run cleanup every hour
  setInterval(cleanupPastMeetings, 60 * 60 * 1000);
  
  // Initial cleanup
  setTimeout(cleanupPastMeetings, 5000);
  
  console.log('✅ Persistent Meetings module initialized');
  
  return {
    setupSocketHandlers,
    storeMeeting,
    getUserMeetings,
    deleteMeeting,
    cleanupPastMeetings,
    PersistentMeeting
  };
}

export { PersistentMeeting };
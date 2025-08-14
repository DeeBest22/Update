import mongoose from 'mongoose';

// Helper function to get User model safely
function getUserModel() {
  try {
    return mongoose.model('User');
  } catch (error) {
    // User model not yet defined
    return null;
  }
}

// Meeting Schema for persistent storage
const meetingSchema = new mongoose.Schema({
  // Meeting identification - use the same ID as in-memory meetings
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
  meetingDateTime: { type: Date, required: true }
});

// Compound index to prevent exact duplicates for same user
meetingSchema.index({ 
  schedulerEmail: 1, 
  title: 1, 
  date: 1, 
  time: 1 
}, { unique: true });

// Other indexes for performance
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
    meetingId: meetingData.id ? meetingData.id.toString() : `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: meetingData.title,
    description: meetingData.description || '',
    date: meetingData.date,
    time: meetingData.time,
    duration: parseInt(meetingData.duration),
    schedulerEmail: meetingData.schedulerEmail || meetingData.scheduler?.email,
    schedulerId: userId,
    participants: (meetingData.participants || []).map(p => ({
      email: p.email,
      name: p.name || p.email.split('@')[0],
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
      name: dbMeeting.schedulerEmail.split('@')[0],
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
  
  // Store a new meeting in the database - COMPLETELY REWRITTEN
  async function storeMeeting(meetingData, userId = null) {
    try {
      const dbMeetingData = convertToDbFormat(meetingData, userId);
      
      console.log(`💾 Attempting to store meeting: ${dbMeetingData.title} (ID: ${dbMeetingData.meetingId})`);
      
      // AGGRESSIVE DUPLICATE PREVENTION - Check multiple conditions
      const duplicateChecks = [
        // Check by meetingId
        { meetingId: dbMeetingData.meetingId },
        // Check by exact same meeting details for same user
        {
          schedulerEmail: dbMeetingData.schedulerEmail,
          title: dbMeetingData.title,
          date: dbMeetingData.date,
          time: dbMeetingData.time,
          status: 'scheduled'
        }
      ];
      
      for (const checkCondition of duplicateChecks) {
        const existingMeeting = await PersistentMeeting.findOne(checkCondition);
        if (existingMeeting) {
          console.log(`⚠️ DUPLICATE DETECTED - Meeting already exists:`, checkCondition);
          console.log(`⚠️ Existing meeting: ${existingMeeting.title} (${existingMeeting.meetingId})`);
          return existingMeeting; // Return existing, don't create new
        }
      }
      
      // Create new meeting only if no duplicates found
      const newMeeting = new PersistentMeeting(dbMeetingData);
      await newMeeting.save();
      
      console.log(`✅ NEW meeting stored in database: ${newMeeting.title} (${newMeeting.meetingId})`);
      return newMeeting;
      
    } catch (error) {
      // Handle duplicate key errors specifically
      if (error.code === 11000) {
        console.log(`⚠️ DUPLICATE KEY ERROR - Meeting already exists, skipping storage`);
        // Try to find and return the existing meeting
        const existingMeeting = await PersistentMeeting.findOne({
          schedulerEmail: meetingData.schedulerEmail || meetingData.scheduler?.email,
          title: meetingData.title,
          date: meetingData.date,
          time: meetingData.time
        });
        if (existingMeeting) {
          return existingMeeting;
        }
      }
      
      console.error('❌ Error storing meeting in database:', error);
      throw error;
    }
  }
  
  // Get meetings for a specific user - IMPROVED WITH DEDUPLICATION
  async function getUserMeetings(userId, userEmail) {
    try {
      const now = new Date();
      
      console.log(`🔍 Fetching meetings for user: ${userEmail} (ID: ${userId})`);
      
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
      
      console.log(`📋 Found ${meetings.length} meetings for user ${userEmail}`);
      
      // AGGRESSIVE DEDUPLICATION - Remove duplicates by multiple criteria
      const uniqueMeetings = [];
      const seenMeetings = new Set();
      
      for (const meeting of meetings) {
        // Create unique key based on meeting details
        const uniqueKey = `${meeting.schedulerEmail}-${meeting.title}-${meeting.date}-${meeting.time}`;
        
        if (!seenMeetings.has(uniqueKey) && !seenMeetings.has(meeting.meetingId)) {
          seenMeetings.add(uniqueKey);
          seenMeetings.add(meeting.meetingId);
          uniqueMeetings.push(meeting);
        } else {
          console.log(`🧹 Removing duplicate meeting: ${meeting.title} (${meeting.meetingId})`);
        }
      }
      
      if (uniqueMeetings.length !== meetings.length) {
        console.log(`🧹 Removed ${meetings.length - uniqueMeetings.length} duplicate meetings`);
      }
      
      return uniqueMeetings.map(convertToFrontendFormat);
      
    } catch (error) {
      console.error('❌ Error retrieving user meetings:', error);
      throw error;
    }
  }
  
  // Delete a meeting from database - COMPLETELY REWRITTEN
  async function deleteMeeting(meetingId, userId, userEmail) {
    try {
      console.log(`🗑️ DELETE REQUEST: meetingId=${meetingId}, userId=${userId}, userEmail=${userEmail}`);
      
      // Convert meetingId to string for consistent comparison
      const meetingIdStr = meetingId.toString();
      
      // Find the meeting by meetingId
      const meeting = await PersistentMeeting.findOne({ 
        meetingId: meetingIdStr
      });
      
      if (!meeting) {
        console.log(`❌ Meeting not found: ${meetingIdStr}`);
        throw new Error('Meeting not found');
      }
      
      console.log(`🔍 Found meeting: "${meeting.title}" by ${meeting.schedulerEmail}`);
      
      // AGGRESSIVE PERMISSION CHECK
      const isScheduler = meeting.schedulerEmail === userEmail;
      const isParticipant = meeting.participants && meeting.participants.some(p => p.email === userEmail);
      const isOwner = meeting.schedulerId && meeting.schedulerId.toString() === userId.toString();
      
      console.log(`👤 Permission check:`, {
        isScheduler,
        isParticipant,
        isOwner,
        meetingSchedulerEmail: meeting.schedulerEmail,
        userEmail,
        meetingSchedulerId: meeting.schedulerId,
        userId
      });
      
      if (!isScheduler && !isParticipant && !isOwner) {
        console.log(`❌ PERMISSION DENIED for user ${userEmail} to delete meeting ${meetingIdStr}`);
        throw new Error('You do not have permission to delete this meeting');
      }
      
      // Delete the meeting
      const deleteResult = await PersistentMeeting.deleteOne({ meetingId: meetingIdStr });
      
      if (deleteResult.deletedCount === 0) {
        console.log(`❌ No meeting was deleted for ID: ${meetingIdStr}`);
        throw new Error('Failed to delete meeting');
      }
      
      console.log(`✅ Meeting successfully deleted: "${meeting.title}" (${meetingIdStr})`);
      
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
  
  // Get user's meetings from database - IMPROVED ERROR HANDLING
  app.get('/api/meetings/persistent', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      let userEmail = req.user?.email || req.session.userEmail;
      
      if (!userEmail) {
        // Try to get email from user document
        const User = getUserModel();
        if (User) {
          const user = await User.findById(userId);
          if (user) {
            userEmail = user.email;
            req.session.userEmail = user.email;
          }
        }
      }
      
      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found' });
      }
      
      const meetings = await getUserMeetings(userId, userEmail);
      
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
  
  // Store a meeting in database - COMPLETELY REWRITTEN
  app.post('/api/meetings/persistent', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      const meetingData = req.body;
      
      // Ensure meetingId is properly set
      if (!meetingData.id) {
        meetingData.id = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      console.log(`📝 STORE REQUEST: ${meetingData.title} (ID: ${meetingData.id})`);
      
      const storedMeeting = await storeMeeting(meetingData, userId);
      
      // Emit real-time update to user's sockets
      if (io) {
        io.to(`user_${userId}`).emit('meeting-stored', {
          meeting: convertToFrontendFormat(storedMeeting)
        });
      }
      
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
  
  // Delete a meeting from database - COMPLETELY REWRITTEN
  app.delete('/api/meetings/persistent/:meetingId', async (req, res) => {
    try {
      if (!req.session.userId && !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const userId = req.session.userId || req.user._id;
      let userEmail = req.user?.email || req.session.userEmail;
      const meetingId = req.params.meetingId;
      
      if (!userEmail) {
        // Try to get email from user document
        const User = getUserModel();
        if (User) {
          const user = await User.findById(userId);
          if (user) {
            userEmail = user.email;
            req.session.userEmail = user.email;
          }
        }
      }
      
      if (!userEmail) {
        return res.status(400).json({ error: 'User email not found' });
      }
      
      console.log(`🗑️ DELETE API REQUEST: meetingId=${meetingId}, userId=${userId}, userEmail=${userEmail}`);
      
      const deletedMeeting = await deleteMeeting(meetingId, userId, userEmail);
      
      // Emit real-time update to user's sockets
      if (io) {
        io.to(`user_${userId}`).emit('meeting-deleted', {
          meetingId: meetingId,
          title: deletedMeeting.title
        });
      }
      
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
  
  // Sync in-memory meetings to database - COMPLETELY REWRITTEN
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
      
      console.log(`🔄 SYNC REQUEST: ${meetings.length} meetings for user ${userId}`);
      
      const syncResults = {
        stored: [],
        skipped: [],
        errors: []
      };
      
      for (const meeting of meetings) {
        try {
          // AGGRESSIVE DUPLICATE CHECK before storing
          const existingMeeting = await PersistentMeeting.findOne({
            $or: [
              { meetingId: meeting.id.toString() },
              {
                schedulerEmail: meeting.schedulerEmail || meeting.scheduler?.email,
                title: meeting.title,
                date: meeting.date,
                time: meeting.time,
                status: 'scheduled'
              }
            ]
          });
          
          if (existingMeeting) {
            console.log(`⏭️ SKIPPING duplicate meeting: ${meeting.title} (${meeting.id})`);
            syncResults.skipped.push({
              id: meeting.id,
              title: meeting.title,
              reason: 'Already exists'
            });
            continue;
          }
          
          const storedMeeting = await storeMeeting(meeting, userId);
          syncResults.stored.push(convertToFrontendFormat(storedMeeting));
          
        } catch (error) {
          console.error(`❌ Failed to sync meeting ${meeting.id}:`, error);
          syncResults.errors.push({ 
            meetingId: meeting.id, 
            title: meeting.title,
            error: error.message 
          });
        }
      }
      
      console.log(`✅ SYNC COMPLETE: ${syncResults.stored.length} stored, ${syncResults.skipped.length} skipped, ${syncResults.errors.length} errors`);
      
      res.json({
        success: true,
        message: `Sync completed: ${syncResults.stored.length} stored, ${syncResults.skipped.length} skipped`,
        results: syncResults
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
    
    socket.on('disconnect', handleDisconnect);
    
    return { handleDisconnect };
  };
  
  // Run cleanup every hour
  setInterval(cleanupPastMeetings, 60 * 60 * 1000);
  
  // Initial cleanup
  setTimeout(cleanupPastMeetings, 5000);
  
  console.log('✅ Persistent Meetings module initialized with AGGRESSIVE duplicate prevention');
  
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
import mongoose from 'mongoose';

// Meeting Statistics Schema
const meetingStatsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  totalCalls: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // in minutes
  totalParticipants: { type: Number, default: 0 },
  meetingsScheduled: { type: Number, default: 0 },
  lastMonthStats: {
    totalCalls: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    totalParticipants: { type: Number, default: 0 },
    meetingsScheduled: { type: Number, default: 0 }
  },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Individual Meeting Record Schema
const meetingRecordSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  meetingId: { type: String, required: true },
  meetingTitle: { type: String, default: 'Video Call' },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // in minutes
  participantCount: { type: Number, default: 1 },
  isScheduled: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'cancelled'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now }
});

const MeetingStats = mongoose.model('MeetingStats', meetingStatsSchema);
const MeetingRecord = mongoose.model('MeetingRecord', meetingRecordSchema);

// Helper function to format duration
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Get or create user stats
const getUserStats = async (userId) => {
  try {
    let stats = await MeetingStats.findOne({ userId });
    
    if (!stats) {
      stats = new MeetingStats({ userId });
      await stats.save();
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

// Update stats when a meeting starts
const recordMeetingStart = async (userId, meetingId, meetingTitle = 'Video Call', isScheduled = false) => {
  try {
    const meetingRecord = new MeetingRecord({
      userId,
      meetingId,
      meetingTitle,
      startTime: new Date(),
      isScheduled,
      status: 'active'
    });
    
    await meetingRecord.save();
    
    // Update user stats
    const stats = await getUserStats(userId);
    stats.totalCalls += 1;
    if (isScheduled) {
      stats.meetingsScheduled += 1;
    }
    stats.lastUpdated = new Date();
    await stats.save();
    
    return meetingRecord;
  } catch (error) {
    console.error('Error recording meeting start:', error);
    throw error;
  }
};

// Update stats when a meeting ends
const recordMeetingEnd = async (userId, meetingId, participantCount = 1) => {
  try {
    const meetingRecord = await MeetingRecord.findOne({ 
      userId, 
      meetingId, 
      status: 'active' 
    });
    
    if (!meetingRecord) {
      console.warn(`No active meeting found for user ${userId} and meeting ${meetingId}`);
      return null;
    }
    
    const endTime = new Date();
    const duration = Math.round((endTime - meetingRecord.startTime) / (1000 * 60)); // in minutes
    
    meetingRecord.endTime = endTime;
    meetingRecord.duration = duration;
    meetingRecord.participantCount = participantCount;
    meetingRecord.status = 'completed';
    await meetingRecord.save();
    
    // Update user stats
    const stats = await getUserStats(userId);
    stats.totalDuration += duration;
    stats.totalParticipants += participantCount;
    stats.lastUpdated = new Date();
    await stats.save();
    
    return meetingRecord;
  } catch (error) {
    console.error('Error recording meeting end:', error);
    throw error;
  }
};

// Get formatted stats for display
const getFormattedStats = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    
    // Calculate percentage changes
    const callsChange = calculatePercentageChange(stats.totalCalls, stats.lastMonthStats.totalCalls);
    const durationChange = calculatePercentageChange(stats.totalDuration, stats.lastMonthStats.totalDuration);
    const participantsChange = calculatePercentageChange(stats.totalParticipants, stats.lastMonthStats.totalParticipants);
    const scheduledChange = calculatePercentageChange(stats.meetingsScheduled, stats.lastMonthStats.meetingsScheduled);
    
    
    return {
      totalCalls: {
        value: stats.totalCalls,
        change: callsChange,
        changeType: callsChange > 0 ? 'positive' : callsChange < 0 ? 'negative' : 'neutral'
      },
      totalDuration: {
        value: formatDuration(stats.totalDuration),
        rawValue: stats.totalDuration,
        change: durationChange,
        changeType: durationChange > 0 ? 'positive' : durationChange < 0 ? 'negative' : 'neutral'
      },
      totalParticipants: {
        value: stats.totalParticipants,
        change: participantsChange,
        changeType: participantsChange > 0 ? 'positive' : participantsChange < 0 ? 'negative' : 'neutral'
      },
      meetingsScheduled: {
        value: stats.meetingsScheduled,
        change: scheduledChange,
        changeType: scheduledChange > 0 ? 'positive' : scheduledChange < 0 ? 'negative' : 'neutral'
      },
      lastUpdated: stats.lastUpdated
    };
  } catch (error) {
    console.error('Error getting formatted stats:', error);
    throw error;
  }
};

// Reset monthly stats (should be called monthly via cron job)
const resetMonthlyStats = async () => {
  try {
    const allStats = await MeetingStats.find({});
    
    for (const stats of allStats) {
      stats.lastMonthStats = {
        totalCalls: stats.totalCalls,
        totalDuration: stats.totalDuration,
        totalParticipants: stats.totalParticipants,
        meetingsScheduled: stats.meetingsScheduled
      };
      await stats.save();
    }
    
    console.log('Monthly stats reset completed');
  } catch (error) {
    console.error('Error resetting monthly stats:', error);
    throw error;
  }
};

// Get recent meetings for a user
const getRecentMeetings = async (userId, limit = 10) => {
  try {
    const meetings = await MeetingRecord.find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    
    return meetings.map(meeting => ({
      ...meeting,
      formattedDuration: formatDuration(meeting.duration),
      formattedStartTime: meeting.startTime.toLocaleString()
    }));
  } catch (error) {
    console.error('Error getting recent meetings:', error);
    throw error;
  }
};

// Setup API routes
const setupMeetingStatsRoutes = (app) => {
  // Get user statistics
  app.get('/api/meeting-stats', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const stats = await getFormattedStats(userId);
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error fetching meeting stats:', error);
      res.status(500).json({ error: 'Failed to fetch meeting statistics' });
    }
  });
  
  // Get recent meetings
  app.get('/api/recent-meetings', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const limit = parseInt(req.query.limit) || 10;
      const meetings = await getRecentMeetings(userId, limit);
      res.json({ success: true, meetings });
    } catch (error) {
      console.error('Error fetching recent meetings:', error);
      res.status(500).json({ error: 'Failed to fetch recent meetings' });
    }
  });
  
  // Manual stats update (for testing)
  app.post('/api/meeting-stats/update', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { action, meetingId, meetingTitle, participantCount, isScheduled } = req.body;
      
      let result;
      if (action === 'start') {
        result = await recordMeetingStart(userId, meetingId, meetingTitle, isScheduled);
      } else if (action === 'end') {
        result = await recordMeetingEnd(userId, meetingId, participantCount);
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      const stats = await getFormattedStats(userId);
      res.json({ success: true, result, stats });
    } catch (error) {
      console.error('Error updating meeting stats:', error);
      res.status(500).json({ error: 'Failed to update meeting statistics' });
    }
  });
};

// Setup Socket.IO handlers for real-time stats updates
const setupMeetingStatsSocket = (io) => {
  const handleMeetingStart = async (socket, data) => {
    try {
      const { userId, meetingId, meetingTitle, isScheduled } = data;
      
      await recordMeetingStart(userId, meetingId, meetingTitle, isScheduled);
      const stats = await getFormattedStats(userId);
      
      // Emit updated stats to the user
      socket.emit('stats-updated', stats);
      
      // Also emit to other sessions of the same user
      socket.broadcast.emit('stats-updated', { userId, stats });
    } catch (error) {
      console.error('Error handling meeting start:', error);
      socket.emit('stats-error', { error: 'Failed to update meeting statistics' });
    }
  };
  
  const handleMeetingEnd = async (socket, data) => {
    try {
      const { userId, meetingId, participantCount } = data;
      
      await recordMeetingEnd(userId, meetingId, participantCount);
      const stats = await getFormattedStats(userId);
      
      // Emit updated stats to the user
      socket.emit('stats-updated', stats);
      
      // Also emit to other sessions of the same user
      socket.broadcast.emit('stats-updated', { userId, stats });
    } catch (error) {
      console.error('Error handling meeting end:', error);
      socket.emit('stats-error', { error: 'Failed to update meeting statistics' });
    }
  };
  
  return {
    handleMeetingStart,
    handleMeetingEnd,
    setupSocketHandlers: (socket) => {
      socket.on('meeting-started', (data) => handleMeetingStart(socket, data));
      socket.on('meeting-ended', (data) => handleMeetingEnd(socket, data));
      
      return {
        handleDisconnect: () => {
          // Cleanup if needed
        }
      };
    }
  };
};

export {
  MeetingStats,
  MeetingRecord,
  getUserStats,
  recordMeetingStart,
  recordMeetingEnd,
  getFormattedStats,
  resetMonthlyStats,
  getRecentMeetings,
  setupMeetingStatsRoutes,
  setupMeetingStatsSocket
};
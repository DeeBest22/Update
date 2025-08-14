import mongoose from 'mongoose';

// Schema to track meeting participants per user per month
const meetingParticipantStatsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  year: { 
    type: Number, 
    required: true 
  },
  month: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 12 
  },
  totalParticipants: { 
    type: Number, 
    default: 0 
  },
  meetingsHosted: { 
    type: Number, 
    default: 0 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Compound index to ensure one record per user per month
meetingParticipantStatsSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const MeetingParticipantStats = mongoose.model('MeetingParticipantStats', meetingParticipantStatsSchema);

// Function to record participants when someone joins a meeting
export const recordMeetingParticipant = async (hostUserId, participantCount = 1) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Find or create stats record for current month
    const stats = await MeetingParticipantStats.findOneAndUpdate(
      { userId: hostUserId, year, month },
      { 
        $inc: { 
          totalParticipants: participantCount,
          meetingsHosted: participantCount > 0 ? 1 : 0
        },
        $set: { lastUpdated: now }
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log(`Recorded ${participantCount} participant(s) for user ${hostUserId} in ${year}-${month}`);
    return stats;
  } catch (error) {
    console.error('Error recording meeting participant:', error);
    throw error;
  }
};

// Function to get current and previous month stats for comparison
export const getMeetingParticipantStats = async (userId) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Calculate previous month
    let previousYear = currentYear;
    let previousMonth = currentMonth - 1;
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }

    // Get current month stats
    const currentStats = await MeetingParticipantStats.findOne({
      userId,
      year: currentYear,
      month: currentMonth
    });

    // Get previous month stats
    const previousStats = await MeetingParticipantStats.findOne({
      userId,
      year: previousYear,
      month: previousMonth
    });

    const currentParticipants = currentStats?.totalParticipants || 0;
    const previousParticipants = previousStats?.totalParticipants || 0;

    // Calculate percentage change
    let percentageChange = 0;
    let changeDirection = 'neutral';
    
    if (previousParticipants === 0 && currentParticipants > 0) {
      percentageChange = 100;
      changeDirection = 'up';
    } else if (previousParticipants > 0) {
      percentageChange = Math.round(((currentParticipants - previousParticipants) / previousParticipants) * 100);
      changeDirection = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'neutral';
    }

    return {
      current: {
        participants: currentParticipants,
        meetings: currentStats?.meetingsHosted || 0,
        year: currentYear,
        month: currentMonth
      },
      previous: {
        participants: previousParticipants,
        meetings: previousStats?.meetingsHosted || 0,
        year: previousYear,
        month: previousMonth
      },
      comparison: {
        percentageChange: Math.abs(percentageChange),
        direction: changeDirection,
        isIncrease: changeDirection === 'up',
        isDecrease: changeDirection === 'down'
      }
    };
  } catch (error) {
    console.error('Error getting meeting participant stats:', error);
    throw error;
  }
};

// Function to get historical stats for charts/analytics
export const getHistoricalStats = async (userId, months = 12) => {
  try {
    const now = new Date();
    const stats = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthStats = await MeetingParticipantStats.findOne({
        userId,
        year,
        month
      });

      stats.push({
        year,
        month,
        monthName: date.toLocaleString('default', { month: 'long' }),
        participants: monthStats?.totalParticipants || 0,
        meetings: monthStats?.meetingsHosted || 0
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting historical stats:', error);
    throw error;
  }
};

// Setup routes for meeting participant stats
export const setupMeetingParticipantStatsRoutes = (app) => {
  // Get current user's meeting participant stats
  app.get('/api/meeting-participant-stats', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const stats = await getMeetingParticipantStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching meeting participant stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Get historical stats
  app.get('/api/meeting-participant-stats/history', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const months = parseInt(req.query.months) || 12;
      const stats = await getHistoricalStats(userId, months);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching historical stats:', error);
      res.status(500).json({ error: 'Failed to fetch historical stats' });
    }
  });

  // Manual endpoint to record participants (for testing)
  app.post('/api/meeting-participant-stats/record', async (req, res) => {
    try {
      const userId = req.session.userId || req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { participantCount = 1 } = req.body;
      const stats = await recordMeetingParticipant(userId, participantCount);
      res.json({ message: 'Participants recorded successfully', stats });
    } catch (error) {
      console.error('Error recording participants:', error);
      res.status(500).json({ error: 'Failed to record participants' });
    }
  });
};

export { MeetingParticipantStats };
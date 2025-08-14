import mongoose from 'mongoose';
import { User, createEmailTransport, getUserName, getUserProfilePicture, validateEmail, sendMockVerificationEmail } from './auth.js';

import Meeting from './meetingRetrieve.js'; 

// Enhanced Meeting Schema with better indexing and validation
const enhancedMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, default: '', maxlength: 1000 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // Format: YYYY-MM-DD
  time: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // Format: HH:mm
  duration: { type: Number, required: true, min: 15, max: 480 }, // 15 minutes to 8 hours
  schedulerEmail: { type: String, required: true, lowercase: true, index: true },
  schedulerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // NEW: Link to User
  participants: [{
    email: { type: String, required: true, lowercase: true },
    name: String,
    profilePicture: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // NEW: Link participant to User
  }],
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  meetingId: { type: String, unique: true, sparse: true }, // For when meeting actually starts
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index for efficient queries
enhancedMeetingSchema.index({ schedulerEmail: 1, date: 1, time: 1 });
enhancedMeetingSchema.index({ 'participants.email': 1, date: 1, time: 1 });
enhancedMeetingSchema.index({ schedulerUserId: 1, status: 1 });

// Create the enhanced model
const EnhancedMeeting = mongoose.model('EnhancedMeeting', enhancedMeetingSchema);

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId && !req.user) {
    console.log('Authentication failed: No userId in session or Passport user');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  console.log('Authentication passed:', req.session.userId || req.user?._id);
  next();
}

// Get current user helper
async function getCurrentUser(req) {
  try {
    if (req.user) {
      console.log('Using Passport user:', req.user.email);
      return req.user;
    }
    if (req.session.userId) {
      const user = await User.findById(req.session.userId).select('-password -verificationCode');
      if (!user) {
        console.log('No user found for session userId:', req.session.userId);
        return null;
      }
      console.log('Found user in session:', user.email);
      return user;
    }
    console.log('No user found in session or Passport');
    return null;
  } catch (error) {
    console.error('Error in getCurrentUser:', error.message);
    return null;
  }
}

// Helper function to migrate old meetings to new format
async function migrateOldMeetings() {
  try {
    console.log('🔄 Checking for meetings to migrate...');
    
    // Get all old meetings that haven't been migrated
    const oldMeetings = await Meeting.find({});
    
    if (oldMeetings.length === 0) {
      console.log('✅ No old meetings to migrate');
      return;
    }
    
    console.log(`📋 Found ${oldMeetings.length} meetings to migrate`);
    
    for (const oldMeeting of oldMeetings) {
      try {
        // Check if already migrated
        const existingEnhanced = await EnhancedMeeting.findOne({
          schedulerEmail: oldMeeting.schedulerEmail,
          date: oldMeeting.date,
          time: oldMeeting.time,
          title: oldMeeting.title
        });
        
        if (existingEnhanced) {
          continue; // Skip if already migrated
        }
        
        // Find scheduler user
        const schedulerUser = await User.findOne({ email: oldMeeting.schedulerEmail });
        
        // Enhance participants with user IDs
        const enhancedParticipants = await Promise.all(
          oldMeeting.participants.map(async (participant) => {
            const user = await User.findOne({ email: participant.email });
            return {
              ...participant.toObject(),
              userId: user ? user._id : null
            };
          })
        );
        
        // Create enhanced meeting
        const enhancedMeeting = new EnhancedMeeting({
          title: oldMeeting.title,
          description: oldMeeting.description,
          date: oldMeeting.date,
          time: oldMeeting.time,
          duration: oldMeeting.duration,
          schedulerEmail: oldMeeting.schedulerEmail,
          schedulerUserId: schedulerUser ? schedulerUser._id : null,
          participants: enhancedParticipants,
          status: 'scheduled',
          createdAt: oldMeeting.createdAt
        });
        
        await enhancedMeeting.save();
        console.log(`✅ Migrated meeting: ${oldMeeting.title}`);
        
      } catch (error) {
        console.error(`❌ Error migrating meeting ${oldMeeting.title}:`, error.message);
      }
    }
    
    console.log('🎉 Meeting migration completed');
    
  } catch (error) {
    console.error('❌ Error during meeting migration:', error);
  }
}

// Meeting booking functionality
export function setupMeetingBooking(app, io) {
  // Run migration on startup
  migrateOldMeetings();
  
  // Mock login endpoint (for testing)
  app.post('/api/booking/login', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        console.log('Login failed: Email is required');
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const validation = validateEmail(email);
      if (!validation.valid) {
        console.log('Login failed: Invalid email:', email);
        return res.status(400).json({ error: validation.error });
      }

      let user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = new User({
          firstName: email.split('@')[0].split('.')[0].replace(/\b\w/g, l => l.toUpperCase()),
          lastName: 'User',
          email: email.toLowerCase(),
          authProvider: 'local',
          isVerified: false
        });
        await user.save();
        console.log('Created new user:', user.email);
      } else {
        console.log('Found existing user:', user.email);
      }

      req.session.userId = user._id;
      req.session.save(err => {
        if (err) console.error('Session save error:', err);
        else console.log('Session saved with userId:', user._id);
      });

      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: await getUserName(user.email),
          profilePicture: await getUserProfilePicture(user.email)
        }
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  // Auth status endpoint (for upcoming.js)
  app.get('/api/auth/status', async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        console.log('Auth status: No user found');
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      res.json({
        success: true,
        user: {
          id: currentUser._id,
          email: currentUser.email,
          name: await getUserName(currentUser.email),
          profilePicture: await getUserProfilePicture(currentUser.email)
        }
      });
      console.log('Auth status: User found:', currentUser.email);
    } catch (error) {
      console.error('Auth status error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to check auth status' });
    }
  });

  // Get current user (fallback for upcoming.js)
  app.get('/api/user', async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        console.log('No user found for /api/user');
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: currentUser._id,
          email: currentUser.email,
          name: await getUserName(currentUser.email),
          profilePicture: await getUserProfilePicture(currentUser.email)
        }
      });
      console.log('User endpoint: User found:', currentUser.email);
    } catch (error) {
      console.error('Get user error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  });

  // Logout
  app.post('/api/booking/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err.message);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.clearCookie('sessionToken');
      console.log('User logged out, session destroyed');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // Schedule meeting endpoint - ENHANCED with persistence
  app.post('/api/meetings', requireAuth, async (req, res) => {
    try {
      const { title, date, time, duration, participants, description, schedulerEmail } = req.body;

      // Validate required fields
      if (!title || !date || !time || !duration || !schedulerEmail) {
        console.log('Schedule meeting failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, date, time, duration, schedulerEmail'
        });
      }

      const currentUser = await getCurrentUser(req);
      if (!currentUser || currentUser.email !== schedulerEmail.toLowerCase()) {
        console.log('Schedule meeting failed: Unauthorized, user:', currentUser?.email, 'schedulerEmail:', schedulerEmail);
        return res.status(403).json({ success: false, message: 'Unauthorized to schedule meeting' });
      }

      // Validate participant emails and fetch details
      const participantDetails = await Promise.all(
        (participants || []).map(async (p) => {
          const validation = validateEmail(p.email);
          if (!validation.valid) {
            console.log('Invalid participant email:', p.email);
            throw new Error(`Invalid participant email: ${p.email}`);
          }
          const participant = {
          // Find or create user for participant
          let participantUser = await User.findOne({ email: p.email.toLowerCase() });
          if (!participantUser) {
            participantUser = new User({
              firstName: p.email.split('@')[0].split('.')[0].replace(/\b\w/g, l => l.toUpperCase()),
              lastName: 'User',
              email: p.email.toLowerCase(),
              authProvider: 'local',
              isVerified: false
            });
            await participantUser.save();
          }
          
            email: p.email.toLowerCase(),
            name: await getUserName(p.email),
            profilePicture: await getUserProfilePicture(p.email),
            userId: participantUser._id
          };
          console.log('Participant details:', participant);
          return participant;
        })
      );

      // Create meeting in both old and new format for compatibility
      const meetingData = {
        title: title.trim(),
        description: description ? description.trim() : '',
        date,
        time,
        duration: parseInt(duration),
        schedulerEmail: schedulerEmail.toLowerCase(),
        schedulerUserId: currentUser._id,
        participants: participantDetails,
        createdAt: new Date()
      };
      
      // Save to old format for backward compatibility
      const meeting = new Meeting(meetingData);
      await meeting.save();
      
      // Save to new enhanced format for persistence
      const enhancedMeeting = new EnhancedMeeting(meetingData);
      await enhancedMeeting.save();

      console.log('✅ Meeting saved to MongoDB:', {
        id: meeting._id,
        enhancedId: enhancedMeeting._id,
        title: meeting.title,
        dateTime: `${meeting.date} ${meeting.time}`,
        participants: meeting.participants.length + 1
      });

      // Emit real-time notification
      io.emit('meeting-scheduled', {
        meeting: {
          id: meeting._id,
          enhancedId: enhancedMeeting._id,
          title: meeting.title,
          description: meeting.description,
          date: meeting.date,
          time: meeting.time,
          duration: meeting.duration,
          scheduler: {
            email: meeting.schedulerEmail,
            name: await getUserName(meeting.schedulerEmail),
            profilePicture: await getUserProfilePicture(meeting.schedulerEmail)
          },
          participants: meeting.participants,
          createdAt: meeting.createdAt
        }
      });

      // Send email notifications
      const emailResults = [];
      const allEmails = [schedulerEmail, ...participants.map(p => p.email)];
      const transport = createEmailTransport(schedulerEmail);

      for (const email of allEmails) {
        try {
          const validation = validateEmail(email);
          const recipientUser = await User.findOne({ email: email.toLowerCase() });
          const recipientName = recipientUser ? recipientUser.firstName : email.split('@')[0];

          const mailOptions = {
            from: {
              name: 'Video Call App',
              address: process.env.EMAIL_USER
            },
            to: email,
            subject: `Meeting Scheduled: ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Meeting Scheduled</h2>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Date:</strong> ${new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' })}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Duration:</strong> ${duration} minutes</p>
                ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
                <p><strong>Organizer:</strong> ${schedulerEmail}</p>
              </div>
            `,
            text: `
              Meeting Scheduled
              Title: ${title}
              Date: ${new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'Africa/Lagos' })}
              Time: ${time}
              Duration: ${duration} minutes
              ${description ? `Description: ${description}\n` : ''}
              Organizer: ${schedulerEmail}
            `
          };

          if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
            await sendMockVerificationEmail(email, 'N/A', recipientName);
            emailResults.push({ email, status: 'simulated', messageId: `sim_${Date.now()}` });
            console.log('Mock email sent to:', email);
          } else {
            const info = await transport.sendMail(mailOptions);
            emailResults.push({ email, status: 'sent', messageId: info.messageId });
            console.log('Email sent to:', email, 'Message ID:', info.messageId);
          }
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error.message);
          emailResults.push({ email, status: 'failed', error: error.message });
        }
      }

      res.json({
        success: true,
        message: 'Meeting scheduled successfully',
        meeting: {
          id: meeting._id,
          enhancedId: enhancedMeeting._id,
          title: meeting.title,
          description: meeting.description,
          date: meeting.date,
          time: meeting.time,
          duration: meeting.duration,
          schedulerEmail: meeting.schedulerEmail,
          participants: meeting.participants,
          createdAt: meeting.createdAt,
          totalNotifications: emailResults.length,
          emailResults
        }
      });
    } catch (error) {
      console.error('❌ Error scheduling meeting:', error.message);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  });

  // Get upcoming meetings - ENHANCED with persistence
  app.get('/api/meetings', requireAuth, async (req, res) => {
    try {
      const now = new Date();
      console.log('Fetching meetings, server time:', now.toISOString(), 'Timezone: Africa/Lagos');
      const currentUser = await getCurrentUser(req);

      if (!currentUser) {
        console.log('No user found for fetching meetings');
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      // Query both old and new meeting collections
      const [oldMeetings, enhancedMeetings] = await Promise.all([
        Meeting.find({
          $or: [
            { schedulerEmail: currentUser.email },
            { 'participants.email': currentUser.email }
          ]
        }),
        EnhancedMeeting.find({
          $or: [
            { schedulerEmail: currentUser.email },
            { 'participants.email': currentUser.email },
            { schedulerUserId: currentUser._id },
            { 'participants.userId': currentUser._id }
          ],
          status: 'scheduled'
        })
      ]);
      
      // Combine and deduplicate meetings
      const allMeetings = [...oldMeetings, ...enhancedMeetings];
      const uniqueMeetings = allMeetings.filter((meeting, index, self) => {
        return index === self.findIndex(m => 
          m.title === meeting.title && 
          m.date === meeting.date && 
          m.time === meeting.time &&
          m.schedulerEmail === meeting.schedulerEmail
        );
      });
      
      console.log('Found meetings for user:', currentUser.email, 'Count:', uniqueMeetings.length);
      
      const userMeetings = await Promise.all(
        uniqueMeetings
          .filter(meeting => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00Z`);
            const isUpcoming = meetingDateTime > now;
            console.log('Meeting:', meeting.title, 'DateTime:', meetingDateTime, 'Is Upcoming:', isUpcoming);
            return isUpcoming;
          })
          .sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}:00Z`);
            const dateTimeB = new Date(`${b.date}T${b.time}:00Z`);
            return dateTimeA - dateTimeB;
          })
          .map(async (meeting) => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            scheduler: {
              email: meeting.schedulerEmail,
              name: await getUserName(meeting.schedulerEmail),
              profilePicture: await getUserProfilePicture(meeting.schedulerEmail)
            },
            participants: meeting.participants,
            totalParticipants: meeting.participants.length + 1,
            createdAt: meeting.createdAt
          }))
      );
      
      res.json({
        success: true,
        meetings: userMeetings,
        total: userMeetings.length
      });
      console.log('Sent meetings response, total:', userMeetings.length);
    } catch (error) {
      console.error('❌ Error fetching meetings:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetings',
        error: error.message
      });
    }
  });

  // Get all meetings (for admin purposes) - ENHANCED
  app.get('/api/meetings/all', requireAuth, async (req, res) => {
    try {
      const now = new Date();
      console.log('Fetching all meetings, server time:', now.toISOString());
      
      // Query both collections
      const [oldMeetings, enhancedMeetings] = await Promise.all([
        Meeting.find({}),
        EnhancedMeeting.find({ status: 'scheduled' })
      ]);
      
      // Combine and deduplicate
      const allMeetings = [...oldMeetings, ...enhancedMeetings];
      const uniqueMeetings = allMeetings.filter((meeting, index, self) => {
        return index === self.findIndex(m => 
          m.title === meeting.title && 
          m.date === meeting.date && 
          m.time === meeting.time &&
          m.schedulerEmail === meeting.schedulerEmail
        );
      const upcomingMeetings = await Promise.all(
        uniqueMeetings
          .filter(meeting => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00Z`);
            const isUpcoming = meetingDateTime > now;
            console.log('Meeting:', meeting.title, 'DateTime:', meetingDateTime, 'Is Upcoming:', isUpcoming);
            return isUpcoming;
          })
          .sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}:00Z`);
            const dateTimeB = new Date(`${b.date}T${b.time}:00Z`);
            return dateTimeA - dateTimeB;
          })
          .map(async (meeting) => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            scheduler: {
              email: meeting.schedulerEmail,
              name: await getUserName(meeting.schedulerEmail),
              profilePicture: await getUserProfilePicture(meeting.schedulerEmail)
            },
            participants: meeting.participants,
            totalParticipants: meeting.participants.length + 1,
            createdAt: meeting.createdAt
          }))
      );

      res.json({
        success: true,
        meetings: upcomingMeetings,
        total: upcomingMeetings.length
      });
      console.log('Sent meetings response, total:', upcomingMeetings.length);
    } catch (error) {
      console.error('❌ Error fetching meetings:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetings',
        error: error.message
      });
    }
  });

  // Get all meetings (for admin purposes)
  app.get('/api/meetings/all', requireAuth, async (req, res) => {
    try {
      const now = new Date();
      console.log('Fetching all meetings, server time:', now.toISOString());
      const meetings = await Meeting.find({});

      const upcomingMeetings = await Promise.all(
        meetings
          .filter(meeting => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00Z`);
            const isUpcoming = meetingDateTime > now;
            console.log('Meeting:', meeting.title, 'DateTime:', meetingDateTime, 'Is Upcoming:', isUpcoming);
            return isUpcoming;
          })
          .sort((a, b) => {
            const dateTimeA = new Date(`${a.date}T${a.time}:00Z`);
            const dateTimeB = new Date(`${b.date}T${b.time}:00Z`);
            return dateTimeA - dateTimeB;
          })
          .map(async (meeting) => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            scheduler: {
              email: meeting.schedulerEmail,
              name: await getUserName(meeting.schedulerEmail),
              profilePicture: await getUserProfilePicture(meeting.schedulerEmail)
            },
            participants: meeting.participants,
            totalParticipants: meeting.participants.length + 1,
            createdAt: meeting.createdAt
          }))
      );

      res.json({
        success: true,
        meetings: upcomingMeetings,
        total: upcomingMeetings.length
      });
      console.log('Sent all meetings response, total:', upcomingMeetings.length);
    } catch (error) {
      console.error('❌ Error fetching all meetings:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meetings',
        error: error.message
      });
    }
  });

  // Delete meeting endpoint - ENHANCED to handle both collections
  app.delete('/api/meetings/:id', requireAuth, async (req, res) => {
    try {
      const meetingId = req.params.id;
      const currentUser = await getCurrentUser(req);

      // Try to find meeting in both collections
      let meeting = await Meeting.findById(meetingId);
      let isEnhanced = false;
      
      if (!meeting) {
        meeting = await EnhancedMeeting.findById(meetingId);
        isEnhanced = true;
      }

      if (!meeting) {
        console.log('Meeting not found for deletion, ID:', meetingId);
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      if (meeting.schedulerEmail !== currentUser.email) {
        console.log('Unauthorized delete attempt by:', currentUser.email, 'for meeting:', meeting._id);
        return res.status(403).json({
          success: false,
          message: 'You can only delete meetings that you scheduled'
        });
      }

      // Delete from both collections if they exist
      await meeting.deleteOne();
      
      if (!isEnhanced) {
        // Also try to delete from enhanced collection
        await EnhancedMeeting.deleteOne({
          title: meeting.title,
          date: meeting.date,
          time: meeting.time,
          schedulerEmail: meeting.schedulerEmail
        });
      } else {
        // Also try to delete from old collection
        await Meeting.deleteOne({
          title: meeting.title,
          date: meeting.date,
          time: meeting.time,
          schedulerEmail: meeting.schedulerEmail
        });
      }
      
      console.log('🗑️ Meeting deleted:', {
        id: meeting._id,
        title: meeting.title,
        deletedBy: currentUser.email
      });

      io.emit('meeting-deleted', {
        meetingId: meeting._id,
        title: meeting.title,
        deletedBy: currentUser.email
      });

      res.json({
        success: true,
        message: 'Meeting deleted successfully',
        deletedMeeting: {
          id: meeting._id,
          title: meeting.title
        }
      });
    } catch (error) {
      console.error('❌ Error deleting meeting:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete meeting',
        error: error.message
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const now = new Date();
      
      // Count from both collections
      const [oldCount, enhancedCount] = await Promise.all([
        Meeting.countDocuments({
          $expr: {
            $gt: [
              { $dateFromString: { dateString: { $concat: ['$date', 'T', '$time', ':00Z'] } } },
              now
            ]
          }
        }),
        EnhancedMeeting.countDocuments({
          status: 'scheduled',
          $expr: {
            $gt: [
              { $dateFromString: { dateString: { $concat: ['$date', 'T', '$time', ':00Z'] } } },
              now
            ]
          }
        })
      ]);
      
      const [totalOld, totalEnhanced] = await Promise.all([
        Meeting.countDocuments(),
        EnhancedMeeting.countDocuments()
      ]);
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: now.toISOString(),
        upcomingMeetings: Math.max(oldCount, enhancedCount), // Use the higher count
        totalMeetings: totalOld + totalEnhanced,
        collections: {
          oldMeetings: { upcoming: oldCount, total: totalOld },
          enhancedMeetings: { upcoming: enhancedCount, total: totalEnhanced }
        },
        scheduledJobs: 0
      });
      
      console.log('Health check:', { 
        upcomingOld: oldCount, 
        upcomingEnhanced: enhancedCount,
        totalOld: totalOld,
        totalEnhanced: totalEnhanced
      });
    } catch (error) {
      console.error('Health check error:', error.message);
      res.status(500).json({ success: false, message: 'Health check failed' });
    }
  });

  // Cleanup old meetings endpoint (for maintenance)
  app.post('/api/meetings/cleanup', requireAuth, async (req, res) => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Delete completed meetings older than 1 day from both collections
      const [oldDeleted, enhancedDeleted] = await Promise.all([
        Meeting.deleteMany({
          $expr: {
            $lt: [
              { $dateFromString: { dateString: { $concat: ['$date', 'T', '$time', ':00Z'] } } },
              oneDayAgo
            ]
          }
        }),
        EnhancedMeeting.deleteMany({
          status: { $in: ['completed', 'cancelled'] },
          updatedAt: { $lt: oneDayAgo }
        })
      ]);
      
      res.json({
        success: true,
        message: 'Cleanup completed',
        deleted: {
          oldMeetings: oldDeleted.deletedCount,
          enhancedMeetings: enhancedDeleted.deletedCount
        }
      });
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message
      });
    }
  });

  // Migrate meetings endpoint (manual trigger)
  app.post('/api/meetings/migrate', requireAuth, async (req, res) => {
    try {
      await migrateOldMeetings();
      res.json({
        success: true,
        message: 'Migration completed successfully'
      });
    } catch (error) {
      console.error('❌ Error during manual migration:', error.message);
      res.status(500).json({
        success: false,
        message: 'Migration failed',
        error: error.message
      });
    }
  });

  // Get meeting statistics
  app.get('/api/meetings/stats', requireAuth, async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [userStats, totalStats] = await Promise.all([
        EnhancedMeeting.aggregate([
          {
            $match: {
              $or: [
                { schedulerUserId: currentUser._id },
                { 'participants.userId': currentUser._id }
              ]
            }
          },
          {
            $group: {
              _id: null,
              totalScheduled: { $sum: 1 },
              thisMonth: {
                $sum: {
                  $cond: [
                    { $gte: ['$createdAt', startOfMonth] },
                    1,
                    0
                  ]
                }
              },
              upcoming: {
                $sum: {
                  $cond: [
                    {
                      $gt: [
                        { $dateFromString: { dateString: { $concat: ['$date', 'T', '$time', ':00Z'] } } },
                        now
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        EnhancedMeeting.countDocuments({ status: 'scheduled' })
      ]);
      
      res.json({
        success: true,
        stats: {
          user: userStats[0] || { totalScheduled: 0, thisMonth: 0, upcoming: 0 },
          platform: { totalScheduled: totalStats }
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching meeting stats:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch meeting statistics',
        error: error.message
      });
    }
  });

  // Socket.IO handlers
  const setupSocketHandlers = (socket) => {
    socket.on('join-booking-room', () => {
      socket.join('booking-room');
      console.log(`Socket ${socket.id} joined booking room`);
    });

    socket.on('leave-booking-room', () => {
      socket.leave('booking-room');
      console.log(`Socket ${socket.id} left booking room`);
    });

    const handleDisconnect = () => {
      console.log(`Socket ${socket.id} disconnected from booking`);
    };

    return { handleDisconnect };
  };

  return {
    setupSocketHandlers,
    getUserName,
    getUserProfilePicture,
    EnhancedMeeting, // Export the enhanced model
    migrateOldMeetings // Export migration function
  };
}
        $expr: {
          $gt: [
            { $dateFromString: { dateString: { $concat: ['$date', 'T', '$time', ':00Z'] } } },
            now
          ]
        }
      });

      res.json({
        success: true,
        status: 'healthy',
        timestamp: now.toISOString(),
        upcomingMeetings,
        totalMeetings: await Meeting.countDocuments(),
        scheduledJobs: 0
      });
      console.log('Health check:', { upcomingMeetings, totalMeetings: await Meeting.countDocuments() });
    } catch (error) {
      console.error('Health check error:', error.message);
      res.status(500).json({ success: false, message: 'Health check failed' });
    }
  });

  // Test email endpoint
  app.post('/api/test-email', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        console.log('Test email failed: Email is required');
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const validation = validateEmail(email);
      if (!validation.valid) {
        console.log('Test email failed: Invalid email:', email);
        return res.status(400).json({ error: validation.error });
      }

      const recipientUser = await User.findOne({ email: email.toLowerCase() });
      const recipientName = recipientUser ? recipientUser.firstName : email.split('@')[0];

      const mailOptions = {
        from: {
          name: 'Video Call App',
          address: process.env.EMAIL_USER
        },
        to: email,
        subject: 'Video Call App - Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Test Email from Video Call App</h2>
            <p>This is a test email to verify that the email service is working correctly.</p>
            <p>If you received this email, the email configuration is working properly.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `
          Test Email from Video Call App
          This is a test email to verify that the email service is working correctly.
          If you received this email, the email configuration is working properly.
          Timestamp: ${new Date().toISOString()}
        `
      };

      if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
        await sendMockVerificationEmail(email, 'N/A', recipientName);
        res.json({ success: true, messageId: `simulated_${Date.now()}`, note: 'Email service not configured - simulated' });
        console.log('Mock test email sent to:', email);
      } else {
        const transport = createEmailTransport(email);
        const info = await transport.sendMail(mailOptions);
        res.json({ success: true, messageId: info.messageId });
        console.log('Test email sent to:', email, 'Message ID:', info.messageId);
      }
    } catch (error) {
      console.error('❌ Test email error:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Socket.IO handlers
  const setupSocketHandlers = (socket) => {
    socket.on('join-booking-room', () => {
      socket.join('booking-room');
      console.log(`Socket ${socket.id} joined booking room`);
    });

    socket.on('leave-booking-room', () => {
      socket.leave('booking-room');
      console.log(`Socket ${socket.id} left booking room`);
    });

    const handleDisconnect = () => {
      console.log(`Socket ${socket.id} disconnected from booking`);
    };

    return { handleDisconnect };
  };

  return {
    setupSocketHandlers,
    getUserName,
    getUserProfilePicture
  };
}
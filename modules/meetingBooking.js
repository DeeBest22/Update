import mongoose from 'mongoose';
import { User, createEmailTransport, getUserName, getUserProfilePicture, validateEmail, sendMockVerificationEmail } from './auth.js';

import Meeting from './meetingRetrieve.js'; 
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

// Meeting booking functionality
export function setupMeetingBooking(app, io) {
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

  // Schedule meeting endpoint
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
            email: p.email.toLowerCase(),
            name: await getUserName(p.email),
            profilePicture: await getUserProfilePicture(p.email)
          };
          console.log('Participant details:', participant);
          return participant;
        })
      );

      // Create meeting
      const meeting = new Meeting({
        title: title.trim(),
        description: description ? description.trim() : '',
        date,
        time,
        duration: parseInt(duration),
        schedulerEmail: schedulerEmail.toLowerCase(),
        participants: participantDetails,
        createdAt: new Date()
      });

      await meeting.save();
      console.log('✅ Meeting saved to MongoDB:', {
        id: meeting._id,
        title: meeting.title,
        dateTime: `${meeting.date} ${meeting.time}`,
        participants: meeting.participants.length + 1
      });

      // Emit real-time notification
      io.emit('meeting-scheduled', {
        meeting: {
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

  // Get upcoming meetings
  app.get('/api/meetings', requireAuth, async (req, res) => {
    try {
      const now = new Date();
      console.log('Fetching meetings, server time:', now.toISOString(), 'Timezone: Africa/Lagos');
      const currentUser = await getCurrentUser(req);

      if (!currentUser) {
        console.log('No user found for fetching meetings');
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      const userMeetings = await Meeting.find({
        $or: [
          { schedulerEmail: currentUser.email },
          { 'participants.email': currentUser.email }
        ]
      });
      console.log('Found meetings for user:', currentUser.email, 'Count:', userMeetings.length);

      const upcomingMeetings = await Promise.all(
        userMeetings
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

  // Delete meeting endpoint
  app.delete('/api/meetings/:id', requireAuth, async (req, res) => {
    try {
      const meetingId = req.params.id;
      const meeting = await Meeting.findById(meetingId);
      const currentUser = await getCurrentUser(req);

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

      await meeting.deleteOne();
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
      const upcomingMeetings = await Meeting.countDocuments({
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
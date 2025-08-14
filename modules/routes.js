// modules/scheduler.js
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

// Meeting Schema
const meetingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true },
    participants: [{
        id: String,
        email: String,
        name: String,
        profilePicture: String
    }],
    description: String,
    schedulerEmail: { type: String, required: true },
    schedulerName: String,
    meetingId: { type: String, unique: true },
    status: { type: String, default: 'scheduled' },
    createdAt: { type: Date, default: Date.now },
    notificationsSent: { type: Boolean, default: false }
});

let Meeting;

// Email configuration
const createTransporter = () => {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || process.env.SCHEDULER_EMAIL,
            pass: process.env.EMAIL_APP_PASSWORD || process.env.SCHEDULER_EMAIL_PASSWORD || process.env.EMAIL_PASSWORD
        }
    });
};

// Generate unique meeting ID
const generateMeetingId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Enhanced participant profile picture fetching
const enhanceParticipants = async (participants) => {
    return participants.map(participant => ({
        ...participant,
        name: participant.name || participant.email.split('@')[0],
        profilePicture: participant.profilePicture || null
    }));
};

// Email template function
const createEmailHTML = (recipientName, meeting, isOrganizer = false) => {
    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
    const formattedDate = meetingDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = meetingDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🎥 ConvoSpace</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Video Conference ${isOrganizer ? 'Scheduled' : 'Invitation'}</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Hi ${recipientName}!</h2>
                <p style="color: #666; font-size: 16px;">
                    ${isOrganizer ? 'Your meeting has been scheduled successfully!' : 'You have been invited to a video conference.'}
                </p>
                
                <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">${meeting.title}</h3>
                    <p style="margin: 5px 0; color: #666;"><strong>📅 Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>🕐 Time:</strong> ${formattedTime}</p>
                    <p style="margin: 5px 0; color: #666;"><strong>⏱️ Duration:</strong> ${meeting.duration} minutes</p>
                    ${meeting.description ? `<p style="margin: 15px 0 5px 0; color: #666;"><strong>📝 Description:</strong></p><p style="margin: 0; color: #666;">${meeting.description}</p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.BASE_URL || 'http://localhost:5000'}/meeting/${meeting.meetingId}" 
                       style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        🎥 Join Meeting
                    </a>
                </div>
                
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 15px; margin-top: 20px;">
                    <p style="color: #1976d2; font-size: 14px; margin: 0;">
                        <strong>💡 Tip:</strong> You'll receive reminder notifications 5 minutes before the meeting starts.
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>ConvoSpace - Connecting people worldwide</p>
            </div>
        </div>
    `;
};

// Send meeting notifications
const sendMeetingNotifications = async (meeting, isReminder = false) => {
    const transporter = createTransporter();
    let totalNotifications = 0;

    // Send to organizer
    try {
        await transporter.sendMail({
            from: {
                name: 'ConvoSpace',
                address: process.env.EMAIL_USER || process.env.SCHEDULER_EMAIL
            },
            to: meeting.schedulerEmail,
            subject: `${isReminder ? 'Reminder: ' : 'Meeting Scheduled: '}${meeting.title}`,
            html: createEmailHTML(meeting.schedulerName, meeting, true)
        });
        totalNotifications++;
    } catch (error) {
        console.error('Failed to send email to organizer:', error);
    }

    // Send to participants
    for (const participant of meeting.participants) {
        try {
            await transporter.sendMail({
                from: {
                    name: 'ConvoSpace',
                    address: process.env.EMAIL_USER || process.env.SCHEDULER_EMAIL
                },
                to: participant.email,
                subject: `${isReminder ? 'Meeting Reminder: ' : 'Meeting Invitation: '}${meeting.title}`,
                html: createEmailHTML(participant.name || participant.email.split('@')[0], meeting, false)
            });
            totalNotifications++;
        } catch (error) {
            console.error(`Failed to send email to ${participant.email}:`, error);
        }
    }

    return totalNotifications;
};

// Get user email from request (session or OAuth)
const getUserEmail = async (req) => {
    let userEmail;
    
    if (req.session.userId) {
        const User = mongoose.model('User');
        const user = await User.findById(req.session.userId);
        userEmail = user?.email;
    } else if (req.user) {
        userEmail = req.user.email;
    }

    return userEmail;
};

// Get user name from request (session or OAuth)
const getUserName = (req) => {
    let userName = 'Meeting Organizer';
    
    if (req.session.userName) {
        userName = req.session.userName;
    } else if (req.user) {
        userName = `${req.user.firstName} ${req.user.lastName}`;
    }

    return userName;
};

// Setup routes
const setupSchedulerRoutes = (app) => {
    // Schedule meeting endpoint
    app.post('/api/schedule-meeting', async (req, res) => {
        try {
            const { title, date, time, duration, participants, description, schedulerEmail } = req.body;

            // Validate required fields
            if (!title || !date || !time || !duration || !schedulerEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Generate unique meeting ID
            const meetingId = generateMeetingId();

            // Enhance participants with profile pictures
            const enhancedParticipants = await enhanceParticipants(participants || []);

            // Get scheduler name
            const schedulerName = getUserName(req);

            // Create meeting
            const meeting = new Meeting({
                title,
                date,
                time,
                duration,
                participants: enhancedParticipants,
                description,
                schedulerEmail,
                schedulerName,
                meetingId
            });

            await meeting.save();

            // Send email notifications
            const totalNotifications = await sendMeetingNotifications(meeting);

            const meetingDateTime = new Date(`${date}T${time}:00`);
            const formattedDate = meetingDateTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const formattedTime = meetingDateTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            res.json({
                success: true,
                message: 'Meeting scheduled successfully',
                meeting: {
                    id: meeting._id,
                    meetingId,
                    title,
                    date: formattedDate,
                    time: formattedTime,
                    totalNotifications
                }
            });

        } catch (error) {
            console.error('Error scheduling meeting:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to schedule meeting'
            });
        }
    });

    // Get upcoming meetings
    app.get('/api/meetings/upcoming', async (req, res) => {
        try {
            const userEmail = await getUserEmail(req);

            if (!userEmail) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not authenticated' 
                });
            }

            console.log('📋 Loading meetings for user:', userEmail);

            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

            // Find meetings where user is organizer or participant
            const meetings = await Meeting.find({
                $and: [
                    {
                        $or: [
                            { schedulerEmail: userEmail },
                            { 'participants.email': userEmail }
                        ]
                    },
                    {
                        $or: [
                            { date: { $gt: currentDate } },
                            {
                                $and: [
                                    { date: currentDate },
                                    { time: { $gte: currentTime } }
                                ]
                            }
                        ]
                    }
                ]
            }).sort({ date: 1, time: 1 });

            console.log(`📋 Found ${meetings.length} upcoming meetings for ${userEmail}`);

            // Transform meetings for frontend
            const transformedMeetings = meetings.map(meeting => ({
                id: meeting._id.toString(),
                title: meeting.title,
                date: meeting.date,
                time: meeting.time,
                duration: meeting.duration,
                participants: meeting.participants,
                description: meeting.description,
                schedulerEmail: meeting.schedulerEmail,
                schedulerName: meeting.schedulerName,
                meetingId: meeting.meetingId,
                createdAt: meeting.createdAt
            }));

            res.json({
                success: true,
                meetings: transformedMeetings
            });

        } catch (error) {
            console.error('Error fetching meetings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch meetings',
                error: error.message
            });
        }
    });

    // Get meeting details
    app.get('/api/meetings/:meetingId', async (req, res) => {
        try {
            const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
            
            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    message: 'Meeting not found'
                });
            }

            res.json({
                success: true,
                meeting: {
                    id: meeting._id.toString(),
                    title: meeting.title,
                    date: meeting.date,
                    time: meeting.time,
                    duration: meeting.duration,
                    participants: meeting.participants,
                    description: meeting.description,
                    schedulerEmail: meeting.schedulerEmail,
                    schedulerName: meeting.schedulerName,
                    meetingId: meeting.meetingId,
                    status: meeting.status
                }
            });
        } catch (error) {
            console.error('Error fetching meeting:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch meeting'
            });
        }
    });

    // Health check endpoint
    app.get('/api/scheduler/health', async (req, res) => {
        try {
            const upcomingMeetings = await Meeting.countDocuments({
                date: { $gte: new Date().toISOString().split('T')[0] }
            });

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                upcomingMeetings,
                scheduledJobs: 'active'
            });
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });

    // Test endpoint
    app.get('/api/meetings/test', async (req, res) => {
        try {
            const totalMeetings = await Meeting.countDocuments();
            const upcomingMeetings = await Meeting.find({
                date: { $gte: new Date().toISOString().split('T')[0] }
            });
            
            res.json({
                success: true,
                totalMeetings,
                upcomingCount: upcomingMeetings.length,
                meetings: upcomingMeetings.map(m => ({
                    title: m.title,
                    date: m.date,
                    time: m.time,
                    schedulerEmail: m.schedulerEmail
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Meeting room endpoint
    app.get('/meeting/:meetingId', async (req, res) => {
        try {
            const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
            
            if (!meeting) {
                return res.status(404).send(`
                    <html>
                        <head><title>Meeting Not Found</title></head>
                        <body>
                            <h1>Meeting Not Found</h1>
                            <p>The meeting you're looking for doesn't exist.</p>
                            <p><a href="/scheduler">← Back to Scheduler</a></p>
                        </body>
                    </html>
                `);
            }

            // Check if user is authenticated
            if (!req.session.userId && !req.user) {
                return res.redirect('/');
            }

            // Redirect to join page with meeting ID
            res.redirect(`/join?meetingId=${req.params.meetingId}`);
        } catch (error) {
            console.error('Error accessing meeting room:', error);
            res.status(500).send(`
                <html>
                    <head><title>Error</title></head>
                    <body>
                        <h1>Error</h1>
                        <p>An error occurred while accessing the meeting room.</p>
                        <p><a href="/scheduler">← Back to Scheduler</a></p>
                    </body>
                </html>
            `);
        }
    });
};

// Setup Socket.IO handlers
const setupSchedulerSocketHandlers = (socket) => {
    // Handle meeting notifications
    socket.on('join-meeting-room', (meetingId) => {
        socket.join(`meeting-${meetingId}`);
        console.log(`Socket ${socket.id} joined meeting room: ${meetingId}`);
    });

    socket.on('leave-meeting-room', (meetingId) => {
        socket.leave(`meeting-${meetingId}`);
        console.log(`Socket ${socket.id} left meeting room: ${meetingId}`);
    });

    // Handle meeting updates
    socket.on('update-meeting-status', async (data) => {
        try {
            const { meetingId, status } = data;
            await Meeting.findOneAndUpdate(
                { meetingId },
                { status },
                { new: true }
            );
            
            // Broadcast to all participants in the meeting room
            socket.to(`meeting-${meetingId}`).emit('meeting-status-updated', { meetingId, status });
        } catch (error) {
            console.error('Error updating meeting status:', error);
            socket.emit('error', { message: 'Failed to update meeting status' });
        }
    });

    const handleDisconnect = () => {
        // Cleanup logic when socket disconnects
        console.log('Scheduler socket disconnected:', socket.id);
    };

    return { handleDisconnect };
};

// Initialize reminder system
const initializeReminderSystem = (io) => {
    // Reminder system using cron jobs (runs every minute)
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
            
            const currentDate = now.toISOString().split('T')[0];
            const reminderTime = fiveMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5);

            const meetingsToRemind = await Meeting.find({
                date: currentDate,
                time: reminderTime,
                notificationsSent: false
            });

            for (const meeting of meetingsToRemind) {
                console.log(`📧 Sending reminders for meeting: ${meeting.title}`);
                
                // Send reminder emails
                await sendMeetingNotifications(meeting, true);
                
                // Emit socket event for real-time notifications
                if (io) {
                    io.to(`meeting-${meeting.meetingId}`).emit('meeting-reminder', {
                        meetingId: meeting.meetingId,
                        title: meeting.title,
                        startsIn: '5 minutes'
                    });
                }
                
                // Mark as notified
                meeting.notificationsSent = true;
                await meeting.save();
            }
        } catch (error) {
            console.error('Error in reminder system:', error);
        }
    });

    console.log('✓ Meeting reminder system initialized');
};

// Main setup function
export const setupScheduler = (app, io) => {
    // Initialize Meeting model
    if (!mongoose.models.Meeting) {
        Meeting = mongoose.model('Meeting', meetingSchema);
    } else {
        Meeting = mongoose.models.Meeting;
    }

    // Setup routes
    setupSchedulerRoutes(app);

    // Initialize reminder system
    initializeReminderSystem(io);

    // Return API object with socket handlers
    return {
        setupSocketHandlers: setupSchedulerSocketHandlers,
        Meeting,
        generateMeetingId,
        sendMeetingNotifications
    };
};
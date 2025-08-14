// modules/meetingBooking.js
import nodemailer from 'nodemailer';

// In-memory storage for meetings (in production, use a database)
let meetings = [];
let users = new Map();




// Email configuration
let transporter;
try {
    transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} catch (error) {
    console.warn('⚠️ Email service not configured. Email notifications will be simulated.');
}

// Helper function to get user profile picture
function getUserProfilePicture(email) {
    const user = mockUsers.get(email.toLowerCase());
    if (user && user.profilePicture) {
        return user.profilePicture;
    }
    
    // Generate a default avatar with initials
    const name = user ? user.name : email.split('@')[0];
    const initials = name.split(' ').map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
    
    // Return a placeholder image URL with initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=64`;
}

// Helper function to get user name
function getUserName(email) {
    const user = mockUsers.get(email.toLowerCase());
    return user ? user.name : email.split('@')[0];
}

// Authentication middleware
function requireAuth(req, res, next) {
    // Updated to work with both session-based and Passport-based auth
    if (!req.session.userId && !req.user && !req.session.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    next();
}

// Get current user helper
function getCurrentUser(req) {
    // Return user from different auth methods
    if (req.user) return req.user; // Passport auth
    if (req.session.user) return req.session.user; // Session auth
    if (req.session.userId) {
        // Try to find user by session userId
        for (const [email, user] of mockUsers) {
            if (user.id === req.session.userId) {
                return user;
            }
        }
    }
    return null;
}

// Meeting booking functionality
export function setupMeetingBooking(app, io) {
    
    // Mock login endpoint (for testing)
    app.post('/api/booking/login', (req, res) => {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        
        // For demo purposes, auto-create user if not exists
        if (!mockUsers.has(email.toLowerCase())) {
            const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            mockUsers.set(email.toLowerCase(), {
                id: Date.now().toString(),
                email: email.toLowerCase(),
                name: name,
                profilePicture: getUserProfilePicture(email)
            });
        }
        
        const user = mockUsers.get(email.toLowerCase());
        req.session.user = user;
        
        res.json({ success: true, user });
    });

    // Get current user
    app.get('/api/booking/user', (req, res) => {
        let currentUser = getCurrentUser(req);
        
        if (!currentUser) {
            // Auto-login with default user for demo if no auth system user found
            const defaultUser = mockUsers.get('user1@gmail.com');
            req.session.user = defaultUser;
            currentUser = defaultUser;
        }
        
        res.json({ success: true, user: currentUser });
    });

    // Logout
    app.post('/api/booking/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Logout failed' });
            }
            res.json({ success: true, message: 'Logged out successfully' });
        });
    });

    // Schedule meeting endpoint
    app.post('/api/booking/schedule-meeting', requireAuth, async (req, res) => {
        try {
            const { title, date, time, duration, participants, description, schedulerEmail } = req.body;
            
            // Validate required fields
            if (!title || !date || !time || !duration || !schedulerEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: title, date, time, duration, schedulerEmail'
                });
            }

            // Create meeting object
            const meeting = {
                id: Date.now().toString(),
                title: title.trim(),
                description: description ? description.trim() : '',
                date,
                time,
                duration: parseInt(duration),
                schedulerEmail: schedulerEmail.toLowerCase(),
                participants: participants || [],
                createdAt: new Date().toISOString()
            };

            // Add to meetings array
            meetings.push(meeting);

            console.log('✅ Meeting scheduled:', {
                id: meeting.id,
                title: meeting.title,
                dateTime: `${date} ${time}`,
                participants: meeting.participants.length + 1
            });

            // Emit real-time notification to all connected clients
            io.emit('meeting-scheduled', {
                meeting: {
                    ...meeting,
                    scheduler: {
                        email: meeting.schedulerEmail,
                        name: getUserName(meeting.schedulerEmail),
                        profilePicture: getUserProfilePicture(meeting.schedulerEmail)
                    },
                    participants: meeting.participants.map(participant => ({
                        ...participant,
                        name: getUserName(participant.email),
                        profilePicture: getUserProfilePicture(participant.email)
                    }))
                }
            });

            // Send email notifications (simulated)
            let emailResults = [];
            const allEmails = [schedulerEmail, ...participants.map(p => p.email)];
            
            for (const email of allEmails) {
                try {
                    if (transporter) {
                        const mailOptions = {
                            from: process.env.EMAIL_USER,
                            to: email,
                            subject: `Meeting Scheduled: ${title}`,
                            html: `
                                <h2>Meeting Scheduled</h2>
                                <p><strong>Title:</strong> ${title}</p>
                                <p><strong>Date:</strong> ${new Date(date + 'T00:00:00').toLocaleDateString()}</p>
                                <p><strong>Time:</strong> ${time}</p>
                                <p><strong>Duration:</strong> ${duration} minutes</p>
                                ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
                                <p><strong>Organizer:</strong> ${schedulerEmail}</p>
                            `
                        };
                        
                        const info = await transporter.sendMail(mailOptions);
                        emailResults.push({ email, status: 'sent', messageId: info.messageId });
                    } else {
                        // Simulate email sending
                        emailResults.push({ email, status: 'simulated', messageId: `sim_${Date.now()}` });
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
                    ...meeting,
                    totalNotifications: emailResults.length,
                    emailResults
                }
            });

        } catch (error) {
            console.error('❌ Error scheduling meeting:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    });

    // Get upcoming meetings
    app.get('/api/booking/meetings', requireAuth, (req, res) => {
        try {
            const now = new Date();
            const currentUser = getCurrentUser(req);
            
            if (!currentUser) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            
            // Filter meetings for the current user (either as scheduler or participant)
            const userMeetings = meetings.filter(meeting => {
                const isScheduler = meeting.schedulerEmail === currentUser.email;
                const isParticipant = meeting.participants.some(p => p.email === currentUser.email);
                return isScheduler || isParticipant;
            });
            
            // Filter upcoming meetings and sort by date/time
            const upcomingMeetings = userMeetings
                .filter(meeting => {
                    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
                    return meetingDateTime > now;
                })
                .sort((a, b) => {
                    const dateTimeA = new Date(`${a.date}T${a.time}:00`);
                    const dateTimeB = new Date(`${b.date}T${b.time}:00`);
                    return dateTimeA - dateTimeB;
                })
                .map(meeting => {
                    // Add participant details with profile pictures
                    const participantsWithDetails = meeting.participants.map(participant => ({
                        ...participant,
                        name: getUserName(participant.email),
                        profilePicture: getUserProfilePicture(participant.email)
                    }));
                    
                    // Add scheduler details
                    const schedulerDetails = {
                        email: meeting.schedulerEmail,
                        name: getUserName(meeting.schedulerEmail),
                        profilePicture: getUserProfilePicture(meeting.schedulerEmail)
                    };
                    
                    return {
                        ...meeting,
                        scheduler: schedulerDetails,
                        participants: participantsWithDetails,
                        totalParticipants: participantsWithDetails.length + 1 // +1 for scheduler
                    };
                });

            res.json({
                success: true,
                meetings: upcomingMeetings,
                total: upcomingMeetings.length
            });

        } catch (error) {
            console.error('❌ Error fetching meetings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch meetings',
                error: error.message
            });
        }
    });

    // Get all meetings (for admin purposes)
    app.get('/api/booking/meetings/all', requireAuth, (req, res) => {
        try {
            const now = new Date();
            
            // Get all upcoming meetings and sort by date/time
            const upcomingMeetings = meetings
                .filter(meeting => {
                    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
                    return meetingDateTime > now;
                })
                .sort((a, b) => {
                    const dateTimeA = new Date(`${a.date}T${a.time}:00`);
                    const dateTimeB = new Date(`${b.date}T${b.time}:00`);
                    return dateTimeA - dateTimeB;
                })
                .map(meeting => {
                    // Add participant details with profile pictures
                    const participantsWithDetails = meeting.participants.map(participant => ({
                        ...participant,
                        name: getUserName(participant.email),
                        profilePicture: getUserProfilePicture(participant.email)
                    }));
                    
                    // Add scheduler details
                    const schedulerDetails = {
                        email: meeting.schedulerEmail,
                        name: getUserName(meeting.schedulerEmail),
                        profilePicture: getUserProfilePicture(meeting.schedulerEmail)
                    };
                    
                    return {
                        ...meeting,
                        scheduler: schedulerDetails,
                        participants: participantsWithDetails,
                        totalParticipants: participantsWithDetails.length + 1 // +1 for scheduler
                    };
                });

            res.json({
                success: true,
                meetings: upcomingMeetings,
                total: upcomingMeetings.length
            });

        } catch (error) {
            console.error('❌ Error fetching all meetings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch meetings',
                error: error.message
            });
        }
    });

    // Delete meeting endpoint
    app.delete('/api/booking/meetings/:id', requireAuth, (req, res) => {
        try {
            const meetingId = req.params.id;
            const meetingIndex = meetings.findIndex(m => m.id === meetingId);
            
            if (meetingIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Meeting not found'
                });
            }
            
            const meeting = meetings[meetingIndex];
            const currentUser = getCurrentUser(req);
            
            // Check if user has permission to delete (only scheduler can delete)
            if (meeting.schedulerEmail !== currentUser.email) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete meetings that you scheduled'
                });
            }
            
            // Remove meeting from array
            meetings.splice(meetingIndex, 1);
            
            console.log('🗑️ Meeting deleted:', {
                id: meeting.id,
                title: meeting.title,
                deletedBy: currentUser.email
            });
            
            // Emit real-time notification to all connected clients
            io.emit('meeting-deleted', {
                meetingId: meeting.id,
                title: meeting.title,
                deletedBy: currentUser.email
            });
            
            res.json({
                success: true,
                message: 'Meeting deleted successfully',
                deletedMeeting: {
                    id: meeting.id,
                    title: meeting.title
                }
            });

        } catch (error) {
            console.error('❌ Error deleting meeting:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete meeting',
                error: error.message
            });
        }
    });

    // Health check endpoint
    app.get('/api/booking/health', (req, res) => {
        const now = new Date();
        const upcomingMeetings = meetings.filter(meeting => {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
            return meetingDateTime > now;
        });

        res.json({
            success: true,
            status: 'healthy',
            timestamp: now.toISOString(),
            upcomingMeetings: upcomingMeetings.length,
            totalMeetings: meetings.length,
            scheduledJobs: 0
        });
    });

    // Test email endpoint
    app.post('/api/booking/test-email', async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            if (transporter) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'ConvoSpace - Test Email',
                    html: `
                        <h2>Test Email from ConvoSpace</h2>
                        <p>This is a test email to verify that the email service is working correctly.</p>
                        <p>If you received this email, the email configuration is working properly.</p>
                        <p>Timestamp: ${new Date().toISOString()}</p>
                    `
                };
                
                const info = await transporter.sendMail(mailOptions);
                res.json({ success: true, messageId: info.messageId });
            } else {
                res.json({ success: true, messageId: `simulated_${Date.now()}`, note: 'Email service not configured - simulated' });
            }
        } catch (error) {
            console.error('❌ Test email error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Socket.IO handlers for real-time functionality
    const setupSocketHandlers = (socket) => {
        // Join meeting booking room
        socket.on('join-booking-room', () => {
            socket.join('booking-room');
            console.log(`Socket ${socket.id} joined booking room`);
        });

        // Leave meeting booking room
        socket.on('leave-booking-room', () => {
            socket.leave('booking-room');
            console.log(`Socket ${socket.id} left booking room`);
        });

        // Handle disconnect
        const handleDisconnect = () => {
            console.log(`Socket ${socket.id} disconnected from booking`);
        };

        return { handleDisconnect };
    };

    // Return API for external use
    return {
        setupSocketHandlers,
  

        getUserName,
        getUserProfilePicture
    };
}

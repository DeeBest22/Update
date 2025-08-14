
import nodemailer from 'nodemailer';

// In-memory storage for meetings and scheduled jobs
let meetings = [];
let meetingIdCounter = 1;
let scheduledJobs = new Map(); // Store timeout IDs for cleanup

let transporter = null;

// Initialize email transporter
function initializeEmailTransport() {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SCHEDULER_EMAIL || 'convospace602@gmail.com',
            pass: process.env.SCHEDULER_EMAIL_PASSWORD || 'dikq qayo cmgq cavg'
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

// Helper function to format date and time
function formatDateTime(date, time) {
    const meetingDate = new Date(`${date}T${time}:00`);
    return {
        date: meetingDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        time: meetingDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }),
        dateTime: meetingDate
    };
}

// Helper function to send initial scheduling email
async function sendSchedulingEmail(meetingData, formatted) {
    if (!transporter) {
        throw new Error('Email transporter not initialized');
    }

    const { title, schedulerEmail, participants, description, duration } = meetingData;
    
    const allEmails = [schedulerEmail, ...participants.map(p => p.email)];
    
    const emailSubject = `Meeting Scheduled: ${title}`;
    const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #4A90E2;">📅 Meeting Scheduled</h2>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">${title}</h3>
        
        <p><strong>📅 Date:</strong> ${formatted.date}</p>
        <p><strong>🕒 Time:</strong> ${formatted.time}</p>
        <p><strong>⏱️ Duration:</strong> ${duration} minutes</p>
        <p><strong>👤 Organizer:</strong> ${schedulerEmail}</p>
        
        ${participants.length > 0 ? `
        <p><strong>👥 Participants:</strong></p>
        <ul style="margin: 5px 0;">
            ${participants.map(p => `<li>${p.email}</li>`).join('')}
        </ul>
        ` : ''}
        
        ${description ? `
        <div style="margin-top: 20px;">
            <strong>📋 Description:</strong>
            <p style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #4A90E2;">${description}</p>
        </div>
        ` : ''}
    </div>
    
    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #2c5282;">
            ⏰ You will receive a reminder when the meeting starts.
        </p>
    </div>
    
    <p style="color: #666; font-size: 14px;">
        This meeting has been scheduled through ConvoSpace Meeting Scheduler.
    </p>
</div>
    `;

    return await sendEmailToAll(allEmails, emailSubject, emailBody);
}

// Helper function to send meeting start notification
async function sendMeetingStartEmail(meeting, formatted) {
    if (!transporter) {
        throw new Error('Email transporter not initialized');
    }

    const { title, schedulerEmail, participants, description, duration } = meeting;
    
    const allEmails = [schedulerEmail, ...participants.map(p => p.email)];
    
    const emailSubject = `🔴 Meeting Starting Now: ${title}`;
    const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #E53E3E;">🔴 Meeting Starting Now!</h2>
    
    <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E53E3E;">
        <h3 style="margin-top: 0; color: #333;">${title}</h3>
        
        <p><strong>📅 Date:</strong> ${formatted.date}</p>
        <p><strong>🕒 Time:</strong> ${formatted.time}</p>
        <p><strong>⏱️ Duration:</strong> ${duration} minutes</p>
        <p><strong>👤 Organizer:</strong> ${schedulerEmail}</p>
        
        ${participants.length > 0 ? `
        <p><strong>👥 Participants:</strong></p>
        <ul style="margin: 5px 0;">
            ${participants.map(p => `<li>${p.email}</li>`).join('')}
        </ul>
        ` : ''}
    </div>
    
    ${description ? `
    <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <strong>📋 Meeting Agenda:</strong>
        <p style="margin: 10px 0 0 0;">${description}</p>
    </div>
    ` : ''}
    
    <div style="background: #c6f6d5; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h4 style="margin: 0; color: #2f855a;">Ready to join your meeting?</h4>
        <p style="margin: 10px 0 0 0; color: #2f855a;">The meeting is starting now!</p>
    </div>
    
    <p style="color: #666; font-size: 14px;">
        This is an automated reminder from ConvoSpace Meeting Scheduler.
    </p>
</div>
    `;

    return await sendEmailToAll(allEmails, emailSubject, emailBody);
}

// Helper function to send emails to all recipients
async function sendEmailToAll(emails, subject, htmlBody) {
    const results = [];
    
    for (const email of emails) {
        try {
            const info = await transporter.sendMail({
                from: `"ConvoSpace" <${process.env.SCHEDULER_EMAIL || 'convospace602@gmail.com'}>`,
                to: email,
                subject: subject,
                html: htmlBody
            });
            
            results.push({ email, success: true, messageId: info.messageId });
            console.log(`✅ Email sent to ${email}: ${info.messageId}`);
        } catch (error) {
            results.push({ email, success: false, error: error.message });
            console.error(`❌ Failed to send email to ${email}:`, error.message);
        }
    }
    
    return results;
}

// Schedule meeting start notification
function scheduleMeetingNotification(meeting) {
    const now = new Date();
    const meetingTime = meeting.dateTime;
    const timeUntilMeeting = meetingTime.getTime() - now.getTime();
    
    // Only schedule if meeting is in the future
    if (timeUntilMeeting > 0) {
        console.log(`⏰ Scheduling notification for "${meeting.title}" in ${Math.round(timeUntilMeeting / 1000 / 60)} minutes`);
        
        const timeoutId = setTimeout(async () => {
            console.log(`🔔 Meeting "${meeting.title}" is starting now! Sending notifications...`);
            
            const formatted = formatDateTime(meeting.date, meeting.time);
            const emailResults = await sendMeetingStartEmail(meeting, formatted);
            
            const successfulEmails = emailResults.filter(r => r.success).length;
            console.log(`📧 Meeting start notifications: ${successfulEmails}/${emailResults.length} sent successfully`);
            
            // Clean up the scheduled job
            scheduledJobs.delete(meeting.id);
        }, timeUntilMeeting);
        
        // Store the timeout ID for potential cleanup
        scheduledJobs.set(meeting.id, timeoutId);
        
        return true;
    }
    
    return false;
}

// Clean up past meetings and their scheduled jobs
function cleanupPastMeetings() {
    const now = new Date();
    const pastMeetings = meetings.filter(m => m.dateTime <= now);
    
    pastMeetings.forEach(meeting => {
        // Clear any remaining scheduled jobs
        if (scheduledJobs.has(meeting.id)) {
            clearTimeout(scheduledJobs.get(meeting.id));
            scheduledJobs.delete(meeting.id);
        }
    });
    
    // Remove past meetings from memory (keep for 1 hour after meeting time)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    meetings = meetings.filter(m => m.dateTime > oneHourAgo);
    
    if (pastMeetings.length > 0) {
        console.log(`🧹 Cleaned up ${pastMeetings.length} past meetings`);
    }
}

// Reschedule existing meetings on server restart
function rescheduleExistingMeetings() {
    const now = new Date();
    const futureMeetings = meetings.filter(m => m.dateTime > now);
    
    futureMeetings.forEach(meeting => {
        scheduleMeetingNotification(meeting);
    });
    
    if (futureMeetings.length > 0) {
        console.log(`🔄 Rescheduled notifications for ${futureMeetings.length} existing meetings`);
    }
}

// Setup routes and functionality
export function setupMeetingScheduler(app, io) {
    // Initialize email transporter
    initializeEmailTransport();
    
    // Run cleanup every 30 minutes
    setInterval(cleanupPastMeetings, 30 * 60 * 1000);
    
    // Reschedule existing meetings on startup
    rescheduleExistingMeetings();

    // Routes

    // Health check endpoint (from prototype.js)
    app.get('/api/health', (req, res) => {
        const now = new Date();
        const upcomingMeetings = meetings.filter(m => m.dateTime > now);
        
        res.json({
            status: 'healthy',
            timestamp: now.toISOString(),
            upcomingMeetings: upcomingMeetings.length,
            totalMeetings: meetings.length,
            scheduledJobs: scheduledJobs.size
        });
    });

    // Schedule meeting endpoint (matching prototype.js API)
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

            // Format date and time
            const formatted = formatDateTime(date, time);
            
            // Check if meeting is in the future
            if (formatted.dateTime <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Meeting must be scheduled for a future date and time'
                });
            }

            // Create meeting object
            const meeting = {
                id: meetingIdCounter++,
                title,
                date,
                time,
                duration,
                participants: participants || [],
                description,
                schedulerEmail,
                dateTime: formatted.dateTime,
                createdAt: new Date()
            };

            // Store meeting
            meetings.push(meeting);

            console.log(`📅 Scheduling meeting: "${title}" for ${formatted.date} at ${formatted.time}`);
            console.log(`👤 Organizer: ${schedulerEmail}`);
            console.log(`👥 Participants: ${participants.length}`);

            // Send initial scheduling emails
            const emailResults = await sendSchedulingEmail(req.body, formatted);
            const successfulEmails = emailResults.filter(r => r.success).length;
            const totalEmails = emailResults.length;

            console.log(`📧 Scheduling notifications: ${successfulEmails}/${totalEmails} sent successfully`);

            // Schedule the meeting start notification
            const notificationScheduled = scheduleMeetingNotification(meeting);

            res.json({
                success: true,
                message: 'Meeting scheduled successfully',
                meeting: {
                    id: meeting.id,
                    title: meeting.title,
                    dateTime: formatted.dateTime,
                    totalNotifications: successfulEmails,
                    emailResults,
                    startNotificationScheduled: notificationScheduled
                }
            });

        } catch (error) {
            console.error('❌ Error scheduling meeting:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    });

    // Get all meetings (from prototype.js)
    app.get('/api/meetings', (req, res) => {
        const now = new Date();
        const upcomingMeetings = meetings
            .filter(m => m.dateTime > now)
            .sort((a, b) => a.dateTime - b.dateTime)
            .map(meeting => ({
                ...meeting,
                hasScheduledNotification: scheduledJobs.has(meeting.id)
            }));
        
        res.json({
            success: true,
            meetings: upcomingMeetings
        });
    });

    // Cancel meeting endpoint (from prototype.js)
    app.delete('/api/meetings/:id', (req, res) => {
        const meetingId = parseInt(req.params.id);
        const meetingIndex = meetings.findIndex(m => m.id === meetingId);
        
        if (meetingIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        
        const meeting = meetings[meetingIndex];
        
        // Clear scheduled notification
        if (scheduledJobs.has(meetingId)) {
            clearTimeout(scheduledJobs.get(meetingId));
            scheduledJobs.delete(meetingId);
        }
        
        // Remove meeting
        meetings.splice(meetingIndex, 1);
        
        console.log(`🗑️ Meeting "${meeting.title}" cancelled and removed`);
        
        res.json({
            success: true,
            message: 'Meeting cancelled successfully'
        });
    });

    // Delete meeting endpoint
    app.delete('/api/meetings/:id', (req, res) => {
        try {
            const meetingId = parseInt(req.params.id);
            const meetingIndex = meetings.findIndex(m => m.id === meetingId);
            
            if (meetingIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Meeting not found'
                });
            }
            
            const meeting = meetings[meetingIndex];
            
            // Clear scheduled notification if exists
            if (scheduledJobs.has(meetingId)) {
                clearTimeout(scheduledJobs.get(meetingId));
                scheduledJobs.delete(meetingId);
                console.log(`⏰ Cancelled notification for meeting: "${meeting.title}"`);
            }
            
            // Remove meeting from array
            meetings.splice(meetingIndex, 1);
            
            console.log(`🗑️ Meeting "${meeting.title}" deleted successfully`);
            
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
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        }
    });

    // Test email endpoint (from prototype.js)
    app.post('/api/test-email', async (req, res) => {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email address is required'
                });
            }

            const info = await transporter.sendMail({
                from: `"ConvoSpace" <${process.env.SCHEDULER_EMAIL || 'convospace602@gmail.com'}>`,
                to: email,
                subject: 'ConvoSpace - Email Test',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4A90E2;">Email Test Successful! ✅</h2>
                        <p>This is a test email from ConvoSpace Meeting Scheduler.</p>
                        <p>Your email service is working correctly.</p>
                        <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
                    </div>
                `
            });

            res.json({
                success: true,
                message: 'Test email sent successfully',
                messageId: info.messageId
            });

        } catch (error) {
            console.error('❌ Test email failed:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Email service error'
            });
        }
    });

    // Socket.IO handlers for real-time meeting updates
    const setupSocketHandlers = (socket) => {
        // Handle disconnect
        const handleDisconnect = () => {
            console.log('User disconnected from scheduler');
        };

        socket.on('disconnect', handleDisconnect);

        return { handleDisconnect };
    };

    console.log('✅ Meeting Scheduler module initialized');
    console.log('📧 Email notifications configured');
    
    return {
        setupSocketHandlers,
        getMeetings: () => meetings,
        getScheduledJobs: () => scheduledJobs
    };
}
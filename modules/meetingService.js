// modules/meetingService.js
import Meeting from './meetingModel.js';

// Helper function to get user profile picture
function getUserProfilePicture(email, mockUsers) {
    const user = mockUsers.get(email.toLowerCase());
    if (user && user.profilePicture) {
        return user.profilePicture;
    }
    
    const name = user ? user.name : email.split('@')[0];
    const initials = name.split(' ').map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=64`;
}

// Helper function to get user name
function getUserName(email, mockUsers) {
    const user = mockUsers.get(email.toLowerCase());
    return user ? user.name : email.split('@')[0];
}

export class MeetingService {
    constructor(mockUsers) {
        this.mockUsers = mockUsers;
    }

    // Create a new meeting
    async createMeeting(meetingData) {
        try {
            const {
                title,
                description = '',
                date,
                time,
                duration,
                schedulerEmail,
                participants = [],
                timezone = 'UTC'
            } = meetingData;

            // Generate unique meeting ID
            const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Get scheduler details
            const schedulerName = getUserName(schedulerEmail, this.mockUsers);
            const schedulerProfilePicture = getUserProfilePicture(schedulerEmail, this.mockUsers);

            // Process participants
            const processedParticipants = participants.map(participant => ({
                email: participant.email.toLowerCase(),
                name: participant.name || getUserName(participant.email, this.mockUsers),
                profilePicture: participant.profilePicture || getUserProfilePicture(participant.email, this.mockUsers),
                status: 'pending'
            }));

            // Create meeting document
            const meeting = new Meeting({
                meetingId,
                title: title.trim(),
                description: description.trim(),
                date,
                time,
                duration: parseInt(duration),
                schedulerEmail: schedulerEmail.toLowerCase(),
                schedulerName,
                schedulerProfilePicture,
                participants: processedParticipants,
                timezone,
                meetingLink: `${process.env.APP_URL || 'http://localhost:5000'}/join?room=${meetingId}`,
                metadata: {
                    createdBy: schedulerEmail.toLowerCase()
                }
            });

            // Save to database
            const savedMeeting = await meeting.save();
            
            console.log('✅ Meeting saved to database:', {
                id: savedMeeting.meetingId,
                title: savedMeeting.title,
                scheduler: savedMeeting.schedulerEmail,
                participants: savedMeeting.participants.length
            });

            return savedMeeting;

        } catch (error) {
            console.error('❌ Error creating meeting:', error);
            throw error;
        }
    }

    // Get all meetings for a user
    async getUserMeetings(userEmail) {
        try {
            const meetings = await Meeting.findByUserEmail(userEmail);
            return meetings.map(meeting => this.formatMeetingForResponse(meeting));
        } catch (error) {
            console.error('❌ Error fetching user meetings:', error);
            throw error;
        }
    }

    // Get upcoming meetings for a user
    async getUserUpcomingMeetings(userEmail) {
        try {
            const meetings = await Meeting.findUpcomingByUserEmail(userEmail);
            return meetings.map(meeting => this.formatMeetingForResponse(meeting));
        } catch (error) {
            console.error('❌ Error fetching upcoming meetings:', error);
            throw error;
        }
    }

    // Get all upcoming meetings (for admin)
    async getAllUpcomingMeetings() {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentTime = now.toTimeString().slice(0, 5);
            
            const meetings = await Meeting.find({
                status: 'scheduled',
                $or: [
                    { date: { $gt: today } },
                    { date: today, time: { $gt: currentTime } }
                ]
            }).sort({ date: 1, time: 1 });

            return meetings.map(meeting => this.formatMeetingForResponse(meeting));
        } catch (error) {
            console.error('❌ Error fetching all upcoming meetings:', error);
            throw error;
        }
    }

    // Get a specific meeting
    async getMeetingById(meetingId) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            return meeting ? this.formatMeetingForResponse(meeting) : null;
        } catch (error) {
            console.error('❌ Error fetching meeting by ID:', error);
            throw error;
        }
    }

    // Update a meeting
    async updateMeeting(meetingId, updateData, userEmail) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            // Check if user has permission to update
            if (meeting.schedulerEmail !== userEmail.toLowerCase()) {
                throw new Error('Only the scheduler can update this meeting');
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (key !== 'participants' && updateData[key] !== undefined) {
                    meeting[key] = updateData[key];
                }
            });

            // Handle participants update separately
            if (updateData.participants) {
                meeting.participants = updateData.participants.map(participant => ({
                    email: participant.email.toLowerCase(),
                    name: participant.name || getUserName(participant.email, this.mockUsers),
                    profilePicture: participant.profilePicture || getUserProfilePicture(participant.email, this.mockUsers),
                    status: participant.status || 'pending'
                }));
            }

            meeting.metadata.version += 1;
            const updatedMeeting = await meeting.save();

            console.log('✅ Meeting updated:', {
                id: updatedMeeting.meetingId,
                title: updatedMeeting.title,
                version: updatedMeeting.metadata.version
            });

            return this.formatMeetingForResponse(updatedMeeting);

        } catch (error) {
            console.error('❌ Error updating meeting:', error);
            throw error;
        }
    }

    // Delete a meeting
    async deleteMeeting(meetingId, userEmail) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            // Check if user has permission to delete
            if (meeting.schedulerEmail !== userEmail.toLowerCase()) {
                throw new Error('Only the scheduler can delete this meeting');
            }

            await Meeting.deleteOne({ meetingId });

            console.log('✅ Meeting deleted from database:', {
                id: meetingId,
                title: meeting.title,
                deletedBy: userEmail
            });

            return this.formatMeetingForResponse(meeting);

        } catch (error) {
            console.error('❌ Error deleting meeting:', error);
            throw error;
        }
    }

    // Mark meeting as completed
    async completeMeeting(meetingId, userEmail) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            // Check if user is involved in the meeting
            if (!meeting.hasUserInvolved(userEmail)) {
                throw new Error('You are not authorized to update this meeting');
            }

            meeting.markAsCompleted();
            const updatedMeeting = await meeting.save();

            console.log('✅ Meeting marked as completed:', {
                id: meetingId,
                title: meeting.title
            });

            return this.formatMeetingForResponse(updatedMeeting);

        } catch (error) {
            console.error('❌ Error completing meeting:', error);
            throw error;
        }
    }

    // Cancel a meeting
    async cancelMeeting(meetingId, userEmail) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            // Check if user has permission to cancel
            if (meeting.schedulerEmail !== userEmail.toLowerCase()) {
                throw new Error('Only the scheduler can cancel this meeting');
            }

            meeting.cancel();
            const updatedMeeting = await meeting.save();

            console.log('✅ Meeting cancelled:', {
                id: meetingId,
                title: meeting.title
            });

            return this.formatMeetingForResponse(updatedMeeting);

        } catch (error) {
            console.error('❌ Error cancelling meeting:', error);
            throw error;
        }
    }

    // Update participant status
    async updateParticipantStatus(meetingId, participantEmail, status) {
        try {
            const meeting = await Meeting.findOne({ meetingId });
            
            if (!meeting) {
                throw new Error('Meeting not found');
            }

            meeting.updateParticipantStatus(participantEmail, status);
            const updatedMeeting = await meeting.save();

            console.log('✅ Participant status updated:', {
                meetingId,
                participant: participantEmail,
                status
            });

            return this.formatMeetingForResponse(updatedMeeting);

        } catch (error) {
            console.error('❌ Error updating participant status:', error);
            throw error;
        }
    }

    // Sync in-memory meetings to database
    async syncMeetingsToDatabase(inMemoryMeetings) {
        try {
            let syncedCount = 0;
            
            for (const meeting of inMemoryMeetings) {
                try {
                    // Check if meeting already exists in database
                    const existingMeeting = await Meeting.findOne({ meetingId: meeting.id });
                    
                    if (!existingMeeting) {
                        // Convert in-memory format to database format
                        const meetingData = {
                            title: meeting.title,
                            description: meeting.description || '',
                            date: meeting.date,
                            time: meeting.time,
                            duration: meeting.duration,
                            schedulerEmail: meeting.schedulerEmail,
                            participants: meeting.participants || []
                        };

                        await this.createMeeting(meetingData);
                        syncedCount++;
                    }
                } catch (syncError) {
                    console.warn(`⚠️ Failed to sync meeting ${meeting.id}:`, syncError.message);
                }
            }

            console.log(`✅ Synced ${syncedCount} meetings to database`);
            return syncedCount;

        } catch (error) {
            console.error('❌ Error syncing meetings to database:', error);
            throw error;
        }
    }

    // Load meetings from database to memory
    async loadMeetingsFromDatabase() {
        try {
            const meetings = await this.getAllUpcomingMeetings();
            
            // Convert to in-memory format
            const inMemoryFormat = meetings.map(meeting => ({
                id: meeting.meetingId,
                title: meeting.title,
                description: meeting.description,
                date: meeting.date,
                time: meeting.time,
                duration: meeting.duration,
                schedulerEmail: meeting.schedulerEmail,
                participants: meeting.participants.map(p => ({
                    email: p.email,
                    name: p.name,
                    profilePicture: p.profilePicture
                })),
                createdAt: meeting.metadata.createdAt
            }));

            console.log(`✅ Loaded ${inMemoryFormat.length} meetings from database`);
            return inMemoryFormat;

        } catch (error) {
            console.error('❌ Error loading meetings from database:', error);
            throw error;
        }
    }

    // Format meeting for API response
    formatMeetingForResponse(meeting) {
        return {
            id: meeting.meetingId,
            meetingId: meeting.meetingId,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            schedulerEmail: meeting.schedulerEmail,
            scheduler: {
                email: meeting.schedulerEmail,
                name: meeting.schedulerName,
                profilePicture: meeting.schedulerProfilePicture
            },
            participants: meeting.participants.map(p => ({
                email: p.email,
                name: p.name,
                profilePicture: p.profilePicture,
                status: p.status,
                respondedAt: p.respondedAt
            })),
            status: meeting.status,
            meetingLink: meeting.meetingLink,
            timezone: meeting.timezone,
            totalParticipants: meeting.participants.length + 1,
            isUpcoming: meeting.isUpcoming,
            dateTimeObject: meeting.dateTimeObject,
            metadata: {
                createdAt: meeting.metadata.createdAt,
                updatedAt: meeting.metadata.updatedAt,
                version: meeting.metadata.version,
                createdBy: meeting.metadata.createdBy
            },
            createdAt: meeting.metadata.createdAt // For backward compatibility
        };
    }

    // Get meeting statistics
    async getMeetingStats(userEmail = null) {
        try {
            const query = userEmail ? {
                $or: [
                    { schedulerEmail: userEmail.toLowerCase() },
                    { 'participants.email': userEmail.toLowerCase() }
                ]
            } : {};

            const [
                totalMeetings,
                upcomingMeetings,
                completedMeetings,
                cancelledMeetings
            ] = await Promise.all([
                Meeting.countDocuments(query),
                Meeting.countDocuments({ ...query, status: 'scheduled' }),
                Meeting.countDocuments({ ...query, status: 'completed' }),
                Meeting.countDocuments({ ...query, status: 'cancelled' })
            ]);

            return {
                total: totalMeetings,
                upcoming: upcomingMeetings,
                completed: completedMeetings,
                cancelled: cancelledMeetings,
                userScope: userEmail ? 'user' : 'global'
            };

        } catch (error) {
            console.error('❌ Error fetching meeting stats:', error);
            throw error;
        }
    }
}
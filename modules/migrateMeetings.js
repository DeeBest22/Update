// scripts/migrateMeetings.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Meeting from '../modules/meetingModel.js';
import { User } from '../modules/auth.js';

// Load environment variables
dotenv.config();

// Sample meetings data (if you have any existing meetings to migrate)
const sampleMeetings = [
    {
        title: "Weekly Team Standup",
        description: "Regular team sync meeting to discuss progress and blockers",
        date: "2025-08-20",
        time: "09:00",
        duration: 30,
        schedulerEmail: "john.doe@company.com",
        participants: [
            { email: "jane.smith@company.com", name: "Jane Smith" },
            { email: "bob.wilson@company.com", name: "Bob Wilson" }
        ]
    },
    {
        title: "Product Planning Session",
        description: "Planning session for Q4 product roadmap",
        date: "2025-08-22",
        time: "14:00",
        duration: 120,
        schedulerEmail: "jane.smith@company.com",
        participants: [
            { email: "john.doe@company.com", name: "John Doe" },
            { email: "alice.johnson@company.com", name: "Alice Johnson" }
        ]
    }
];

// Helper function to get user profile picture
function getUserProfilePicture(email) {
    const name = email.split('@')[0];
    const initials = name.split(/[._]/).map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=64`;
}

// Helper function to get or create user
async function getOrCreateUser(email, name = null) {
    try {
        let user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user && name) {
            // Create a basic user entry if it doesn't exist
            const [firstName, ...lastNameParts] = name.split(' ');
            const lastName = lastNameParts.join(' ') || 'User';
            
            user = new User({
                firstName,
                lastName,
                email: email.toLowerCase(),
                authProvider: 'local',
                isVerified: false // Will be verified when they actually sign up
            });
            
            await user.save();
            console.log(`Created placeholder user: ${email}`);
        }
        
        return user;
    } catch (error) {
        console.error(`Error getting/creating user ${email}:`, error);
        return null;
    }
}

// Migration function
async function migrateMeetings() {
    try {
        console.log('🚀 Starting meeting migration...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videocall');
        console.log('✅ Connected to MongoDB');
        
        // Check if there are already meetings in the database
        const existingMeetingsCount = await Meeting.countDocuments();
        console.log(`📊 Found ${existingMeetingsCount} existing meetings in database`);
        
        if (existingMeetingsCount > 0) {
            console.log('⚠️  Database already contains meetings. Skipping migration.');
            console.log('If you want to force migration, please clear the meetings collection first.');
            process.exit(0);
        }
        
        // Migrate sample meetings
        let migratedCount = 0;
        let errorCount = 0;
        
        for (const meetingData of sampleMeetings) {
            try {
                console.log(`📝 Processing meeting: ${meetingData.title}`);
                
                // Get or create scheduler user
                const schedulerName = meetingData.schedulerEmail.split('@')[0]
                    .replace(/[._]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                
                const schedulerUser = await getOrCreateUser(meetingData.schedulerEmail, schedulerName);
                
                if (!schedulerUser) {
                    console.error(`❌ Could not create scheduler user: ${meetingData.schedulerEmail}`);
                    errorCount++;
                    continue;
                }
                
                // Process participants
                const processedParticipants = [];
                
                for (const participant of meetingData.participants) {
                    const participantUser = await getOrCreateUser(participant.email, participant.name);
                    
                    processedParticipants.push({
                        email: participant.email.toLowerCase(),
                        name: participant.name,
                        profilePicture: getUserProfilePicture(participant.email),
                        status: 'invited'
                    });
                }
                
                // Create meeting document
                const meeting = new Meeting({
                    title: meetingData.title,
                    description: meetingData.description,
                    date: meetingData.date,
                    time: meetingData.time,
                    duration: meetingData.duration,
                    scheduler: {
                        userId: schedulerUser._id,
                        email: schedulerUser.email,
                        name: `${schedulerUser.firstName} ${schedulerUser.lastName}`,
                        profilePicture: schedulerUser.profilePicture || getUserProfilePicture(schedulerUser.email)
                    },
                    participants: processedParticipants,
                    status: 'scheduled'
                });
                
                await meeting.save();
                migratedCount++;
                
                console.log(`✅ Migrated: ${meeting.title} (ID: ${meeting._id})`);
                
            } catch (error) {
                console.error(`❌ Error migrating meeting "${meetingData.title}":`, error);
                errorCount++;
            }
        }
        
        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${migratedCount} meetings`);
        console.log(`❌ Errors: ${errorCount} meetings`);
        
        if (migratedCount > 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log('You can now restart your server and the meetings will persist.');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        // Close database connection
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Initialize database connection function
async function initializeDatabase() {
    try {
        console.log('🗄️  Initializing database for meetings...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videocall');
        console.log('✅ Connected to MongoDB');
        
        // Create indexes for better performance
        await Meeting.collection.createIndex({ 'scheduler.email': 1, status: 1 });
        await Meeting.collection.createIndex({ 'participants.email': 1, status: 1 });
        await Meeting.collection.createIndex({ date: 1, time: 1 });
        await Meeting.collection.createIndex({ status: 1, date: 1, time: 1 });
        
        console.log('✅ Database indexes created');
        
        // Check meeting count
        const meetingCount = await Meeting.countDocuments();
        console.log(`📊 Current meetings in database: ${meetingCount}`);
        
        if (meetingCount === 0) {
            console.log('📝 No meetings found. You can add some sample meetings by running migration.');
        }
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Clear all meetings (for testing purposes)
async function clearMeetings() {
    try {
        console.log('🧹 Clearing all meetings from database...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videocall');
        console.log('✅ Connected to MongoDB');
        
        const deleteResult = await Meeting.deleteMany({});
        console.log(`🗑️  Deleted ${deleteResult.deletedCount} meetings`);
        
        console.log('✅ All meetings cleared from database');
        
    } catch (error) {
        console.error('❌ Clear meetings failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Export functions for use in other scripts
export { migrateMeetings, initializeDatabase, clearMeetings };

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'migrate':
            migrateMeetings();
            break;
        case 'init':
            initializeDatabase();
            break;
        case 'clear':
            clearMeetings();
            break;
        default:
            console.log('📋 Available commands:');
            console.log('  npm run migrate-meetings migrate  - Migrate sample meetings to database');
            console.log('  npm run migrate-meetings init     - Initialize database with indexes');
            console.log('  npm run migrate-meetings clear    - Clear all meetings from database');
    }
}
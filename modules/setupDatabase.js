// scripts/setupDatabase.js - Database setup and migration script
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MeetingService } from '../modules/meetingService.js';
import Meeting from '../modules/meetingModel.js';

// Load environment variables
dotenv.config();

// Mock users for the setup
const mockUsers = new Map([
    ['user1@gmail.com', {
        id: 'user1',
        email: 'user1@gmail.com',
        name: 'John Doe',
        profilePicture: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop'
    }],
    ['user2@gmail.com', {
        id: 'user2',
        email: 'user2@gmail.com',
        name: 'Jane Smith',
        profilePicture: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop'
    }],
    ['user3@gmail.com', {
        id: 'user3',
        email: 'user3@gmail.com',
        name: 'Mike Johnson',
        profilePicture: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop'
    }],
    ['user4@gmail.com', {
        id: 'user4',
        email: 'user4@gmail.com',
        name: 'Sarah Wilson',
        profilePicture: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop'
    }]
]);

class DatabaseSetup {
    constructor() {
        this.meetingService = new MeetingService(mockUsers);
    }

    async connectToDatabase() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/videocall';
            
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            
            console.log('✅ Connected to MongoDB');
            console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
            console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
            
            return true;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            return false;
        }
    }

    async checkDatabaseStatus() {
        try {
            const dbStats = await mongoose.connection.db.stats();
            const collections = await mongoose.connection.db.listCollections().toArray();
            
            console.log('\n📊 Database Status:');
            console.log(`  - Database Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  - Collections: ${dbStats.collections}`);
            console.log(`  - Documents: ${dbStats.objects}`);
            console.log(`  - Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
            
            console.log('\n📁 Collections:');
            collections.forEach(collection => {
                console.log(`  - ${collection.name}`);
            });
            
            return true;
        } catch (error) {
            console.error('❌ Error checking database status:', error);
            return false;
        }
    }

    async createIndexes() {
        try {
            console.log('\n🔍 Creating database indexes...');
            
            // Get the Meeting model to create indexes
            const meetingCollection = mongoose.connection.collection('meetings');
            
            // Create indexes for better performance
            await meetingCollection.createIndex({ meetingId: 1 }, { unique: true });
            await meetingCollection.createIndex({ schedulerEmail: 1, 'metadata.createdAt': -1 });
            await meetingCollection.createIndex({ 'participants.email': 1, 'metadata.createdAt': -1 });
            await meetingCollection.createIndex({ date: 1, time: 1 });
            await meetingCollection.createIndex({ status: 1, date: 1 });
            await meetingCollection.createIndex({ 'metadata.createdAt': -1 });
            
            console.log('✅ Database indexes created successfully');
            return true;
        } catch (error) {
            console.error('❌ Error creating indexes:', error);
            return false;
        }
    }

    async seedSampleData() {
        try {
            console.log('\n🌱 Seeding sample meeting data...');
            
            // Check if data already exists
            const existingMeetings = await Meeting.countDocuments();
            if (existingMeetings > 0) {
                console.log(`⚠️ Database already contains ${existingMeetings} meetings. Skipping seed.`);
                return true;
            }
            
            const sampleMeetings = [
                {
                    title: 'Product Strategy Review',
                    description: 'Quarterly review with the product team',
                    date: new Date().toISOString().split('T')[0], // Today
                    time: '14:30',
                    duration: 60,
                    schedulerEmail: 'user1@gmail.com',
                    participants: [
                        { email: 'user2@gmail.com' },
                        { email: 'user3@gmail.com' },
                        { email: 'user4@gmail.com' }
                    ]
                },
                {
                    title: 'Client Presentation',
                    description: 'Presenting Q4 results to stakeholders',
                    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
                    time: '10:00',
                    duration: 90,
                    schedulerEmail: 'user1@gmail.com',
                    participants: [
                        { email: 'user2@gmail.com' },
                        { email: 'user4@gmail.com' }
                    ]
                },
                {
                    title: 'Team Standup',
                    description: 'Daily team synchronization meeting',
                    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
                    time: '09:00',
                    duration: 30,
                    schedulerEmail: 'user2@gmail.com',
                    participants: [
                        { email: 'user1@gmail.com' },
                        { email: 'user3@gmail.com' }
                    ]
                },
                {
                    title: 'Design Review Session',
                    description: 'Review new UI designs and gather feedback',
                    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
                    time: '15:00',
                    duration: 120,
                    schedulerEmail: 'user3@gmail.com',
                    participants: [
                        { email: 'user1@gmail.com' },
                        { email: 'user2@gmail.com' },
                        { email: 'user4@gmail.com' }
                    ]
                }
            ];
            
            let seedCount = 0;
            for (const meetingData of sampleMeetings) {
                try {
                    const meeting = await this.meetingService.createMeeting(meetingData);
                    console.log(`  ✅ Created: ${meeting.title}`);
                    seedCount++;
                } catch (error) {
                    console.error(`  ❌ Failed to create ${meetingData.title}:`, error.message);
                }
            }
            
            console.log(`\n✅ Successfully seeded ${seedCount} sample meetings`);
            return true;
        } catch (error) {
            console.error('❌ Error seeding sample data:', error);
            return false;
        }
    }

    async testDatabaseOperations() {
        try {
            console.log('\n🧪 Testing database operations...');
            
            // Test creating a meeting
            console.log('  Testing meeting creation...');
            const testMeeting = await this.meetingService.createMeeting({
                title: 'Test Meeting',
                description: 'This is a test meeting',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
                time: '16:00',
                duration: 45,
                schedulerEmail: 'user1@gmail.com',
                participants: [{ email: 'user2@gmail.com' }]
            });
            console.log(`    ✅ Created test meeting: ${testMeeting.meetingId}`);
            
            // Test fetching meetings
            console.log('  Testing meeting retrieval...');
            const userMeetings = await this.meetingService.getUserUpcomingMeetings('user1@gmail.com');
            console.log(`    ✅ Retrieved ${userMeetings.length} meetings for user1@gmail.com`);
            
            // Test updating a meeting
            console.log('  Testing meeting update...');
            const updatedMeeting = await this.meetingService.updateMeeting(
                testMeeting.meetingId,
                { title: 'Updated Test Meeting', duration: 60 },
                'user1@gmail.com'
            );
            console.log(`    ✅ Updated meeting: ${updatedMeeting.title}`);
            
            // Test meeting statistics
            console.log('  Testing meeting statistics...');
            const stats = await this.meetingService.getMeetingStats('user1@gmail.com');
            console.log(`    ✅ Stats - Total: ${stats.total}, Upcoming: ${stats.upcoming}`);
            
            // Test deleting the test meeting
            console.log('  Testing meeting deletion...');
            await this.meetingService.deleteMeeting(testMeeting.meetingId, 'user1@gmail.com');
            console.log('    ✅ Deleted test meeting');
            
            console.log('\n✅ All database operations completed successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error testing database operations:', error);
            return false;
        }
    }

    async getMeetingsSummary() {
        try {
            console.log('\n📋 Current Meetings Summary:');
            
            const allMeetings = await this.meetingService.getAllUpcomingMeetings();
            
            if (allMeetings.length === 0) {
                console.log('  No meetings found in database');
                return;
            }
            
            console.log(`  Total upcoming meetings: ${allMeetings.length}\n`);
            
            allMeetings.forEach((meeting, index) => {
                console.log(`  ${index + 1}. ${meeting.title}`);
                console.log(`     📅 Date: ${meeting.date} at ${meeting.time}`);
                console.log(`     👤 Scheduler: ${meeting.scheduler.name} (${meeting.scheduler.email})`);
                console.log(`     👥 Participants: ${meeting.participants.length + 1} total`);
                console.log(`     🆔 ID: ${meeting.meetingId}`);
                console.log('');
            });
            
            // Group by user
            const userMeetingCounts = {};
            allMeetings.forEach(meeting => {
                const email = meeting.scheduler.email;
                userMeetingCounts[email] = (userMeetingCounts[email] || 0) + 1;
                
                meeting.participants.forEach(participant => {
                    userMeetingCounts[participant.email] = (userMeetingCounts[participant.email] || 0) + 1;
                });
            });
            
            console.log('📊 Meetings per user:');
            Object.entries(userMeetingCounts).forEach(([email, count]) => {
                const user = mockUsers.get(email);
                const name = user ? user.name : email;
                console.log(`  ${name} (${email}): ${count} meetings`);
            });
            
        } catch (error) {
            console.error('❌ Error getting meetings summary:', error);
        }
    }

    async cleanup() {
        try {
            await mongoose.connection.close();
            console.log('\n✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database connection:', error);
        }
    }
}

// Main execution function
async function main() {
    console.log('🚀 ConvoSpace Database Setup Tool');
    console.log('==================================\n');
    
    const setup = new DatabaseSetup();
    
    // Connect to database
    const connected = await setup.connectToDatabase();
    if (!connected) {
        console.log('\n❌ Setup failed - could not connect to database');
        process.exit(1);
    }
    
    // Check current status
    await setup.checkDatabaseStatus();
    
    // Create indexes
    await setup.createIndexes();
    
    // Seed sample data
    await setup.seedSampleData();
    
    // Test operations
    await setup.testDatabaseOperations();
    
    // Show current meetings
    await setup.getMeetingsSummary();
    
    // Cleanup
    await setup.cleanup();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your server with: npm start');
    console.log('2. Visit http://localhost:5000/upcoming to see your meetings');
    console.log('3. Visit http://localhost:5000/booking to schedule new meetings');
    console.log('\nNote: All meetings are now persisted in MongoDB and will survive server restarts.');
}

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

export { DatabaseSetup };
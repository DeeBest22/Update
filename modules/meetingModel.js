// modules/meetingModel.js
import mongoose from 'mongoose';

// Meeting Schema
const meetingSchema = new mongoose.Schema({
  // Meeting basic info
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  
  // DateTime info
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:mm
  duration: { type: Number, required: true, min: 15, max: 480 }, // Duration in minutes
  
  // Meeting status
  status: { 
    type: String, 
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'], 
    default: 'scheduled' 
  },
  
  // Organizer info (required)
  scheduler: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    profilePicture: { type: String }
  },
  
  // Participants array
  participants: [{
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['invited', 'accepted', 'declined', 'tentative'], 
      default: 'invited' 
    },
    profilePicture: { type: String },
    joinedAt: { type: Date },
    leftAt: { type: Date }
  }],
  
  // Meeting room info
  meetingId: { type: String, unique: true }, // Unique meeting room ID
  meetingUrl: { type: String }, // Optional: full meeting URL
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Email notification tracking
  emailNotifications: {
    invited: { type: Boolean, default: false },
    reminded: { type: Boolean, default: false },
    cancelled: { type: Boolean, default: false }
  },
  
  // Additional metadata
  timezone: { type: String, default: 'UTC' },
  recurringPattern: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    endDate: { type: String },
    frequency: { type: Number, default: 1 }
  },
  
  // Meeting settings
  settings: {
    allowJoinBeforeHost: { type: Boolean, default: true },
    muteParticipantsOnJoin: { type: Boolean, default: false },
    recordMeeting: { type: Boolean, default: false },
    requirePassword: { type: Boolean, default: false },
    password: { type: String }
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
meetingSchema.index({ 'scheduler.userId': 1, status: 1 });
meetingSchema.index({ 'scheduler.email': 1, status: 1 });
meetingSchema.index({ 'participants.email': 1, status: 1 });
meetingSchema.index({ date: 1, time: 1 });
meetingSchema.index({ status: 1, date: 1, time: 1 });
meetingSchema.index({ meetingId: 1 }, { unique: true, sparse: true });

// Virtual to get meeting date-time as a single Date object
meetingSchema.virtual('dateTime').get(function() {
  return new Date(`${this.date}T${this.time}:00`);
});

// Virtual to check if meeting is upcoming
meetingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const meetingDateTime = this.dateTime;
  return meetingDateTime > now && this.status === 'scheduled';
});

// Virtual to check if meeting is today
meetingSchema.virtual('isToday').get(function() {
  const today = new Date().toDateString();
  const meetingDate = this.dateTime.toDateString();
  return meetingDate === today;
});

// Virtual to get all attendees (scheduler + participants)
meetingSchema.virtual('allAttendees').get(function() {
  return [
    {
      email: this.scheduler.email,
      name: this.scheduler.name,
      profilePicture: this.scheduler.profilePicture,
      role: 'organizer',
      status: 'accepted'
    },
    ...this.participants.map(p => ({
      email: p.email,
      name: p.name,
      profilePicture: p.profilePicture,
      role: 'participant',
      status: p.status
    }))
  ];
});

// Method to generate unique meeting ID
meetingSchema.methods.generateMeetingId = function() {
  if (!this.meetingId) {
    // Generate a unique meeting ID: timestamp + random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.meetingId = `meet-${timestamp}-${random}`;
  }
  return this.meetingId;
};

// Method to check if user is organizer
meetingSchema.methods.isOrganizer = function(userEmail) {
  return this.scheduler.email.toLowerCase() === userEmail.toLowerCase();
};

// Method to check if user is participant
meetingSchema.methods.isParticipant = function(userEmail) {
  return this.participants.some(p => 
    p.email.toLowerCase() === userEmail.toLowerCase()
  );
};

// Method to check if user can access meeting
meetingSchema.methods.canUserAccess = function(userEmail) {
  return this.isOrganizer(userEmail) || this.isParticipant(userEmail);
};

// Method to add participant
meetingSchema.methods.addParticipant = function(participantData) {
  const existingParticipant = this.participants.find(p => 
    p.email.toLowerCase() === participantData.email.toLowerCase()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      email: participantData.email.toLowerCase(),
      name: participantData.name,
      profilePicture: participantData.profilePicture,
      status: participantData.status || 'invited'
    });
  }
  
  return this;
};

// Method to remove participant
meetingSchema.methods.removeParticipant = function(email) {
  this.participants = this.participants.filter(p => 
    p.email.toLowerCase() !== email.toLowerCase()
  );
  return this;
};

// Method to update participant status
meetingSchema.methods.updateParticipantStatus = function(email, status) {
  const participant = this.participants.find(p => 
    p.email.toLowerCase() === email.toLowerCase()
  );
  
  if (participant) {
    participant.status = status;
  }
  
  return this;
};

// Static method to find user's meetings
meetingSchema.statics.findUserMeetings = function(userEmail, status = 'scheduled') {
  return this.find({
    $or: [
      { 'scheduler.email': userEmail.toLowerCase() },
      { 'participants.email': userEmail.toLowerCase() }
    ],
    status: status
  }).sort({ date: 1, time: 1 });
};

// Static method to find upcoming meetings for user
meetingSchema.statics.findUpcomingMeetings = function(userEmail) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentTime = now.toTimeString().substr(0, 5); // HH:mm format
  
  return this.find({
    $or: [
      { 'scheduler.email': userEmail.toLowerCase() },
      { 'participants.email': userEmail.toLowerCase() }
    ],
    status: 'scheduled',
    $or: [
      { date: { $gt: today } },
      { 
        date: today,
        time: { $gt: currentTime }
      }
    ]
  }).sort({ date: 1, time: 1 });
};

// Static method to find meetings by date range
meetingSchema.statics.findMeetingsByDateRange = function(userEmail, startDate, endDate) {
  return this.find({
    $or: [
      { 'scheduler.email': userEmail.toLowerCase() },
      { 'participants.email': userEmail.toLowerCase() }
    ],
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1, time: 1 });
};

// Pre-save middleware to update the updatedAt field
meetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate meeting ID if not exists
  if (!this.meetingId) {
    this.generateMeetingId();
  }
  
  next();
});

// Pre-save middleware to validate meeting datetime
meetingSchema.pre('save', function(next) {
  const meetingDateTime = new Date(`${this.date}T${this.time}:00`);
  const now = new Date();
  
  // Only validate for new meetings or when date/time is changed
  if (this.isNew || this.isModified('date') || this.isModified('time')) {
    if (meetingDateTime <= now) {
      const error = new Error('Meeting date and time must be in the future');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  
  next();
});

// Export the model
const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
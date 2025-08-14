import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:mm
  duration: { type: Number, required: true },
  schedulerEmail: { type: String, required: true, lowercase: true },
  participants: [{
    email: { type: String, required: true, lowercase: true },
    name: String,
    profilePicture: String
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Meeting', meetingSchema, 'meetings');
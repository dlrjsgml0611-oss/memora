import mongoose, { Schema } from 'mongoose';
import { IUser } from '@/types';

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    profile: {
      avatar: { type: String, default: '' },
      timezone: { type: String, default: 'UTC' },
      learningGoals: [{ type: String }],
    },
    preferences: {
      dailyReviewTarget: { type: Number, default: 20 },
      preferredAI: {
        type: String,
        enum: ['openai', 'claude', 'gemini'],
        default: 'openai',
      },
      notificationsEnabled: { type: Boolean, default: true },
    },
    stats: {
      totalStudyTime: { type: Number, default: 0 },
      cardsReviewed: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      sevenDayRetention: { type: Number, default: 0 },
      weeklyActiveDays: { type: Number, default: 0 },
      lastStudiedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

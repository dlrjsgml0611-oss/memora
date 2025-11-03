import mongoose, { Schema } from 'mongoose';
import { IStudySession } from '@/types';

const StudySessionSchema = new Schema<IStudySession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['review', 'learn', 'quiz'],
      required: true,
    },
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: 'Curriculum',
    },
    cardsReviewed: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
StudySessionSchema.index({ userId: 1, startedAt: -1 });

export default mongoose.models.StudySession ||
  mongoose.model<IStudySession>('StudySession', StudySessionSchema);

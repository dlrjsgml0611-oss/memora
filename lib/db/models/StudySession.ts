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
      enum: ['review', 'learn', 'quiz', 'exam'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['review', 'exam'],
      default: 'review',
    },
    source: {
      type: String,
      enum: ['today-mission', 'manual', 'exam'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: 'Curriculum',
    },
    cardQueue: [{
      type: Schema.Types.ObjectId,
      ref: 'Flashcard',
    }],
    reviewedCardIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Flashcard',
    }],
    sessionMeta: {
      maxCards: { type: Number, min: 1, max: 500 },
      maxNew: { type: Number, min: 0, max: 200 },
      weaknessBoost: { type: Number, min: 0, max: 200 },
      timeLimitMinutes: { type: Number, min: 1, max: 300 },
      filters: {
        conceptId: { type: String },
        tag: { type: String },
      },
    },
    metrics: {
      totalCards: { type: Number, default: 0, min: 0 },
      reviewedCards: { type: Number, default: 0, min: 0 },
      correctCount: { type: Number, default: 0, min: 0 },
      incorrectCount: { type: Number, default: 0, min: 0 },
      avgResponseTime: { type: Number, default: 0, min: 0 },
      accuracy: { type: Number, default: 0, min: 0, max: 100 },
    },
    weaknessTags: [{
      type: String,
      trim: true,
    }],
    completionReason: {
      type: String,
      enum: ['completed', 'user-exit', 'timeout', 'abandoned'],
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
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
StudySessionSchema.index({ userId: 1, startedAt: -1 });
StudySessionSchema.index({ userId: 1, status: 1, startedAt: -1 });
StudySessionSchema.index({ userId: 1, type: 1, startedAt: -1 });

export default mongoose.models.StudySession ||
  mongoose.model<IStudySession>('StudySession', StudySessionSchema);

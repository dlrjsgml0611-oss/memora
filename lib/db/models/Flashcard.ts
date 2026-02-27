import mongoose, { Schema } from 'mongoose';
import { IFlashcard } from '@/types';

const FlashcardSchema = new Schema<IFlashcard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conceptId: {
      type: Schema.Types.ObjectId,
      ref: 'Concept',
    },
    type: {
      type: String,
      enum: ['basic', 'cloze', 'image', 'code'],
      default: 'basic',
    },
    front: {
      type: String,
      required: [true, 'Front content is required'],
    },
    back: {
      type: String,
      required: [true, 'Back content is required'],
    },
    hint: {
      type: String,
      default: '',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    lastErrorType: {
      type: String,
      enum: ['concept', 'careless', 'memory', 'unknown'],
      default: undefined,
    },
    mistakeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    examWeight: {
      type: Number,
      default: 1,
      min: 0,
    },
    srs: {
      ease: { type: Number, default: 2.5 },
      interval: { type: Number, default: 0 },
      repetitions: { type: Number, default: 0 },
      nextReview: { type: Date, default: Date.now },
      lastReviewed: { type: Date },
      state: {
        type: String,
        enum: ['new', 'learning', 'review', 'relearning'],
        default: 'new',
      },
    },
    stats: {
      totalReviews: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 },
      incorrectCount: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FlashcardSchema.index({ userId: 1, 'srs.nextReview': 1 });
FlashcardSchema.index({ conceptId: 1 });
FlashcardSchema.index({ userId: 1, tags: 1 });
FlashcardSchema.index({ userId: 1, isFavorite: 1 });
FlashcardSchema.index({ userId: 1, examWeight: -1, mistakeCount: -1 });

export default mongoose.models.Flashcard ||
  mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);

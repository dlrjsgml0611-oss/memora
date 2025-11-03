import mongoose, { Schema } from 'mongoose';
import { IReview } from '@/types';

const ReviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    flashcardId: {
      type: Schema.Types.ObjectId,
      ref: 'Flashcard',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
      min: 0,
    },
    previousInterval: {
      type: Number,
      required: true,
    },
    newInterval: {
      type: Number,
      required: true,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
ReviewSchema.index({ userId: 1, reviewedAt: -1 });
ReviewSchema.index({ flashcardId: 1, reviewedAt: -1 });

export default mongoose.models.Review ||
  mongoose.model<IReview>('Review', ReviewSchema);

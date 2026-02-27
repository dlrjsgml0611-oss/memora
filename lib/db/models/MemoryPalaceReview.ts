import mongoose, { Schema } from 'mongoose';
import { IMemoryPalaceReview } from '@/types';

const MemoryPalaceReviewSchema = new Schema<IMemoryPalaceReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    palaceId: {
      type: Schema.Types.ObjectId,
      ref: 'MemoryPalace',
      required: true,
      index: true,
    },
    palaceTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    totalItems: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    correctItems: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
    },
    wrongItems: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    durationSec: {
      type: Number,
      required: true,
      min: 1,
      max: 86400,
    },
    finishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MemoryPalaceReviewSchema.index({ userId: 1, finishedAt: -1 });
MemoryPalaceReviewSchema.index({ userId: 1, palaceId: 1, finishedAt: -1 });

export default mongoose.models.MemoryPalaceReview ||
  mongoose.model<IMemoryPalaceReview>('MemoryPalaceReview', MemoryPalaceReviewSchema);

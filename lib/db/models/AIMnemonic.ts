import mongoose, { Schema } from 'mongoose';
import { IAIMnemonic } from '@/types';

const AIMnemonicSchema = new Schema<IAIMnemonic>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      enum: ['history', 'math', 'science', 'english', 'custom'],
      required: true,
      index: true,
    },
    technique: {
      type: String,
      enum: ['sequence', 'story', 'acronym', 'association'],
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mnemonic: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['openai', 'claude', 'gemini'],
    },
  },
  {
    timestamps: true,
  }
);

AIMnemonicSchema.index({ userId: 1, createdAt: -1 });

const AIMnemonic =
  mongoose.models.AIMnemonic ||
  mongoose.model<IAIMnemonic>('AIMnemonic', AIMnemonicSchema);

export default AIMnemonic;

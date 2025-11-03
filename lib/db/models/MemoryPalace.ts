import mongoose, { Schema } from 'mongoose';

const MemoryPalaceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: 'Curriculum',
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    rooms: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MemoryPalaceSchema.index({ userId: 1, createdAt: -1 });

export const MemoryPalace = mongoose.models.MemoryPalace ||
  mongoose.model('MemoryPalace', MemoryPalaceSchema);

import mongoose, { Schema } from 'mongoose';

const MindmapSchema = new Schema(
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
    structure: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MindmapSchema.index({ userId: 1, createdAt: -1 });

export const Mindmap = mongoose.models.Mindmap ||
  mongoose.model('Mindmap', MindmapSchema);

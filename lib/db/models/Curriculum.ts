import mongoose, { Schema } from 'mongoose';
import { ICurriculum } from '@/types';

const TopicSchema = new Schema(
  {
    topicId: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    conceptIds: [{ type: Schema.Types.ObjectId, ref: 'Concept' }],
  },
  { _id: false }
);

const ModuleSchema = new Schema(
  {
    moduleId: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    estimatedHours: { type: Number, default: 0 },
    topics: [TopicSchema],
  },
  { _id: false }
);

const CurriculumSchema = new Schema<ICurriculum>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    aiModel: {
      type: String,
      required: true,
    },
    structure: [ModuleSchema],
    progress: {
      completedTopics: [{ type: String }],
      currentModule: { type: String, default: '' },
      overallPercentage: { type: Number, default: 0, min: 0, max: 100 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CurriculumSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Curriculum ||
  mongoose.model<ICurriculum>('Curriculum', CurriculumSchema);

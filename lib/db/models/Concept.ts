import mongoose, { Schema } from 'mongoose';
import { IConcept } from '@/types';

const ConceptSchema = new Schema<IConcept>(
  {
    curriculumId: {
      type: Schema.Types.ObjectId,
      ref: 'Curriculum',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      text: { type: String, required: true },
      code: { type: String, default: '' },
      images: [{ type: String }],
      references: [{ type: String }],
    },
    aiGenerated: {
      model: { type: String },
      prompt: { type: String },
      generatedAt: { type: Date, default: Date.now },
    },
    tags: [{ type: String, trim: true }],
    difficulty: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    relatedConcepts: [{ type: Schema.Types.ObjectId, ref: 'Concept' }],
  },
  {
    timestamps: true,
  }
);

// Indexes
ConceptSchema.index({ tags: 1 });

export const Concept = mongoose.models.Concept ||
  mongoose.model('Concept', ConceptSchema);

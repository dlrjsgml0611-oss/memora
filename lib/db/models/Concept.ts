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
    topicId: {
      type: String,
      trim: true,
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
      highlights: [
        {
          text: { type: String, trim: true, maxlength: 400 },
          weight: { type: Number, enum: [1, 2, 3], default: 2 },
          reason: { type: String, trim: true, maxlength: 240 },
        },
      ],
      visuals: [
        {
          id: { type: String, trim: true, maxlength: 120 },
          prompt: { type: String, trim: true, maxlength: 2000 },
          url: { type: String, trim: true, maxlength: 4000 },
          alt: { type: String, trim: true, maxlength: 300 },
          provider: { type: String, enum: ['openai', 'claude', 'gemini'] },
          generatedAt: { type: Date, default: Date.now },
          cacheKey: { type: String, trim: true, maxlength: 128, index: true },
          width: { type: Number, min: 64, max: 4096 },
          height: { type: Number, min: 64, max: 4096 },
        },
      ],
      renderHints: {
        summary: { type: String, trim: true, maxlength: 500 },
        readingLevel: { type: String, enum: ['easy', 'normal', 'dense'], default: 'normal' },
        lastEnrichedAt: { type: Date },
      },
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
ConceptSchema.index({ curriculumId: 1, topicId: 1 });

export const Concept = mongoose.models.Concept ||
  mongoose.model('Concept', ConceptSchema);

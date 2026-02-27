import mongoose, { Schema } from 'mongoose';

const ConceptVisualAssetSchema = new Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: 'image/webp',
    },
    data: {
      type: Buffer,
      required: true,
    },
    width: {
      type: Number,
      min: 64,
      max: 4096,
    },
    height: {
      type: Number,
      min: 64,
      max: 4096,
    },
    provider: {
      type: String,
      enum: ['openai', 'claude', 'gemini'],
      default: 'openai',
    },
  },
  {
    timestamps: true,
  }
);

ConceptVisualAssetSchema.index({ createdAt: -1 });

export const ConceptVisualAsset = mongoose.models.ConceptVisualAsset ||
  mongoose.model('ConceptVisualAsset', ConceptVisualAssetSchema);

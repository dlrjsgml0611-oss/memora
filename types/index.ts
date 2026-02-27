import { Document, Types } from 'mongoose';
import type {
  CurriculumLearningMetaV2,
  CurriculumModuleV2,
  CurriculumQualityV2,
  LegacyMemoryRoom,
} from './learning-space';

// ==================== User Types ====================
export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  profile: {
    avatar?: string;
    timezone: string;
    learningGoals: string[];
  };
  preferences: {
    dailyReviewTarget: number;
    preferredAI: 'openai' | 'claude' | 'gemini';
    notificationsEnabled: boolean;
  };
  stats: {
    totalStudyTime: number;
    cardsReviewed: number;
    currentStreak: number;
    longestStreak: number;
    sevenDayRetention: number;
    weeklyActiveDays: number;
    lastStudiedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Curriculum Types ====================
export interface ITopic {
  topicId: string;
  title: string;
  order: number;
  conceptIds: Types.ObjectId[];
}

export interface IModule {
  moduleId: string;
  title: string;
  order: number;
  estimatedHours: number;
  topics: ITopic[];
}

export interface ICurriculum extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  aiModel: string;
  structure: IModule[];
  schemaVersion?: 'v2';
  structureV2?: CurriculumModuleV2[];
  learningMeta?: CurriculumLearningMetaV2;
  quality?: CurriculumQualityV2;
  progress: {
    completedTopics: string[];
    currentModule: string;
    overallPercentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Concept Types ====================
export interface IConcept extends Document {
  curriculumId: Types.ObjectId;
  topicId?: string;
  title: string;
  content: {
    text: string;
    code?: string;
    images: string[];
    references: string[];
    highlights?: Array<{
      text: string;
      weight: 1 | 2 | 3;
      reason?: string;
    }>;
    visuals?: Array<{
      id: string;
      prompt: string;
      url: string;
      alt: string;
      provider: 'openai' | 'claude' | 'gemini';
      generatedAt: Date;
      cacheKey?: string;
      width?: number;
      height?: number;
    }>;
    renderHints?: {
      summary?: string;
      readingLevel?: 'easy' | 'normal' | 'dense';
      lastEnrichedAt?: Date;
    };
  };
  aiGenerated: {
    model: string;
    prompt: string;
    generatedAt: Date;
  };
  tags: string[];
  difficulty: number;
  relatedConcepts: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Flashcard Types ====================
export interface ISRSData {
  ease: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed?: Date;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export interface IFlashcardStats {
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  averageResponseTime: number;
}

export interface IFlashcard extends Document {
  userId: Types.ObjectId;
  conceptId?: Types.ObjectId;
  type: 'basic' | 'cloze' | 'image' | 'code';
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  isFavorite?: boolean;
  lastErrorType?: 'concept' | 'careless' | 'memory' | 'unknown';
  mistakeCount?: number;
  examWeight?: number;
  srs: ISRSData;
  stats: IFlashcardStats;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Review Types ====================
export interface IReview extends Document {
  userId: Types.ObjectId;
  flashcardId: Types.ObjectId;
  sessionId?: Types.ObjectId;
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  responseTime: number;
  aiScore?: number;
  recommendedRating?: 1 | 2 | 3 | 4;
  finalRatingDiff?: number;
  previousInterval: number;
  newInterval: number;
  reviewedAt: Date;
}

// ==================== AI Mnemonic Types ====================
export interface IAIMnemonic extends Document {
  userId: Types.ObjectId;
  subject: 'history' | 'math' | 'science' | 'english' | 'custom';
  technique: 'sequence' | 'story' | 'acronym' | 'association';
  content: string;
  mnemonic: string;
  provider?: 'openai' | 'claude' | 'gemini';
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Mindmap Types ====================
export interface IMindmapNode {
  nodeId: string;
  conceptId?: Types.ObjectId;
  label: string;
  position: { x: number; y: number };
  color: string;
  size: number;
}

export interface IMindmapEdge {
  edgeId: string;
  source: string;
  target: string;
  label?: string;
  strength: number;
}

export interface IMindmap extends Document {
  userId: Types.ObjectId;
  curriculumId?: Types.ObjectId;
  title: string;
  nodes: IMindmapNode[];
  edges: IMindmapEdge[];
  layout: 'force' | 'tree' | 'radial';
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Memory Palace Types ====================
export interface IMemoryLocation {
  locationId: string;
  position: { x: number; y: number; z: number };
  conceptId?: Types.ObjectId;
  visualCue: {
    image: string;
    description: string;
    aiGenerated: boolean;
  };
  order: number;
}

export interface IMemoryPalace extends Document {
  userId: Types.ObjectId;
  curriculumId?: Types.ObjectId;
  title: string;
  rooms: LegacyMemoryRoom[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMemoryPalaceReview extends Document {
  userId: Types.ObjectId;
  palaceId: Types.ObjectId;
  palaceTitle: string;
  totalItems: number;
  correctItems: number;
  wrongItems: number;
  accuracy: number;
  durationSec: number;
  finishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Study Session Types ====================
export interface IStudySession extends Document {
  userId: Types.ObjectId;
  type: 'review' | 'learn' | 'quiz' | 'exam';
  mode: 'review' | 'exam';
  source: 'today-mission' | 'manual' | 'exam';
  status: 'active' | 'completed' | 'abandoned';
  curriculumId?: Types.ObjectId;
  cardQueue: Types.ObjectId[];
  reviewedCardIds: Types.ObjectId[];
  sessionMeta: {
    maxCards?: number;
    maxNew?: number;
    weaknessBoost?: number;
    timeLimitMinutes?: number;
    filters?: {
      conceptId?: string;
      tag?: string;
    };
  };
  metrics: {
    totalCards: number;
    reviewedCards: number;
    correctCount: number;
    incorrectCount: number;
    avgResponseTime: number;
    accuracy: number;
  };
  weaknessTags: string[];
  completionReason?: 'completed' | 'user-exit' | 'timeout' | 'abandoned';
  cardsReviewed: number; // legacy mirror of metrics.reviewedCards
  duration: number;
  accuracy: number;
  startedAt: Date;
  completedAt?: Date;
}

// ==================== API Types ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

// ==================== Auth Types ====================
export interface JWTPayload {
  userId: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export * from './learning-space';

import { Document, Types } from 'mongoose';

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
  title: string;
  content: {
    text: string;
    code?: string;
    images: string[];
    references: string[];
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
  srs: ISRSData;
  stats: IFlashcardStats;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Review Types ====================
export interface IReview extends Document {
  userId: Types.ObjectId;
  flashcardId: Types.ObjectId;
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  responseTime: number;
  previousInterval: number;
  newInterval: number;
  reviewedAt: Date;
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
  type: 'room' | 'building' | 'path' | 'custom';
  backgroundImage?: string;
  locations: IMemoryLocation[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Study Session Types ====================
export interface IStudySession extends Document {
  userId: Types.ObjectId;
  type: 'review' | 'learn' | 'quiz';
  curriculumId?: Types.ObjectId;
  cardsReviewed: number;
  duration: number;
  accuracy: number;
  startedAt: Date;
  completedAt: Date;
}

// ==================== API Types ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

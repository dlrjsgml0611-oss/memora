import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username cannot exceed 50 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Curriculum schemas
export const createCurriculumSchema = z.object({
  goal: z.string().min(10, 'Please provide a detailed learning goal'),
  subject: z.string().min(1, 'Subject is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  aiModel: z.enum(['openai', 'claude', 'gemini']).optional(),
});

export const updateCurriculumProgressSchema = z.object({
  topicId: z.string().min(1, 'Topic ID is required'),
  completed: z.boolean(),
});

// Flashcard schemas
export const createFlashcardSchema = z.object({
  front: z.string().min(1, 'Front content is required'),
  back: z.string().min(1, 'Back content is required'),
  hint: z.string().optional(),
  type: z.enum(['basic', 'cloze', 'image', 'code']).optional(),
  conceptId: z.string().optional(),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: z.string().min(1, 'Flashcard ID is required'),
  rating: z.number().min(1).max(4),
  responseTime: z.number().min(0),
  sessionId: z.string().optional(),
  aiScore: z.number().min(0).max(100).optional(),
  recommendedRating: z.number().int().min(1).max(4).optional(),
  errorType: z.enum(['concept', 'careless', 'memory', 'unknown']).optional(),
});

export const createReviewSessionSchema = z.object({
  mode: z.enum(['review', 'exam']).default('review'),
  source: z.enum(['today-mission', 'manual', 'exam']).default('manual'),
  maxCards: z.number().int().min(1).max(200).default(20),
  maxNew: z.number().int().min(0).max(100).default(10),
  weaknessBoost: z.number().int().min(0).max(100).default(3),
  conceptId: z.string().optional(),
  tag: z.string().optional(),
});

export const answerReviewSessionSchema = z.object({
  flashcardId: z.string().min(1, 'Flashcard ID is required'),
  rating: z.number().int().min(1).max(4),
  responseTime: z.number().min(0),
  aiScore: z.number().min(0).max(100).optional(),
  recommendedRating: z.number().int().min(1).max(4).optional(),
  errorType: z.enum(['concept', 'careless', 'memory', 'unknown']).optional(),
});

export const createExamSessionSchema = z.object({
  count: z.number().int().min(5).max(200).default(30),
  timeLimitMinutes: z.number().int().min(5).max(300).default(45),
  conceptId: z.string().optional(),
  tag: z.string().optional(),
});

// Mindmap schemas
type MindmapNodeInput = {
  id: string;
  name: string;
  image?: string;
  fx?: number;
  fy?: number;
  children?: MindmapNodeInput[];
};

const mindmapNodeSchema: z.ZodType<MindmapNodeInput> = z.lazy(() =>
  z.object({
    id: z.string().min(1, 'Node id is required').max(120),
    name: z.string().min(1, 'Node name is required').max(200),
    image: z.string().max(2000).optional(),
    fx: z.number().finite().optional(),
    fy: z.number().finite().optional(),
    children: z.array(mindmapNodeSchema).max(120).optional(),
  })
);

const mindmapV2NodeSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  image: z.string().max(2000).optional(),
  parentId: z.string().max(120).nullable().optional(),
  position: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .optional(),
  depth: z.number().int().min(0).max(20).optional(),
});

const mindmapV2EdgeSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  sourceId: z.string().min(1).max(120),
  targetId: z.string().min(1).max(120),
  label: z.string().max(200).optional(),
  strength: z.number().min(0).max(1).optional(),
});

const mindmapV2Schema = z.object({
  version: z.literal('v2').optional(),
  rootNodeId: z.string().min(1).max(120),
  nodes: z.array(mindmapV2NodeSchema).min(1).max(500),
  edges: z.array(mindmapV2EdgeSchema).max(1500).optional(),
  layout: z
    .object({
      type: z.enum(['radial', 'tree', 'horizontal', 'force']).default('radial'),
    })
    .optional(),
});

export const createMindmapSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    structure: mindmapNodeSchema.optional(),
    mindmap: mindmapV2Schema.optional(),
  })
  .refine((value) => Boolean(value.structure || value.mindmap), {
    message: 'Either structure or mindmap is required',
    path: ['structure'],
  });

export const updateMindmapSchema = z
  .object({
    structure: mindmapNodeSchema.optional(),
    mindmap: mindmapV2Schema.optional(),
  })
  .refine((value) => Boolean(value.structure || value.mindmap), {
    message: 'Either structure or mindmap is required',
    path: ['structure'],
  });

export const generateFromConceptSchema = z.object({
  conceptTitle: z.string().min(1, 'Concept title is required').max(200),
  conceptContent: z.string().min(1, 'Concept content is required').max(30000),
});

// Memory Palace schemas
const memoryItemSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  content: z.string().min(1, 'Memory item content is required').max(2000),
  position: z
    .object({
      x: z.number().finite().min(0).max(100),
      y: z.number().finite().min(0).max(100),
    })
    .optional(),
  image: z.string().max(2000).optional(),
  shape: z.enum(['box', 'sphere', 'cylinder', 'pyramid', 'card', 'cube']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  color: z.string().min(3).max(20).optional(),
  height: z.number().finite().min(0.5).max(5).optional(),
});

const memoryRoomSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  name: z.string().min(1, 'Room name is required').max(120),
  description: z.string().max(1000).optional(),
  color: z.string().min(3).max(20).optional(),
  items: z.array(memoryItemSchema).max(120).optional(),
});

const legacyMemoryRoomSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  name: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().min(3).max(20).optional(),
  items: z.array(memoryItemSchema).max(120).optional(),
});

const palaceAnchorV2Schema = z.object({
  id: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(2000),
  image: z.string().max(2000).optional(),
  position: z.object({
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
    z: z.number().finite().min(0).max(10).optional(),
  }),
  style: z.object({
    shape: z.enum(['box', 'sphere', 'cylinder', 'pyramid', 'card']),
    size: z.enum(['small', 'medium', 'large']),
    color: z.string().min(3).max(20),
    height: z.number().finite().min(0.5).max(5).optional(),
  }),
  mnemonic: z
    .object({
      cue: z.string().max(500).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
    })
    .optional(),
});

const palaceRoomV2Schema = z.object({
  id: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  themeColor: z.string().min(3).max(20).optional(),
  anchors: z.array(palaceAnchorV2Schema).max(160).default([]),
});

const palaceV2Schema = z.object({
  version: z.literal('v2').optional(),
  rooms: z.array(palaceRoomV2Schema).min(1).max(50),
});

export const memoryRoomsSchema = z.union([
  z.array(memoryRoomSchema).min(1).max(50),
  legacyMemoryRoomSchema,
]);

export const createMemoryPalaceSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    rooms: memoryRoomsSchema.optional(),
    palace: palaceV2Schema.optional(),
  })
  .refine((value) => Boolean(value.rooms || value.palace), {
    message: 'Either rooms or palace is required',
    path: ['rooms'],
  });

export const updateMemoryPalaceSchema = z
  .object({
    rooms: memoryRoomsSchema.optional(),
    palace: palaceV2Schema.optional(),
  })
  .refine((value) => Boolean(value.rooms || value.palace), {
    message: 'Either rooms or palace is required',
    path: ['rooms'],
  });

export const createConceptSchema = z.object({
  curriculumId: z.string().min(1, 'Curriculum ID is required'),
  topicId: z.string().min(1).optional(),
  topicTitle: z.string().min(1, 'Topic title is required').max(200),
  aiModel: z.string().min(1).max(40).optional(),
  mode: z.enum(['encyclopedia', 'conversational']).optional(),
});

export const generateConceptFlashcardsSchema = z.object({
  count: z.number().int().min(1).max(20).default(5),
});

export const createMemoryPalaceReviewSchema = z
  .object({
    palaceId: z.string().min(1, 'Palace ID is required'),
    palaceTitle: z.string().min(1, 'Palace title is required').max(200),
    totalItems: z.number().int().min(1).max(10000),
    correctItems: z.number().int().min(0).max(10000),
    wrongItems: z.number().int().min(0).max(10000),
    accuracy: z.number().min(0).max(100),
    durationSec: z.number().int().min(1).max(86400),
    finishedAt: z.coerce.date().optional(),
  })
  .refine((data) => data.correctItems + data.wrongItems === data.totalItems, {
    message: 'correctItems + wrongItems must equal totalItems',
    path: ['totalItems'],
  });

// Helper function to validate data
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Helper function for safe validation
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

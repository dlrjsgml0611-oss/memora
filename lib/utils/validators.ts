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
});

// Mindmap schemas
export const createMindmapSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  curriculumId: z.string().optional(),
  layout: z.enum(['force', 'tree', 'radial']).optional(),
});

// Memory Palace schemas
export const createMemoryPalaceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['room', 'building', 'path', 'custom']).optional(),
  curriculumId: z.string().optional(),
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

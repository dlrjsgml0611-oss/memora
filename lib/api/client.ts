import { useAuthStore } from '@/store/authStore';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type {
  CurriculumDocumentV2,
  LegacyMemoryRoom,
  LegacyMindMapNode,
  MemoryPalaceDocumentV2,
  MindmapDocumentV2,
  MindmapV2,
  PalaceV2,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || '';

interface RequestOptions extends RequestInit {
  useAuth?: boolean;
}

async function apiRequest<T = ApiResponse<any>>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { useAuth = true, headers: customHeaders, ...fetchOptions } = options;

  const headers = new Headers();
  if (typeof fetchOptions.body !== 'undefined' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (customHeaders) {
    const extraHeaders = new Headers(customHeaders);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: fetchOptions.credentials || 'include',
  });

  // Handle 204 No Content response (e.g., DELETE requests)
  if (response.status === 204) {
    return { success: true } as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && useAuth) {
      useAuthStore.getState().logout();
    }
    const message = data?.message || data?.error || 'Request failed';
    const error = new Error(message) as Error & { code?: string; details?: unknown };
    if (typeof data?.code === 'string') {
      error.code = data.code;
    }
    if (typeof data?.details !== 'undefined') {
      error.details = data.details;
    }
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (email: string, password: string, username: string) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
      useAuth: false,
    }),

  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      useAuth: false,
    }),

  logout: () =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
      useAuth: false,
    }),

  getMe: () => apiRequest('/api/auth/me'),

  updateProfile: (data: any) =>
    apiRequest('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Flashcards
  getFlashcards: (params?: { page?: number; limit?: number; conceptId?: string; search?: string; state?: string; type?: string; favorite?: string; tag?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.conceptId) query.set('conceptId', params.conceptId);
    if (params?.search) query.set('search', params.search);
    if (params?.state) query.set('state', params.state);
    if (params?.type) query.set('type', params.type);
    if (params?.favorite) query.set('favorite', params.favorite);
    if (params?.tag) query.set('tag', params.tag);

    return apiRequest(`/api/flashcards?${query.toString()}`);
  },

  getFlashcardsForPrint: (params?: { mode?: string; count?: number }) => {
    const query = new URLSearchParams();
    if (params?.mode) query.set('mode', params.mode);
    if (params?.count) query.set('count', params.count.toString());

    return apiRequest(`/api/flashcards/print?${query.toString()}`);
  },

  getDueFlashcards: (includeNew = true, newLimit = 10) => {
    const query = new URLSearchParams();
    query.set('includeNew', includeNew.toString());
    query.set('newLimit', newLimit.toString());

    return apiRequest(`/api/flashcards/due?${query.toString()}`);
  },

  createFlashcard: (data: any) =>
    apiRequest('/api/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFlashcard: (id: string, data: any) =>
    apiRequest(`/api/flashcards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFlashcard: (id: string) =>
    apiRequest(`/api/flashcards/${id}`, {
      method: 'DELETE',
    }),

  evaluateFlashcardAnswer: (data: {
    question: string;
    correctAnswer: string;
    userAnswer: string;
  }) =>
    apiRequest('/api/flashcards/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reviews
  submitReview: (flashcardId: string, rating: number, responseTime: number) =>
    apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ flashcardId, rating, responseTime }),
    }),

  createReviewSession: (data?: {
    mode?: 'review' | 'exam';
    source?: 'today-mission' | 'manual' | 'exam';
    maxCards?: number;
    maxNew?: number;
    weaknessBoost?: number;
    conceptId?: string;
    tag?: string;
  }) =>
    apiRequest('/api/reviews/sessions', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  submitReviewSessionAnswer: (
    sessionId: string,
    data: {
      flashcardId: string;
      rating: 1 | 2 | 3 | 4;
      responseTime: number;
      aiScore?: number;
      recommendedRating?: 1 | 2 | 3 | 4;
      errorType?: 'concept' | 'careless' | 'memory' | 'unknown';
    }
  ) =>
    apiRequest(`/api/reviews/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReviewSessionSummary: (sessionId: string) =>
    apiRequest(`/api/reviews/sessions/${sessionId}/summary`),

  completeReviewSession: (
    sessionId: string,
    reason?: 'completed' | 'user-exit' | 'timeout' | 'abandoned'
  ) =>
    apiRequest(`/api/reviews/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getReviewStats: (period?: number) => {
    const query = new URLSearchParams();
    if (period) query.set('period', period.toString());

    return apiRequest(`/api/reviews/stats?${query.toString()}`);
  },

  getActivityStats: () =>
    apiRequest('/api/stats/activity'),

  getTodayStudyMission: () =>
    apiRequest('/api/study/today'),

  getWeaknessTopics: (days?: number) => {
    const query = new URLSearchParams();
    if (days) query.set('days', days.toString());
    return apiRequest(`/api/weakness/topics?${query.toString()}`);
  },

  createExamSession: (data?: {
    count?: number;
    timeLimitMinutes?: number;
    conceptId?: string;
    tag?: string;
  }) =>
    apiRequest('/api/exams/sessions', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // Curriculums
  getCurriculums: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return apiRequest<PaginatedResponse<CurriculumDocumentV2>>(`/api/curriculums?${query.toString()}`);
  },

  getCurriculum: (id: string) =>
    apiRequest<ApiResponse<CurriculumDocumentV2>>(`/api/curriculums/${id}`),

  createCurriculum: (data: {
    goal: string;
    subject: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    aiModel?: 'openai' | 'claude' | 'gemini';
  }) =>
    apiRequest<ApiResponse<CurriculumDocumentV2>>('/api/curriculums', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCurriculumProgress: (id: string, data: { topicId: string; completed: boolean }) =>
    apiRequest<ApiResponse<{ completedTopics: string[]; overallPercentage: number; currentModule: string }>>(`/api/curriculums/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCurriculum: (id: string) =>
    apiRequest(`/api/curriculums/${id}`, {
      method: 'DELETE',
    }),

  // Concepts
  getConcepts: (params?: { page?: number; limit?: number; search?: string; curriculumId?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.curriculumId) query.set('curriculumId', params.curriculumId);

    return apiRequest(`/api/concepts?${query.toString()}`);
  },

  createConcept: (data: {
    curriculumId: string;
    topicId?: string;
    topicTitle: string;
    aiModel?: string;
    mode?: 'encyclopedia' | 'conversational';
  }) =>
    apiRequest('/api/concepts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteConcept: (id: string) =>
    apiRequest(`/api/concepts/${id}`, {
      method: 'DELETE',
    }),

  generateConceptFlashcards: (conceptId: string, count: number = 5) =>
    apiRequest(`/api/concepts/${conceptId}/flashcards`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),

  // Mindmaps
  getMindmaps: () =>
    apiRequest<ApiResponse<MindmapDocumentV2[]>>('/api/mindmaps'),

  getMindmap: (id: string) =>
    apiRequest<ApiResponse<MindmapDocumentV2>>(`/api/mindmaps/${id}`),

  createMindmap: (data: { title: string; structure?: LegacyMindMapNode; mindmap?: MindmapV2 }) =>
    apiRequest<ApiResponse<MindmapDocumentV2>>('/api/mindmaps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateMindmapFromConcept: (data: { conceptTitle: string; conceptContent: string }) =>
    apiRequest('/api/mindmaps/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMindmap: (id: string, data: { structure?: LegacyMindMapNode; mindmap?: MindmapV2 }) =>
    apiRequest<ApiResponse<MindmapDocumentV2>>(`/api/mindmaps/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMindmap: (id: string) =>
    apiRequest(`/api/mindmaps/${id}`, {
      method: 'DELETE',
    }),

  // Memory Palaces
  getMemoryPalaces: () =>
    apiRequest<ApiResponse<MemoryPalaceDocumentV2[]>>('/api/memory-palaces'),

  getMemoryPalace: (id: string) =>
    apiRequest<ApiResponse<MemoryPalaceDocumentV2>>(`/api/memory-palaces/${id}`),

  createMemoryPalace: (data: { title: string; rooms?: LegacyMemoryRoom[]; palace?: PalaceV2 }) =>
    apiRequest<ApiResponse<MemoryPalaceDocumentV2>>('/api/memory-palaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateMemoryPalaceFromConcept: (data: { conceptTitle: string; conceptContent: string }) =>
    apiRequest('/api/memory-palaces/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMemoryPalace: (id: string, data: { rooms?: LegacyMemoryRoom[]; palace?: PalaceV2 }) =>
    apiRequest<ApiResponse<MemoryPalaceDocumentV2>>(`/api/memory-palaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createMemoryPalaceReview: (data: {
    palaceId: string;
    palaceTitle: string;
    totalItems: number;
    correctItems: number;
    wrongItems: number;
    accuracy: number;
    durationSec: number;
    finishedAt?: string;
  }) =>
    apiRequest('/api/memory-palaces/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMemoryPalaceReviews: (limit?: number) => {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return apiRequest(`/api/memory-palaces/reviews?${query.toString()}`);
  },

  deleteMemoryPalace: (id: string) =>
    apiRequest(`/api/memory-palaces/${id}`, {
      method: 'DELETE',
    }),

  // AI Mnemonics
  generateMnemonic: (data: {
    subject: 'history' | 'math' | 'science' | 'english' | 'custom';
    technique: 'sequence' | 'story' | 'acronym' | 'association';
    content: string;
    save?: boolean;
  }) =>
    apiRequest('/api/ai-mnemonics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAIMnemonics: (limit?: number) => {
    const query = new URLSearchParams();
    if (limit) query.set('limit', limit.toString());
    return apiRequest(`/api/ai-mnemonics?${query.toString()}`);
  },

  deleteAIMnemonic: (id: string) =>
    apiRequest(`/api/ai-mnemonics/${id}`, {
      method: 'DELETE',
    }),
};

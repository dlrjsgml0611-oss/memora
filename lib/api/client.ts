import { useAuthStore } from '@/store/authStore';
import type { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  useAuth?: boolean;
}

async function apiRequest<T = ApiResponse<any>>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { useAuth = true, headers: customHeaders, ...fetchOptions } = options;

  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (customHeaders) {
    const extraHeaders = new Headers(customHeaders);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }

  // Add auth token if required
  if (useAuth) {
    const token = useAuthStore.getState().token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
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

  getMe: () => apiRequest('/api/auth/me'),

  updateProfile: (data: any) =>
    apiRequest('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Flashcards
  getFlashcards: (params?: { page?: number; limit?: number; conceptId?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.conceptId) query.set('conceptId', params.conceptId);

    return apiRequest(`/api/flashcards?${query.toString()}`);
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

  // Reviews
  submitReview: (flashcardId: string, rating: number, responseTime: number) =>
    apiRequest('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ flashcardId, rating, responseTime }),
    }),

  getReviewStats: (period?: number) => {
    const query = new URLSearchParams();
    if (period) query.set('period', period.toString());

    return apiRequest(`/api/reviews/stats?${query.toString()}`);
  },

  // Curriculums
  getCurriculums: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return apiRequest(`/api/curriculums?${query.toString()}`);
  },

  getCurriculum: (id: string) =>
    apiRequest(`/api/curriculums/${id}`),

  createCurriculum: (data: { goal: string; subject: string; difficulty?: string; aiModel?: string }) =>
    apiRequest('/api/curriculums', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCurriculum: (id: string) =>
    apiRequest(`/api/curriculums/${id}`, {
      method: 'DELETE',
    }),

  // Mindmaps
  getMindmaps: () =>
    apiRequest('/api/mindmaps'),

  getMindmap: (id: string) =>
    apiRequest(`/api/mindmaps/${id}`),

  createMindmap: (data: { title: string; structure: any }) =>
    apiRequest('/api/mindmaps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteMindmap: (id: string) =>
    apiRequest(`/api/mindmaps/${id}`, {
      method: 'DELETE',
    }),

  // Memory Palaces
  getMemoryPalaces: () =>
    apiRequest('/api/memory-palaces'),

  getMemoryPalace: (id: string) =>
    apiRequest(`/api/memory-palaces/${id}`),

  createMemoryPalace: (data: { title: string; rooms: any[] }) =>
    apiRequest('/api/memory-palaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteMemoryPalace: (id: string) =>
    apiRequest(`/api/memory-palaces/${id}`, {
      method: 'DELETE',
    }),
};

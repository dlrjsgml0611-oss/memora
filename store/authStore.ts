import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setSession: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  _hasHydrated: false,

  setHasHydrated: (state) => {
    set({ _hasHydrated: state });
  },

  setSession: (user) => {
    set({
      user,
      isAuthenticated: Boolean(user),
    });
  },

  login: (user) => {
    set({
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },
}));

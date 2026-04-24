import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  school?: string;
  phone?: string;
  designation?: string;
  bio?: string;
  subjects?: string[];
  city?: string;
  state?: string;
  branch?: string;
  degree?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        // Optional: redirect to login
        if (typeof window !== 'undefined') window.location.href = '/login';
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          console.error('Session expired or invalid token');
          get().logout();
        }
      },
    }),
    {
      name: 'veda-auth-storage', // key in localStorage
      partialize: (state) => ({ token: state.token }), // only persist token
    }
  )
);

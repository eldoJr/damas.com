import { create } from "zustand";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout:   () => void;
  init:     () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  token:   localStorage.getItem("token"),
  loading: false,

  login: async (email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>(
      "/auth/login", { email, password }
    );
    localStorage.setItem("token", token);
    set({ token, user });
  },

  register: async (username, email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>(
      "/auth/register", { username, email, password }
    );
    localStorage.setItem("token", token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },

  init: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    set({ loading: true });
    try {
      const { user } = await api.get<{ user: AuthUser }>("/auth/me");
      set({ user, token });
    } catch {
      localStorage.removeItem("token");
      set({ token: null, user: null });
    } finally {
      set({ loading: false });
    }
  },
}));

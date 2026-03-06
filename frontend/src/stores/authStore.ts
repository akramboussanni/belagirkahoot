import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Host } from "../types";

interface AuthState {
  token: string | null;
  host: Host | null;
  setAuth: (token: string, host: Host) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      host: null,
      setAuth: (token, host) => set({ token, host }),
      clearAuth: () => set({ token: null, host: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "hilal-auth",
      partialize: (state) => ({ token: state.token, host: state.host }),
    }
  )
);

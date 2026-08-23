import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  role: string;
  firm_id: string | null;
  has_completed_onboarding?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean; // New flag to track if storage is loaded
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setHydrated: (val: boolean) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),

      setAccessToken: (accessToken) =>
        set({ accessToken, isAuthenticated: !!accessToken }),

      setHydrated: (isHydrated) => set({ isHydrated }),

      completeOnboarding: () =>
        set((state) => ({ 
          user: state.user ? { ...state.user, has_completed_onboarding: true } : null 
        })),

      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: "ca-os-auth",
      storage: createJSONStorage(() => localStorage), // Changed from sessionStorage
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ 
        user: state.user, 
        accessToken: state.accessToken, 
        isAuthenticated: state.isAuthenticated // Now we remember we are logged in!
      }),
    }
  )
);

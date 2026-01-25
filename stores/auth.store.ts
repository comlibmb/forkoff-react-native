import { create } from 'zustand';
import { User, LoginCredentials, RegisterCredentials } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // OTP flow state
  pendingEmail: string | null;
  pendingName: string | null;
  otpSent: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;

  // OTP actions
  signUpWithOtp: (email: string, name: string) => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  clearOtpState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  pendingEmail: null,
  pendingName: null,
  otpSent: false,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check for existing session
      const session = await authService.getSession();
      if (session) {
        const user = await authService.getCurrentUser();
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }

      // Listen for auth state changes
      authService.onAuthStateChange((user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Failed to initialize auth',
      });
    }
  },

  signIn: async (credentials) => {
    try {
      set({ isLoading: true, error: null });

      const user = await authService.signIn(credentials);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
      throw error;
    }
  },

  signUp: async (credentials) => {
    try {
      set({ isLoading: true, error: null });

      const user = await authService.signUp(credentials);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      });
      throw error;
    }
  },

  // OTP-based sign up - sends verification code
  signUpWithOtp: async (email: string, name: string) => {
    try {
      set({ isLoading: true, error: null });

      await authService.signUpWithOtp(email, name);

      set({
        pendingEmail: email,
        pendingName: name,
        otpSent: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code',
      });
      throw error;
    }
  },

  // OTP-based sign in - sends verification code
  signInWithOtp: async (email: string) => {
    try {
      set({ isLoading: true, error: null });

      await authService.signInWithOtp(email);

      set({
        pendingEmail: email,
        pendingName: null,
        otpSent: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code',
      });
      throw error;
    }
  },

  // Verify OTP code
  verifyOtp: async (code: string) => {
    const { pendingEmail } = get();

    if (!pendingEmail) {
      set({ error: 'No pending verification' });
      throw new Error('No pending verification');
    }

    try {
      set({ isLoading: true, error: null });

      const user = await authService.verifyOtp(pendingEmail, code);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        pendingEmail: null,
        pendingName: null,
        otpSent: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Invalid verification code',
      });
      throw error;
    }
  },

  // Resend OTP code
  resendOtp: async () => {
    const { pendingEmail } = get();

    if (!pendingEmail) {
      set({ error: 'No pending verification' });
      throw new Error('No pending verification');
    }

    try {
      set({ isLoading: true, error: null });

      await authService.resendOtp(pendingEmail);

      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to resend code',
      });
      throw error;
    }
  },

  // Clear OTP state (when user cancels)
  clearOtpState: () => {
    set({
      pendingEmail: null,
      pendingName: null,
      otpSent: false,
      error: null,
    });
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      await authService.signOut();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        pendingEmail: null,
        pendingName: null,
        otpSent: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      });
      throw error;
    }
  },

  resetPassword: async (email) => {
    try {
      set({ isLoading: true, error: null });

      await authService.resetPassword(email);

      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      });
      throw error;
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ isLoading: true, error: null });

      const user = await authService.updateProfile(updates);

      set({
        user,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Profile update failed',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
}));

export default useAuthStore;

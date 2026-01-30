import { create } from 'zustand';
import { User, LoginCredentials, RegisterCredentials } from '@/types';
import { authService } from '@/services/auth.service';
import { sentryService } from '@/services/sentry.service';
import { analyticsService } from '@/services/analytics.service';

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

      // Identify user in analytics
      analyticsService.identify(user.id, {
        email: user.email,
        name: user.name,
      });

      // Set user context in Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      // Track sign in event
      analyticsService.track('user_signed_in', {
        method: 'password',
      });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'sign_in' });
      analyticsService.track('sign_in_failed', {
        method: 'password',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

      // Track user signed up
      analyticsService.track('user_signed_up', {
        method: 'password',
      });

      // Identify user
      analyticsService.identify(user.id, {
        email: user.email,
        name: user.name,
        signUpDate: new Date().toISOString(),
      });

      sentryService.setUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'sign_up' });
      analyticsService.track('sign_up_failed', {
        method: 'password',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

      analyticsService.track('otp_requested', {
        flow: 'sign_up',
      });

      set({
        pendingEmail: email,
        pendingName: name,
        otpSent: true,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'sign_up_with_otp' });
      analyticsService.track('otp_request_failed', {
        flow: 'sign_up',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

      analyticsService.track('otp_requested', {
        flow: 'sign_in',
      });

      set({
        pendingEmail: email,
        pendingName: null,
        otpSent: true,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'sign_in_with_otp' });
      analyticsService.track('otp_request_failed', {
        flow: 'sign_in',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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

      // Identify user in analytics
      analyticsService.identify(user.id, {
        email: user.email,
        name: user.name,
      });

      // Set user context in Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      // Track OTP verified event
      analyticsService.track('otp_verified');
      analyticsService.track('user_signed_in', {
        method: 'otp',
      });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        pendingEmail: null,
        pendingName: null,
        otpSent: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'verify_otp' });
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

      analyticsService.track('otp_resent');

      set({ isLoading: false });
    } catch (error) {
      sentryService.captureException(error, { context: 'resend_otp' });
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

      // Track sign out event before clearing user
      analyticsService.track('user_signed_out');

      await authService.signOut();

      // Reset analytics and Sentry user context
      analyticsService.reset();
      sentryService.setUser(null);

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        pendingEmail: null,
        pendingName: null,
        otpSent: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'sign_out' });
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

      analyticsService.track('profile_updated', {
        updatedFields: Object.keys(updates),
      });

      // Update user properties in analytics
      if (user) {
        analyticsService.setUserProperties({
          name: user.name,
        });
      }

      set({
        user,
        isLoading: false,
      });
    } catch (error) {
      sentryService.captureException(error, { context: 'update_profile' });
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

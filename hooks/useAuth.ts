import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { LoginCredentials, RegisterCredentials } from '@/types';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    initialize,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    clearError,
  } = useAuthStore();

  const handleSignIn = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        await signIn(credentials);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Sign in failed',
        };
      }
    },
    [signIn]
  );

  const handleSignUp = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        await signUp(credentials);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Sign up failed',
        };
      }
    },
    [signUp]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sign out failed',
      };
    }
  }, [signOut]);

  const handleResetPassword = useCallback(
    async (email: string) => {
      try {
        await resetPassword(email);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Password reset failed',
        };
      }
    },
    [resetPassword]
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    initialize,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updateProfile,
    clearError,
  };
}

export default useAuth;

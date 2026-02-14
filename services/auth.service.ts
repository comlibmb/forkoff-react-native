import { createClient, SupabaseClient, AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { User, LoginCredentials, RegisterCredentials } from '@/types';
import { useVersionStore } from '@/stores/version.store';

// Warm up the web browser for faster OAuth flow
WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// SECURITY: Mock mode should only be enabled in development builds AND when explicitly requested
// __DEV__ is a React Native global that is true in development builds only
const IS_DEV_BUILD = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
const USE_MOCKS = IS_DEV_BUILD && process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  try {
    const url = new URL(SUPABASE_URL);
    return url.protocol === 'https:' && SUPABASE_ANON_KEY.length > 20;
  } catch {
    return false;
  }
};

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// SECURITY: Generate cryptographically random OTP for mock mode
// This ensures mock mode can't be exploited with a known OTP
function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

// Mock user for development/testing - only used in dev builds with USE_MOCKS=true
const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'demo@forkoff.dev',
  username: 'demouser',
  name: 'Demo User',
  avatarUrl: undefined,
  createdAt: new Date().toISOString(),
  subscription: 'free',
};

// Username validation rules
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const RESERVED_USERNAMES = ['admin', 'root', 'system', 'forkoff', 'support', 'help', 'api', 'www'];

// Store pending registration data
interface PendingRegistration {
  email: string;
  name?: string;
}

class AuthService {
  private supabase: SupabaseClient | null = null;
  private useMocks: boolean;
  private mockSession: boolean = false;
  private authListeners: Array<(user: User | null) => void> = [];
  private pendingRegistration: PendingRegistration | null = null;
  // SECURITY: Generate random OTP for each request instead of using hardcoded value
  private pendingMockOtp: Map<string, { code: string; expiresAt: number }> = new Map();

  constructor() {
    this.useMocks = USE_MOCKS || !isSupabaseConfigured();

    if (!this.useMocks && isSupabaseConfigured()) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: ExpoSecureStoreAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    } else {
      console.log('AuthService: Running in mock mode');
    }
  }

  private mapSupabaseUser(supabaseUser: SupabaseUser): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      username: supabaseUser.user_metadata?.username,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      createdAt: supabaseUser.created_at,
      subscription: supabaseUser.user_metadata?.subscription || 'free',
    };
  }

  // ==================== OTP-BASED AUTHENTICATION ====================

  // SECURITY: Generate and store a mock OTP with expiration (10 minutes)
  private generateMockOtp(email: string): string {
    const code = generateSecureOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.pendingMockOtp.set(email.toLowerCase(), { code, expiresAt });
    return code;
  }

  // SECURITY: Verify mock OTP and check expiration
  private verifyMockOtp(email: string, code: string): boolean {
    const stored = this.pendingMockOtp.get(email.toLowerCase());
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.pendingMockOtp.delete(email.toLowerCase());
      return false;
    }
    if (stored.code !== code) return false;
    this.pendingMockOtp.delete(email.toLowerCase());
    return true;
  }

  // Start signup with email OTP (6-digit code sent to email)
  async signUpWithOtp(email: string, name?: string): Promise<{ message: string }> {
    // Store registration data for verification step
    this.pendingRegistration = { email, name };

    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const otp = this.generateMockOtp(email);
      // SECURITY: Only log OTP in development console, never in production logs
      if (IS_DEV_BUILD) {
        console.log(`[DEV ONLY] Mock OTP for ${email}: ${otp}`);
      }
      return { message: 'Verification code sent to your email' };
    }

    const { error } = await this.supabase!.auth.signInWithOtp({
      email,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw this.formatError(error);
    }

    return { message: 'Verification code sent to your email' };
  }

  // Start sign in with email OTP
  async signInWithOtp(email: string): Promise<{ message: string }> {
    this.pendingRegistration = { email };

    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const otp = this.generateMockOtp(email);
      // SECURITY: Only log OTP in development console, never in production logs
      if (IS_DEV_BUILD) {
        console.log(`[DEV ONLY] Mock OTP for ${email}: ${otp}`);
      }
      return { message: 'Verification code sent to your email' };
    }

    // Allow user creation on sign-in for seamless experience
    const { error } = await this.supabase!.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw this.formatError(error);
    }

    return { message: 'Verification code sent to your email' };
  }

  // Verify OTP code (6-digit)
  async verifyOtp(email: string, code: string): Promise<User> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // SECURITY: Use secure OTP verification with expiration check
      if (!this.verifyMockOtp(email, code)) {
        throw new Error('Invalid or expired verification code');
      }

      this.mockSession = true;
      const user = {
        ...MOCK_USER,
        email,
        name: this.pendingRegistration?.name || email.split('@')[0]
      };
      this.pendingRegistration = null;
      this.notifyListeners(user);
      return user;
    }

    const { data, error } = await this.supabase!.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      throw this.formatError(error);
    }

    if (!data.user) {
      throw new Error('Verification failed. Please try again.');
    }

    // Update user metadata with name if this was a signup
    if (this.pendingRegistration?.name) {
      await this.supabase!.auth.updateUser({
        data: { name: this.pendingRegistration.name },
      });
    }

    this.pendingRegistration = null;

    // Fetch full profile from API to get DB-stored fields like username
    const baseUser = this.mapSupabaseUser(data.user);
    try {
      const token = data.session?.access_token;
      if (token) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profile = await response.json();

          // Handle appConfig if present
          if (profile.appConfig) {
            useVersionStore.getState().setVersionConfig(profile.appConfig);
          }

          return {
            ...baseUser,
            username: profile.username || baseUser.username,
            name: profile.name || baseUser.name,
            avatarUrl: profile.avatarUrl || baseUser.avatarUrl,
            subscription: profile.subscription || baseUser.subscription,
            country: profile.country,
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile from API after OTP verification:', error);
    }

    return baseUser;
  }

  // Resend OTP code
  async resendOtp(email: string): Promise<{ message: string }> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const otp = this.generateMockOtp(email);
      // SECURITY: Only log OTP in development console, never in production logs
      if (IS_DEV_BUILD) {
        console.log(`[DEV ONLY] Mock OTP resent for ${email}: ${otp}`);
      }
      return { message: 'Verification code resent' };
    }

    const { error } = await this.supabase!.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw this.formatError(error);
    }

    return { message: 'Verification code resent' };
  }

  // ==================== LEGACY PASSWORD-BASED AUTH (kept for compatibility) ====================

  async signUp(credentials: RegisterCredentials): Promise<User> {
    // Redirect to OTP-based signup
    await this.signUpWithOtp(credentials.email, credentials.name);
    throw new Error('OTP_REQUIRED');
  }

  async signIn(credentials: LoginCredentials): Promise<User> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.mockSession = true;
      const user = { ...MOCK_USER, email: credentials.email };
      this.notifyListeners(user);
      return user;
    }

    // Try password-based sign in first (for existing password accounts)
    const { data, error } = await this.supabase!.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw this.formatError(error);
    }

    if (!data.user) {
      throw new Error('Login failed. Please try again.');
    }

    return this.mapSupabaseUser(data.user);
  }

  async signOut(): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      this.mockSession = false;
      this.notifyListeners(null);
      return;
    }

    const { error } = await this.supabase!.auth.signOut();
    if (error) {
      throw this.formatError(error);
    }

    // Clear any additional stored data
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  async getSession(): Promise<Session | null> {
    console.log('[AuthService] getSession called, useMocks:', this.useMocks);
    if (this.useMocks) {
      return this.mockSession ? ({ user: MOCK_USER } as unknown as Session) : null;
    }

    console.log('[AuthService] Calling supabase.auth.getSession...');
    const { data, error } = await this.supabase!.auth.getSession();
    console.log('[AuthService] getSession result:', !!data?.session, error?.message);
    if (error) {
      throw this.formatError(error);
    }
    return data.session;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.useMocks) {
      return this.mockSession ? MOCK_USER : null;
    }

    const { data, error } = await this.supabase!.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    // Get base user from Supabase
    const baseUser = this.mapSupabaseUser(data.user);

    // Fetch profile from our API to get username and other DB-stored fields
    try {
      const token = await this.getAccessToken();
      if (token) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profile = await response.json();

          // Handle appConfig if present
          if (profile.appConfig) {
            useVersionStore.getState().setVersionConfig(profile.appConfig);
          }

          // Merge API profile data with Supabase user
          return {
            ...baseUser,
            username: profile.username || baseUser.username,
            name: profile.name || baseUser.name,
            avatarUrl: profile.avatarUrl || baseUser.avatarUrl,
            subscription: profile.subscription || baseUser.subscription,
            country: profile.country,
            // Stripe subscription fields
            stripeCustomerId: profile.stripeCustomerId,
            stripeSubscriptionId: profile.stripeSubscriptionId,
            stripePriceId: profile.stripePriceId,
            stripeCurrentPeriodEnd: profile.stripeCurrentPeriodEnd,
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile from API:', error);
    }

    return baseUser;
  }

  async getAccessToken(): Promise<string | null> {
    if (this.useMocks) {
      return this.mockSession ? 'mock-access-token' : null;
    }

    const { data } = await this.supabase!.auth.getSession();
    return data.session?.access_token || null;
  }

  async resetPassword(email: string): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    const { error } = await this.supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: 'forkoff://reset-password',
    });

    if (error) {
      throw this.formatError(error);
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    const { error } = await this.supabase!.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw this.formatError(error);
    }
  }

  async updateProfile(updates: { name?: string; username?: string; avatarUrl?: string }): Promise<User> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const user = { ...MOCK_USER, ...updates };
      return user;
    }

    // If username is being updated, validate and check via API
    if (updates.username) {
      const validation = this.validateUsername(updates.username);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check availability via API
      const available = await this.checkUsernameAvailability(updates.username);
      if (!available.available) {
        throw new Error(available.error || 'Username is already taken');
      }
    }

    // Update via API (which handles DB update)
    const token = await this.getAccessToken();
    if (token) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update profile');
      }
    }

    // Also update Supabase auth metadata
    const { data, error } = await this.supabase!.auth.updateUser({
      data: {
        name: updates.name,
        username: updates.username,
        avatar_url: updates.avatarUrl,
      },
    });

    if (error) {
      throw this.formatError(error);
    }

    if (!data.user) {
      throw new Error('Failed to update profile.');
    }

    return this.mapSupabaseUser(data.user);
  }

  // Validate username format locally
  validateUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
      return { valid: false, error: 'Username must be at most 20 characters' };
    }
    if (!/^[a-zA-Z]/.test(username)) {
      return { valid: false, error: 'Username must start with a letter' };
    }
    if (!USERNAME_REGEX.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return { valid: false, error: 'This username is reserved' };
    }
    return { valid: true };
  }

  // Check username availability via API
  async checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      // Mock: usernames starting with 'taken' are unavailable
      if (username.toLowerCase().startsWith('taken')) {
        return { available: false, error: 'Username is already taken' };
      }
      return { available: true };
    }

    const token = await this.getAccessToken();
    if (!token) {
      return { available: true }; // Allow if not authenticated yet
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    try {
      const response = await fetch(`${apiUrl}/auth/username/check/${encodeURIComponent(username)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { available: false, error: 'Failed to check username' };
      }

      return await response.json();
    } catch (error) {
      console.error('Username check error:', error);
      return { available: true }; // Fail open
    }
  }

  async deleteAccount(): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.mockSession = false;
      this.notifyListeners(null);
      return;
    }

    // Note: Supabase requires server-side admin API to delete users
    // We'll call our backend API to handle the deletion
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to delete account');
    }

    // Sign out locally after deletion
    await this.signOut();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (currentPassword !== 'password') {
        throw new Error('Current password is incorrect');
      }
      return;
    }

    // Supabase doesn't have a direct "change password with current password" flow
    // We need to re-authenticate first, then update password
    const session = await this.getSession();
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await this.supabase!.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update to new password
    const { error } = await this.supabase!.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw this.formatError(error);
    }
  }

  async signInWithGoogle(): Promise<User> {
    console.log('[Auth] signInWithGoogle called, useMocks:', this.useMocks);

    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.mockSession = true;
      const user = { ...MOCK_USER, name: 'Google User' };
      this.notifyListeners(user);
      return user;
    }

    // Use the same redirect pattern that works in both Expo Go and native builds
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'forkoff',
      preferLocalhost: false,
    });

    console.log('[Auth] Google OAuth redirect URI:', redirectUri);

    const { data, error } = await this.supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error.message);
      throw this.formatError(error);
    }

    if (!data.url) {
      throw new Error('Failed to get Google OAuth URL');
    }

    console.log('[Auth] Opening Google OAuth browser session...');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    console.log('[Auth] Google OAuth result type:', result.type);

    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign in was cancelled');
    }

    console.log('[Auth] Google OAuth success URL:', result.url.substring(0, 80) + '...');

    // Extract tokens from the redirect URL fragment (#access_token=...&refresh_token=...)
    const hashIndex = result.url.indexOf('#');
    if (hashIndex === -1) {
      throw new Error('No tokens returned from Google sign in');
    }

    const params = new URLSearchParams(result.url.substring(hashIndex + 1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      throw new Error('Failed to extract tokens from Google sign in');
    }

    // Set the session in Supabase
    const { data: sessionData, error: sessionError } = await this.supabase!.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      throw this.formatError(sessionError);
    }

    if (!sessionData.user) {
      throw new Error('Failed to complete Google sign in');
    }

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after Google sign in');
    }

    return user;
  }

  async signInWithApple(): Promise<User> {
    console.log('[Auth] signInWithApple called, useMocks:', this.useMocks);

    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.mockSession = true;
      const user = { ...MOCK_USER, name: 'Apple User' };
      this.notifyListeners(user);
      return user;
    }

    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    // Dynamic import to avoid crash in Expo Go where the native module isn't available
    let AppleAuthentication: typeof import('expo-apple-authentication');
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch {
      throw new Error('Apple Sign In requires a development build. It is not available in Expo Go.');
    }

    // Check if Apple Sign In is available on this device
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device. A development build is required.');
    }

    // Generate a cryptographic nonce for security
    // Raw nonce goes to Supabase, hashed nonce goes to Apple
    const rawNonce = Math.random().toString(36).substring(2, 34);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('No identity token from Apple Sign In');
    }

    const { data, error } = await this.supabase!.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      throw this.formatError(error);
    }

    if (!data.user) {
      throw new Error('Failed to complete Apple sign in');
    }

    // Update user name from Apple credential if provided (only on first sign-in)
    if (credential.fullName?.givenName) {
      const name = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ');
      await this.supabase!.auth.updateUser({ data: { name } });
    }

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Failed to get user after Apple sign in');
    }

    return user;
  }

  private notifyListeners(user: User | null): void {
    this.authListeners.forEach((callback) => callback(user));
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    if (this.useMocks) {
      this.authListeners.push(callback);
      return () => {
        const index = this.authListeners.indexOf(callback);
        if (index > -1) {
          this.authListeners.splice(index, 1);
        }
      };
    }

    const { data } = this.supabase!.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch full user profile from API instead of just mapping Supabase metadata
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  private formatError(error: AuthError): Error {
    const errorMessages: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password.',
      'Email not confirmed': 'Please verify your email address.',
      'User already registered': 'An account with this email already exists.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters.',
      'Token has expired or is invalid': 'Invalid or expired verification code.',
      'OTP has expired': 'Verification code has expired. Please request a new one.',
      'Provider not enabled': 'This login method is not enabled. Please contact support.',
      'OAuth provider not enabled': 'This login method is not enabled. Please contact support.',
    };

    const message = errorMessages[error.message] || error.message;
    console.log('[Auth] formatError:', error.message, '->', message);
    return new Error(message);
  }

  get client(): SupabaseClient | null {
    return this.supabase;
  }

  get isMockMode(): boolean {
    return this.useMocks;
  }
}

export const authService = new AuthService();
export default authService;

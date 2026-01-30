import { createClient, SupabaseClient, AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import { User, LoginCredentials, RegisterCredentials } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

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

// Mock user for development/testing
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
  private mockOtpCode: string = '123456'; // Mock OTP for testing

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

  // Start signup with email OTP (6-digit code sent to email)
  async signUpWithOtp(email: string, name?: string): Promise<{ message: string }> {
    // Store registration data for verification step
    this.pendingRegistration = { email, name };

    if (this.useMocks) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log(`Mock OTP for ${email}: ${this.mockOtpCode}`);
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
      console.log(`Mock OTP for ${email}: ${this.mockOtpCode}`);
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

      if (code !== this.mockOtpCode) {
        throw new Error('Invalid verification code');
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
          return {
            ...baseUser,
            username: profile.username || baseUser.username,
            name: profile.name || baseUser.name,
            avatarUrl: profile.avatarUrl || baseUser.avatarUrl,
            subscription: profile.subscription || baseUser.subscription,
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
      console.log(`Mock OTP resent for ${email}: ${this.mockOtpCode}`);
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
    if (this.useMocks) {
      return this.mockSession ? ({ user: MOCK_USER } as unknown as Session) : null;
    }

    const { data, error } = await this.supabase!.auth.getSession();
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
          // Merge API profile data with Supabase user
          return {
            ...baseUser,
            username: profile.username || baseUser.username,
            name: profile.name || baseUser.name,
            avatarUrl: profile.avatarUrl || baseUser.avatarUrl,
            subscription: profile.subscription || baseUser.subscription,
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

  async signInWithGitHub(): Promise<{ url: string }> {
    console.log('[Auth] signInWithGitHub called, useMocks:', this.useMocks);

    if (this.useMocks) {
      return { url: 'https://github.com/login/oauth/authorize?mock=true' };
    }

    // For Expo Go development, we need to use a redirect that Supabase accepts
    // In production (native build), use the app scheme
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'forkoff',
      preferLocalhost: false,
    });

    console.log('[Auth] GitHub OAuth redirect URI:', redirectUri);

    const { data, error } = await this.supabase!.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUri,
        scopes: 'read:user user:email',
        skipBrowserRedirect: false,
      },
    });

    console.log('[Auth] GitHub OAuth response:', { data, error });

    if (error) {
      console.error('[Auth] GitHub OAuth error:', error.message, error);
      throw this.formatError(error);
    }

    if (!data.url) {
      console.error('[Auth] GitHub OAuth no URL returned');
      throw new Error('Failed to get OAuth URL');
    }

    console.log('[Auth] GitHub OAuth URL obtained:', data.url.substring(0, 50) + '...');
    return { url: data.url };
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

    const { data } = this.supabase!.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback(this.mapSupabaseUser(session.user));
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
      'Provider not enabled': 'GitHub login is not enabled. Please contact support.',
      'OAuth provider not enabled': 'GitHub login is not enabled. Please contact support.',
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

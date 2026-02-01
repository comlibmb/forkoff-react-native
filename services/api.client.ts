import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types';
import { authService } from './auth.service';
import { sentryService } from './sentry.service';
import { analyticsService } from './analytics.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// SECURITY: Sensitive query parameter names to redact from logs
const SENSITIVE_PARAMS = ['token', 'key', 'api_key', 'apikey', 'secret', 'password', 'auth', 'bearer', 'credential', 'session'];

/**
 * SECURITY: Sanitize URL by removing sensitive query parameters
 */
function sanitizeUrl(url: string | undefined): string {
  if (!url) return '';

  try {
    // Handle relative URLs
    const fullUrl = url.startsWith('http') ? url : `https://placeholder.com${url}`;
    const urlObj = new URL(fullUrl);

    // Redact sensitive query parameters
    const params = new URLSearchParams(urlObj.search);
    for (const param of SENSITIVE_PARAMS) {
      if (params.has(param)) {
        params.set(param, '[REDACTED]');
      }
      // Also check for params containing sensitive words
      for (const [key] of params.entries()) {
        if (key.toLowerCase().includes(param)) {
          params.set(key, '[REDACTED]');
        }
      }
    }

    // Return just the path and sanitized query string for relative URLs
    if (!url.startsWith('http')) {
      const sanitizedSearch = params.toString();
      return urlObj.pathname + (sanitizedSearch ? `?${sanitizedSearch}` : '');
    }

    urlObj.search = params.toString();
    return urlObj.toString();
  } catch {
    // If URL parsing fails, just return the path portion
    return url.split('?')[0] || url;
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token from Supabase and tracking
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = await authService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.log('Failed to get access token:', error);
        }

        // SECURITY: Add breadcrumb with sanitized URL
        const sanitizedUrl = sanitizeUrl(config.url);
        sentryService.addBreadcrumb(
          `API ${config.method?.toUpperCase()} ${sanitizedUrl}`,
          'http',
          {
            method: config.method,
            url: sanitizedUrl,
          }
        );

        // Track request start time for latency measurement
        (config as InternalAxiosRequestConfig & { metadata?: { startTime: number } }).metadata = { startTime: Date.now() };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and tracking
    this.client.interceptors.response.use(
      (response) => {
        // Track API latency with sanitized URL
        const config = response.config as InternalAxiosRequestConfig & { metadata?: { startTime: number } };
        if (config.metadata?.startTime) {
          const latency = Date.now() - config.metadata.startTime;
          // SECURITY: Sanitize URL in analytics
          analyticsService.track('api_request', {
            method: config.method,
            url: sanitizeUrl(config.url),
            status: response.status,
            latency_ms: latency,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as (InternalAxiosRequestConfig & { metadata?: { startTime: number } }) | undefined;

        // Track API error latency with sanitized URL
        if (config?.metadata?.startTime) {
          const latency = Date.now() - config.metadata.startTime;
          // SECURITY: Sanitize URL in analytics
          analyticsService.track('api_request', {
            method: config.method,
            url: sanitizeUrl(config.url),
            status: error.response?.status || 0,
            latency_ms: latency,
            error: true,
          });
        }

        // Handle 401 - user needs to re-authenticate
        if (error.response?.status === 401) {
          // Token might be expired, Supabase should auto-refresh
          // If it fails, user will need to sign in again
          console.log('Unauthorized - token may be expired');
        } else {
          // SECURITY: Capture non-401 errors to Sentry with sanitized URL
          sentryService.captureException(error, {
            url: sanitizeUrl(config?.url),
            method: config?.method,
            status: error.response?.status,
            // SECURITY: Don't include response data as it might contain sensitive info
          });
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const data = error.response.data as Partial<ApiError>;
      return {
        code: data.code || 'UNKNOWN_ERROR',
        message: data.message || 'An unexpected error occurred',
        details: data.details,
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out. Please try again.',
      };
    }

    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
    };
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

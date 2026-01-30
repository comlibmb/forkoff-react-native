import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types';
import { authService } from './auth.service';
import { sentryService } from './sentry.service';
import { analyticsService } from './analytics.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

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

        // Add breadcrumb for API request
        sentryService.addBreadcrumb(
          `API ${config.method?.toUpperCase()} ${config.url}`,
          'http',
          {
            method: config.method,
            url: config.url,
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
        // Track API latency
        const config = response.config as InternalAxiosRequestConfig & { metadata?: { startTime: number } };
        if (config.metadata?.startTime) {
          const latency = Date.now() - config.metadata.startTime;
          analyticsService.track('api_request', {
            method: config.method,
            url: config.url,
            status: response.status,
            latency_ms: latency,
          });
        }
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as (InternalAxiosRequestConfig & { metadata?: { startTime: number } }) | undefined;

        // Track API error latency
        if (config?.metadata?.startTime) {
          const latency = Date.now() - config.metadata.startTime;
          analyticsService.track('api_request', {
            method: config.method,
            url: config.url,
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
          // Capture non-401 errors to Sentry
          sentryService.captureException(error, {
            url: config?.url,
            method: config?.method,
            status: error.response?.status,
            data: error.response?.data,
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

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP Client Utility
 * Centralized HTTP client for all API calls
 * Replaces hardcoded localhost URLs
 */

import { API_CONFIG } from '@/config/api.config';

export interface HttpClientOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

class HttpClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string = API_CONFIG.BASE_URL, timeout: number = API_CONFIG.TIMEOUT) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }

  /**
   * Get authorization token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  /**
   * Build headers with authorization
   */
  private buildHeaders(options: HttpClientOptions = {}): Headers {
    const headers = new Headers(options.headers || {});

    // Add Content-Type if not present
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add Accept header
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Add authorization token
    if (!options.skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /**
   * Build full URL
   */
  private buildURL(endpoint: string): string {
    // If endpoint already includes protocol, return as is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // Ensure baseURL doesn't have trailing slash
    const cleanBaseURL = this.baseURL.endsWith('/')
      ? this.baseURL.slice(0, -1)
      : this.baseURL;

    return `${cleanBaseURL}/${cleanEndpoint}`;
  }

  /**
   * Make HTTP request with timeout
   */
  private async request<T>(
    endpoint: string,
    options: HttpClientOptions = {}
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    const timeout = options.timeout || this.defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: this.buildHeaders(options),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle non-2xx responses
      if (!response.ok) {
        const error: ApiError = new Error(
          data?.message || data?.error || `HTTP Error: ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: HttpClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options: HttpClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options: HttpClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options: HttpClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: HttpClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options: HttpClientOptions = {}
  ): Promise<T> {
    const headers = this.buildHeaders(options);
    // Remove Content-Type to let browser set it with boundary
    headers.delete('Content-Type');

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    });
  }

  /**
   * Build URL with query parameters
   */
  buildURLWithParams(endpoint: string, params: Record<string, any>): string {
    const url = this.buildURL(endpoint);
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

// Export class for custom instances if needed
export default HttpClient;

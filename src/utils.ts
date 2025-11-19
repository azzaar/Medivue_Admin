/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  fetchUtils,
  DataProvider,
  GetOneParams,
  CreateParams,
  UpdateParams,
  GetManyParams,
  GetManyReferenceParams,
  DeleteParams,
  UpdateManyParams,
  DeleteManyParams,
  RaRecord,
  DeleteResult,
  DeleteManyResult,
} from "react-admin";
import { API_CONFIG } from "./config/api.config";

const apiUrl = API_CONFIG.BASE_URL;

/**
 * HTTP Client for react-admin DataProvider
 */
const httpClient = (url: string, options: RequestInit = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }

  const token = localStorage.getItem("token");
  if (token) {
    (options.headers as Headers).set("Authorization", `Bearer ${token}`);
  }

  return fetchUtils.fetchJson(url, options);
};

// ========================================
// Standalone HTTP Client Class
// ========================================

export interface HttpClientOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

export interface ApiError extends Error {
  status?: number;
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

// Export singleton instance for general use
export const apiClient = new HttpClient();

// Export class for custom instances if needed
export { HttpClient };

// Define a common type for your data structure
interface Patient {
  _id: string;
  id?: string;
  name: string;
  age: number;
}

const customDataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    
    const { field, order } = params.sort || { field: "id", order: "ASC" };

    const query = {
      _start: ((page - 1) * perPage).toString(),
      _end: (page * perPage).toString(),
      _sort: field,
      _order: order,
      ...params.filter, // Spread the filter object
      q: params.filter.q || "", // Ensure `q` is passed for search
    };

    const url = `${apiUrl}/${resource}?${new URLSearchParams(query)}`;
    const { headers, json } = await httpClient(url);

    return {
      data: json?.map((record: { _id: unknown }) => ({
        ...record,
        id: record._id,
      })),
      total: parseInt(headers.get("X-Total-Count") || "0", 10), // Ensure `X-Total-Count` is read
    };
  },

  getOne: async (resource: string, params: GetOneParams) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url);
    return { data: { ...json, id: json._id } };
  },

  getMany: async (resource: string, params: GetManyParams) => {
    const ids = params.ids.join(",");
    const url = `${apiUrl}/${resource}?ids=${ids}`;
    const { json } = await httpClient(url);
    return {
      data: json?.map((record: Patient) => ({ ...record, id: record._id })),
    };
  },

  getManyReference: async (
    resource: string,
    params: GetManyReferenceParams
  ) => {
    const url = `${apiUrl}/${resource}?${params.target}=${params.id}`;
    const { json } = await httpClient(url);
    return {
      data: json?.map((record: Patient) => ({ ...record, id: record._id })),
      total: json.length,
    };
  },

  create: async (resource: string, params: CreateParams) => {
    const url = `${apiUrl}/${resource}`;
    const { json } = await httpClient(url, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: { ...json.data, id: json.id || json._id } };
  },

  update: async (resource: string, params: UpdateParams) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: { ...json, id: json._id } };
  },

  updateMany: async (_resource: string, params: UpdateManyParams) => {
    return { data: params.ids };
  },

  delete: async <RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: DeleteParams<RecordType>
  ): Promise<DeleteResult<RecordType>> => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    await httpClient(url, { method: "DELETE" });

    return {
      data: {
        id: params.id,
      } as RecordType,
    };
  },

  deleteMany: async <RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: DeleteManyParams<RecordType>
  ): Promise<DeleteManyResult<RecordType>> => {
    await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, { method: "DELETE" })
      )
    );

    return {
      data: params.ids as RecordType["id"][],
    };
  },
};

export default customDataProvider;

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import supabase from "../config/supabase";

// Use Vite's environment variable syntax
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add a request interceptor to include token
    this.api.interceptors.request.use(
      async (config) => {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If we have a session, add the token to the request
        if (session) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add a response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle unauthorized errors by redirecting to login
        if (error.response && error.response.status === 401) {
          // Check if we have a session that might need refreshing
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            // If no session, redirect to login
            window.location.href = "/login";
          }

          // Let the error propagate for further handling
          return Promise.reject({
            ...error,
            isAuthError: true,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config);
    return response.data;
  }

  // Generic POST request
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config);
    return response.data;
  }

  // Generic PUT request
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config);
    return response.data;
  }

  // Generic DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }

  // Get the underlying axios instance for special cases
  getInstance(): AxiosInstance {
    return this.api;
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import supabase from "../config/supabase";

// Use Vite's environment variable syntax
const BASE_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL_DEV
  : import.meta.env.VITE_API_URL;

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
        // Enhanced error logging
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("API Error Response:", {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
            url: error.config?.url,
            method: error.config?.method,
          });

          // Handle unauthorized errors by redirecting to login
          if (error.response.status === 401) {
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
        } else if (error.request) {
          // The request was made but no response was received
          console.error("API No Response:", {
            request: error.request,
            url: error.config?.url,
            method: error.config?.method,
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("API Request Error:", {
            message: error.message,
            url: error.config?.url,
            method: error.config?.method,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`GET request failed for ${url}:`, error);
      throw error;
    }
  }

  // Generic POST request
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`POST request failed for ${url}:`, error);
      throw error;
    }
  }

  // Generic PUT request
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`PUT request failed for ${url}:`, error);
      throw error;
    }
  }

  // Generic DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(`DELETE request failed for ${url}:`, error);
      throw error;
    }
  }

  // Get the underlying axios instance for special cases
  getInstance(): AxiosInstance {
    return this.api;
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;

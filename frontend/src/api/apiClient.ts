import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { getAuthHeader } from "../utils/auth";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth headers
apiClient.interceptors.request.use(
  (config) => {
    const headers = getAuthHeader();
    if (headers.Authorization) {
      config.headers.Authorization = headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle session expiration
    if (error.response?.status === 401) {
      // Optionally clear token and redirect to login
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }

    // Extract error message from response
    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      "An unknown error occurred";

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      original: error,
    });
  }
);

export default {
  get: <T>(path: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient
      .get(path, config)
      .then((response: AxiosResponse<T>) => response.data),

  post: <T>(
    path: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    apiClient
      .post(path, data, config)
      .then((response: AxiosResponse<T>) => response.data),

  put: <T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient
      .put(path, data, config)
      .then((response: AxiosResponse<T>) => response.data),

  delete: <T>(path: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient
      .delete(path, config)
      .then((response: AxiosResponse<T>) => response.data),
};

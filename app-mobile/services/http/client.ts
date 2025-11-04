import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE_URL =
	Platform.OS === "android"
		? "http://10.0.2.2:80"   // Android emulator
		: "http://localhost:8000"; // iOS simulator

export const api = axios.create({
	baseURL: BASE_URL,
	headers: { "Content-Type": "application/json" },
	// Set a reasonable timeout so requests fail instead of hanging forever
	timeout: 10000, // 10 seconds
	withCredentials: true,
});

// Request interceptor authorization header
api.interceptors.request.use(async (config) => {
  const url = (config.url ?? "").toString();
  const skipAuth =
    url.endsWith("/auth/login") || url.endsWith("/auth/refresh");

  if (!skipAuth) {
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
let isRefreshing = false;
type QueueItem = { resolve: (v: any) => void; reject: (e: any) => void; originalRequest: any };
let queue: QueueItem[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: any = error?.config;
    const status = error?.response?.status;
    const url = (originalRequest?.url ?? "").toString();
		const hadAuth = !!originalRequest?.headers?.Authorization;
		const isAuthEndpoint = url.endsWith("/auth/login") || url.endsWith("/auth/refresh");
    // 1) Skip refresh flow for /auth/refresh itself
		if (isAuthEndpoint) {
			return Promise.reject(error);
		}		

    // Only refresh on actual expired-token cases
    const detail = error?.response?.data?.detail;
    const shouldRefresh =
      status === 401 && !originalRequest?._retry && hadAuth && !isAuthEndpoint;

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

		// Debugging
		console.log("Failed request:", {
			method: originalRequest.method,
			url: originalRequest.url,
		});

    originalRequest._retry = true;

    if (isRefreshing) {
      // 2) Queue with resolve + reject and set headers object safely
      return new Promise((resolve, reject) => {
        queue.push({
          resolve,
          reject,
          originalRequest,
        });
      });
    }

    isRefreshing = true;
    try {
      const { authApi } = await import("../api/auth-api");
      const result = await authApi.refresh(); //GET /auth/refresh
      if (!result.ok || !result.data?.access_token) {
        // Refresh failed -> reject all queued requests
        queue.splice(0).forEach(({ reject }) => reject(error));
        await SecureStore.deleteItemAsync("access_token");
        return Promise.reject(error);
      }

      const newToken = result.data.access_token;
			// Debugging
			console.log("Retrying request: ", {
				method: originalRequest.method,
				url: originalRequest.url,
			});

      // Resolve queued requests
      queue.splice(0).forEach(({ resolve, originalRequest }) => {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

				// Debugging
				console.log("Retrying request: ", {
					method: originalRequest.method,
					url: originalRequest.url,
				});

        resolve(api(originalRequest));
      });

      // Retry the original request
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } 
		catch (refreshErr) {
      // Reject queued requests on failure
      queue.splice(0).forEach(({ reject }) => reject(refreshErr));
      await SecureStore.deleteItemAsync("access_token");
      return Promise.reject(refreshErr);
    } 
		finally {
      isRefreshing = false;
    }
  }
);
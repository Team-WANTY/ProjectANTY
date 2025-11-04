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
});

// Request interceptor authorization header
api.interceptors.request.use(async (config) => {
	const token = await SecureStore.getItemAsync("access_token")
	if (token) { config.headers.Authorization = `Bearer ${token}` };
	return config;
});

// Response interceptor
let isRefreshing = false;
let queuedRequests: ((token: string) => void)[] = [];

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config as any;
		const status = error?.response?.status;

		// If token expired and request haven't retried yet
		if (status == 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			if (isRefreshing) {
				// Queue requests until refresh is finished
				return new Promise((resolve) => {
					queuedRequests.push((newToken) => {
						originalRequest.headers.Authorization = `Bearer ${newToken}`;
						resolve(api(originalRequest));
					});
				});
			}

			isRefreshing = true;
			try {
				const { authApi } = await import("../api/auth-api");
				const result = await authApi.refresh(); // GET /auth/refresh
				if (result.ok && result.data?.access_token) {
					const newToken = result.data.access_token;
					await SecureStore.setItemAsync("access_token", newToken);

					// Retry queued requests
          queuedRequests.forEach((cb) => cb(newToken));
          queuedRequests = [];

					// Retry original failed request
					originalRequest.header.Authorization = `Bearer ${newToken}`;
					return api(originalRequest);
				}
				else {
					queuedRequests = [];
					await SecureStore.deleteItemAsync("access_token");
					return Promise.reject(error);
				}
			}
			catch (refreshError) {
				queuedRequests = [];
				await SecureStore.deleteItemAsync("access_token");
				return Promise.reject(refreshError);
			}
			finally {
				isRefreshing = false;
			}
		}
		return Promise.reject(error);
	}
);
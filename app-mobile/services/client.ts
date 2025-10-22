import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BASE_URL =
	Platform.OS === "android"
		? "http://10.0.2.2:80"   // Android emulator → local FastAPI
		: "http://localhost:8000"; // iOS simulator
export const api = axios.create({
	baseURL: BASE_URL,
	headers: { "Content-Type": "application/json" },
	// Set a reasonable timeout so requests fail instead of hanging forever
	timeout: 10000, // 10 seconds
});

// Auto-Injection authorization header
api.interceptors.request.use(async (config) => {
	const token = await SecureStore.getItemAsync("access_token")
	if (token) { config.headers.Authorization = `Bearer ${token}` };
	return config;
});

// Response interceptor to handle/log network errors centrally
api.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error("API request failed:", error?.message || error);
		if (error?.code === 'ECONNABORTED' || !error?.response) {
			return Promise.reject(new Error("Network error or timeout"));
		}
		return Promise.reject(error);
	}
);
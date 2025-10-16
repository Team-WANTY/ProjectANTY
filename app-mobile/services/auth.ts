import { api } from "./client";
import * as SecureStore from "expo-secure-store"; // to store access token

export type CallResult<T = any> = {
	ok: boolean;
	data?: T;
	status?: number;
	error?: string;
	detail?: any;
};

function extractDetail(data: any) {
	if (!data) return undefined;
	if (typeof data.detail === "string") return data.detail;                 // FastAPI: {"detail": "..."}
	if (Array.isArray(data.detail)) {                                        // FastAPI: {"detail":[{msg: "..."}]}
		return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
	}
	return data.message || JSON.stringify(data);
}


// Register
export async function registerUser(username: string, password: string, email: string): Promise<CallResult> {
	try {
		const payload = { username, email, plain_text_password: password };
		const result = await api.post("/auth/auth/register", payload);
		const ok = result.status >= 200 && result.status < 300;
		return { ok, status: result.status, data: result.data, error: ok ? undefined : extractDetail(result.data) };
	}
	catch (err: any) {
		const status = err?.response?.status;
		const detail = err?.response?.data;
		return { ok: false, status, error: extractDetail(detail), detail };
	}
}

// Login
export async function loginUser(username: string, password: string): Promise<CallResult> {
	try {
		const form = new URLSearchParams();
		form.append("username", username);
		form.append("password", password);

		const result = await api.post("/auth/auth/login", form, {
			headers: { "Content-Type": "application/x-www-form-urlencoded" }
		});

		const ok = result.status === 200 && !!result.data?.access_token;
		if (ok) {
			await SecureStore.setItemAsync("access_token", result.data.access_token);
			return { ok: true, status: result.status, data: result.data };
		}
		else {
			await SecureStore.deleteItemAsync("access_token");
			return { ok: false, status: result.status, error: extractDetail(result.data), detail: result.data };
		}
	}
	catch (err: any) {
		await SecureStore.deleteItemAsync("access_token");
		const status = err?.response?.status;
		const detail = err?.response?.data;
		return { ok: false, status, error: extractDetail(detail), detail };
	}
}

// Validate log in by calling protected route /users/me
export async function getCurrentUser() {
	return api.get("/auth/users/me");
}
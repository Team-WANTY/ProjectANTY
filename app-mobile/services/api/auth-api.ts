// app-mobile/services/api/auth-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";
import { secureStoreToken, maskToken } from "../storage/access-token";

// Endpoints for authentication
const paths = {
  login: "/auth/login",
  register: "/auth/register",
  request_password_reset: "/auth/request-password-reset",
  reset_password: "/auth/reset-password",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  update: "/auth/",  
} as const;

export type ChangePassword = {id: string, plain_text_password: string};
export type LoginResponse = { access_token: string; token_type?: "bearer"  };

export const authApi = {
  //  POST /auth/login 
  async login(username: string, password: string): Promise<ApiResult<LoginResponse>> {
    try {
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);

      const res = await api.post<LoginResponse>(paths.login, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const token = res.data?.access_token;
      if (!token) {
        await secureStoreToken.clear();
        return { ok: false, status: res.status, message: "Login failed" };
      }

      console.log("Access Token:", maskToken(token, 6)); // Debugging
      await secureStoreToken.set(token);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
    } 
    catch (error: any) {
      await secureStoreToken.clear();
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Username or password is incorrect"
          : status === 403 ? "User is inactive"
          : status === 404 ? "User not found"
          : status && status >= 500
          ? "Server error. Please try again."
          : toMessage(data, "Login failed");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /auth/logout
 async logout(): Promise<ApiResult<void>> {
    try {
      const res = await api.post(paths.logout);
      const token = res.data?.access_token;
      await secureStoreToken.clear();

      // Debugging
      console.log("Access token cleared");
      console.log("Access Token:", maskToken(token, 6));

      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: undefined
      };
    } 
    catch (error: any) {
      await secureStoreToken.clear();
      const status = error?.response?.status;
      const data = error?.response?.data;
      return { ok: false, status, message: toMessage(data, "Logout failed"), detail: data };
    }
  },

  // POST /auth/request-password-reset
  async requestForgetPassword(email: string): Promise<ApiResult<void>> {
    try {
      const url = `${paths.request_password_reset}?email=${encodeURIComponent(email.trim())}`;
      const res = await api.post<{ message?: string }>(url);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: undefined
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 400 ? toMessage(data, "Invalid email")
          : status === 404 ? "No account found with that email"
          : status === 429 ? "Too many requests. Try again later."
          : status && status >= 500 ? "Server error. Please try again."
          : toMessage(data, "Couldn't send reset email");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /auth/reset-password 
  async resetPassword(token: string, newPassword: string): Promise<ApiResult<void>> {
    try {
      const res = await api.post<{ message?: string }>(paths.reset_password, {
        token,
        new_password: newPassword,
      });
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: undefined
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 400 ? "Invalid or malformed reset token"
          : status === 401 ? "Your reset link has expired. Please request a new one."
          : status && status >= 500 ? "Server error. Please try again."
          : toMessage(data, "Password reset failed");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /auth/register 
  async register(email: string, username: string, password: string): Promise<ApiResult<void>> {
    try {
      const res = await api.post<unknown>(paths.register, {
        email,
        username,
        plain_text_password: password,
      });
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: undefined 
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 400
          ? toMessage(data, "Invalid input")
          : status === 403
          ? "Username or email already exists"
          : toMessage(data, "Registration failed");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /auth/refresh
  async refresh(): Promise<ApiResult<LoginResponse>> {
    try {
      const res = await api.get<LoginResponse>(paths.refresh);
      const token = res.data?.access_token;
    
      if (!token) {
        await secureStoreToken.clear();
        return {ok: false, status: res.status, message: "Refresh failed"};
      }
      
      await secureStoreToken.set(token);

      // Debugging
      console.log("New access token set");
      console.log("Access Token:", maskToken(token, 6));
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
    }
    catch (error: any) {
      await secureStoreToken.clear();
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = 
        status === 401 ? "Expired or missing refresh token"
        : status === 403 ? "Invalid token type"
        : toMessage(data, "Failed to refresh session");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH /auth
  async update(body: Partial<ChangePassword>): Promise<ApiResult<ChangePassword>> {
    try {
      const id = (body as any).id;
      if (!id) {
        return {ok: false, status: 400, message: "id field is required in body"};
      }
      const payload: Record<string, any> = {id};
      if (body.plain_text_password !== undefined) payload.plain_text_password = body.plain_text_password;

      const res = await api.patch(paths.update, payload);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        detail: res.data?.detail,
        data: res.data 
      };

    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
        : toMessage(data, "Failed to change password");
      return {ok: false, status, message: msg, detail: data};
    }
  },
};

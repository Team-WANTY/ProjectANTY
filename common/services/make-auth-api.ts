import type { HttpClient } from "../http/http-client";
import type { ApiResult } from "../http/types";
import { toMessage } from "../http/types";
import type { TokenStore } from "../auth/token-store";

// Endpoints for authentication
export type AuthPaths = {
    login: string;        // POST
    register: string;     // POST
    // refresh?: string;     // POST 
};

const defaultPaths: AuthPaths = {
    login: "/auth/login",
    // refresh: "/auth/refresh",
    register: "/auth/register"
};  

export function makeAuthApi(http: HttpClient, tokens: TokenStore, paths: AuthPaths = defaultPaths) {
    return {
        // POST /auth/login
        async login(username: string, password: string): Promise<ApiResult<{ access_token: string }>> {
        try {
            // Form-URL-encoded to match FastAPI OAuth2PasswordRequestForm
            const body = new URLSearchParams();
            body.append("username", username);
            body.append("password", password);

            const res = await http.post<{ access_token: string }>(paths.login, body, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });

            const token = res.data?.access_token;
            if (!token) {
                await tokens.clear();
                return { ok: false, status: res.status, message: "Login failed" };
            }
            await tokens.set(token);
            return { ok: true, status: res.status, data: res.data };
        } 
        catch (error: any) {
            await tokens.clear();
            const status = error?.response?.status;
            const data   = error?.response?.data;
            const msg =
                status === 401 ? "Username or password is incorrect" :
                status && status >= 500 ? "Server error. Please try again." :
            toMessage(data, "Login failed");
            return { ok: false, status, message: msg, detail: data };
        }
        },
        
        // log out
        async logout(): Promise<ApiResult<void>> {
            await tokens.clear();
            return { ok: true, status: 200, data: undefined };
        },

        //POST /auth/register
        async register(
            email: string,
            username: string,
            password: string
        ): Promise<ApiResult<void>> {
            if (!paths.register) return { ok: false, message: "REGISTER endpoint not configured" };

            try {
                const res = await http.post<unknown>(paths.register, {
                    email,
                    username,
                    plain_text_password: password,
                    });

                return { ok: true, status: res.status, data: undefined };
            } 
            catch (error: any) {
                const status = error?.response?.status;
                const data   = error?.response?.data;
                // console.log("Register failed:", error?.response?.data);
                const msg =
                    status === 400 ? toMessage(data, "Invalid input")
                    : status === 409 ? "Username or email already exists"
                    : toMessage(data, "Registration failed");
                return { ok: false, status, message: msg, detail: data };
            }
        },

        
        /*
        async refresh(): Promise<ApiResult<{ access_token: string }>> {
        if (!paths.refresh) return { ok: false, message: "Refresh endpoint not configured" };
        try {
            const res = await http.post<{ access_token: string }>(paths.refresh, {});
            const token = res.data?.access_token;
            if (!token) return { ok: false, status: res.status, message: "Refresh failed" };
            await tokens.set(token);
            return { ok: true, status: res.status, data: res.data };
        } catch (error: any) {
            const status = error?.response?.status;
            const data   = error?.response?.data;
            return { ok: false, status, message: toMessage(data, "Refresh failed"), detail: data };
        }
        },
        */
    };
}

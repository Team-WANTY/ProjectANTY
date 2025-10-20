// common/services/make-users-api.ts
import type { HttpClient } from "../http/http-client";
import type { ApiResult } from "../http/types";
import { toMessage } from "../http/types";

// Endpoints for users
export type UsersPaths = {
	me?: string;                 // GET current user        -> "/users/me"
	byId?: string;               // GET/DELETE by id (tpl)  -> "/users/{user_id}"
	update?: string             // PATCH current user      -> "/users/"
};

const defaultPaths: UsersPaths = {
	me: "/users/me",
	byId: "/users/{user_id}",
	update: "/users/",
};

// helper to fill {user_id}
function fillId(tpl: string, id: string) {
  	return tpl.replace("{user_id}", encodeURIComponent(id));
}

// Keep the returned user type generic
export type SimpleUser = { id: string; username: string; email: string };

export function makeUsersApi<TUser = SimpleUser, TUpdate extends object = Partial<TUser>>(
	http: HttpClient,
	paths: UsersPaths = defaultPaths
) {
  	return {
		/** GET /users/me */
		async me(): Promise<ApiResult<TUser>> {
			if (!paths.me) return { ok: false, message: "ME endpoint not configured" };
			try {
				const res = await http.get<TUser>(paths.me);
				return { ok: true, status: res.status, data: res.data };
			} 
			catch (error: any) {
				const status = error?.response?.status;
				const data   = error?.response?.data;
				return { ok: false, status, message: toMessage(data, "Failed to load current user"), detail: data };
			}
		},

		/** GET /users/{user_id} */
		async getById(userId: string): Promise<ApiResult<TUser>> {
			if (!paths.byId) return { ok: false, message: "BY-ID endpoint not configured" };
			try {
				const res = await http.get<TUser>(fillId(paths.byId, userId));
				return { ok: true, status: res.status, data: res.data };
			} 
			catch (error: any) {
				const status = error?.response?.status;
				const data   = error?.response?.data;
				const msg = status === 404 ? "User not found" : toMessage(data, "Failed to load user");
				return { ok: false, status, message: msg, detail: data };
			}
		},

		/** DELETE /users/{user_id} */
		async remove(userId: string): Promise<ApiResult<void>> {
			if (!paths.byId) return { ok: false, message: "BY-ID endpoint not configured" };
			try {
				const res = await http.delete(fillId(paths.byId, userId));
				return { ok: true, status: res.status, data: undefined };
			} 
			catch (error: any) {
				const status = error?.response?.status;
				const data   = error?.response?.data;
				const msg = status === 404 ? "User not found" : toMessage(data, "Failed to delete user");
				return { ok: false, status, message: msg, detail: data };
			}
		},

		/** PATCH /users/  (updates the *current* user based on auth token) */
		async update(body: TUpdate): Promise<ApiResult<TUser>> {
			if (!paths.update) return { ok: false, message: "UPDATE endpoint not configured" };
			try {
				const res = await http.patch<TUser>(paths.update, body);
				return { ok: true, status: res.status, data: res.data };
			} 
			catch (error: any) {
				const status = error?.response?.status;
				const data   = error?.response?.data;
				return { ok: false, status, message: toMessage(data, "Failed to update user"), detail: data };
			}
		},
  	};
}

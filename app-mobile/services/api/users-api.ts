// app-mobile/services/users-api.ts
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";
import { api } from "../http/client";

const paths = {
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

export const usersApi = {
  // /me
  async me(): Promise<ApiResult<SimpleUser>> {
    try {
      const res = await api.get(paths.me);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };

    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      return {ok: false, status, message: toMessage(data, "Failed to load current user"), detail: data};
    }
  },

  // /{user_id}
  async getById(userId: string): Promise<ApiResult<SimpleUser>> {
    try {
      const res = await api.get(fillId(paths.byId, userId));
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status === 404 ? "User not found" : toMessage(data, "Failed to load user");
      return {ok: false, status, message: msg, detail:data };
    }
  },

  async remove(userId: string): Promise<ApiResult<SimpleUser>> {
    try {
      const res = await api.delete(fillId(paths.byId, userId));
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status === 404 ? "User not found" : toMessage(data, "Failed to delete user");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH require user_id in JSON body
  async update(body: Partial<SimpleUser>): Promise<ApiResult<SimpleUser>> {
    try {
      const id = (body as any).id;
      if (!id) {
        return {ok: false, status: 400, message: "id field is required in body"};
      }
      const payload: Record<string, any> = { id };
      if (body.username !== undefined) payload.username = body.username;
      if (body.email !== undefined) payload.email = body.email;
      
      const res = await api.patch(paths.update, payload);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated or not enough permissions"
        : toMessage(data, "Failed to update user");
      return { ok: false, status, message: msg, detail: data };
    }
  },
}
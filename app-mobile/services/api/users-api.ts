// app-mobile/services/users-api.ts
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";
import { api } from "../http/client";

const paths = {
	me: "/users/me",
  byUsername: "/users/username/{username}", // GET IDs from partial username
  publicById: "/users/public/id/{user_id}", // GET username from ID
	update: "/users", // POST PATCH
  delete: "/users/{user_id}" // DELETE
};

// helper to fill {user_id}
function fillId(tpl: string, id: string) {
  	return tpl.replace("{user_id}", encodeURIComponent(id));
}

function fillUsername(tpl: string, username: string) {
  	return tpl.replace("{username}", encodeURIComponent(username));
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

  // GET username from ID
  async getPublicById(userId: string): Promise<ApiResult<SimpleUser>> {
    try {
      const res = await api.get(fillId(paths.publicById, userId));
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 404 ? "User not found" : toMessage(data, "Failed to load user");
      return { ok: false, status, message: msg, detail: data };
    }
  },
  // GET /users/username/{username} implemented by assuming client will always do exact match username
  async getByUsername(username: string): Promise<ApiResult<SimpleUser>> {
    try {
      const searchUrl = `/users/search/${encodeURIComponent(username)}`;
      const res = await api.get(searchUrl, {
        params: {
          max_items: 1,
          continuation_token: ""   // always blank for first call
        }
      });

      // Response format: [ ["userId"], continuationToken ]
      const [ids] = res.data;
      if (!ids || ids.length === 0) {
        return {
          ok: false,
          status: 404,
          message: "User not found",
        };
      }

      const userId = ids[0];

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
      const res = await api.delete(fillId(paths.delete, userId));
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
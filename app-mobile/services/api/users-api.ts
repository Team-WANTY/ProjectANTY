// app-mobile/services/users-api.ts
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";
import { api } from "../http/client";

const paths = {
	me: "/users/me",
  byUsername: "/users/search/{partial_username}", // GET IDs from partial username
  byID: "users/id/{user_id}", // GET username from ID
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

export type SearchUsersResult = {
    ids: string[];
    continuationToken: string | null;
};

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
  async getById(userId: string): Promise<ApiResult<SimpleUser>> {
    try {
      const res = await api.get(fillId(paths.byID, userId));
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

  // GET /users/username/{username}
  async getByUsername(username: string): Promise<ApiResult<string>> {
    try {
      const searchUrl = `/users/search/${encodeURIComponent(username)}`;
      const res = await api.get<[string[], string]>(searchUrl, {
        params: {
          max_items: 5,
          continuation_token: "", // first page only
        },
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

      if (!userId || typeof userId !== "string") {
        console.error(
          "[usersApi.getByUsername] Invalid id returned:",
          userId,
          res.data
        );
        return {
          ok: false,
          status: 500,
          message: "Invalid user id returned from server.",
        };
      }

      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: userId 
      };
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status === 404 ? "User not found" : toMessage(data, "Failed to load user");
      return {ok: false, status, message: msg, detail:data };
    }
  },

  async searchByUsernamePart(partial: string): Promise<ApiResult<SearchUsersResult>> {
    try {
      const searchUrl = `/users/search/${encodeURIComponent(partial)}`;
      const res = await api.get<[string[], string | null]>(searchUrl, {
        params: {
          max_items: 10,            
          continuation_token: "",   // first page only for now
        },
      });

      const raw = res.data ?? [[], null];
      const ids = Array.isArray(raw[0]) ? raw[0] : [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: {
          ids,
          continuationToken: token,
        },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = toMessage(data, "Failed to search users");
      return { ok: false, status, message: msg, detail: data };
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
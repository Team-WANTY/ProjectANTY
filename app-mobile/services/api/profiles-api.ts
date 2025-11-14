// app-mobile/services/profiles-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  byId: "/profiles/{user_id}", // GET, PATCH, DELETE
} as const;

// helper to fill {user_id}
function fillId(tpl: string, id: string) {
  return tpl.replace("{user_id}", encodeURIComponent(id));
}


// App-level simplified shape for typical screens
export type SimpleProfile = { bio?: string };

// PATCH body must include user_id per backend 
export type ProfileUpdateBody = { user_id: string } & Partial<SimpleProfile> & {
  // future fields
  avatar_image_id?: string;
  unlocked_badges?: string[];
  unlocked_analytics?: string[];
  equipped_badges?: string[];
  equipped_analytics?: string[];
};


export const profileApi = {
  // GET /profiles/{user_id}
  async getById(userId: string): Promise<ApiResult<SimpleProfile>> {
    try {
      const res = await api.get<SimpleProfile>(fillId(paths.byId, userId));
      return { ok: true, status: res.status, data: res.data };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status === 404 ? "Profile not found" : toMessage(data, "Failed to load profile");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH /profiles/{user_id}
  // NOTE: server requires user_id in the body for authorization;
  async update(userId: string, body: Partial<SimpleProfile>): Promise<ApiResult<SimpleProfile>> {
    try {
      const payload: ProfileUpdateBody = { user_id: userId, ...body };
      const res = await api.patch<SimpleProfile>(fillId(paths.byId, userId), payload);
      return { ok: true, status: res.status, data: res.data };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated or not enough permissions"
        : status === 404 ? "Profile not found"
        : toMessage(data, "Failed to update profile");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // DELETE /profiles/{user_id}
  async remove(userId: string): Promise<ApiResult<void>> {
    try {
      const res = await api.delete(fillId(paths.byId, userId));
      return { ok: true, status: res.status, data: undefined };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status === 404 ? "Profile not found" : toMessage(data, "Failed to delete profile");
      return { ok: false, status, message: msg, detail: data };
    }
  },
};

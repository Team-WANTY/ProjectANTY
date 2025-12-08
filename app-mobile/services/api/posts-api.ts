// app-mobile/services/api/posts-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  root: "/posts",                      // POST, PATCH
  byId: "/posts/{post_id}",            // GET, DELETE
  byUserId: "/posts/user/{user_id}",   // GET paginated IDs
  relevantForUser: "/posts/relevant/{user_id}", // GET paginated IDs
} as const;

function fillPostId(tpl: string, postId: string) {
  return tpl.replace("{post_id}", encodeURIComponent(postId));
}

function fillUserId(tpl: string, userId: string) {
  return tpl.replace("{user_id}", encodeURIComponent(userId));
}

export type Post = {
  id: string;
  creator_id: string;
  text: string;
  liker_ids: string[];
  created_at: string;   // ISO datetime
  updated_at: string;   // ISO datetime
  image_ids: string[];
  allow_comments: boolean;
};

export type NewPost = {
  creator_id: string;
  text: string;
  image_ids?: string[];
  allow_comments: boolean;
};

export type PostLikerUpdate = {
  id: string;
  like: boolean;
};

export type PostUpdateBody = {
  id: string;
  text?: string | null;
  liker?: PostLikerUpdate | null;
  image_ids?: string[] | null;
};

export type IdPage = {
  ids: string[];
  continuationToken: string | null;
};

export const postsApi = {
  // POST /posts
  async create(body: NewPost): Promise<ApiResult<string>> {
    try {
      const res = await api.post<string>(paths.root, body);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Post created",
        data: res.data,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 400
          ? "Invalid post data"
          : status === 401
          ? "Not authenticated"
          : status === 403
          ? "Not allowed to create post"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to create post");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /posts/{post_id}
  async getById(postId: string): Promise<ApiResult<Post>> {
    try {
      const url = fillPostId(paths.byId, postId);
      const res = await api.get<Post>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Post loaded",
        data: res.data,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Post not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load post");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /posts/user/{user_id}?max_items=&continuation_token=
  // Returns [string[], string | null] on the wire -> IdPage in the app
  async listForUser(
    userId: string,
    maxItems = 10,
    continuationToken?: string | null
  ): Promise<ApiResult<IdPage>> {
    try {
      const url = fillUserId(paths.byUserId, userId);
      const res = await api.get<[string[], string | null]>(url, {
        params: {
          max_items: maxItems,
          continuation_token: continuationToken ?? undefined,
        },
      });

      const raw = res.data ?? [[], null];
      const ids = raw[0] ?? [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded posts",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "No posts found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load posts");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /posts/relevant/{user_id}?max_items=&continuation_token=&timestamp=
  async listRelevantForUser(
    userId: string,
    options?: {
      maxItems?: number;
      continuationToken?: string | null;
      timestamp?: string | null; // ISO datetime to fetch only newer posts
    }
  ): Promise<ApiResult<IdPage>> {
    try {
      const { maxItems = 10, continuationToken, timestamp } = options ?? {};
      const url = fillUserId(paths.relevantForUser, userId);

      const res = await api.get<[string[], string | null]>(url, {
        params: {
          max_items: maxItems,
          continuation_token: continuationToken ?? undefined,
          timestamp: timestamp ?? undefined,
        },
      });

      const raw = res.data ?? [[], null];
      const ids = raw[0] ?? [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded relevant posts",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;
      if (status === 404) {
            return {
                ok: true,
                status,
                message: "No newer posts",
                data: { ids: [], continuationToken: null },
            };
        }
      const msg =
        status === 401
          ? "Not authenticated"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load relevant posts");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH /posts
  async update(body: PostUpdateBody): Promise<ApiResult<null>> {
    try {
      const id = body.id;
      if (!id) {
        return {
          ok: false,
          status: 400,
          message: "id field is required in body",
        };
      }

      const payload: Record<string, any> = {};
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined) {
          payload[key] = value;
        }
      });

      const res = await api.patch<void>(paths.root, payload);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Post updated",
        data: null,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 400
          ? "Invalid post update payload"
          : status === 401
          ? "Not authenticated"
          : status === 404
          ? "Post not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to update post");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // DELETE /posts/{post_id}
  async remove(postId: string): Promise<ApiResult<null>> {
    try {
      const url = fillPostId(paths.byId, postId);
      const res = await api.delete<void>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Post deleted",
        data: null,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Post not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to delete post");

      return { ok: false, status, message: msg, detail: data };
    }
  },
};

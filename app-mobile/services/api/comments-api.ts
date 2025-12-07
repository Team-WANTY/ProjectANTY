// app-mobile/services/api/comments-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  root: "/comments",                       // POST, PATCH
  byId: "/comments/{comment_id}",          // GET, DELETE
  byContentId: "/comments/content/{id}",   // GET paginated IDs
} as const;

function fillCommentId(tpl: string, id: string) {
  return tpl.replace("{comment_id}", encodeURIComponent(id));
}

function fillContentId(tpl: string, id: string) {
  return tpl.replace("{id}", encodeURIComponent(id));
}

export type ContentType = "post" | "comment";

export type Comment = {
  id: string;
  creator_id: string;
  text: string;
  liker_ids: string[];
  parent_content_id: string;
  parent_content_type: ContentType;
  created_at: string;  // ISO datetime
  updated_at: string;  // ISO datetime
};

export type CommentCreateBody = {
  creator_id: string;
  text: string;
  parent_content_id: string;
  parent_content_type: ContentType;
};

export type CommentLikerUpdate = {
  id: string;
  like: boolean;
};

export type CommentUpdateBody = {
  id: string;
  text?: string | null;
  liker?: CommentLikerUpdate | null;
};

export type IdPage = {
  ids: string[];
  continuationToken: string | null;
};

export const commentsApi = {
  // POST /comments
  async create(body: CommentCreateBody): Promise<ApiResult<string>> {
    try {
      const res = await api.post<string>(paths.root, body);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Comment created",
        data: res.data,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 400
          ? "Invalid comment data"
          : status === 401
          ? "Not authenticated"
          : status === 403
          ? "Not allowed to create comment"
          : status === 404
          ? "Parent content not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to create comment");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /comments/{comment_id}
  async getById(commentId: string): Promise<ApiResult<Comment>> {
    try {
      const url = fillCommentId(paths.byId, commentId);
      const res = await api.get<Comment>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Comment loaded",
        data: res.data,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Comment not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load comment");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /comments/content/{id}?limit=&continuation=
  // Returns [string[], string | null] on the wire -> IdPage
  async listForContent(
    contentId: string,
    maxItems = 10,
    continuationToken?: string | null
  ): Promise<ApiResult<IdPage>> {
    try {
      const url = fillContentId(paths.byContentId, contentId);
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
        message: res.statusText || "Loaded comments",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "No comments found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load comments");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH /comments
  async update(body: CommentUpdateBody): Promise<ApiResult<null>> {
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
        message: res.statusText || "Comment updated",
        data: null,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 400
          ? "Invalid comment update payload"
          : status === 401
          ? "Not authenticated"
          : status === 404
          ? "Comment not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to update comment");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // DELETE /comments/{comment_id}
  async remove(commentId: string): Promise<ApiResult<null>> {
    try {
      const url = fillCommentId(paths.byId, commentId);
      const res = await api.delete<void>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Comment deleted",
        data: null,
      };
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Comment not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to delete comment");

      return { ok: false, status, message: msg, detail: data };
    }
  },
};

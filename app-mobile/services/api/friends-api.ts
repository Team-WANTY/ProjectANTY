import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  // Send / accept friend requests
  request: "/friends/request",
  requestRoot: "/friends/request/{request_id}",

  // Paginated lists
  incoming: "/friends/incoming",
  outgoing: "/friends/outgoing",
  list: "/friends",

  // Single friendship + search
  id: "/friends/id/{friendship_id}",
  search: "/friends/search/{friend_id}",

  // Unfriend (by other user's ID)
  delete: "/friends/{friend_id}",
};


// helper to fill {friend_id}
function fillFriendId(tpl: string, id: string) {
  	return tpl.replace("{friend_id}", encodeURIComponent(id));
}

// helper to fill {request_id}
function fillRequestId(tpl: string, id: string) {
  	return tpl.replace("{request_id}", encodeURIComponent(id));
}

// helper to fill {friendship_id}
function fillFriendshipId(tpl: string, id: string) {
  return tpl.replace("{friendship_id}", encodeURIComponent(id));
}

export type FriendRequestStatus = "pending" | "accepted";
export type FriendRequestCreate = {
  to_user_id: string,
}

export type Friendship = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: Date;
  updated_at: Date;
};


export type IdPage = {
  ids: string[];
  continuationToken: string | null;
};

export const friendsApi = {
  // POST /friends/request/{to_user_id}
  async create(toUserId: string): Promise<ApiResult<null>> {
    if (
      !toUserId ||
      typeof toUserId !== "string" ||
      toUserId === "undefined" ||
      toUserId === "null"
    ) {
      console.error("[friendsApi.create] Invalid toUserId:", toUserId);
      return {
        ok: false,
        status: 400,
        message: "Invalid friend id.",
        detail: null,
      };
    }
    
    try {
      const url = `${paths.request}/${encodeURIComponent(toUserId)}`;
      const res = await api.post<void>(url);
      return {
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: null,
      }
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = 
        status === 401 ? "Not authenticated"
        : status === 403 ? "Pending friend request already exist"
        : status && status >= 500 ? "Server error"
        : toMessage(data, "Failed to send friend request");
      return {ok: false, status, message: msg, detail: data};
    }
  },

  // GET /friends/incoming?limit=&continuation=
  async listIncoming(
    limit = 10,
    continuation?: string | null
  ): Promise<ApiResult<IdPage>> {
    try {
      const res = await api.get<[string[], string | null]>(paths.incoming, {
        params: {
          limit,
          continuation: continuation ?? undefined,
        },
      });

      const raw = res.data ?? [[], null];
      const ids = raw[0] ?? [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded incoming friend requests",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "No incoming requests found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load incoming friend requests");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /friends/outgoing?limit=&continuation=
  async listOutgoing(
    limit = 10,
    continuation?: string | null
  ): Promise<ApiResult<IdPage>> {
    try {
      const res = await api.get<[string[], string | null]>(paths.outgoing, {
        params: {
          limit,
          continuation: continuation ?? undefined,
        },
      });

      const raw = res.data ?? [[], null];
      const ids = raw[0] ?? [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded outgoing friend requests",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "No outgoing requests found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load outgoing friend requests");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /friends/request/{request_id}/accept
  async accept(requestId: string): Promise<ApiResult<null>> {
    try {
      const url = fillRequestId(`${paths.requestRoot}/accept`, requestId);
      const res = await api.post<void>(url);

      return {
        ok: true,
        status: res.status,
        message: "Friend request accepted",
        data: null,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friendship not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to accept friend request");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /friends/requests/{request_id}/decline
  async decline(requestId: string): Promise<ApiResult<null>> {
    try {
      const url = fillRequestId(`${paths.requestRoot}/decline`, requestId);
      const res = await api.post<void>(url);

      return {
        ok: true,
        status: res.status,
        message: "Friend request declined",
        data: null,
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friend request not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to decline friend request");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /friends/requests/{request_id}/cancel
  async cancel(requestId: string): Promise<ApiResult<null>> {
    try {
      const url = fillRequestId(`${paths.requestRoot}/cancel`, requestId);
      const res = await api.post<void>(url);
      return {
        ok: true,
        status: res.status,
        message: "Friend request declined",
        data: null,
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friend request not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to cancel friend request");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /friends/me?limit=&continuation=
  async listFriends(
    limit = 10,
    continuation?: string | null
  ): Promise<ApiResult<IdPage>> {
    try {
      const res = await api.get<[string[], string | null]>(paths.list, {
        params: {
          limit,
          continuation: continuation ?? undefined,
        },
      });

      const raw = res.data ?? [[], null];
      const ids = raw[0] ?? [];
      const token = raw[1] ?? null;

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded friendships",
        data: { ids, continuationToken: token },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "No friendships found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load friendships");

      return { ok: false, status, message: msg, detail: data };
    }
  },
 
  // GET /friends/id/{friendship_id} get friendship document
  async getById(friendshipId: string): Promise<ApiResult<Friendship>> {
    try {
      const url = fillFriendshipId(paths.id, friendshipId);
      const res = await api.get<Friendship>(url);

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded friendship",
        data: res.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friendship not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load friendship");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /friends/search/{friend_id}
  // Returns the friendship ID if a relationship exists between the current user and friend_id
  async findFriendship(friendId: string): Promise<ApiResult<string>> {
    try {
      const url = fillFriendId(paths.search, friendId);
      const res = await api.get<string>(url);

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Friendship found",
        data: res.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friendship not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to search friendship");

      return { ok: false, status, message: msg, detail: data };
    }
  },


  // DELETE /friends/{friend_id}
  async unfriend(friendId: string): Promise<ApiResult<null>> {
    try {
      const res = await api.delete<void>(fillFriendId(paths.delete, friendId));
      return {
        ok: true,
        status: res.status,
        message: "Friend removed",
        data: null,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Friendship not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to remove friend");

      return { ok: false, status, message: msg, detail: data };
    }
  },

}
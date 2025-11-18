import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  request: "/friends/requests",
  root: "/friends/requests/{request_id}",
  incoming: "/friends/requests/incoming",
  outgoing: "/friends/requests/outgoing",
  me: "/friends/me",
  status: "/friends/status",
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

export type FriendRequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export type FriendRequestCreate = {
  to_user_id: string,
}

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: number;
  updated_at: number;
};

export type Friendship = {
  id: string;
  owner_id: string;
  friend_id: string;
  created_at: number;
};

export type RelationshipStatus = {
  is_self: boolean;
  are_friends: boolean;
  incoming_request: FriendRequest | null;
  outgoing_request: FriendRequest | null;
};

export type FriendListResponse = {
  friends: Friendship[];
  continuationToken?: string | null;
};

export const friendsApi = {
  // friend_request
  async create(body: Partial<FriendRequestCreate>): Promise<ApiResult<FriendRequest>> {
    try {
      const res = await api.post<FriendRequest>(paths.request, body);
      return {
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
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

  // GET /friends/requests/incoming
  async listIncoming(status: FriendRequestStatus | null = "pending"): Promise<ApiResult<FriendRequest[]>> {
    try {
      const res = await api.get<FriendRequest[]>(paths.incoming, {
        params: {
          status_param: status ?? undefined,
        },
      })

      return {
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      }
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = 
        status === 401 ? "Not authenticated"
        : status === 403 ? "No incoming Requests found"
        : status && status >= 500 ? "Server error"
        : toMessage(data, "Failed to fetch incoming requests");
      return {ok: false, status, message: msg, detail: data};
    }
  },

  // GET /friends/requests/outgoing
  async listOutgoing(status: FriendRequestStatus | null = "pending"): Promise<ApiResult<FriendRequest[]>> {
    try {
      const res = await api.get<FriendRequest[]>(paths.outgoing, {
        params: {
          status_param: status ?? undefined,
        },
      })

      return {
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      }
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = 
        status === 401 ? "Not authenticated"
        : status === 403 ? "No incoming Requests found"
        : status && status >= 500 ? "Server error"
        : toMessage(data, "Failed to fetch incoming requests");
      return {ok: false, status, message: msg, detail: data};
    }
  },

  // POST /friends/requests/{request_id}/accept
  async accept(requestId: string): Promise<ApiResult<null>> {
    try {
      const url = fillRequestId(`${paths.root}/accept`, requestId);
      const res = await api.post<void>(url);

      return {
        ok: true,
        status: res.status,
        message: "Friend request accepted",
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
          : toMessage(data, "Failed to accept friend request");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // POST /friends/requests/{request_id}/decline
  async decline(requestId: string): Promise<ApiResult<null>> {
    try {
      const url = fillRequestId(`${paths.root}/decline`, requestId);
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
      const url = fillRequestId(`${paths.root}/cancel`, requestId);
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
  async listFriends(limit = 10, continuation?: string | null): Promise<ApiResult<FriendListResponse>> {
    try {
      const res = await api.get<FriendListResponse>(paths.me, {
        params: {
          limit,
          continuation: continuation ?? undefined,
        },
      });

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded friends",
        data: res.data,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load friends");

      return { ok: false, status, message: msg, detail: data };
    }
  },

  // DELETE /{friend_id}
  async unfriend(friendId: string): Promise<ApiResult<null>> {
    try {
      const res = await api.delete<void>(fillFriendId(paths.delete,friendId));
      return {
        ok: true,
        status: res.status,
        message: "Friend removed",
        data: null,
      };
    }
    catch (error: any) {
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

      return { ok: false, status, message: msg, detail: data};
    }
  },

  // GET /friends/status?user_id=
  async getStatus(userId: string): Promise<ApiResult<RelationshipStatus>> {
    try {
      const res = await api.get<RelationshipStatus>(paths.status, {
        params: { user_id: userId },
      });

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Loaded relationship status",
        data: res.data,
      };
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      const msg =
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "User or relationship not found"
          : status && status >= 500
          ? "Server error"
          : toMessage(data, "Failed to load relationship status");

      return { ok: false, status, message: msg, detail: data };
    }
  },
}
// services/stores/friends-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "../storage/async-storage";
import type { Friendship } from "../api/friends-api";


export type FriendUserInfo = {
  id: string;
  username: string;
  avatarUrl: string | null;
};


export type DisplayFriend = Friendship & {
  friendUserId: string;
  user: FriendUserInfo;
};

export type FriendsState = {
  friends: DisplayFriend[];
  friendCount: number;
  lastFriendSaveAt: number | null;

  // Bulk replace (after fetching & enriching from /friends → ids)
  setFriends: (friends: DisplayFriend[]) => void;

  // Optimistic insert (e.g. after accepting a request)
  addFriend: (friend: DisplayFriend) => void;

  // Remove by friend user id (friend_id or user.id)
  removeFriend: (friendUserId: string) => void;

  clear: () => void;
};

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set) => ({
      friends: [],
      friendCount: 0,
      lastFriendSaveAt: null,

      setFriends: (friends) =>
        set({
          friends,
          friendCount: friends.length,
          lastFriendSaveAt: Date.now(),
        }),

      addFriend: (friend) =>
        set((state) => {
          const exists = state.friends.some(
            (f) =>
              f.friendUserId === friend.friendUserId ||
              f.user.id === friend.user.id
          );
          if (exists) return state;

          const next = [...state.friends, friend];
          return {
            friends: next,
            friendCount: next.length,
            lastFriendSaveAt: Date.now(),
          };
        }),

      removeFriend: (friendUserId) =>
        set((state) => {
          const next = state.friends.filter(
            (f) => f.friendUserId !== friendUserId && f.user.id !== friendUserId
          );
          return {
            friends: next,
            friendCount: next.length,
            lastFriendSaveAt: Date.now(),
          };
        }),

      clear: () => ({
        friends: [],
        friendCount: 0,
        lastFriendSaveAt: null,
      }),
    }),
    {
      name: "friends-store",
      storage: createJSONStorage(() => storage),
    }
  )
);

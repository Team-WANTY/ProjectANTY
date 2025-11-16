// services/stores/users-store.ts 
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";

type UserUpdate = {
  id?: string;
  username?: string;
  email?: string;
};


type UsersState = {
  userId: string | null;
  username: string | null;
  email: string | null;
  lastUserSaveAt: number | null;
  setUser: (p: UserUpdate) => void;
  clear: () => void;
};

export const useUserStore = create<UsersState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      email: null,
      lastUserSaveAt: null,

      setUser: ({ id, username, email}) =>
        set((state) => ({
          userId: id ?? state.userId,
          username: username ?? state.username,
          email: email ?? state.email,
          lastUserSaveAt: Date.now(),
        })),
      clear: () => 
        set({ userId: null, username: null, email: null, lastUserSaveAt: null }),
    }),
    { 
      name: "user-store", 
      storage: createJSONStorage(() => storage),
    }
  )
);

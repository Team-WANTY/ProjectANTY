// services/stores/users-store.ts 
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";

type UsersState = {
  userId: string | null;
  username: string | null;
  email: string | null;
  lastUserSaveAt: number | null;
  setUser: (p: { id: string; username: string; email: string }) => void;
  clear: () => void;
};

export const useUserStore = create<UsersState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      email: null,
      lastUserSaveAt: null,
      setUser: ({ id, username }) =>
        set({ userId: id, username, lastUserSaveAt: Date.now() }),
      clear: () => set({ userId: null, username: null, lastUserSaveAt: null }),
    }),
    { 
      name: "user-store", 
      storage: createJSONStorage(() => storage),
    }
  )
);

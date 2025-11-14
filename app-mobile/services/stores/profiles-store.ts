// services/stores/profile-store.ts
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";

type ProfileState = {
  bio: string | null;
  lastProfileSaveAt: number | null;
  setProfile: (p: { bio?: string | null }) => void;
  clear: () => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      bio: null,
      lastProfileSaveAt: null,
      setProfile: ({ bio }) =>
        set({ bio: bio ?? null, lastProfileSaveAt: Date.now() }),
      clear: () => set({ bio: null, lastProfileSaveAt: null }),
    }),
    { 
      name: "profile-store", 
      storage: createJSONStorage(() => storage),
    }
  )
);

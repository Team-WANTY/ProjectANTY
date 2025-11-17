// services/stores/profile-store.ts
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";

type ProfileUpdate = {
  userId?: string;
  bio?: string | null;
  avatarImageId?: string | null;
  avatarUrl?: string | null;
};

type ProfileState = {
  userId: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarImageId: string | null;
  lastProfileSaveAt: number | null;

  isAvatarUploading: boolean;
  setAvatarUploading: (val: boolean) => void;

  setProfile: (p: ProfileUpdate) => void;
  clear: () => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      userId: null,
      bio: null,
      avatarUrl: null,
       avatarImageId: null,
      lastProfileSaveAt: null,
      isAvatarUploading: false,
      setAvatarUploading: (val) => set({ isAvatarUploading: val }),

      setProfile: (update) =>
        set((state) => ({
          ...state,
          ...update,
          lastProfileSaveAt: Date.now(),
        })),
        
      clear: () => set( { 
        userId: null, 
        bio: null, 
        avatarUrl: null, 
        avatarImageId: null,
        lastProfileSaveAt: null, 
        isAvatarUploading: false,
      }),
    }),
    { 
      name: "profile-store", 
      storage: createJSONStorage(() => storage),
    }
  )
);

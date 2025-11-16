// services/stores/profile-store.ts
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";

type ProfileUpdate = {
  id?: string;
  bio?: string;
  avatarUrl?: string;
};

type ProfileState = {
  userId: string | null;
  bio: string | null;
  avatarUrl: string | null;
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
      lastProfileSaveAt: null,
      isAvatarUploading: false,
      setAvatarUploading: (val) => set({ isAvatarUploading: val }),

      setProfile: ({ id, bio, avatarUrl }) =>
        set((state) => ({
          userId: id ?? state.userId,
          bio: bio ?? state.bio,
          avatarUrl: avatarUrl ?? state.avatarUrl,
          lastProfileSaveAt: Date.now(),
        })),
        
      clear: () => set( { 
        userId: null, 
        bio: null, 
        avatarUrl: null, 
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

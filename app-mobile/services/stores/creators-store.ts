import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storage } from "../storage/async-storage";

export type CreatorInfo = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

type CreatorState = {
  byId: Record<string, CreatorInfo>;
  setCreator: (info: CreatorInfo) => void;
  setMany: (infos: CreatorInfo[]) => void;
  clear: () => void;
};

export const useCreatorsStore = create<CreatorState>()(
  persist(
    (set) => ({
      byId: {},

      setCreator: (info) =>
        set((state) => ({
          byId: { ...state.byId, [info.id]: info },
        })),

      setMany: (infos) =>
        set((state) => {
          const map = { ...state.byId };
          for (const info of infos) {
            map[info.id] = info;
          }
          return { byId: map };
        }),

      clear: () => ({ byId: {} }),
    }),
    {
      name: "creators-store",
      storage: createJSONStorage(() => storage),
    }
  )
);

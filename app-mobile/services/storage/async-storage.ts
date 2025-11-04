// services/storage/async-storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

export const storage: StateStorage = {
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};

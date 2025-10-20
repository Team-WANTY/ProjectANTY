import * as SecureStore from "expo-secure-store";
import type { TokenStore } from "../../common/auth/token-store";

const KEY = "access_token";

export const secureStoreToken: TokenStore = {
  async get()   { return (await SecureStore.getItemAsync(KEY)) ?? null; },
  async set(t)  { await SecureStore.setItemAsync(KEY, t); },
  async clear() { await SecureStore.deleteItemAsync(KEY); },
};

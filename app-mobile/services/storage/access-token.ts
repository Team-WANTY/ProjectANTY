import * as SecureStore from "expo-secure-store";

const KEY = "access_token";

export const secureStoreToken = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
} as const;

export function maskToken(token: string, n: number = 4): string {
  if (!token) return "(empty)";
  if (token.length <= n * 2) return token; // too short, show as is
  return `${token.slice(0, n)}...${token.slice(-n)}`;
}

// services/bootstrap/user-profile-bootstrap.ts
import { usersApi } from "../api/users-api";
import { profileApi } from "../api/profiles-api";
import { useUserStore } from "../stores/users-store";
import { useProfileStore } from "../stores/profiles-store";

export async function loadUser() {
  const result = await usersApi.me();
  if (!result.ok) throw new Error(result.message ?? "Failed to load user");
  useUserStore.getState().setUser(result.data);
  return result.data;
}

export async function loadProfile(userId?: string) {
  const id = userId ?? useUserStore.getState().userId;
  if (!id) return null;
  const result = await profileApi.getById(id);
  if (!result.ok) {
    if (result.status === 404) {
      useProfileStore.getState().setProfile({ bio: null });
      return null;
    }
    throw new Error(result.message ?? "Failed to load profile");
  }
  useProfileStore.getState().setProfile(result.data);
  return result.data;
}

export async function safeBootstrap() {
  try {
    const me = await loadUser();
    await loadProfile(me.id);
  } 
  catch (err: any) {
    useUserStore.getState().clear();
    useProfileStore.getState().clear();
    if (err?.response?.status !== 401) throw err;
  }
}


// services/bootstrap/user-profile-bootstrap.ts
import { usersApi } from "../api/users-api";
import { profileApi } from "../api/profiles-api";
import { useUserStore } from "../stores/users-store";
import { useProfileStore } from "../stores/profiles-store";
import { tasksApi } from "../api/tasks-api";
import { useTasksStore } from "../stores/tasks-store";
import { imagesApi } from "../api/image-api";


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
      useProfileStore.getState().clear();
      return null;
    }
    throw new Error(result.message ?? "Failed to load profile");
  }
  
  const raw = result.data as any;
  const newAvatarId: string | null = raw.avatar_image_id ?? null;

  // pull store values
  const {
    avatarImageId: currentId,
    avatarUrl: currentUrl,
  } = useProfileStore.getState();

  let avatarUrl: string | null = currentUrl ?? null;

  // Only fetch if changed or not previously resolved
  if (newAvatarId && newAvatarId !== currentId) {
    try {
      const img = await imagesApi.getUrl(newAvatarId);
      if (img.ok) avatarUrl = img.data;
    } catch (e) {
      console.warn("Failed to resolve avatar", e);
    }
  }

  // Update store
  useProfileStore.getState().setProfile({
    userId: id,
    bio: raw.bio ?? null,
    avatarUrl,
    avatarImageId: newAvatarId,
  });

  return { ...raw, avatarUrl };
}
export async function loadTasks(userId?: string){
  const id = userId ?? useUserStore.getState().userId;
  if (!id) return null;
  const result = await tasksApi.getByUserID(id,30);
  if (!result.ok) {
    if (result.status === 404) {
      useTasksStore.getState().setTasks([]);
      return [];
    }
    throw new Error(result.message ?? "Failed to load tasks");
  }

  const getTasks = result?.data?.tasks ?? [];
  // map API tasks -> store tasks and add completed UI flag
  const mapped = getTasks.map((t) => ({
    ...t,
    completed: false,
  }));

  useTasksStore.getState().setTasks(mapped);
  return mapped;
}

export async function safeBootstrap() {
  try {
    const me = await loadUser();
    await Promise.all([
      loadProfile(me.id),
      loadTasks(me.id),
    ]);
  } 
  catch (err: any) {
    useUserStore.getState().clear();
    useProfileStore.getState().clear();
    useTasksStore.getState().clear();
    if (err?.response?.status !== 401) throw err;
  }
}


// services/bootstrap/user-profile-bootstrap.ts
import { usersApi } from "../api/users-api";
import { profileApi } from "../api/profiles-api";
import { useUserStore } from "../stores/users-store";
import { useProfileStore } from "../stores/profiles-store";
import { tasksApi } from "../api/tasks-api";
import { useTasksStore } from "../stores/tasks-store";
import { imagesApi } from "../api/image-api";
import type { Task } from "../api/tasks-api";

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

  // Build date range: yesterday -> tmr
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 1);

  const result = await tasksApi.getByUserID(id, startDate, endDate);
  if (!result.ok) {
    if (result.status === 404) {
      useTasksStore.getState().setTasks([]);
      return [];
    }
    throw new Error(result.message ?? "Failed to load tasks");
  }

  // result.data is OccurrencesByDate: { occurrences: { "YYYY-MM-DD": [taskId, ...], ... } }
  const occurrences = result.data?.occurrences ?? {};

  const uniqueTaskIds = Array.from(
    new Set(
      Object.values(occurrences).flat() // flatten list of lists
    )
  );

  if (uniqueTaskIds.length === 0) {
    useTasksStore.getState().setTasks([]);
    return [];
  }

  // Hydrate each task ID via GET /tasks/id/{task_id}
  const taskResults = await Promise.all(
    uniqueTaskIds.map((taskId) => tasksApi.getByID(taskId))
  );

  
  const tasks: (Task & { completed: boolean })[] = [];

  for (const res of taskResults) {
    if (!res.ok) continue;
    if (!res.data) continue;

    tasks.push({
      ...res.data,
      completed: false, // UI flag
    });
  }

  useTasksStore.getState().setTasks(tasks);
  return tasks;
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


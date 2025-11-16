// services/bootstrap/user-profile-bootstrap.ts
import { usersApi } from "../api/users-api";
import { profileApi } from "../api/profiles-api";
import { useUserStore } from "../stores/users-store";
import { useProfileStore } from "../stores/profiles-store";
import { tasksApi } from "../api/tasks-api";
import { useTasksStore } from "../stores/tasks-store";


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
  useProfileStore.getState().setProfile(result.data);
  return result.data;
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


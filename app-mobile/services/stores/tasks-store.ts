// services/stores/tasks-store.ts
import { create } from "zustand";
import { persist, createJSONStorage  } from "zustand/middleware";
import { storage } from "../storage/async-storage";
import type { Task as ApiTask } from "../api/tasks-api";


export type Task = ApiTask & {
  completed?: boolean; // UI-only
  due_date?: number;
};

export type TaskUpdate = Partial<Omit<Task, "id" | "user_id">>;

type TasksState = {
  tasks: Task[];
  lastTaskSaveAt: number | null;

  // replace all tasks GET /tasks
  setTasks: (tasks: Task[]) => void;

  insertTask: (task: Task) => void; 

  updateTask: (id: string, changes: TaskUpdate) => void;

  removeTask: (id: string) => void;

  clear: () => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      tasks: [],
      lastTaskSaveAt: null,

      setTasks: (tasks) =>
        set({
          tasks,
          lastTaskSaveAt: Date.now(),
        }),
      
      insertTask: (task) =>
        set((state) => {
          const idx = state.tasks.findIndex((t) => t.id === task.id);
          if (idx === -1) {
            // add new task
            return {
              tasks: [...state.tasks, task],
              lastTaskSaveAt: Date.now(),
            };
          }

          // merge into existing
          const next = [...state.tasks];
          next[idx] = {...next[idx], ...task};
          return {
            tasks: next,
            lastTaskSaveAt: Date.now(),
          };
        }),

      updateTask: (id, changes) =>
        set((state) => ({
          tasks: state.tasks.map((t) => 
            t.id === id ? {...t, ...changes} : t
          ),
          lastTaskSaveAt: Date.now(),
        })),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          lastTaskSaveAt: Date.now(),
        })),
      
      clear: () => set({ tasks: [], lastTaskSaveAt: null}),
    }),
    {
      name: "task-store",
      storage: createJSONStorage(() => storage),
    }
  )
);
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
  occurrencesByDate: Record<string, string[]>;
  completedByDate: Record<string, string[]>;

  // replace all tasks GET /tasks
  setTasks: (tasks: Task[]) => void;

  setOccurrences: (occ: Record<string, string[]>) => void;

  insertTask: (task: Task) => void; 

  updateTask: (id: string, changes: TaskUpdate) => void;

  removeTask: (id: string) => void;
  
  toggleOccurrenceCompletion: (dateKey: string, taskId: string) => void;

  clear: () => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      tasks: [],
      occurrencesByDate: {},
      completedByDate: {},
      lastTaskSaveAt: null,

      setTasks: (tasks) =>
        set({
          tasks,
          lastTaskSaveAt: Date.now(),
        }),
      
      setOccurrences: (occurrences) =>
        set({
          occurrencesByDate: occurrences,
          lastTaskSaveAt: Date.now(),
        }),
      
      toggleOccurrenceCompletion: (dateKey, taskId) =>
        set((state) => {
          const currentForDay = state.completedByDate[dateKey] ?? [];
          const exists = currentForDay.includes(taskId);
          const nextForDay = exists
            ? currentForDay.filter((id) => id !== taskId)
            : [...currentForDay, taskId];

          return {
            completedByDate: {
              ...state.completedByDate,
              [dateKey]: nextForDay,
            },
            lastTaskSaveAt: Date.now(),
          };
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
      
      clear: () => set({ tasks: [], occurrencesByDate: {}, completedByDate: {}, lastTaskSaveAt: null}),
    }),
    {
      name: "task-store",
      storage: createJSONStorage(() => storage),
    }
  )
);
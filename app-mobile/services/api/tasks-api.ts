// app-mobile/services/tasks-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  root: "/tasks", // POST, GET, PATCH
  byId: "/tasks/{task_id}", // DELETE 
} as const;

// helper to fill {user_id}
function fillId(tpl: string, id: string) {
  return tpl.replace("{user_id}", encodeURIComponent(id));
}

// Frequency and Duration Specifiers
export type FrequencySpecifier = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type DurationSpecifier = "FOREVER" | "NUMBER_OF_TIMES" | "UNTIL_DATE";

export type RepeatDuration = {
  specifier?: DurationSpecifier | null; // default FOREVER
  value?: number | null; // count or timestamp depending on specifier
};

export type RepeatFrequency = {
  specifier?: FrequencySpecifier | null; // DAILY/WEEKLY/MONTHLY/YEARLY
  value?: number | null; // every X days/weeks/months/years
  days_of_week?: number[] | null; // 0=Mon ... 6=Sun (for WEEKLY)
  day_of_month?: number | null; // 1..31 (for MONTHLY)
  month_of_year?: number | null; // 1..12 (for YEARLY)
};

export type RepeatRule = {
  frequency?: RepeatFrequency | null;
  duration?: RepeatDuration | null;
};

export type Task = {
  id?: string | null;
  user_id: string;
  name: string;
  desc: string;
  cat?: string | null;
  due_date?: number | null; 
  repeat_rule?: RepeatRule | null;
};

export type TaskUpdateBody = {
id: string; 
name?: string | null;
desc?: string | null;
cat?: string | null;
due_date?: number | null;
repeat_rule?: RepeatRule | null;
};

// Tasks 
export type NewTask = Omit<Task, "id"> & { id?: string | null };

export const tasksApi = {
  // POST /tasks
  async create(task: NewTask): Promise<ApiResult<Task>> {
    try {
      const res = await api.post<Task>(paths.root, task);
      return {ok: true, status: res.status, data: res.data};
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = 
        status === 401 ? "Not authenticated"
        : status === 403 ? "Task already exist"
        : status && status >= 500 ? "Server error"
        : toMessage(data, "Failed to create task");
      return {ok: false, status, message: msg, detail: data};
    }
  },

  // GET /tasks by taskID
  async getByID(taskId: string): Promise<ApiResult<Task>> {
    try {
      const res = await api.get<Task>(`${paths.root}?task_id=${encodeURIComponent(taskId)}`);
      return {ok: true, status: res.status, data: res.data};
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
        : status === 404 ? "Task not found"
        : toMessage(data, "Failed to get task");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /task by userID
  async getByUserID(userId: string, quantity = 10): Promise<ApiResult<Task[]>> {
    try {
      const url = `${paths.root}?user_id=${encodeURIComponent(userId)}&quantity=${encodeURIComponent(String(quantity))}`;
      const res = await api.get<Task[] | Task>(url);
      const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      return { ok: true, status: res.status, data};
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
      status === 401 ? "Not authenticated or not enough permissions"
      : status === 404 ? "No tasks found"
      : toMessage(data, "Failed to load tasks");
      return { ok: false, status, message: msg, detail: data };
    }
  },
  
  // PATCH /tasks requires user_id in the JSON body
  async update(body: TaskUpdateBody): Promise<ApiResult<Task>> {
    try {
      const id = (body as any).id;
      if (!id) {
        return { ok: false, status: 400, message: "id field is required in body" };
      }
      const res = await api.patch<Task>(fillId(paths.root, id), body);
      return { ok: true, status: res.status, data: res.data };
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
        : status === 404 ? "Task not found"
        : toMessage(data, "Failed to update task");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // Delete /tasks/{task_id}
  async remove(taskId: string): Promise<ApiResult<Task>> {
    try {
      const res = await api.delete(fillId(paths.byId, taskId));
      return { ok: true, status: res.status, data: res.data}; 
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
        : status === 404 ? "Task not found"
        : toMessage(data, "Failed to delete task");
      return { ok: false, status, message: msg, detail: data};
    }
  },
}
// app-mobile/services/tasks-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  root: "/tasks", // POST, GET, PATCH
  byId: "/tasks/{task_id}", // DELETE 
} as const;


function fillTaskId(tpl: string, taskId: string) {
  return tpl.replace("{task_id}", encodeURIComponent(taskId));
}

// Frequency and Duration Specifiers
export type FrequencySpecifier = "daily" | "weekly" | "monthly" | "yearly";
export type DurationSpecifier = "forever" | "number_of_times" | "until_date";


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

export type PaginatedTasks = {
  continuation_token: string | null;
  tasks: Task[];
};

/**
 * backend Task model:
 * - id: string 
 * - user_id: string
 * - name: string
 * - desc: string
 * - cat: string | null
 * - due_date: Unix timestamp in SECONDS
 * - repeat_rule: RepeatRule | null
 */

export type Task = {
  id: string;                 
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
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };


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
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };

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

  // GET /task by userID with paginated option
  async getByUserID(userId: string, quantity = 10, continuationToken?: string | null): Promise<ApiResult<PaginatedTasks>> {
    try {
      const params = new URLSearchParams();
      params.set("user_id", userId);
      params.set("quantity", String(quantity));
      if (continuationToken) {
        params.set("continuation_token", continuationToken);
      }
      const url = `${paths.root}?${params.toString()}`;
      const res = await api.get<PaginatedTasks>(url);

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request Successful",
        data: res.data,
      };
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
      const id = body.id;
      if (!id) {
        return { ok: false, status: 400, message: "id field is required in body" };
      }
      const res = await api.patch<Task>(paths.root, body);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
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
      const res = await api.delete<Task>(`${paths.root}?task_id=${encodeURIComponent(taskId)}`);
      return { 
        ok: true, 
        status: res.status, 
        message: res.statusText || "Request successful", 
        data: res.data 
      };
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
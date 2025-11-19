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
export type FrequencySpecifier = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type DurationSpecifier = "none" | "forever" | "number_of_times" | "until_date";

export type RepeatDuration = {
  specifier?: DurationSpecifier | null;
  value?: number | null;
};

export type RepeatFrequency = {
  specifier?: FrequencySpecifier | null;
  value?: number | null;
  days_of_week?: number[] | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
};

export type RepeatRule = {
  frequency?: RepeatFrequency | null;
  duration?: RepeatDuration | null;
};

export type PaginatedTasks = {
  continuation_token: string | null;
  tasks: Task[];
};

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
  repeat_rule?: RepeatRule | null | "UNCHANGED";
};

export type NewTask = Omit<Task, "id"> & { id?: string | null };

export const tasksApi = {
  // POST /tasks
  async create(task: NewTask): Promise<ApiResult<Task>> {
    try {
      const payload = { ...task };

      if (payload.repeat_rule) {
        if (payload.repeat_rule.frequency?.specifier === "none") {
          payload.repeat_rule.frequency = {
            specifier: null,
            value: null,
            days_of_week: null,
            day_of_month: null,
            month_of_year: null,
          };
        }
        if (payload.repeat_rule.duration?.specifier === "none") {
          payload.repeat_rule.duration = {
            specifier: null,
            value: null,
          };
        }
      }

      const res = await api.post<Task>(paths.root, payload);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
          : status === 403 ? "Task already exist"
            : status && status >= 500 ? "Server error"
              : toMessage(data, "Failed to create task");
      return { ok: false, status, message: msg, detail: data };
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
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
          : status === 404 ? "Task not found"
            : toMessage(data, "Failed to get task");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // GET /tasks by userID with pagination
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
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated or not enough permissions"
          : status === 404 ? "No tasks found"
            : toMessage(data, "Failed to load tasks");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // PATCH /tasks
  async update(body: TaskUpdateBody): Promise<ApiResult<Task>> {
    try {
      const { id } = body;
      if (!id) {
        return { ok: false, status: 400, message: "id field is required in body" };
      }

      const payload: any = {};
      Object.entries(body).forEach(([key, value]) => {
        if (key === "repeat_rule") {
          if (value === "UNCHANGED") return;

          if (value === null) {
            payload[key] = {
              frequency: { specifier: null, value: null, days_of_week: null, day_of_month: null, month_of_year: null },
              duration: { specifier: null, value: null },
            };
          } else {
            const repeatRule: RepeatRule = { ...value };
            if (repeatRule.frequency?.specifier === "none") {
              repeatRule.frequency = { specifier: null, value: null, days_of_week: null, day_of_month: null, month_of_year: null };
            }
            if (repeatRule.duration?.specifier === "none") {
              repeatRule.duration = { specifier: null, value: null };
            }
            payload[key] = repeatRule;
          }
        } else {
          // For all other fields, send null if explicitly cleared, skip only if undefined
          if (value !== undefined) {
            payload[key] = value;
          }
        }
      });

      const res = await api.patch<Task>(paths.root, payload);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
          : status === 404 ? "Task not found"
            : toMessage(data, "Failed to update task");
      return { ok: false, status, message: msg, detail: data };
    }
  },

  // DELETE /tasks/{task_id}
  async remove(taskId: string): Promise<ApiResult<Task>> {
    try {
      const res = await api.delete<Task>(`${paths.root}?task_id=${encodeURIComponent(taskId)}`);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 401 ? "Not authenticated"
          : status === 404 ? "Task not found"
            : toMessage(data, "Failed to delete task");
      return { ok: false, status, message: msg, detail: data };
    }
  },
};

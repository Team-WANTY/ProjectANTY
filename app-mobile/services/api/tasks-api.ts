// app-mobile/services/tasks-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  root: "/tasks",                 // POST, PATCH
  byId: "/tasks/id/{task_id}",    // GET by task id
  deleteById: "/tasks/{task_id}", // DELETE by task id
  byUserId: "/tasks/user_id/{user_id}", // GET occurrences by user id
} as const;

function fillTaskId(tpl: string, taskId: string) {
  return tpl.replace("{task_id}", encodeURIComponent(taskId));
}

function fillUserId(tpl: string, userId: string) {
  return tpl.replace("{user_id}", encodeURIComponent(userId));
}

// Helper to serialize dates to YYYY-MM-DD for backend `date` type
function toDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return value;
}


export type OccurrencesByDate = {
  // keys are "YYYY-MM-DD" date strings, values are arrays of task IDs
  occurrences: Record<string, string[]>;
};

// Frequency and Duration Specifiers
export type FrequencySpecifier = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type DurationSpecifier = "none" | "forever" | "number_of_times" | "until_date";

export type RepeatDuration = {
  specifier?: DurationSpecifier | null;
  value?: number | Date | string | null;
};

export type RepeatFrequency = {
  specifier?: FrequencySpecifier | null;
  value?: number | null;
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
  first_relevant_date?: Date | string | null;
  repeat_rule?: RepeatRule | null;
};


export type TaskUpdateBody = {
  id: string;
  name?: string | null;
  desc?: string | null;
  cat?: string | null;
  first_relevant_date?: Date | string | null;
  repeat_rule?: RepeatRule | null;
};

export type NewTask = Omit<Task, "id"> & { id?: string | null };

export const tasksApi = {
  // POST /tasks
  async create(task: NewTask): Promise<ApiResult<Task>> {
    try {
      const payload: any = { ...task };

      // Normalize repeat_rule to avoid sending "none" to backend
      if (payload.repeat_rule) {
        const rr: RepeatRule = { ...payload.repeat_rule };

        // Frequency "none" -> set to null so backend treats as no repeat
        if (rr.frequency?.specifier === "none") {
          rr.frequency = {
            specifier: null,
            value: null,
          };
        }

        // Duration "none" -> null duration
        if (rr.duration?.specifier === "none") {
          rr.duration = {
            specifier: null,
            value: null,
          };
        }
        
        if (
          rr.duration?.specifier === "until_date" &&
          rr.duration.value != null
        ) {
          rr.duration = {
            ...rr.duration,
            value: toDateOnly(rr.duration.value as any),
          };
        }
        
        payload.repeat_rule = rr;
      }

      // first_relevant_date is a Python `date` on the backend
      if (payload.first_relevant_date !== undefined) {
        payload.first_relevant_date = toDateOnly(payload.first_relevant_date);
      }

      const res = await api.post<{ task_id: string }>(paths.root, payload); 
      const taskId = res.data?.task_id;
      if (!taskId) {
        return {
          ok: false,
          status: res.status,
          message: "Task created but no task ID?",
        }
      }

      // Fetch the full task
      const url = fillTaskId(paths.byId, taskId);
      const getRes = await api.get<Task>(url);

      return {
        ok: true,
        status: getRes.status,
        message: getRes.statusText,
        data: getRes.data, 
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
      const url = fillTaskId(paths.byId, taskId);
      const res = await api.get<Task>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data,
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
  async getByUserID(
    userId: string,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<ApiResult<OccurrencesByDate>> {
    try {
      const base = fillUserId(paths.byUserId, userId);
      const params = new URLSearchParams();
      params.set("start_date", toDateOnly(startDate));
      params.set("end_date", toDateOnly(endDate));

      const url = `${base}?${params.toString()}`;
      const res = await api.get<OccurrencesByDate>(url);

      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
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
            // Explicitly clear repeat_rule in backend
            payload[key] = {
              frequency: { specifier: null, value: null },
              duration: { specifier: null, value: null },
            };
          } else {
            const repeatRule: RepeatRule = { ...(value as RepeatRule) };

            // Strip "none" on frequency
            if (repeatRule.frequency?.specifier === "none") {
              repeatRule.frequency = { specifier: null, value: null };
            }

            // Strip "none" on duration
            if (repeatRule.duration?.specifier === "none") {
              repeatRule.duration = { specifier: null, value: null };
            }

            // Serialize UNTIL_DATE value as YYYY-MM-DD
            if (
              repeatRule.duration?.specifier === "until_date" &&
              repeatRule.duration.value != null
            ) {
              repeatRule.duration = {
                ...repeatRule.duration,
                value: toDateOnly(repeatRule.duration.value as any),
              };
            }

            payload[key] = repeatRule;
          }
        } else if (key === "first_relevant_date") {
          // Always normalize first_relevant_date to date-only string
          if (value !== undefined) {
            payload[key] = toDateOnly(value as any);
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
        data: res.data,
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
      const url = fillTaskId(paths.deleteById, taskId);
      const res = await api.delete<Task>(url);
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data,
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

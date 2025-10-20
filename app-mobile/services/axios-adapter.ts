import { api } from "./client"; // axios instance
import type { HttpClient, HttpResponse } from "../../common/http/http-client";

export const axiosAdapter: HttpClient = {
  async get<T>(url: string, init: { headers: any; }) {
    const r = await api.get<T>(url, { headers: init?.headers });
    return { status: r.status, data: r.data as T } as HttpResponse<T>;
  },
  async post<T>(url: string, body, init) {
    const r = await api.post<T>(url, body, { headers: init?.headers });
    return { status: r.status, data: r.data as T } as HttpResponse<T>;
  },
  async put<T>(url: string, body, init) {
    const r = await api.put<T>(url, body, { headers: init?.headers });
    return { status: r.status, data: r.data as T } as HttpResponse<T>;
  },
  async patch<T>(url: string, body, init) {
    const r = await api.patch<T>(url, body, { headers: init?.headers });
    return { status: r.status, data: r.data as T } as HttpResponse<T>;
  },
  async delete<T>(url: string, init) {
    const r = await api.delete<T>(url, { headers: init?.headers });
    return { status: r.status, data: r.data as T } as HttpResponse<T>;
  },
};

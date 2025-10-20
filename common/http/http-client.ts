// HTTP interface
export type HttpResponse<T> = { status: number; data: T };

export interface HttpClient {
  get<T>(url: string, init?: { headers?: Record<string, string> }): Promise<HttpResponse<T>>;
  post<T>(url: string, body?: any, init?: { headers?: Record<string, string> }): Promise<HttpResponse<T>>;
  put<T>(url: string, body?: any, init?: { headers?: Record<string, string> }): Promise<HttpResponse<T>>;
  patch<T>(url: string, body?: any, init?: { headers?: Record<string, string> }): Promise<HttpResponse<T>>;
  delete<T>(url: string, init?: { headers?: Record<string, string> }): Promise<HttpResponse<T>>;
}

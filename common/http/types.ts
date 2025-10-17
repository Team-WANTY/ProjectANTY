// HTTP Interface result + error helper
export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure  = { ok: false; status?: number; message: string; detail?: any };
export type ApiResult<T = any> = ApiSuccess<T> | ApiFailure;

export function toMessage(detail: any, fallback = "Request failed") {
  if (!detail) return fallback;
  if (typeof detail?.detail === "string") return detail.detail;       // FastAPI {"detail": "..."}
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail?.detail)) return detail.detail.map((d:any)=>d?.msg||JSON.stringify(d)).join("; ");
  return detail?.message || fallback;
}

// app-mobile/services/api/images-api.ts
import { api } from "../http/client";
import type { ApiResult } from "../../../common/http/types";
import { toMessage } from "../../../common/http/types";

const paths = {
  byContainer: "/images/{container_name}", // POST
  byId: "/images/{image_id}",              // GET, DELETE
} as const;

function fillContainer(tpl: string, container: string) {
  return tpl.replace("{container_name}", encodeURIComponent(container));
}

function fillId(tpl: string, id: string) {
  return tpl.replace("{image_id}", encodeURIComponent(id));
}


export type ImageRecord = {
  id: string;
  container: string;
  url: string;
  uploader_user_id: string;
};

type RNFile = {
  uri: string;
  name?: string;
  type?: string;
};

export const imagesApi = {
  // POST /images/{container_name}?user_id=...
  async upload(container: string, userId: string, file: RNFile): Promise<ApiResult<ImageRecord>> {
    try {
      const form = new FormData();
      form.append("file", {
        uri: file.uri,
        name: file.name ?? "upload.jpg",
        type: file.type ?? "image/jpeg",
      } as any);

      const base = fillContainer(paths.byContainer, container);
      const url = `${base}?user_id=${encodeURIComponent(userId)}`;

      const start = Date.now();
      console.log("[UPLOAD] Starting upload at", new Date(start).toISOString());
      const res = await api.post<ImageRecord>(url, form, {
        // override any JSON defaults and let RN handle the boundary
        headers: {
          ...(api.defaults.headers.common ?? {}),
          Authorization: api.defaults.headers.common?.Authorization,
          "Content-Type": "multipart/form-data",
        },
        transformRequest: (data) => data, // don't JSON.stringify FormData
        timeout: 60000,
      });
      
      const end = Date.now();
      console.log(
        `[UPLOAD] Upload finished. Duration: ${(end - start) / 1000}s`
      );
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data,
      };
    }
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      console.log(
        "image upload RAW error:",
        error?.message,
        error?.code,
        error?.toJSON ? error.toJSON() : null
      );

      console.log(
        "image upload error",
        status,
        data ? JSON.stringify(data, null, 2) : data
      );
      const msg =
        status === 400 ? "Invalid image data"
        : status === 401 ? "Not authenticated"
        : status === 403 ? "Image already exists"
        : toMessage(data, "Failed to upload image");
      return { ok: false, status, message: msg, detail: data };
    }
  },


  // GET /images/{image_id}
  async getUrl(imageId: string): Promise<ApiResult<string>> {
    try {
      const res = await api.get<string>(fillId(paths.byId, imageId));
      return {
        ok: true,
        status: res.status,
        message: res.statusText || "Request successful",
        data: res.data,
      };
    } 
    catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg =
        status === 404
          ? "Image not found"
          : toMessage(data, "Failed to load image URL");
      return { ok: false, status, message: msg, detail: data };
    }
  },


  // DELETE /images/{image_id}
  async remove(imageId: string): Promise<ApiResult<void>> {
    try {
      const res = await api.delete(fillId(paths.byId, imageId));
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
        status === 401
          ? "Not authenticated"
          : status === 404
          ? "Image not found"
          : toMessage(data, "Failed to delete image");
      return { ok: false, status, message: msg, detail: data };
    }
  },
};

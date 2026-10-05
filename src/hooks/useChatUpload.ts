import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MAX_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGES = 6;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
export const FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg",
  "application/zip",
];

export type UploadedItem = { bucket: "chat-images" | "chat-files"; path: string; url: string; name: string };

export const safeFileName = (name: string) => {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .slice(0, 60) || "file";
  return ext ? `${base}.${ext}` : base;
};

export const validateImage = (f: File): string | null => {
  if (!IMAGE_TYPES.includes(f.type)) return "type";
  if (f.size > IMAGE_MAX_BYTES) return "size";
  return null;
};

export const validateFile = (f: File): string | null => {
  if (!FILE_TYPES.includes(f.type) && !IMAGE_TYPES.includes(f.type)) return "type";
  if (f.size > FILE_MAX_BYTES) return "size";
  return null;
};

export const useChatUpload = (userId: string | undefined) => {
  const upload = useCallback(
    async (file: File, bucket: UploadedItem["bucket"]): Promise<UploadedItem> => {
      if (!userId) throw new Error("not_authenticated");
      const name = safeFileName(file.name);
      const path = `${userId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { bucket, path, url: data.publicUrl, name: file.name.slice(0, 120) };
    },
    [userId],
  );

  const removeUploaded = useCallback(async (items: UploadedItem[]) => {
    for (const bucket of ["chat-images", "chat-files"] as const) {
      const paths = items.filter((i) => i.bucket === bucket).map((i) => i.path);
      if (paths.length) {
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) console.warn("orphan cleanup failed", error.message);
      }
    }
  }, []);

  return { upload, removeUploaded };
};

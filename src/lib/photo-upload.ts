// Client-side image resize + upload helpers for the plant photo journal.
import { supabase } from "@/integrations/supabase/client";

const MAX_DIM = 1600;

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  contentType: string;
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  // iPhone HEIC/HEIF (and some exotic formats) can't be decoded by every browser.
  // In that case upload the original bytes untouched instead of failing.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file, width: 0, height: 0, contentType: file.type || "application/octet-stream" };
  }
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, width: bitmap.width, height: bitmap.height, contentType: file.type || "image/jpeg" };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );
  if (!blob) return { blob: file, width, height, contentType: file.type || "image/jpeg" };
  return { blob, width, height, contentType: "image/jpeg" };
}

export async function uploadPlantPhotoFile(plantId: string, file: File) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error("You must be signed in to upload photos");
  const userId = userData.user.id;

  const prepared = await prepareImage(file);
  const path = `photos/${userId}/${plantId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("plant-images")
    .upload(path, prepared.blob, { contentType: prepared.contentType, upsert: false });
  if (error) throw new Error(error.message);

  return {
    storage_path: path,
    width: prepared.width,
    height: prepared.height,
    bytes: prepared.blob.size,
    content_type: prepared.contentType,
  };
}

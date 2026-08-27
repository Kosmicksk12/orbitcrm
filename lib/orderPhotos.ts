import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderPhoto } from "@/lib/types";

export const ORDER_PHOTOS_BUCKET = "order-photos";

export const MAX_ORDER_PHOTOS = 12;

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Redimensiona/comprime una imagen en el navegador antes de subirla, para no
 * mandar fotos de varios MB del celular. Si algo falla o no achica nada,
 * devuelve el archivo original.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function extFor(blob: Blob, originalName: string) {
  if (blob.type === "image/jpeg") return "jpg";
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/webp") return "webp";
  const m = originalName.match(/\.(\w+)$/);
  return (m?.[1] || "jpg").toLowerCase();
}

/**
 * Sube una foto: comprime, la manda a Storage y registra el metadato en
 * order_photos. Devuelve true solo si ambos pasos salieron bien; si el
 * metadato falla, borra el archivo para no dejar huérfanos.
 */
export async function uploadOrderPhoto(
  supabase: SupabaseClient,
  { shopId, orderId, file }: { shopId: string; orderId: string; file: File }
): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const blob = await compressImage(file);
    const path = `${shopId}/${orderId}/${crypto.randomUUID()}.${extFor(blob, file.name)}`;

    const { error: upErr } = await supabase.storage
      .from(ORDER_PHOTOS_BUCKET)
      .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if (upErr) return false;

    const { error: metaErr } = await supabase.from("order_photos").insert({
      owner_id: session.user.id,
      shop_id: shopId,
      order_id: orderId,
      storage_path: path,
    });
    if (metaErr) {
      await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove([path]);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Borra la foto de Storage y su metadato. */
export async function deleteOrderPhoto(supabase: SupabaseClient, photo: OrderPhoto) {
  await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove([photo.storage_path]);
  await supabase.from("order_photos").delete().eq("id", photo.id);
}

/** Borra todos los archivos de una orden de Storage (los metadatos se van solos
 *  por el cascade al borrar la orden). Se usa al borrar una orden para siempre. */
export async function deleteAllOrderPhotoFiles(supabase: SupabaseClient, orderId: string) {
  const { data } = await supabase
    .from("order_photos")
    .select("storage_path")
    .eq("order_id", orderId);
  const paths = (data ?? []).map((r) => (r as { storage_path: string }).storage_path);
  if (paths.length > 0) await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove(paths);
}

/** URLs firmadas (bucket privado) para mostrar miniaturas, indexadas por path. */
export async function signedUrlsFor(
  supabase: SupabaseClient,
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from(ORDER_PHOTOS_BUCKET)
    .createSignedUrls(paths, expiresIn);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  }
  return map;
}

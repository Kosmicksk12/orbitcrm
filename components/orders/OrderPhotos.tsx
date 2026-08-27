"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconPlus, IconTrash } from "@/components/ui/Icons";
import {
  MAX_ORDER_PHOTOS,
  deleteOrderPhoto,
  signedUrlsFor,
  uploadOrderPhoto,
} from "@/lib/orderPhotos";
import type { OrderPhoto } from "@/lib/types";

/**
 * Fotos del equipo de una orden. Dos modos:
 *  - adjunto (con orderId): carga/sube/borra contra Storage al instante.
 *  - staged (sin orderId): solo previews en memoria; el padre sube los File[]
 *    después de crear la orden. Requiere stagedFiles + onStagedChange.
 */
export function OrderPhotos({
  orderId,
  shopId,
  stagedFiles,
  onStagedChange,
  readOnly = false,
}: {
  orderId?: string;
  shopId: string;
  stagedFiles?: File[];
  onStagedChange?: (files: File[]) => void;
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const staged = !orderId;

  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!staged);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<OrderPhoto | null>(null);
  const [stagedUrls, setStagedUrls] = useState<string[]>([]);

  const loadAttached = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("order_photos")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as OrderPhoto[];
    setPhotos(list);
    setUrls(await signedUrlsFor(supabase, list.map((p) => p.storage_path)));
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!staged) loadAttached();
  }, [staged, loadAttached]);

  useEffect(() => {
    if (staged) {
      const next = (stagedFiles ?? []).map((f) => URL.createObjectURL(f));
      setStagedUrls(next);
      return () => next.forEach((u) => URL.revokeObjectURL(u));
    }
  }, [staged, stagedFiles]);

  const count = staged ? stagedFiles?.length ?? 0 : photos.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const picked = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;

    const room = MAX_ORDER_PHOTOS - count;
    if (room <= 0) {
      toast({ title: `Máximo ${MAX_ORDER_PHOTOS} fotos por orden`, variant: "danger" });
      return;
    }
    const toAdd = picked.slice(0, room);

    if (staged) {
      onStagedChange?.([...(stagedFiles ?? []), ...toAdd]);
      return;
    }

    setBusy(true);
    let failed = 0;
    const supabase = createClient();
    for (const file of toAdd) {
      const ok = await uploadOrderPhoto(supabase, { shopId, orderId: orderId as string, file });
      if (!ok) failed += 1;
    }
    setBusy(false);
    await loadAttached();
    if (failed > 0) {
      toast({ title: `${failed} foto(s) no se pudieron subir`, variant: "danger" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await deleteOrderPhoto(createClient(), deleting);
    setDeleting(null);
    await loadAttached();
    toast({ title: "Foto eliminada", variant: "success" });
  }

  function removeStaged(idx: number) {
    onStagedChange?.((stagedFiles ?? []).filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold text-ink dark:text-ink-dark">Fotos del equipo</p>
        {count > 0 && (
          <span className="font-mono text-xs text-ink-muted dark:text-ink-dark-muted">{count}</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {loading ? (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">Cargando…</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {count === 0 && readOnly && (
            <p className="col-span-full text-sm text-ink-muted dark:text-ink-dark-muted">
              Sin fotos.
            </p>
          )}
          {staged
            ? (stagedFiles ?? []).map((f, i) => (
                <Thumb
                  key={`${f.name}-${i}`}
                  src={stagedUrls[i]}
                  onRemove={readOnly ? undefined : () => removeStaged(i)}
                />
              ))
            : photos.map((p) => (
                <Thumb
                  key={p.id}
                  src={urls[p.storage_path]}
                  href={urls[p.storage_path]}
                  onRemove={readOnly ? undefined : () => setDeleting(p)}
                />
              ))}

          {!readOnly && count < MAX_ORDER_PHOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50 dark:border-line-dark dark:text-ink-dark-muted"
            >
              {busy ? <span className="text-xs">Subiendo…</span> : <IconPlus width={20} height={20} />}
            </button>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
        Evidencia del estado del equipo al recibirlo. Uso interno — no se muestran al cliente.
      </p>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar foto"
        description="¿Eliminar esta foto del equipo? No se puede deshacer."
        confirmLabel="Eliminar"
      />
    </div>
  );
}

function Thumb({
  src,
  href,
  onRemove,
}: {
  src?: string;
  href?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-bg dark:border-line-dark dark:bg-white/5">
      {src ? (
        href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Foto del equipo" className="h-full w-full object-cover" loading="lazy" />
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto del equipo" className="h-full w-full object-cover" loading="lazy" />
        )
      ) : (
        <div className="h-full w-full animate-pulse bg-line dark:bg-white/10" />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar foto"
          className="absolute right-1 top-1 rounded-md bg-ink/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <IconTrash width={13} height={13} />
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/States";
import { IconRotateLeft, IconTrash } from "@/components/ui/Icons";
import type { ServiceOrder } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Órdenes movidas a la papelera (deleted_at no nulo). Se pueden restaurar
 * (deleted_at = null, vuelven a aparecer en Órdenes normal) o borrar para
 * siempre — esto último ya sí es irreversible y solo lo puede hacer un
 * administrador, igual que antes con "eliminar".
 */
export function OrdersTrashModal({
  open,
  onClose,
  isAdmin,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onRestored: () => void;
}) {
  const supabase = createClient();
  const { toast } = useToast();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingForever, setDeletingForever] = useState<ServiceOrder | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!error) setOrders((data ?? []) as ServiceOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleRestore(order: ServiceOrder) {
    setBusyId(order.id);
    const { error } = await supabase
      .from("service_orders")
      .update({ deleted_at: null })
      .eq("id", order.id);
    setBusyId(null);
    if (error) {
      toast({ title: "No se pudo restaurar", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Orden restaurada", variant: "success" });
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    onRestored();
  }

  async function handleDeleteForever() {
    if (!deletingForever) return;
    const order = deletingForever;
    setBusyId(order.id);
    const { error } = await supabase.from("service_orders").delete().eq("id", order.id);
    setBusyId(null);
    if (error) {
      toast({ title: "No se pudo borrar", description: error.message, variant: "danger" });
    } else {
      toast({ title: "Orden borrada para siempre", variant: "success" });
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
    setDeletingForever(null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Papelera de órdenes"
      description="Órdenes movidas aquí. Restáuralas o bórralas para siempre."
      size="lg"
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
          La papelera está vacía.
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {orders.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 dark:border-line-dark"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                  {o.order_number} · {o.client_name}
                </p>
                <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                  {formatCurrency(o.total_cents)} · Eliminada el{" "}
                  {o.deleted_at ? formatDate(o.deleted_at) : "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleRestore(o)}
                  disabled={busyId === o.id}
                  aria-label={`Restaurar orden ${o.order_number}`}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-50 disabled:opacity-50 dark:hover:bg-accent/10"
                >
                  <IconRotateLeft width={14} height={14} />
                  Restaurar
                </button>
                <button
                  onClick={() => setDeletingForever(o)}
                  disabled={!isAdmin || busyId === o.id}
                  aria-label={`Borrar para siempre la orden ${o.order_number}`}
                  title={!isAdmin ? "Solo un administrador puede borrar para siempre" : undefined}
                  className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger disabled:hidden dark:hover:bg-danger/10"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deletingForever}
        onClose={() => setDeletingForever(null)}
        onConfirm={handleDeleteForever}
        title="Borrar para siempre"
        description={`¿Borrar para siempre la orden ${deletingForever?.order_number}? Esto no se puede deshacer.`}
        confirmLabel="Borrar para siempre"
      />
    </Modal>
  );
}

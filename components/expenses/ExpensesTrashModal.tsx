"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/States";
import { IconRotateLeft, IconTrash } from "@/components/ui/Icons";
import type { Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

/** Gastos movidos a la papelera (deleted_at no nulo) — restaurar o borrar
 * para siempre, igual que la papelera de Órdenes. */
export function ExpensesTrashModal({
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

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingForever, setDeletingForever] = useState<Expense | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!error) setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleRestore(expense: Expense) {
    setBusyId(expense.id);
    const { error } = await supabase.from("expenses").update({ deleted_at: null }).eq("id", expense.id);
    setBusyId(null);
    if (error) {
      toast({ title: "No se pudo restaurar", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Gasto restaurado", variant: "success" });
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    onRestored();
  }

  async function handleDeleteForever() {
    if (!deletingForever) return;
    const expense = deletingForever;
    setBusyId(expense.id);
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    setBusyId(null);
    if (error) {
      toast({ title: "No se pudo borrar", description: error.message, variant: "danger" });
    } else {
      toast({ title: "Gasto borrado para siempre", variant: "success" });
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    }
    setDeletingForever(null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Papelera de gastos"
      description="Gastos movidos aquí. Restáuralos o bórralos para siempre."
      size="lg"
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
          La papelera está vacía.
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 dark:border-line-dark"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">{e.description}</p>
                <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                  {formatCurrency(e.amount_cents)} · Eliminado el{" "}
                  {e.deleted_at ? formatDate(e.deleted_at) : "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleRestore(e)}
                  disabled={busyId === e.id}
                  aria-label={`Restaurar gasto ${e.description}`}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-50 disabled:opacity-50 dark:hover:bg-accent/10"
                >
                  <IconRotateLeft width={14} height={14} />
                  Restaurar
                </button>
                <button
                  onClick={() => setDeletingForever(e)}
                  disabled={!isAdmin || busyId === e.id}
                  aria-label={`Borrar para siempre el gasto ${e.description}`}
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
        description={`¿Borrar para siempre "${deletingForever?.description}"? Esto no se puede deshacer.`}
        confirmLabel="Borrar para siempre"
      />
    </Modal>
  );
}

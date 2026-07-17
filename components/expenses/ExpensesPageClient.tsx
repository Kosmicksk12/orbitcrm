"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpenseForm, type ExpenseFormValues } from "./ExpenseForm";
import { IconDownload, IconEdit, IconPlus, IconReceipt, IconSearch, IconTrash } from "@/components/ui/Icons";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";

export function ExpensesPageClient() {
  const supabase = createClient();
  const { toast } = useToast();
  const { shopId, isAdmin } = useShop();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    if (err) setError(true);
    else setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchesQuery = !q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      const matchesCategory = !category || e.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [expenses, query, category]);

  const monthKey = new Date().toISOString().slice(0, 7);
  const totalThisMonth = expenses
    .filter((e) => e.expense_date.slice(0, 7) === monthKey)
    .reduce((sum, e) => sum + e.amount_cents, 0);
  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount_cents, 0);

  async function handleSubmit(values: ExpenseFormValues) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      category: values.category,
      description: values.description.trim(),
      amount_cents: Math.round((parseFloat(values.amount || "0") || 0) * 100),
      expense_date: values.expense_date,
    };

    if (editing) {
      const { error: err } = await supabase.from("expenses").update(payload).eq("id", editing.id);
      if (err) {
        toast({ title: "No se pudo actualizar", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Gasto actualizado", variant: "success" });
    } else {
      const { error: err } = await supabase
        .from("expenses")
        .insert({ ...payload, owner_id: user.id, shop_id: shopId });
      if (err) {
        toast({ title: "No se pudo registrar el gasto", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Gasto registrado", variant: "success" });
    }

    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error: err } = await supabase.from("expenses").delete().eq("id", deleting.id);
    if (err) {
      toast({ title: "No se pudo eliminar", description: err.message, variant: "danger" });
    } else {
      toast({ title: "Gasto eliminado", variant: "success" });
      setExpenses((prev) => prev.filter((e) => e.id !== deleting.id));
    }
    setDeleting(null);
  }

  function handleExport() {
    const rows = filtered.map((e) => ({
      Fecha: formatDate(e.expense_date),
      Categoría: e.category,
      Descripción: e.description,
      Monto: e.amount_cents / 100,
    }));
    if (rows.length === 0) {
      toast({ title: "No hay gastos para exportar", variant: "danger" });
      return;
    }
    exportToExcel("gastos-orbitcrm", "Gastos", rows);
    toast({ title: `${rows.length} gastos exportados`, variant: "success" });
  }

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Compras e insumos del negocio — lo que sale de caja, no lo que entra."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport}>
              <IconDownload width={16} height={16} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <IconPlus width={16} height={16} />
              Nuevo gasto
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <Card className="p-5">
          <p className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">Gastos del mes</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
            {formatCurrency(totalThisMonth)}
          </p>
        </Card>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <IconSearch
              width={16}
              height={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por descripción…"
              className="pl-9"
              aria-label="Buscar gastos"
            />
          </div>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-56"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {(query || category) && (
          <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
            Total filtrado: <span className="font-mono font-medium">{formatCurrency(totalFiltered)}</span>
          </p>
        )}

        <Card className="mt-4 overflow-x-auto">
          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message="No pudimos cargar tus gastos." onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconReceipt width={22} height={22} />}
              title={query || category ? "Sin resultados" : "Aún no tienes gastos registrados"}
              description={
                query || category
                  ? "Intenta con otro término o categoría."
                  : "Registra tu primera compra o gasto del negocio."
              }
              action={
                !query &&
                !category && (
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <IconPlus width={16} height={16} />
                    Nuevo gasto
                  </Button>
                )
              }
            />
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Categoría</th>
                  <th className="px-3 py-3 font-medium">Descripción</th>
                  <th className="px-3 py-3 font-medium">Monto</th>
                  <th className="px-3 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line-dark">
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 text-ink-muted dark:text-ink-dark-muted">
                      {formatDate(e.expense_date)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone="neutral">{e.category}</Badge>
                    </td>
                    <td className="px-3 py-3 text-ink dark:text-ink-dark">{e.description}</td>
                    <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">
                      {formatCurrency(e.amount_cents)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(e);
                            setFormOpen(true);
                          }}
                          aria-label={`Editar gasto ${e.description}`}
                          className="rounded-lg p-2 text-ink-muted hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <IconEdit width={16} height={16} />
                        </button>
                        <button
                          onClick={() => setDeleting(e)}
                          aria-label={`Eliminar gasto ${e.description}`}
                          disabled={!isAdmin}
                          className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger disabled:hidden dark:hover:bg-danger/10"
                        >
                          <IconTrash width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <ExpenseForm
        key={editing?.id ?? "new"}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        expense={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar gasto"
        description={`¿Seguro que quieres eliminar "${deleting?.description}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}

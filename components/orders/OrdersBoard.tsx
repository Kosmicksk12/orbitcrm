"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, Skeleton, SkeletonRow } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrderForm, type OrderFormValues } from "./OrderForm";
import {
  IconDownload,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTrash,
  IconWrench,
} from "@/components/ui/Icons";
import { ORDER_STATUSES, type OrderStatus, type ServiceOrder } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { exportToExcel } from "@/lib/export";
import { consumePendingSearch } from "@/lib/searchBridge";

type View = "kanban" | "list";
type StatusFilter = OrderStatus | "todos";

const STATUS_ACCENT: Record<OrderStatus, string> = {
  recibido: "bg-ink-muted",
  diagnostico: "bg-accent",
  en_reparacion: "bg-warning",
  listo: "bg-success",
  entregado: "bg-success",
  pagada: "bg-success",
};

export function OrdersBoard() {
  const supabase = createClient();
  const { toast } = useToast();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<OrderStatus>("recibido");
  const [deleting, setDeleting] = useState<ServiceOrder | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("service_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(true);
    else setOrders((data ?? []) as ServiceOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const pending = consumePendingSearch("orders");
    if (pending) {
      setQuery(pending);
      setView("list");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.client_name.toLowerCase().includes(q) ||
        o.client_phone.includes(q) ||
        o.order_number.toLowerCase().includes(q) ||
        `${o.device_brand ?? ""} ${o.device_model ?? ""}`.toLowerCase().includes(q)
    );
  }, [orders, query]);

  const columns = useMemo(
    () => ORDER_STATUSES.map((s) => ({ ...s, orders: searched.filter((o) => o.status === s.id) })),
    [searched]
  );

  const listRows = useMemo(
    () => (statusFilter === "todos" ? searched : searched.filter((o) => o.status === statusFilter)),
    [searched, statusFilter]
  );

  async function handleSubmit(values: OrderFormValues) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      client_name: values.client_name.trim(),
      client_phone: values.client_phone.trim(),
      device_brand: values.device_brand.trim() || null,
      device_model: values.device_model.trim() || null,
      problem_description: values.problem_description.trim() || null,
      technician: values.technician.trim() || null,
      status: values.status,
      total_cents: Math.round((parseFloat(values.total || "0") || 0) * 100),
      paid_cents: Math.round((parseFloat(values.paid || "0") || 0) * 100),
      cost_cents: Math.round((parseFloat(values.cost || "0") || 0) * 100),
      warranty_days: parseInt(values.warranty_days || "0", 10) || 0,
      notes: values.notes.trim() || null,
    };

    if (editing) {
      const { error: err } = await supabase.from("service_orders").update(payload).eq("id", editing.id);
      if (err) {
        toast({ title: "No se pudo actualizar", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Orden actualizada", variant: "success" });
    } else {
      const { error: err } = await supabase.from("service_orders").insert({ ...payload, owner_id: user.id });
      if (err) {
        toast({ title: "No se pudo crear la orden", description: err.message, variant: "danger" });
        return;
      }
      toast({ title: "Orden creada", variant: "success" });
    }

    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error: err } = await supabase.from("service_orders").delete().eq("id", deleting.id);
    if (err) {
      toast({ title: "No se pudo eliminar", description: err.message, variant: "danger" });
    } else {
      toast({ title: "Orden eliminada", variant: "success" });
      setOrders((prev) => prev.filter((o) => o.id !== deleting.id));
    }
    setDeleting(null);
  }

  async function moveOrder(orderId: string, status: OrderStatus) {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    const { error: err } = await supabase.from("service_orders").update({ status }).eq("id", orderId);
    if (err) {
      setOrders(previous);
      toast({ title: "No se pudo mover la orden", description: err.message, variant: "danger" });
    }
  }

  function handleExport() {
    const rows = (statusFilter === "todos" ? searched : listRows).map((o) => ({
      "N.º de orden": o.order_number,
      Cliente: o.client_name,
      Teléfono: o.client_phone,
      Equipo: [o.device_brand, o.device_model].filter(Boolean).join(" "),
      Técnico: o.technician ?? "",
      Estado: ORDER_STATUSES.find((s) => s.id === o.status)?.label ?? o.status,
      Total: o.total_cents / 100,
      Costo: o.cost_cents / 100,
      Ganancia: (o.total_cents - o.cost_cents) / 100,
      Abonado: o.paid_cents / 100,
      Saldo: (o.total_cents - o.paid_cents) / 100,
      "Garantía (días)": o.warranty_days,
      Fecha: formatDate(o.created_at),
    }));

    if (rows.length === 0) {
      toast({ title: "No hay órdenes para exportar", variant: "danger" });
      return;
    }

    exportToExcel("ordenes-orbitcrm", "Órdenes", rows);
    toast({ title: `${rows.length} órdenes exportadas`, variant: "success" });
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Órdenes de servicio"
        description={`${orders.length} ${orders.length === 1 ? "orden" : "órdenes"} registradas`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-line p-0.5 dark:border-line-dark">
              <button
                onClick={() => setView("kanban")}
                aria-label="Ver como tablero"
                aria-pressed={view === "kanban"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === "kanban"
                    ? "bg-accent-50 text-accent dark:bg-accent/15"
                    : "text-ink-muted hover:bg-bg dark:hover:bg-white/5"
                )}
              >
                <IconLayoutGrid width={16} height={16} />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="Ver como lista"
                aria-pressed={view === "list"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === "list"
                    ? "bg-accent-50 text-accent dark:bg-accent/15"
                    : "text-ink-muted hover:bg-bg dark:hover:bg-white/5"
                )}
              >
                <IconList width={16} height={16} />
              </button>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <IconDownload width={16} height={16} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDefaultStatus("recibido");
                setFormOpen(true);
              }}
            >
              <IconPlus width={16} height={16} />
              Nueva orden
            </Button>
          </div>
        }
      />

      <div className="space-y-3 border-b border-line px-4 py-3 dark:border-line-dark sm:px-6">
        <div className="relative max-w-sm">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar orden, cliente, equipo…"
            className="pl-9"
            aria-label="Buscar órdenes"
          />
        </div>

        {view === "list" && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter("todos")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === "todos"
                  ? "bg-ink text-white dark:bg-white dark:text-ink"
                  : "bg-bg text-ink-muted hover:bg-line dark:bg-white/5 dark:text-ink-dark-muted"
              )}
            >
              Todos
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === s.id
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "bg-bg text-ink-muted hover:bg-line dark:bg-white/5 dark:text-ink-dark-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {loading ? (
          view === "kanban" ? (
            <div className="flex gap-4">
              {ORDER_STATUSES.map((s) => (
                <div key={s.id} className="w-72 shrink-0 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </Card>
          )
        ) : error ? (
          <ErrorState message="No pudimos cargar tus órdenes." onRetry={load} />
        ) : orders.length === 0 ? (
          <Card>
            <EmptyState
              icon={<IconWrench width={22} height={22} />}
              title="Aún no tienes órdenes"
              description="Registra el primer equipo que ingresa al taller."
              action={
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <IconPlus width={16} height={16} />
                  Nueva orden
                </Button>
              }
            />
          </Card>
        ) : view === "list" ? (
          <Card className="overflow-x-auto">
            {listRows.length === 0 ? (
              <EmptyState
                icon={<IconWrench width={22} height={22} />}
                title="Sin órdenes en este estado"
                description="Prueba con otra pestaña o búsqueda."
              />
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                    <th className="px-5 py-3 font-medium">Orden</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Equipo</th>
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 font-medium">Total</th>
                    <th className="px-3 py-3 font-medium">Ganancia</th>
                    <th className="px-3 py-3 font-medium">Saldo</th>
                    <th className="px-3 py-3 font-medium">Estado</th>
                    <th className="px-3 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line-dark">
                  {listRows.map((o) => {
                    const balance = o.total_cents - o.paid_cents;
                    const device = [o.device_brand, o.device_model].filter(Boolean).join(" ") || "—";
                    return (
                      <tr
                        key={o.id}
                        onClick={() => {
                          setEditing(o);
                          setFormOpen(true);
                        }}
                        className="cursor-pointer transition-colors hover:bg-bg dark:hover:bg-white/5"
                      >
                        <td className="px-5 py-3 font-mono text-xs font-medium text-accent">
                          {o.order_number}
                        </td>
                        <td className="px-3 py-3 text-ink dark:text-ink-dark">{o.client_name}</td>
                        <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">{device}</td>
                        <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">
                          {formatDate(o.created_at)}
                        </td>
                        <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">
                          {formatCurrency(o.total_cents)}
                        </td>
                        <td className="px-3 py-3 font-mono text-success">
                          {formatCurrency(o.total_cents - o.cost_cents)}
                        </td>
                        <td className="px-3 py-3 font-mono">
                          <span className={balance > 0 ? "text-warning" : "text-ink dark:text-ink-dark"}>
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={o.status}
                            onChange={(e) => moveOrder(o.id, e.target.value as OrderStatus)}
                            aria-label={`Cambiar estado de ${o.order_number}`}
                            className={cn(
                              "h-8 w-40 py-1 text-xs font-medium",
                              o.status === "pagada" || o.status === "entregado"
                                ? "text-success"
                                : "text-accent"
                            )}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <a
                              href={`/orders/${o.id}/warranty`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Imprimir garantía de ${o.order_number}`}
                              className="rounded-lg p-2 text-ink-muted hover:bg-accent-50 hover:text-accent dark:hover:bg-accent/10"
                            >
                              <IconPrinter width={16} height={16} />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(o);
                              }}
                              aria-label={`Eliminar ${o.order_number}`}
                              className="rounded-lg p-2 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10"
                            >
                              <IconTrash width={16} height={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        ) : (
          <div className="flex gap-4">
            {columns.map((col) => {
              const columnTotal = col.orders.reduce((sum, o) => sum + o.total_cents, 0);
              return (
                <div
                  key={col.id}
                  className={cn(
                    "w-72 shrink-0 rounded-2xl border border-transparent p-1 transition-colors",
                    dragOverStatus === col.id && "border-accent/40 bg-accent-50/60 dark:bg-accent/5"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(col.id);
                  }}
                  onDragLeave={() => setDragOverStatus((s) => (s === col.id ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const orderId = e.dataTransfer.getData("text/order-id");
                    setDragOverStatus(null);
                    if (orderId) moveOrder(orderId, col.id);
                  }}
                >
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_ACCENT[col.id])} />
                      <h3 className="text-sm font-semibold text-ink dark:text-ink-dark">{col.label}</h3>
                      <span className="font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
                        {col.orders.length}
                      </span>
                    </div>
                  </div>
                  <p className="px-2 pb-2 font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
                    {formatCurrency(columnTotal)}
                  </p>

                  <div className="space-y-2.5">
                    {col.orders.map((o) => {
                      const balance = o.total_cents - o.paid_cents;
                      const device = [o.device_brand, o.device_model].filter(Boolean).join(" ");
                      return (
                        <div
                          key={o.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/order-id", o.id)}
                          onClick={() => {
                            setEditing(o);
                            setFormOpen(true);
                          }}
                          role="button"
                          tabIndex={0}
                          className="group cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-card transition-shadow hover:shadow-raised active:cursor-grabbing dark:border-line-dark dark:bg-surface-dark"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-medium text-accent">
                              {o.order_number}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                              <a
                                href={`/orders/${o.id}/warranty`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Imprimir garantía de ${o.order_number}`}
                                className="rounded-md p-1 text-ink-muted hover:bg-accent-50 hover:text-accent dark:hover:bg-accent/10"
                              >
                                <IconPrinter width={14} height={14} />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleting(o);
                                }}
                                aria-label={`Eliminar ${o.order_number}`}
                                className="rounded-md p-1 text-ink-muted hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/10"
                              >
                                <IconTrash width={14} height={14} />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-ink dark:text-ink-dark">
                            {o.client_name}
                          </p>
                          {device && (
                            <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                              {device}
                              {o.technician ? ` · ${o.technician}` : ""}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <span className="font-mono text-sm text-ink dark:text-ink-dark">
                                {formatCurrency(o.total_cents)}
                              </span>
                              <span className="ml-1.5 font-mono text-xs text-success">
                                (+{formatCurrency(o.total_cents - o.cost_cents)})
                              </span>
                            </div>
                            <Badge tone={balance > 0 ? "warning" : "success"}>
                              {balance > 0 ? `Saldo ${formatCurrency(balance)}` : "Pagado"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setEditing(null);
                      setDefaultStatus(col.id);
                      setFormOpen(true);
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-xs font-medium text-ink-muted hover:border-accent hover:text-accent dark:border-line-dark"
                  >
                    <IconPlus width={14} height={14} />
                    Añadir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <OrderForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        order={editing}
        defaultStatus={defaultStatus}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar orden"
        description={`¿Seguro que quieres eliminar la orden ${deleting?.order_number}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Field";
import { Card, Badge, Avatar } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { IconMail, IconPhone, IconSearch, IconUsers, IconWrench } from "@/components/ui/Icons";
import { ORDER_STATUSES, type ClientSummary, type ServiceOrder } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

function buildClientSummaries(orders: ServiceOrder[]): ClientSummary[] {
  const byPhone = new Map<string, ServiceOrder[]>();
  for (const order of orders) {
    const key = order.client_phone || order.client_name;
    const list = byPhone.get(key) ?? [];
    list.push(order);
    byPhone.set(key, list);
  }

  const now = Date.now();

  return Array.from(byPhone.values())
    .map((clientOrders) => {
      const sorted = [...clientOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const first = sorted[0];
      const devices = Array.from(
        new Set(
          clientOrders
            .map((o) => [o.device_brand, o.device_model].filter(Boolean).join(" "))
            .filter(Boolean)
        )
      );
      const activeWarranties = clientOrders.filter((o) => {
        const expires = new Date(o.created_at);
        expires.setDate(expires.getDate() + o.warranty_days);
        return expires.getTime() > now;
      }).length;

      return {
        client_name: first.client_name,
        client_phone: first.client_phone,
        total_spent_cents: clientOrders.reduce((sum, o) => sum + o.paid_cents, 0),
        balance_cents: clientOrders.reduce((sum, o) => sum + Math.max(0, o.total_cents - o.paid_cents), 0),
        repairs_count: clientOrders.length,
        active_warranties_count: activeWarranties,
        devices,
        last_visit: first.created_at,
        orders: sorted,
      };
    })
    .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime());
}

export function ClientsPageClient() {
  const supabase = createClient();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clients = useMemo(() => buildClientSummaries(orders), [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.client_phone.includes(q) ||
        c.devices.some((d) => d.toLowerCase().includes(q))
    );
  }, [clients, query]);

  const selected = useMemo(
    () => filtered.find((c) => c.client_phone === selectedPhone) ?? filtered[0] ?? null,
    [filtered, selectedPhone]
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Ficha automática construida desde tus órdenes de servicio — no se llena a mano."
      />

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="border-b border-line p-4 dark:border-line-dark">
            <div className="relative">
              <IconSearch
                width={16}
                height={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente, teléfono o equipo…"
                className="pl-9"
                aria-label="Buscar clientes"
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">
              {filtered.length} {filtered.length === 1 ? "cliente encontrado" : "clientes encontrados"}
            </p>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message="No pudimos cargar tus clientes." onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers width={22} height={22} />}
              title={query ? "Sin resultados" : "Aún no tienes clientes"}
              description={
                query
                  ? "Intenta con otro término de búsqueda."
                  : "En cuanto registres tu primera orden de servicio, el cliente aparecerá aquí solo."
              }
            />
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto dark:divide-line-dark">
              {filtered.map((c) => (
                <li key={c.client_phone}>
                  <button
                    onClick={() => setSelectedPhone(c.client_phone)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg dark:hover:bg-white/5",
                      selected?.client_phone === c.client_phone && "bg-accent-50 dark:bg-accent/10"
                    )}
                  >
                    <Avatar name={c.client_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                        {c.client_name}
                      </p>
                      <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                        {c.repairs_count} {c.repairs_count === 1 ? "reparación" : "reparaciones"} ·{" "}
                        {formatCurrency(c.total_spent_cents)}
                      </p>
                    </div>
                    {c.balance_cents > 0 && (
                      <Badge tone="warning" className="shrink-0">
                        Debe
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-3">
          {!loading && selected && (
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
                    Ficha de cliente
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ink dark:text-ink-dark">
                    {selected.client_name}
                  </h2>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted dark:text-ink-dark-muted">
                    <IconPhone width={14} height={14} />
                    {selected.client_phone}
                  </div>
                </div>
                <div className="rounded-xl bg-ink px-4 py-3 text-right dark:bg-white/10">
                  <p className="text-xs text-white/60">Total gastado</p>
                  <p className="font-mono text-lg font-semibold text-white">
                    {formatCurrency(selected.total_spent_cents)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-bg p-3 dark:bg-white/5">
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Última visita</p>
                  <p className="mt-0.5 text-sm font-medium text-ink dark:text-ink-dark">
                    {formatDate(selected.last_visit)}
                  </p>
                </div>
                <div className="rounded-xl bg-bg p-3 dark:bg-white/5">
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Reparaciones</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-ink dark:text-ink-dark">
                    {selected.repairs_count}
                  </p>
                </div>
                <div className="rounded-xl bg-bg p-3 dark:bg-white/5">
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Garantías activas</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-ink dark:text-ink-dark">
                    {selected.active_warranties_count}
                  </p>
                </div>
                <div className="rounded-xl bg-bg p-3 dark:bg-white/5">
                  <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Saldo pendiente</p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-sm font-medium",
                      selected.balance_cents > 0 ? "text-warning" : "text-ink dark:text-ink-dark"
                    )}
                  >
                    {formatCurrency(selected.balance_cents)}
                  </p>
                </div>
              </div>

              {selected.devices.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium text-ink-muted dark:text-ink-dark-muted">Equipos</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.devices.map((d) => (
                      <Badge key={d} tone="neutral">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-line pt-5 dark:border-line-dark">
                <p className="mb-3 text-sm font-semibold text-ink dark:text-ink-dark">
                  Historial de reparaciones
                </p>
                <ul className="space-y-3">
                  {selected.orders.map((o) => {
                    const device = [o.device_brand, o.device_model].filter(Boolean).join(" ");
                    return (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 dark:border-line-dark"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent dark:bg-accent/15">
                            <IconWrench width={16} height={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink dark:text-ink-dark">
                              {o.order_number} {device && `· ${device}`}
                            </p>
                            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                              {formatDate(o.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-ink dark:text-ink-dark">
                            {formatCurrency(o.total_cents)}
                          </span>
                          <Badge tone={o.status === "pagada" || o.status === "entregado" ? "success" : "accent"}>
                            {ORDER_STATUSES.find((s) => s.id === o.status)?.label}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          )}

          {!loading && !selected && filtered.length === 0 && !error && (
            <Card className="flex h-full items-center justify-center p-12">
              <div className="text-center text-sm text-ink-muted dark:text-ink-dark-muted">
                <IconMail width={22} height={22} className="mx-auto mb-2" />
                Selecciona un cliente para ver su ficha.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

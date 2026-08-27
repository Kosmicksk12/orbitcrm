"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Input } from "@/components/ui/Field";
import { IconBuilding, IconCheck, IconRotateLeft, IconSearch, IconTrash } from "@/components/ui/Icons";
import { resolveAccess, type SubscriptionStatus } from "@/lib/subscription";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface AdminShopRow {
  shop_id: string;
  shop_name: string | null;
  created_at: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  member_count: number;
  order_count: number;
  sale_count: number;
  owner_email: string | null;
  last_order_at: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function AdminDashboard() {
  const supabase = createClient();
  const { toast } = useToast();

  const [rows, setRows] = useState<AdminShopRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(false);
    const { data, error: err } = await supabase.rpc("admin_list_shops");
    if (err) {
      setError(true);
      setRows([]);
      return;
    }
    setRows(
      (data ?? []).map((r: Record<string, unknown>) => ({
        shop_id: r.shop_id as string,
        shop_name: (r.shop_name as string | null) ?? null,
        created_at: r.created_at as string,
        subscription_status: r.subscription_status as SubscriptionStatus,
        trial_ends_at: r.trial_ends_at as string,
        member_count: Number(r.member_count ?? 0),
        order_count: Number(r.order_count ?? 0),
        sale_count: Number(r.sale_count ?? 0),
        owner_email: (r.owner_email as string | null) ?? null,
        last_order_at: (r.last_order_at as string | null) ?? null,
      }))
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(
    row: AdminShopRow,
    status: SubscriptionStatus,
    trialEndsAt?: string
  ) {
    setBusyId(row.shop_id);
    const { error: err } = await supabase.rpc("admin_set_shop_subscription", {
      p_shop_id: row.shop_id,
      p_status: status,
      p_trial_ends_at: trialEndsAt ?? null,
    });
    setBusyId(null);
    if (err) {
      toast({ title: "No se pudo cambiar el estado", description: err.message, variant: "danger" });
      return;
    }
    toast({ title: "Estado actualizado", variant: "success" });
    load();
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.shop_name ?? "").toLowerCase().includes(q) ||
        (r.owner_email ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const s = { total: 0, trial: 0, active: 0, expired: 0 };
    for (const r of rows ?? []) {
      s.total += 1;
      const a = resolveAccess({ status: r.subscription_status, trialEndsAt: r.trial_ends_at });
      if (a.status === "active") s.active += 1;
      else if (a.inTrial) s.trial += 1;
      else s.expired += 1;
    }
    return s;
  }, [rows]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Todos los talleres</h1>
      <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
        Estado de prueba y suscripción de cada taller registrado en Danivo CRM.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Talleres", value: stats.total },
          { label: "En prueba", value: stats.trial },
          { label: "Suscripción activa", value: stats.active },
          { label: "Prueba vencida", value: stats.expired },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink dark:text-ink-dark">
              {rows === null ? "—" : c.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="relative mt-5 max-w-sm">
        <IconSearch
          width={16}
          height={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por taller o correo…"
          className="pl-9"
          aria-label="Buscar talleres"
        />
      </div>

      <Card className="mt-4 overflow-x-auto">
        {rows === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message="No pudimos cargar los talleres." onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconBuilding width={22} height={22} />}
            title={query ? "Sin resultados" : "Todavía no hay talleres"}
            description={query ? "Prueba con otro término." : "Aparecerán aquí en cuanto alguien se registre."}
          />
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                <th className="px-5 py-3 font-medium">Taller</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium">Miembros</th>
                <th className="px-3 py-3 font-medium">Órdenes</th>
                <th className="px-3 py-3 font-medium">Ventas</th>
                <th className="px-3 py-3 font-medium">Última orden</th>
                <th className="px-3 py-3 font-medium">Registrado</th>
                <th className="px-3 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line-dark">
              {filtered.map((r) => {
                const access = resolveAccess({
                  status: r.subscription_status,
                  trialEndsAt: r.trial_ends_at,
                });
                const tone = access.status === "active" ? "success" : access.inTrial ? "accent" : "danger";
                const label =
                  access.status === "active"
                    ? "Activa"
                    : access.inTrial
                      ? `Prueba · ${access.trialDaysLeft}d`
                      : r.subscription_status === "canceled"
                        ? "Cancelada"
                        : r.subscription_status === "past_due"
                          ? "Pago pendiente"
                          : "Prueba vencida";
                return (
                  <tr key={r.shop_id} className={busyId === r.shop_id ? "opacity-50" : undefined}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink dark:text-ink-dark">
                        {r.shop_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
                        {r.owner_email || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                    <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">{r.member_count}</td>
                    <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">{r.order_count}</td>
                    <td className="px-3 py-3 font-mono text-ink dark:text-ink-dark">{r.sale_count}</td>
                    <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">
                      {r.last_order_at ? formatRelativeTime(r.last_order_at) : "—"}
                    </td>
                    <td className="px-3 py-3 text-ink-muted dark:text-ink-dark-muted">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ActionMenu
                        label={`Cambiar estado de ${r.shop_name || "taller"}`}
                        items={[
                          {
                            label: "Marcar suscripción activa",
                            icon: <IconCheck width={16} height={16} />,
                            onSelect: () => setStatus(r, "active"),
                          },
                          {
                            label: "Extender prueba 15 días",
                            icon: <IconRotateLeft width={16} height={16} />,
                            onSelect: () =>
                              setStatus(r, "trialing", new Date(Date.now() + 15 * DAY_MS).toISOString()),
                          },
                          {
                            label: "Marcar prueba vencida",
                            icon: <IconTrash width={16} height={16} />,
                            danger: true,
                            onSelect: () => setStatus(r, "canceled"),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/States";
import { IconBox, IconDeal, IconTrendingUp, IconUsers, IconWrench } from "@/components/ui/Icons";
import { ORDER_STATUSES, type ServiceOrder } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data }, { data: inventory }] = await Promise.all([
    supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("inventory_products").select("stock_qty, low_stock_threshold"),
  ]);

  const orders = (data ?? []) as ServiceOrder[];
  const lowStockCount = (inventory ?? []).filter((p) => p.stock_qty <= p.low_stock_threshold).length;

  const activeOrders = orders.filter((o) => o.status !== "entregado" && o.status !== "pagada");
  const monthKey = new Date().toISOString().slice(0, 7);
  const ordersThisMonth = orders.filter((o) => o.created_at.slice(0, 7) === monthKey);
  const salesThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.total_cents, 0);
  const profitThisMonth = ordersThisMonth.reduce((sum, o) => sum + (o.total_cents - o.cost_cents), 0);
  const outstandingBalance = orders.reduce((sum, o) => sum + Math.max(0, o.total_cents - o.paid_cents), 0);
  const uniqueClients = new Set(orders.map((o) => o.client_phone)).size;
  const recentOrders = orders.slice(0, 5);

  const statusCounts = ORDER_STATUSES.map((s) => ({
    ...s,
    count: orders.filter((o) => o.status === s.id).length,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((s) => s.count));

  const stats = [
    { label: "Reparaciones activas", value: activeOrders.length, icon: IconWrench, href: "/orders" },
    { label: "Clientes", value: uniqueClients, icon: IconUsers, href: "/clients" },
    { label: "Ventas del mes", value: formatCurrency(salesThisMonth), icon: IconTrendingUp, href: "/orders" },
    { label: "Ganancia del mes", value: formatCurrency(profitThisMonth), icon: IconTrendingUp, href: "/orders" },
    { label: "Saldo pendiente", value: formatCurrency(outstandingBalance), icon: IconDeal, href: "/orders" },
    { label: "Stock bajo", value: lowStockCount, icon: IconBox, href: "/inventory" },
  ];

  return (
    <div>
      <PageHeader title="Panel" description="Un vistazo general a la actividad del taller." />

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 transition-shadow hover:shadow-raised">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-muted dark:text-ink-dark-muted">
                  {s.label}
                </span>
                <s.icon width={18} height={18} className="text-accent" />
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold text-ink dark:text-ink-dark">
                {s.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
            Órdenes por estado
          </h2>
          <div className="mt-4 space-y-3">
            {statusCounts.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium text-ink-muted dark:text-ink-dark-muted">
                  {s.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg dark:bg-white/5">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="w-5 shrink-0 text-right font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
              Órdenes recientes
            </h2>
            <Link href="/orders" className="text-sm font-medium text-accent hover:underline">
              Ver todas
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              icon={<IconWrench width={22} height={22} />}
              title="Sin órdenes todavía"
              description="Registra el primer equipo que ingresa al taller."
            />
          ) : (
            <ul className="mt-3 divide-y divide-line dark:divide-line-dark">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink dark:text-ink-dark">
                      {o.order_number} · {o.client_name}
                    </p>
                    <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">
                      {[o.device_brand, o.device_model].filter(Boolean).join(" ") || "Sin equipo"} ·{" "}
                      {formatRelativeTime(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm text-ink dark:text-ink-dark">
                      {formatCurrency(o.total_cents)}
                    </span>
                    <Badge tone={o.status === "pagada" || o.status === "entregado" ? "success" : "accent"}>
                      {ORDER_STATUSES.find((s) => s.id === o.status)?.label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, Badge } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/States";
import { IconBox, IconCart, IconDeal, IconReceipt, IconTrendingUp, IconUsers, IconWrench } from "@/components/ui/Icons";
import { ORDER_STATUSES, type Expense, type Sale, type ServiceOrder } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { MonthCloseExport } from "@/components/dashboard/MonthCloseExport";

export const metadata = { title: "Panel" };

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const supabase = createClient();

  const [{ data }, { data: inventory }, { data: salesData }, { data: expensesData }] = await Promise.all([
    supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("inventory_products").select("stock_qty, low_stock_threshold"),
    supabase.from("sales").select("*").order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
  ]);

  const sales = (salesData ?? []) as Sale[];
  const expenses = (expensesData ?? []) as Expense[];
  const orders = (data ?? []) as ServiceOrder[];
  const lowStockCount = (inventory ?? []).filter((p) => p.stock_qty <= p.low_stock_threshold).length;

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const requestedMonth = searchParams?.month;
  const monthKey =
    requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : currentMonthKey;
  const isCurrentMonth = monthKey === currentMonthKey;
  const prevMonthKey = shiftMonth(monthKey, -1);
  const nextMonthKey = shiftMonth(monthKey, 1);
  const canGoNext = nextMonthKey <= currentMonthKey;

  const activeOrders = orders.filter((o) => o.status !== "entregado" && o.status !== "pagada");
  const ordersInMonth = orders.filter((o) => o.created_at.slice(0, 7) === monthKey);
  const salesInMonth = ordersInMonth.reduce((sum, o) => sum + o.total_cents, 0);
  const profitInMonth = ordersInMonth.reduce((sum, o) => sum + (o.total_cents - o.cost_cents), 0);
  const accessorySalesInMonth = sales
    .filter((s) => s.created_at.slice(0, 7) === monthKey)
    .reduce((sum, s) => sum + s.total_cents, 0);
  const expensesInMonth = expenses
    .filter((e) => e.expense_date.slice(0, 7) === monthKey)
    .reduce((sum, e) => sum + e.amount_cents, 0);
  const outstandingBalance = orders.reduce((sum, o) => sum + Math.max(0, o.total_cents - o.paid_cents), 0);
  const uniqueClients = new Set(orders.map((o) => o.client_phone)).size;
  const recentOrders = orders.slice(0, 5);

  const statusCounts = ORDER_STATUSES.map((s) => ({
    ...s,
    count: orders.filter((o) => o.status === s.id).length,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((s) => s.count));

  const currentStats = [
    { label: "Reparaciones activas", value: activeOrders.length, icon: IconWrench, href: "/orders" },
    { label: "Clientes", value: uniqueClients, icon: IconUsers, href: "/clients" },
    { label: "Saldo pendiente", value: formatCurrency(outstandingBalance), icon: IconDeal, href: "/orders" },
    { label: "Stock bajo", value: lowStockCount, icon: IconBox, href: "/inventory" },
  ];

  const monthStats = [
    { label: "Ventas reparaciones", value: formatCurrency(salesInMonth), icon: IconTrendingUp, href: "/orders" },
    { label: "Ventas accesorios", value: formatCurrency(accessorySalesInMonth), icon: IconCart, href: "/sales" },
    { label: "Ganancia", value: formatCurrency(profitInMonth), icon: IconTrendingUp, href: "/orders" },
    { label: "Gastos", value: formatCurrency(expensesInMonth), icon: IconReceipt, href: "/expenses" },
  ];

  return (
    <div>
      <PageHeader title="Panel" description="Un vistazo general a la actividad del taller." />

      <div className="px-4 pt-2 sm:px-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
          Estado actual
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {currentStats.map((s) => (
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
      </div>

      <div className="px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
            Resumen del mes
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard?month=${prevMonthKey}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-bg dark:border-line-dark dark:text-ink-dark dark:hover:bg-white/5"
              aria-label="Mes anterior"
            >
              ‹
            </Link>
            <span className="min-w-[140px] text-center font-mono text-sm font-medium text-ink dark:text-ink-dark">
              {formatMonthLabel(monthKey)}
            </span>
            {canGoNext ? (
              <Link
                href={`/dashboard?month=${nextMonthKey}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink hover:bg-bg dark:border-line-dark dark:text-ink-dark dark:hover:bg-white/5"
                aria-label="Mes siguiente"
              >
                ›
              </Link>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted/40 dark:border-line-dark dark:text-ink-dark-muted/40">
                ›
              </span>
            )}
            {!isCurrentMonth && (
              <Link
                href="/dashboard"
                className="ml-1 text-sm font-medium text-accent hover:underline"
              >
                Mes actual
              </Link>
            )}
            <div className="ml-2">
              <MonthCloseExport monthKey={monthKey} monthLabel={formatMonthLabel(monthKey)} />
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {monthStats.map((s) => (
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
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-5">
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { IconArrowLeft, IconPrinter, IconShield } from "@/components/ui/Icons";
import type { ServiceOrder } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function WarrantyClient({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      const [{ data: orderData, error: orderErr }, { data: userRes }] = await Promise.all([
        supabase.from("service_orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (orderErr || !orderData) {
        setError(true);
        setLoading(false);
        return;
      }
      setOrder(orderData as ServiceOrder);
      if (userRes.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("shop_name")
          .eq("id", userRes.user.id)
          .maybeSingle();
        setShopName(profile?.shop_name ?? "");
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return <ErrorState message="No encontramos esta orden o no tienes acceso a ella." />;
  }

  const device = [order.device_brand, order.device_model].filter(Boolean).join(" ") || "—";
  const balance = order.total_cents - order.paid_cents;
  const warrantyExpires = new Date(order.created_at);
  warrantyExpires.setDate(warrantyExpires.getDate() + order.warranty_days);

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark"
        >
          <IconArrowLeft width={16} height={16} />
          Volver a Órdenes
        </Link>
        <Button onClick={() => window.print()}>
          <IconPrinter width={16} height={16} />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="print-area rounded-2xl border border-line bg-surface p-8 shadow-card dark:border-line-dark dark:bg-surface-dark print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-line pb-5 dark:border-line-dark">
          <div>
            <p className="font-display text-lg font-semibold text-ink dark:text-ink-dark">
              {shopName || "OrbitCRM"}
            </p>
            <p className="text-sm text-ink-muted dark:text-ink-dark-muted">Comprobante de garantía</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent dark:bg-accent/15">
            <IconShield width={22} height={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">N.º de orden</p>
            <p className="font-mono font-medium text-ink dark:text-ink-dark">{order.order_number}</p>
          </div>
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Fecha de ingreso</p>
            <p className="font-medium text-ink dark:text-ink-dark">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Cliente</p>
            <p className="font-medium text-ink dark:text-ink-dark">{order.client_name}</p>
          </div>
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Teléfono</p>
            <p className="font-medium text-ink dark:text-ink-dark">{order.client_phone}</p>
          </div>
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Equipo</p>
            <p className="font-medium text-ink dark:text-ink-dark">{device}</p>
          </div>
          <div>
            <p className="text-ink-muted dark:text-ink-dark-muted">Técnico</p>
            <p className="font-medium text-ink dark:text-ink-dark">{order.technician || "—"}</p>
          </div>
        </div>

        {order.problem_description && (
          <div className="mt-5">
            <p className="text-sm text-ink-muted dark:text-ink-dark-muted">Falla reportada</p>
            <p className="mt-1 text-sm text-ink dark:text-ink-dark">{order.problem_description}</p>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-accent-50 p-4 dark:bg-accent/10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">
              Garantía válida por {order.warranty_days} días
            </p>
            <p className="text-sm font-semibold text-accent-700 dark:text-accent-400">
              Vence: {formatDate(warrantyExpires.toISOString())}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-5 text-sm dark:border-line-dark">
          <span className="text-ink-muted dark:text-ink-dark-muted">Total</span>
          <span className="font-mono font-semibold text-ink dark:text-ink-dark">
            {formatCurrency(order.total_cents)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-ink-muted dark:text-ink-dark-muted">Saldo pendiente</span>
          <span className="font-mono font-semibold text-ink dark:text-ink-dark">
            {formatCurrency(balance)}
          </span>
        </div>

        <p className="mt-8 text-center text-xs text-ink-muted dark:text-ink-dark-muted">
          Esta garantía cubre defectos del repuesto o mano de obra relacionados con la reparación
          descrita. No cubre daños por caídas, golpes o líquidos posteriores a la entrega.
        </p>
      </div>
    </div>
  );
}

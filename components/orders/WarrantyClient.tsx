"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { IconArrowLeft, IconPrinter, IconShield } from "@/components/ui/Icons";
import { WhatsAppLink } from "@/components/orders/WhatsAppLink";
import { OrderPhotos } from "@/components/orders/OrderPhotos";
import type { ServiceOrder } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { warrantyWhatsAppMessage } from "@/lib/whatsapp";

export function WarrantyClient({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const { shopId } = useShop();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      // El nombre del taller sale de shops.name — la misma fuente que usa la
      // garantía pública /garantia/[id] — para que ambos comprobantes digan
      // exactamente lo mismo.
      const [{ data: orderData, error: orderErr }, { data: shop }] = await Promise.all([
        supabase.from("service_orders").select("*").eq("id", orderId).is("deleted_at", null).maybeSingle(),
        supabase.from("shops").select("name").eq("id", shopId).maybeSingle(),
      ]);
      if (orderErr || !orderData) {
        setError(true);
        setLoading(false);
        return;
      }
      setOrder(orderData as ServiceOrder);
      setShopName(shop?.name ?? "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, shopId]);

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
  const isActive = warrantyExpires.getTime() > Date.now();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  const publicLink = `${siteUrl}/garantia/${order.id}`;
  const warrantyMessage = warrantyWhatsAppMessage(order, publicLink);

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
        <div className="flex items-center gap-2">
          <WhatsAppLink
            phone={order.client_phone}
            clientName={order.client_name}
            message={warrantyMessage}
            context="garantia"
            shopId={order.shop_id}
            orderId={order.id}
            orderNumber={order.order_number}
            label="Enviar por WhatsApp"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-ink hover:bg-bg dark:border-line-dark dark:text-ink-dark dark:hover:bg-white/5"
          />
          <Button onClick={() => window.print()}>
            <IconPrinter width={16} height={16} />
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      <div className="print-area overflow-hidden rounded-2xl border border-line bg-surface shadow-card dark:border-line-dark dark:bg-surface-dark print:rounded-none print:border-0">
        <div
          className="flex items-center justify-between bg-gradient-to-r from-accent to-accent-600 px-6 py-6 text-white sm:px-8 print:px-0"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <div>
            <p className="font-display text-lg font-semibold">{shopName || "Danivo CRM"}</p>
            <p className="text-sm text-white/75">Comprobante de garantía</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <IconShield width={24} height={24} />
          </div>
        </div>

        <div className="p-6 sm:p-8 print:px-0">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                isActive
                  ? "bg-success-soft text-success dark:bg-success/15"
                  : "bg-danger-soft text-danger dark:bg-danger/15"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-success" : "bg-danger")} />
              {isActive ? "Garantía activa" : "Garantía vencida"}
            </span>
            <span className="font-mono text-xs font-medium text-ink-muted dark:text-ink-dark-muted">
              {order.order_number}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm dark:border-line-dark">
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Fecha de ingreso</p>
              <p className="font-medium text-ink dark:text-ink-dark">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Vence</p>
              <p className="font-medium text-ink dark:text-ink-dark">
                {formatDate(warrantyExpires.toISOString())}
              </p>
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
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">
              Garantía válida por {order.warranty_days} días desde la entrega
            </p>
          </div>

          <div className="mt-5 space-y-1 rounded-xl border border-line p-4 dark:border-line-dark">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted dark:text-ink-dark-muted">Total</span>
              <span className="font-mono font-semibold text-ink dark:text-ink-dark">
                {formatCurrency(order.total_cents)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted dark:text-ink-dark-muted">Saldo pendiente</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  balance > 0 ? "text-warning" : "text-ink dark:text-ink-dark"
                )}
              >
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted dark:text-ink-dark-muted">
            Esta garantía cubre defectos del repuesto o mano de obra relacionados con la reparación
            descrita. No cubre daños por caídas, golpes o líquidos posteriores a la entrega.
          </p>
        </div>
      </div>

      <div className="no-print mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card dark:border-line-dark dark:bg-surface-dark">
        <OrderPhotos orderId={order.id} shopId={order.shop_id} />
      </div>
    </div>
  );
}

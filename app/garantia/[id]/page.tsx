import { createClient } from "@/lib/supabase/server";
import { IconShield } from "@/components/ui/Icons";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Garantía" };

interface PublicWarranty {
  order_number: string;
  client_name: string;
  device_brand: string | null;
  device_model: string | null;
  problem_description: string | null;
  warranty_days: number;
  total_cents: number;
  paid_cents: number;
  created_at: string;
  shop_name: string | null;
}

export default async function PublicWarrantyPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_warranty", { p_order_id: params.id }).maybeSingle();
  const warranty = data as PublicWarranty | null;

  if (error || !warranty) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
          No encontramos esta garantía. Verifica el link con el taller.
        </p>
      </div>
    );
  }

  const device = [warranty.device_brand, warranty.device_model].filter(Boolean).join(" ") || "—";
  const balance = warranty.total_cents - warranty.paid_cents;
  const warrantyExpires = new Date(warranty.created_at);
  warrantyExpires.setDate(warrantyExpires.getDate() + warranty.warranty_days);
  const isActive = warrantyExpires.getTime() > Date.now();

  return (
    <div className="mx-auto min-h-dvh max-w-xl p-4 sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card dark:border-line-dark dark:bg-surface-dark">
        <div
          className="flex items-center justify-between bg-gradient-to-r from-accent to-accent-600 px-6 py-6 text-white sm:px-8"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <div>
            <p className="font-display text-lg font-semibold">{warranty.shop_name || "Danivo CRM"}</p>
            <p className="text-sm text-white/75">Comprobante de garantía</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <IconShield width={24} height={24} />
          </div>
        </div>

        <div className="p-6 sm:p-8">
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
              {warranty.order_number}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm dark:border-line-dark">
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Fecha de ingreso</p>
              <p className="font-medium text-ink dark:text-ink-dark">{formatDate(warranty.created_at)}</p>
            </div>
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Vence</p>
              <p className="font-medium text-ink dark:text-ink-dark">
                {formatDate(warrantyExpires.toISOString())}
              </p>
            </div>
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Cliente</p>
              <p className="font-medium text-ink dark:text-ink-dark">{warranty.client_name}</p>
            </div>
            <div>
              <p className="text-ink-muted dark:text-ink-dark-muted">Equipo</p>
              <p className="font-medium text-ink dark:text-ink-dark">{device}</p>
            </div>
          </div>

          {warranty.problem_description && (
            <div className="mt-5">
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">Falla reportada</p>
              <p className="mt-1 text-sm text-ink dark:text-ink-dark">{warranty.problem_description}</p>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-accent-50 p-4 dark:bg-accent/10">
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">
              Garantía válida por {warranty.warranty_days} días desde la entrega
            </p>
          </div>

          <div className="mt-5 space-y-1 rounded-xl border border-line p-4 dark:border-line-dark">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted dark:text-ink-dark-muted">Total</span>
              <span className="font-mono font-semibold text-ink dark:text-ink-dark">
                {formatCurrency(warranty.total_cents)}
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

      <p className="mt-4 text-center text-xs text-ink-muted/60 dark:text-ink-dark-muted/60">
        Generado con Danivo CRM
      </p>
    </div>
  );
}

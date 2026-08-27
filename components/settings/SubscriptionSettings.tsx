"use client";

import { useState } from "react";
import { useShop } from "@/components/shop/ShopContext";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Primitives";
import { IconCheck, IconShield } from "@/components/ui/Icons";
import { PLAN } from "@/lib/subscription";

const INCLUDES = [
  "Órdenes, inventario, ventas y gastos sin límite",
  "Todo tu equipo con roles de admin y empleado",
  "Fotos del equipo, garantías e historial de WhatsApp",
  "Notificaciones, cierre de mes y exportación a Excel",
];

export function SubscriptionSettings() {
  const { access, isAdmin } = useShop();
  const [notice, setNotice] = useState(false);

  const statusLabel =
    access.status === "active"
      ? "Suscripción activa"
      : access.expired
        ? "Prueba vencida"
        : `Prueba — ${access.trialDaysLeft} ${access.trialDaysLeft === 1 ? "día" : "días"} restantes`;

  const statusTone: "success" | "warning" | "danger" =
    access.status === "active" ? "success" : access.expired ? "danger" : "warning";

  return (
    <div id="suscripcion" className="scroll-mt-24">
      <Card className="p-6">
        <div className="flex items-center gap-2.5">
          <IconShield width={18} height={18} className="text-accent" />
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
            Suscripción
          </h2>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 dark:border-line-dark">
          <div>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">
              {access.status === "active"
                ? "Tu taller tiene acceso completo."
                : access.expired
                  ? "Tu taller quedó en solo lectura: pueden entrar y ver los datos, pero no crear ni editar."
                  : "Durante la prueba tienes acceso completo. Al terminar, el taller pasa a solo lectura hasta que te suscribas."}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">
              {PLAN.priceLabel}
              <span className="ml-1 text-sm font-normal text-ink-muted dark:text-ink-dark-muted">
                {PLAN.periodLabel}
              </span>
            </p>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{PLAN.currencyNote}</p>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {INCLUDES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />
              <span className="text-ink dark:text-ink-dark">{f}</span>
            </li>
          ))}
        </ul>

        {access.status !== "active" && (
          <div className="mt-5 border-t border-line pt-5 dark:border-line-dark">
            {isAdmin ? (
              <>
                {/* TODO(stripe): cuando BILLING_ENABLED, este onClick debe llamar
                    al endpoint de checkout en vez de mostrar el aviso. */}
                <Button onClick={() => setNotice(true)}>Suscríbete</Button>
                {notice && (
                  <p className="mt-3 rounded-xl bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700 dark:bg-accent/10 dark:text-accent-400">
                    Los pagos se activan muy pronto. Te avisaremos por correo cuando puedas
                    suscribirte desde aquí.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
                Pídele a un administrador del taller que gestione la suscripción.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

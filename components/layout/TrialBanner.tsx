"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useShop } from "@/components/shop/ShopContext";
import { cn } from "@/lib/utils";

/**
 * Barra fija bajo el topbar que avisa del estado de la prueba:
 *  - prueba con 5 días o menos → aviso ámbar
 *  - prueba vencida (solo lectura) → aviso rojo, no se puede cerrar
 *  - suscripción activa → no se muestra nada
 */
export function TrialBanner() {
  const { access } = useShop();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (access.status === "active") return null;

  const expired = access.expired;
  const showTrial = access.inTrial && access.trialDaysLeft <= 5;
  if (!expired && !showTrial) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm",
        expired
          ? "border-danger/30 bg-danger-soft text-danger dark:bg-danger/10"
          : "border-warning/30 bg-warning-soft text-warning dark:bg-warning/10"
      )}
    >
      <span className="font-medium">
        {expired
          ? "Tu prueba terminó. Puedes ver todo, pero no crear ni editar."
          : `Te ${access.trialDaysLeft === 1 ? "queda" : "quedan"} ${access.trialDaysLeft} ${
              access.trialDaysLeft === 1 ? "día" : "días"
            } de prueba.`}
      </span>
      <Link
        href="/settings#suscripcion"
        className={cn(
          "inline-flex h-7 items-center rounded-lg px-3 text-xs font-semibold",
          expired
            ? "bg-danger text-white hover:bg-danger/90"
            : "bg-warning text-white hover:bg-warning/90"
        )}
      >
        {expired ? "Suscríbete" : "Ver plan"}
      </Link>
    </div>
  );
}

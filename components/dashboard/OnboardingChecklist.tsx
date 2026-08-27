"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Primitives";
import { IconCheck } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "danivo:onboarding-hidden";

/**
 * Guía de primeros pasos para un taller nuevo. Se muestra en el Panel hasta
 * que los pasos obligatorios (nombre, primera orden, primer producto) estén
 * hechos, o hasta que el usuario la oculte a mano (queda guardado en este
 * dispositivo). El paso de invitar al equipo es opcional y no la cierra.
 */
export function OnboardingChecklist({
  named,
  hasOrder,
  hasProduct,
  hasTeam,
}: {
  named: boolean;
  hasOrder: boolean;
  hasProduct: boolean;
  hasTeam: boolean;
}) {
  // Arranca oculto para no parpadear antes de leer localStorage.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function hide() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const requiredDone = named && hasOrder && hasProduct;
  if (dismissed === null || dismissed || requiredDone) return null;

  const steps: {
    done: boolean;
    label: string;
    hint: string;
    href: string;
    cta: string;
    optional?: boolean;
  }[] = [
    {
      done: named,
      label: "Ponle nombre a tu taller",
      hint: "Aparece en el comprobante de garantía del cliente.",
      href: "/settings",
      cta: "Ir a Ajustes",
    },
    {
      done: hasOrder,
      label: "Registra tu primera orden de servicio",
      hint: "El primer equipo que ingresa al taller.",
      href: "/orders",
      cta: "Ir a Órdenes",
    },
    {
      done: hasProduct,
      label: "Agrega un producto al inventario",
      hint: "Un repuesto o accesorio con su stock y precio.",
      href: "/inventory",
      cta: "Ir a Inventario",
    },
    {
      done: hasTeam,
      label: "Invita a tu equipo",
      hint: "Opcional — puedes hacerlo cuando quieras.",
      href: "/settings",
      cta: "Invitar",
      optional: true,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="px-4 pt-4 sm:px-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">
              Primeros pasos
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted dark:text-ink-dark-muted">
              {doneCount} de {steps.length} · deja tu taller listo en unos minutos.
            </p>
          </div>
          <button
            onClick={hide}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted hover:bg-bg hover:text-ink dark:text-ink-dark-muted dark:hover:bg-white/5 dark:hover:text-ink-dark"
          >
            Ocultar
          </button>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg dark:bg-white/5">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ul className="mt-4 space-y-2">
          {steps.map((s) => (
            <li
              key={s.label}
              className="flex items-start gap-3 rounded-xl border border-line p-3 dark:border-line-dark"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  s.done
                    ? "border-success bg-success text-white"
                    : "border-line dark:border-line-dark"
                )}
              >
                {s.done && <IconCheck width={13} height={13} />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      s.done
                        ? "text-ink-muted line-through dark:text-ink-dark-muted"
                        : "text-ink dark:text-ink-dark"
                    )}
                  >
                    {s.label}
                    {s.optional && !s.done && (
                      <span className="ml-1.5 text-xs font-normal text-ink-muted dark:text-ink-dark-muted">
                        (opcional)
                      </span>
                    )}
                  </p>
                  {!s.done && (
                    <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{s.hint}</p>
                  )}
                </div>
                {!s.done && (
                  <Link
                    href={s.href}
                    className="shrink-0 whitespace-nowrap text-xs font-semibold text-accent hover:underline"
                  >
                    {s.cta} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

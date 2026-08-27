export const TRIAL_DAYS = 15;

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface ShopSubscription {
  status: SubscriptionStatus;
  /** ISO timestamp */
  trialEndsAt: string;
}

export interface SubscriptionAccess {
  status: SubscriptionStatus;
  /** true → el taller puede crear / editar / borrar */
  writable: boolean;
  /** true → prueba en curso, todavía no vencida */
  inTrial: boolean;
  /** días enteros que faltan para que venza la prueba (0 si ya venció) */
  trialDaysLeft: number;
  /** true → la prueba venció y no hay suscripción activa → solo lectura */
  expired: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Traduce el estado crudo de la suscripción a lo que la app necesita saber:
 * ¿puede escribir?, ¿está en prueba?, ¿cuántos días quedan?
 */
export function resolveAccess(sub: ShopSubscription, now: number = Date.now()): SubscriptionAccess {
  if (sub.status === "active") {
    return { status: sub.status, writable: true, inTrial: false, trialDaysLeft: 0, expired: false };
  }

  const trialEnd = new Date(sub.trialEndsAt).getTime();
  const msLeft = trialEnd - now;
  const inTrial = sub.status === "trialing" && msLeft > 0;

  if (inTrial) {
    return {
      status: sub.status,
      writable: true,
      inTrial: true,
      trialDaysLeft: Math.max(1, Math.ceil(msLeft / DAY_MS)),
      expired: false,
    };
  }

  // trialing vencido, past_due o canceled → solo lectura
  return { status: sub.status, writable: false, inTrial: false, trialDaysLeft: 0, expired: true };
}

/**
 * Plan único. Mientras no haya Stripe conectado el precio es informativo y el
 * botón "Suscríbete" muestra un aviso de "próximamente".
 */
export const PLAN = {
  name: "Danivo CRM",
  priceLabel: "$49.900",
  periodLabel: "/ mes",
  currencyNote: "Precios en pesos colombianos (COP).",
};

/**
 * Se activa poniendo NEXT_PUBLIC_BILLING_ENABLED=true (junto con las llaves de
 * Stripe del lado servidor). Sin eso, la app funciona en modo "cobro
 * desactivado": la prueba corre igual, pero "Suscríbete" no cobra todavía.
 */
export const BILLING_ENABLED =
  !!process.env.NEXT_PUBLIC_BILLING_ENABLED &&
  process.env.NEXT_PUBLIC_BILLING_ENABLED !== "false";

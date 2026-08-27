import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Logo } from "@/components/ui/Logo";
import { PLAN, TRIAL_DAYS } from "@/lib/subscription";
import {
  IconBell,
  IconBox,
  IconCheck,
  IconLayoutGrid,
  IconPhone,
  IconReceipt,
  IconShield,
  IconUsers,
  IconWhatsapp,
} from "@/components/ui/Icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { icon: Icon; title: string; body: string }[] = [
  {
    icon: IconLayoutGrid,
    title: "Órdenes en un tablero",
    body: "Cada equipo que entra es una tarjeta. Muévela de “Recibido” a “Entregado” y todo el taller ve el estado al instante.",
  },
  {
    icon: IconBox,
    title: "Inventario de repuestos",
    body: "Control de stock con alerta de mínimos. Al registrar una venta, el repuesto se descuenta solo.",
  },
  {
    icon: IconReceipt,
    title: "La caja, clara",
    body: "Ventas, gastos y ganancia por reparación. Cierre de mes y exportación a Excel en un clic.",
  },
  {
    icon: IconPhone,
    title: "Ficha de cliente automática",
    body: "No la llenas a mano: se arma sola con el historial de cada número de teléfono.",
  },
  {
    icon: IconShield,
    title: "Garantía con enlace público",
    body: "Genera el comprobante y compártelo por un link. El cliente ve si su garantía sigue activa.",
  },
  {
    icon: IconWhatsapp,
    title: "WhatsApp con historial",
    body: "Escríbele al cliente desde la orden y queda registrado qué le mandaste y cuándo.",
  },
  {
    icon: IconBell,
    title: "Nada se te pasa",
    body: "Un centro de avisos te recuerda el stock bajo, los saldos pendientes y las garantías por vencer.",
  },
  {
    icon: IconUsers,
    title: "Tu equipo, con roles",
    body: "Invita a tus técnicos. Los administradores gestionan; los miembros registran y editan.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Registra el equipo",
    body: "Datos del cliente, la falla, el técnico asignado y fotos del estado en que llegó. Toma menos de un minuto.",
  },
  {
    n: "02",
    title: "Sigue la reparación",
    body: "El equipo avanza por el tablero. Anota costos y abonos; la ganancia se calcula sola.",
  },
  {
    n: "03",
    title: "Entrega con garantía",
    body: "Genera el comprobante, mándalo por WhatsApp y cierra la orden. Queda todo el historial.",
  },
];

const PLAN_INCLUDES = [
  "Órdenes, inventario, ventas y gastos sin límite",
  "Todo tu equipo con roles de admin y empleado",
  "Fotos del equipo, garantías e historial de WhatsApp",
  "Notificaciones, cierre de mes y exportación a Excel",
  "Tus datos siempre disponibles, desde cualquier dispositivo",
];

function BrandGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/20 blur-[130px] dark:bg-accent/25"
    />
  );
}

function KanbanPreview() {
  const columns = [
    { label: "Recibido", dot: "bg-ink-muted", cards: ["Tecno Camon 20", "iPhone 11"] },
    { label: "En reparación", dot: "bg-warning", cards: ["Samsung A32", "Redmi Note 12"] },
    { label: "Listo", dot: "bg-success", cards: ["Motorola G9"] },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-raised dark:border-line-dark dark:bg-surface-dark">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3 dark:border-line-dark">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
        <span className="ml-3 font-mono text-xs text-ink-muted dark:text-ink-dark-muted">
          danivo · órdenes
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {columns.map((col) => (
          <div key={col.label} className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="text-[11px] font-semibold text-ink dark:text-ink-dark">
                {col.label}
              </span>
            </div>
            <div className="space-y-2">
              {col.cards.map((c) => (
                <div
                  key={c}
                  className="rounded-lg border border-line bg-surface p-2.5 shadow-card dark:border-line-dark dark:bg-surface-dark"
                >
                  <p className="text-[11px] font-medium text-ink dark:text-ink-dark">{c}</p>
                  <div className="mt-1.5 h-1 w-10 rounded-full bg-line dark:bg-line-dark" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-ink dark:bg-bg-dark dark:text-ink-dark">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur dark:border-line-dark/70 dark:bg-bg-dark/80">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-lg font-bold tracking-[-0.03em]">Danivo</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <a
              href="#funciones"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark sm:block"
            >
              Funciones
            </a>
            <a
              href="#precios"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark sm:block"
            >
              Precios
            </a>
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink dark:text-ink-dark-muted dark:hover:text-ink-dark sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-xl bg-gradient-to-b from-accent to-accent-600 px-4 text-sm font-semibold text-white shadow-button hover:from-accent-600 hover:to-accent-700"
            >
              Empieza gratis
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <BrandGlow />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-card dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark-muted">
              Hecho para talleres de reparación
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              El taller entero,
              <br className="hidden sm:block" /> en una sola pantalla
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted dark:text-ink-dark-muted sm:text-lg">
              Danivo CRM junta tus órdenes de reparación, el inventario de repuestos, la caja y las
              garantías. Sin planillas sueltas y sin perderle el rastro a ningún equipo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-accent to-accent-600 px-6 text-base font-semibold text-white shadow-button hover:from-accent-600 hover:to-accent-700 sm:w-auto"
              >
                Empieza gratis
              </Link>
              <a
                href="#funciones"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line bg-surface px-6 text-base font-semibold text-ink shadow-card hover:bg-bg dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:bg-white/5 sm:w-auto"
              >
                Ver funciones
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-muted dark:text-ink-dark-muted">
              {TRIAL_DAYS} días gratis, sin tarjeta de crédito.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <KanbanPreview />
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Todo lo que un taller necesita
          </h2>
          <p className="mt-3 text-ink-muted dark:text-ink-dark-muted">
            Nada de módulos de más. Cada función existe porque un taller la usa todos los días.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-line bg-surface p-5 shadow-card dark:border-line-dark dark:bg-surface-dark"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent dark:bg-accent/15">
                  <Icon width={20} height={20} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink dark:text-ink-dark">{f.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted dark:text-ink-dark-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Del mostrador a la entrega, sin fricción
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="font-mono text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold text-ink dark:text-ink-dark">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Un precio, todo incluido
          </h2>
          <p className="mt-3 text-ink-muted dark:text-ink-dark-muted">
            Prueba {TRIAL_DAYS} días gratis con acceso completo, sin tarjeta. Después, un solo plan
            para todo el taller.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-accent bg-surface p-6 shadow-raised ring-1 ring-accent/30 dark:bg-surface-dark sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink dark:text-ink-dark">
                {PLAN.name}
              </h3>
              <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent/15 dark:text-accent-400">
                {TRIAL_DAYS} días gratis
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-semibold text-ink dark:text-ink-dark">
                {PLAN.priceLabel}
              </span>
              <span className="text-sm text-ink-muted dark:text-ink-dark-muted">
                {PLAN.periodLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted dark:text-ink-dark-muted">{PLAN.currencyNote}</p>

            <ul className="mt-6 space-y-2.5">
              {PLAN_INCLUDES.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm">
                  <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-success" />
                  <span className="text-ink dark:text-ink-dark">{feat}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-b from-accent to-accent-600 px-4 text-sm font-semibold text-white shadow-button hover:from-accent-600 hover:to-accent-700"
            >
              Empieza los {TRIAL_DAYS} días gratis
            </Link>
            <p className="mt-3 text-center text-xs text-ink-muted dark:text-ink-dark-muted">
              Al terminar la prueba puedes seguir viendo tus datos aunque no te suscribas.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card dark:border-line-dark dark:bg-surface-dark">
          <BrandGlow />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Prueba Danivo con las órdenes de esta semana
            </h2>
            <p className="mx-auto mt-3 max-w-md text-ink-muted dark:text-ink-dark-muted">
              Crea tu taller, invita a tu equipo y registra la primera reparación hoy.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-b from-accent to-accent-600 px-7 text-base font-semibold text-white shadow-button hover:from-accent-600 hover:to-accent-700"
            >
              Empieza gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface dark:border-line-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-base font-bold tracking-[-0.03em]">Danivo CRM</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted dark:text-ink-dark-muted">
            <a href="#funciones" className="hover:text-ink dark:hover:text-ink-dark">
              Funciones
            </a>
            <a href="#precios" className="hover:text-ink dark:hover:text-ink-dark">
              Precios
            </a>
            <Link href="/terminos" className="hover:text-ink dark:hover:text-ink-dark">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-ink dark:hover:text-ink-dark">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-ink dark:hover:text-ink-dark">
              Iniciar sesión
            </Link>
          </div>
        </div>
        <div className="border-t border-line px-4 py-5 text-center text-xs text-ink-muted dark:border-line-dark dark:text-ink-dark-muted sm:px-6">
          © {new Date().getFullYear()} Danivo CRM. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

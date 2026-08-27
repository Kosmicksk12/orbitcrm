-- ============================================================================
-- Migración: Suscripción con prueba gratis. Cada taller nuevo arranca con 15
-- días de acceso total (trial). Al vencer, si no hay suscripción activa, el
-- taller queda en modo SOLO LECTURA: sus usuarios pueden entrar y ver todo,
-- pero no crear / editar / borrar hasta que se suscriban.
--
-- Esta migración es aditiva: solo agrega columnas a `shops` y deja a los
-- talleres YA EXISTENTES en 'active' (acceso total, no se ven afectados). El
-- refuerzo por RLS (bloquear las escrituras a nivel base de datos) se hará
-- junto con la integración real de Stripe; por ahora el bloqueo es del lado
-- de la app.
--
-- Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

alter table public.shops
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '15 days'),
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Grandfather: los talleres que ya existían entran con acceso total.
update public.shops set subscription_status = 'active' where subscription_status = 'trialing';

-- ---------------------------------------------------------------------------
-- Listo. Los talleres nuevos (creados por handle_new_user) toman los valores
-- por defecto: subscription_status = 'trialing' y trial_ends_at = now() + 15d.
-- ---------------------------------------------------------------------------

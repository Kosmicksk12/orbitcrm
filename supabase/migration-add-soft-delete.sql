-- ============================================================================
-- Migración: papelera para Órdenes y Gastos. En vez de borrar para siempre
-- de una, "eliminar" ahora marca la fila con deleted_at y la saca de las
-- vistas normales — se puede restaurar o borrar para siempre desde la
-- papelera. Ventas queda igual que antes (eliminar sigue siendo inmediato)
-- porque ahí "eliminar" también repone stock automáticamente, y mezclar eso
-- con una papelera es más delicado; se deja para una migración aparte si
-- hace falta más adelante.
-- Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

alter table public.service_orders add column if not exists deleted_at timestamptz;
alter table public.expenses add column if not exists deleted_at timestamptz;

create index if not exists service_orders_deleted_at_idx on public.service_orders (deleted_at);
create index if not exists expenses_deleted_at_idx on public.expenses (deleted_at);

-- ---------------------------------------------------------------------------
-- get_public_warranty: una orden movida a la papelera ya no debe ser
-- visible en su link público de garantía.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_warranty(p_order_id uuid)
returns table (
  order_number text,
  client_name text,
  device_brand text,
  device_model text,
  problem_description text,
  warranty_days integer,
  total_cents bigint,
  paid_cents bigint,
  created_at timestamptz,
  shop_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.order_number,
    o.client_name,
    o.device_brand,
    o.device_model,
    o.problem_description,
    o.warranty_days,
    o.total_cents,
    o.paid_cents,
    o.created_at,
    s.name
  from public.service_orders o
  join public.shops s on s.id = o.shop_id
  where o.id = p_order_id and o.deleted_at is null;
$$;

grant execute on function public.get_public_warranty(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listo. La papelera no se vacía sola por ahora — las filas movidas ahí se
-- quedan hasta que alguien las restaure o las borre para siempre a mano.
-- ---------------------------------------------------------------------------

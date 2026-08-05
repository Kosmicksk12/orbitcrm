-- ============================================================================
-- Migración: función pública para el link de garantía que se comparte por
-- WhatsApp. Un cliente sin cuenta puede ver esta información con solo el
-- link (que incluye el ID de la orden, difícil de adivinar), pero la función
-- deliberadamente NO expone datos sensibles: nada de costos, teléfono,
-- técnico ni notas internas. Corre esto completo en el SQL Editor.
-- ============================================================================

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
  where o.id = p_order_id;
$$;

grant execute on function public.get_public_warranty(uuid) to anon, authenticated;

-- ============================================================================
-- Migración: unificar el "nombre del taller" en una sola columna.
--
-- Antes había DOS campos:
--   * profiles.shop_name  — lo escribía/leía la pantalla de Ajustes y la
--     garantía interna. Es por-usuario, no por-taller: incorrecto para un
--     taller con varios miembros.
--   * shops.name          — lo usan la garantía PÚBLICA (/garantia/[id] vía
--     get_public_warranty) y el panel de super-admin (/admin vía
--     admin_list_shops).
--
-- Si el dueño ponía el nombre en Ajustes, se guardaba solo en
-- profiles.shop_name, así que el comprobante que ve el cliente seguía
-- diciendo "Danivo CRM" y el panel mostraba "Sin nombre".
--
-- A partir de ahora `shops.name` es la FUENTE ÚNICA. Ajustes escribe ahí
-- (solo los admins del taller, lo impone RLS) y todos los lugares leen de
-- ahí. `profiles.shop_name` queda deprecada (ya nadie la lee) — no la
-- borramos para no romper cuentas viejas ni rollbacks; se puede eliminar
-- en una migración futura.
--
-- Esta migración es ADITIVA y segura: solo rellena shops.name donde está
-- vacío. Corre esto completo en el SQL Editor de Supabase, una sola vez.
-- ============================================================================

-- 1. Rellenar shops.name desde el nombre que el dueño ya había guardado en
--    su perfil. Si un taller tiene varios admins, tomamos el que se unió
--    primero (misma lógica que usa admin_list_shops para "owner_email").
update public.shops s
set name = sub.shop_name
from (
  select distinct on (m.shop_id)
    m.shop_id,
    btrim(p.shop_name) as shop_name
  from public.shop_members m
  join public.profiles p on p.id = m.user_id
  where m.role = 'admin'
    and p.shop_name is not null
    and btrim(p.shop_name) <> ''
  order by m.shop_id, m.created_at
) sub
where sub.shop_id = s.id
  and (s.name is null or btrim(s.name) = '');

-- 2. Marcar la columna vieja como deprecada (documentación en el catálogo).
comment on column public.profiles.shop_name is
  'DEPRECADA — el nombre del taller vive ahora en shops.name (fuente única). '
  'Esta columna ya no se lee ni se escribe desde la app.';

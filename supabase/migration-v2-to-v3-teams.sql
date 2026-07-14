-- ============================================================================
-- Migración v2 → v3: convierte OrbitCRM de "un usuario = sus datos" a
-- "un taller (shop) = varios usuarios con roles". Diseñada para correr
-- sobre tu proyecto de Supabase YA EN PRODUCCIÓN, sin perder ni un dato:
-- toma tus órdenes e inventario actuales y los mete automáticamente dentro
-- de "tu taller", con tu cuenta actual como admin.
--
-- Es seguro correrla más de una vez (usa "if not exists" en todo lo posible).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. profiles necesita guardar el correo (para mostrar "quién es quién" en
--    la pantalla de Equipo) y los compañeros de taller deben poder verse
--    entre sí, no solo a sí mismos.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

-- ---------------------------------------------------------------------------
-- 1. Tablas nuevas: shops (talleres), shop_members (quién pertenece a cuál
--    taller y con qué rol), shop_invites (invitaciones pendientes por correo).
-- ---------------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table if not exists public.shop_invites (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (email)
);

-- ---------------------------------------------------------------------------
-- 2. Migrar tus datos existentes: cada owner_id distinto que ya tengas en
--    service_orders / inventory_products se convierte en su propio taller,
--    y ese usuario queda como 'admin' de ese taller.
-- ---------------------------------------------------------------------------
do $$
declare
  distinct_owner uuid;
  new_shop_id uuid;
begin
  for distinct_owner in
    select owner_id from public.service_orders
    union
    select owner_id from public.inventory_products
    union
    select id from public.profiles
  loop
    -- ¿Ya tiene taller este usuario? Si no, créaselo.
    if not exists (select 1 from public.shop_members where user_id = distinct_owner) then
      insert into public.shops (name) values (
        (select shop_name from public.profiles where id = distinct_owner)
      ) returning id into new_shop_id;

      insert into public.shop_members (shop_id, user_id, role)
      values (new_shop_id, distinct_owner, 'admin');
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Añadir shop_id a las tablas de datos y rellenarlo desde owner_id.
-- ---------------------------------------------------------------------------
alter table public.service_orders add column if not exists shop_id uuid references public.shops (id);
update public.service_orders so
  set shop_id = sm.shop_id
  from public.shop_members sm
  where sm.user_id = so.owner_id and so.shop_id is null;
alter table public.service_orders alter column shop_id set not null;

alter table public.inventory_products add column if not exists shop_id uuid references public.shops (id);
update public.inventory_products ip
  set shop_id = sm.shop_id
  from public.shop_members sm
  where sm.user_id = ip.owner_id and ip.shop_id is null;
alter table public.inventory_products alter column shop_id set not null;

create index if not exists service_orders_shop_id_idx on public.service_orders (shop_id);
create index if not exists inventory_products_shop_id_idx on public.inventory_products (shop_id);

-- ---------------------------------------------------------------------------
-- 4. Función helper: talleres a los que pertenece el usuario actual.
--    security definer para evitar recursión de RLS al usarla dentro de
--    las propias políticas de shop_members.
-- ---------------------------------------------------------------------------
create or replace function public.user_shop_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select shop_id from public.shop_members where user_id = auth.uid();
$$;

create or replace function public.is_shop_admin(target_shop_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = target_shop_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Reemplazar las políticas RLS de service_orders / inventory_products:
--    ahora se basan en pertenencia al taller, no en ser el dueño original.
--    Eliminar solo está permitido para admins del taller.
-- ---------------------------------------------------------------------------
drop policy if exists "Service orders are owner-scoped select" on public.service_orders;
drop policy if exists "Service orders are owner-scoped insert" on public.service_orders;
drop policy if exists "Service orders are owner-scoped update" on public.service_orders;
drop policy if exists "Service orders are owner-scoped delete" on public.service_orders;

create policy "Service orders: shop members can select" on public.service_orders
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Service orders: shop members can insert" on public.service_orders
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Service orders: shop members can update" on public.service_orders
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Service orders: only admins can delete" on public.service_orders
  for delete using (public.is_shop_admin(shop_id));

drop policy if exists "Inventory products are owner-scoped select" on public.inventory_products;
drop policy if exists "Inventory products are owner-scoped insert" on public.inventory_products;
drop policy if exists "Inventory products are owner-scoped update" on public.inventory_products;
drop policy if exists "Inventory products are owner-scoped delete" on public.inventory_products;
drop policy if exists "Products are owner-scoped select" on public.inventory_products;
drop policy if exists "Products are owner-scoped insert" on public.inventory_products;
drop policy if exists "Products are owner-scoped update" on public.inventory_products;
drop policy if exists "Products are owner-scoped delete" on public.inventory_products;

create policy "Products: shop members can select" on public.inventory_products
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Products: shop members can insert" on public.inventory_products
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Products: shop members can update" on public.inventory_products
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Products: only admins can delete" on public.inventory_products
  for delete using (public.is_shop_admin(shop_id));

-- ---------------------------------------------------------------------------
-- 6. RLS para las tablas nuevas.
-- ---------------------------------------------------------------------------
alter table public.shops enable row level security;
create policy "Shops: members can view their shop" on public.shops
  for select using (id in (select public.user_shop_ids()));
create policy "Shops: admins can update their shop" on public.shops
  for update using (public.is_shop_admin(id));

alter table public.shop_members enable row level security;
create policy "Shop members: visible to shop teammates" on public.shop_members
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Shop members: admins can add" on public.shop_members
  for insert with check (public.is_shop_admin(shop_id));
create policy "Shop members: admins can update roles" on public.shop_members
  for update using (public.is_shop_admin(shop_id));
create policy "Shop members: admins can remove, or you can leave" on public.shop_members
  for delete using (public.is_shop_admin(shop_id) or user_id = auth.uid());

alter table public.shop_invites enable row level security;
create policy "Shop invites: admins can view their shop's invites" on public.shop_invites
  for select using (public.is_shop_admin(shop_id));
create policy "Shop invites: admins can create" on public.shop_invites
  for insert with check (public.is_shop_admin(shop_id));
create policy "Shop invites: admins can delete" on public.shop_invites
  for delete using (public.is_shop_admin(shop_id));

-- ---------------------------------------------------------------------------
-- 7. Actualizar el trigger de usuario nuevo: si su correo tiene una
--    invitación pendiente, lo mete a ese taller con el rol invitado.
--    Si no, le crea su propio taller nuevo y lo hace admin (así el flujo
--    de "regístrate y ya tienes tu CRM" sigue funcionando para cuentas
--    completamente nuevas, no solo para invitados).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  pending_invite record;
  new_shop_id uuid;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);

  select * into pending_invite from public.shop_invites where lower(email) = lower(new.email) limit 1;

  if pending_invite is not null then
    insert into public.shop_members (shop_id, user_id, role)
    values (pending_invite.shop_id, new.id, pending_invite.role);
    delete from public.shop_invites where id = pending_invite.id;
  else
    insert into public.shops (name) values (null) returning id into new_shop_id;
    insert into public.shop_members (shop_id, user_id, role) values (new_shop_id, new.id, 'admin');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Los compañeros de taller deben poder ver el nombre/correo de los
--    demás miembros de su mismo taller (para la pantalla de Equipo).
-- ---------------------------------------------------------------------------
drop policy if exists "Profiles: visible to shop teammates" on public.profiles;
create policy "Profiles: visible to shop teammates" on public.profiles
  for select using (
    id in (
      select user_id from public.shop_members
      where shop_id in (select public.user_shop_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Listo. Verifica al final que todo quedó bien con:
--   select * from shop_members;
-- Debe aparecer tu usuario con role = 'admin'.
-- ---------------------------------------------------------------------------

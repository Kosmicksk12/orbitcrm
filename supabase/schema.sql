-- ============================================================================
-- OrbitCRM — Supabase schema (v3: talleres con varios usuarios y roles)
-- Ejecuta esto en un proyecto NUEVO y vacío. Si ya tenías datos reales con
-- el esquema v2 (un solo usuario por cuenta), usa en cambio
-- supabase/migration-v2-to-v3-teams.sql para no perder nada.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  shop_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- shops / shop_members / shop_invites: a shop is the unit of data ownership.
-- Every user belongs to exactly one shop, with a role of 'admin' or
-- 'member'. Admins can delete records and manage the team; members can
-- create/edit everything else. Invites are matched by email at signup time
-- (see handle_new_user below) — no outbound email sending required.
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

alter table public.shops enable row level security;
create policy "Shops: members can view their shop" on public.shops
  for select using (id in (select public.user_shop_ids()));
create policy "Shops: admins can update their shop" on public.shops
  for update using (public.is_shop_admin(id));

create policy "Profiles: visible to shop teammates" on public.profiles
  for select using (
    id in (
      select user_id from public.shop_members
      where shop_id in (select public.user_shop_ids())
    )
  );

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

-- New user: joins an existing shop if their email was invited, otherwise
-- gets a fresh shop of their own as admin.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- service_orders: el corazón del taller — una fila por reparación.
-- Los "clientes" NO son una tabla aparte: su ficha se calcula agrupando
-- estas órdenes por teléfono. owner_id registra quién creó la orden
-- (para auditoría); shop_id determina quién puede verla/editarla.
-- ---------------------------------------------------------------------------
create sequence if not exists public.service_orders_seq;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_number text not null default (
    'FP-' || lpad(nextval('public.service_orders_seq')::text, 6, '0')
  ),
  client_name text not null,
  client_phone text not null,
  device_brand text,
  device_model text,
  problem_description text,
  technician text,
  status text not null default 'recibido' check (
    status in ('recibido', 'diagnostico', 'en_reparacion', 'listo', 'entregado', 'pagada')
  ),
  total_cents bigint not null default 0,
  paid_cents bigint not null default 0,
  cost_cents bigint not null default 0,
  warranty_days integer not null default 90,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_orders_shop_id_idx on public.service_orders (shop_id);
create index if not exists service_orders_status_idx on public.service_orders (status);
create index if not exists service_orders_client_phone_idx on public.service_orders (shop_id, client_phone);

alter table public.service_orders enable row level security;

create policy "Service orders: shop members can select" on public.service_orders
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Service orders: shop members can insert" on public.service_orders
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Service orders: shop members can update" on public.service_orders
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Service orders: only admins can delete" on public.service_orders
  for delete using (public.is_shop_admin(shop_id));

drop trigger if exists set_updated_at on public.service_orders;
create trigger set_updated_at before update on public.service_orders
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_products: catálogo de repuestos/accesorios con control de stock.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  brand text,
  category text not null default 'General',
  detail text,
  sale_price_cents bigint not null default 0,
  stock_qty integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_products_shop_id_idx on public.inventory_products (shop_id);
create index if not exists inventory_products_category_idx on public.inventory_products (shop_id, category);

alter table public.inventory_products enable row level security;

create policy "Products: shop members can select" on public.inventory_products
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Products: shop members can insert" on public.inventory_products
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Products: shop members can update" on public.inventory_products
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Products: only admins can delete" on public.inventory_products
  for delete using (public.is_shop_admin(shop_id));

drop trigger if exists set_updated_at on public.inventory_products;
create trigger set_updated_at before update on public.inventory_products
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sales / sale_items: ventas de accesorios (no reparaciones) — descuentan
-- stock automáticamente a través de la función create_sale().
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  client_name text,
  total_cents bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.inventory_products (id) on delete set null,
  product_name text not null,
  unit_price_cents bigint not null default 0,
  quantity integer not null default 1,
  subtotal_cents bigint not null default 0
);

create index if not exists sales_shop_id_idx on public.sales (shop_id);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);

alter table public.sales enable row level security;
create policy "Sales: shop members select" on public.sales
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Sales: shop members insert" on public.sales
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Sales: only admins delete" on public.sales
  for delete using (public.is_shop_admin(shop_id));

alter table public.sale_items enable row level security;
create policy "Sale items: shop members select" on public.sale_items
  for select using (sale_id in (select id from public.sales where shop_id in (select public.user_shop_ids())));
create policy "Sale items: shop members insert" on public.sale_items
  for insert with check (sale_id in (select id from public.sales where shop_id in (select public.user_shop_ids())));

create or replace function public.create_sale(p_client_name text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_sale_id uuid;
  v_total bigint := 0;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_subtotal bigint;
  v_product_id uuid;
  v_name text;
  v_price bigint;
begin
  select shop_id into v_shop_id from public.shop_members where user_id = auth.uid() limit 1;
  if v_shop_id is null then
    raise exception 'No perteneces a ningún taller.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    if v_product_id is not null then
      v_qty := (v_item ->> 'quantity')::integer;
      select * into v_product from public.inventory_products
        where id = v_product_id and shop_id = v_shop_id
        for update;
      if v_product is null then
        raise exception 'Uno de los productos no existe o no pertenece a tu taller.';
      end if;
      if v_product.stock_qty < v_qty then
        raise exception 'Stock insuficiente de "%": quedan % y pediste %.', v_product.name, v_product.stock_qty, v_qty;
      end if;
    end if;
  end loop;

  insert into public.sales (owner_id, shop_id, client_name, total_cents)
  values (auth.uid(), v_shop_id, nullif(trim(coalesce(p_client_name, '')), ''), 0)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is not null then
      select * into v_product from public.inventory_products where id = v_product_id;
      v_name := v_product.name;
      v_price := v_product.sale_price_cents;
      update public.inventory_products set stock_qty = stock_qty - v_qty where id = v_product.id;
    else
      v_name := coalesce(v_item ->> 'custom_name', 'Ítem sin nombre');
      v_price := coalesce((v_item ->> 'custom_price_cents')::bigint, 0);
    end if;

    v_subtotal := v_price * v_qty;
    v_total := v_total + v_subtotal;

    insert into public.sale_items (sale_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents)
    values (v_sale_id, v_product_id, v_name, v_price, v_qty, v_subtotal);
  end loop;

  update public.sales set total_cents = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(text, jsonb) to authenticated;

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_item record;
begin
  select shop_id into v_shop_id from public.sales where id = p_sale_id;
  if v_shop_id is null then
    raise exception 'Venta no encontrada.';
  end if;
  if not public.is_shop_admin(v_shop_id) then
    raise exception 'Solo un administrador puede eliminar ventas.';
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id and product_id is not null
  loop
    update public.inventory_products set stock_qty = stock_qty + v_item.quantity where id = v_item.product_id;
  end loop;

  delete from public.sales where id = p_sale_id;
end;
$$;

grant execute on function public.delete_sale(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- expenses: compras y gastos del negocio (repuestos al por mayor, insumos,
-- arriendo, servicios, etc.) — separado de las ventas, para llevar control
-- de lo que sale de caja, no solo lo que entra.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  category text not null default 'General',
  description text not null,
  amount_cents bigint not null default 0,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_shop_id_idx on public.expenses (shop_id);
create index if not exists expenses_date_idx on public.expenses (shop_id, expense_date);

alter table public.expenses enable row level security;

create policy "Expenses: shop members select" on public.expenses
  for select using (shop_id in (select public.user_shop_ids()));
create policy "Expenses: shop members insert" on public.expenses
  for insert with check (shop_id in (select public.user_shop_ids()));
create policy "Expenses: shop members update" on public.expenses
  for update using (shop_id in (select public.user_shop_ids()));
create policy "Expenses: only admins delete" on public.expenses
  for delete using (public.is_shop_admin(shop_id));

drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute procedure public.set_updated_at();

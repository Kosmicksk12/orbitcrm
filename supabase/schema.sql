-- ============================================================================
-- OrbitCRM — Supabase schema (v2: modelo de taller de reparación)
-- Ejecuta esto en un proyecto NUEVO. Si ya tenías el esquema v1 corriendo
-- (con companies/contacts/deals/activities), usa en cambio
-- supabase/migration-v1-to-v2.sql para no perder tu proyecto actual.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  shop_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are self-readable" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- service_orders: el corazón del taller — una fila por reparación.
-- Los "clientes" NO son una tabla aparte: su ficha se calcula agrupando
-- estas órdenes por teléfono, igual que en RepairCopilot ("ficha automática
-- construida desde órdenes"). Así el cliente nunca se desincroniza de sus
-- reparaciones reales.
-- ---------------------------------------------------------------------------
create sequence if not exists public.service_orders_seq;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
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
  warranty_days integer not null default 90,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_orders_owner_id_idx on public.service_orders (owner_id);
create index if not exists service_orders_status_idx on public.service_orders (status);
create index if not exists service_orders_client_phone_idx on public.service_orders (owner_id, client_phone);

alter table public.service_orders enable row level security;

create policy "Service orders are owner-scoped select" on public.service_orders
  for select using (auth.uid() = owner_id);
create policy "Service orders are owner-scoped insert" on public.service_orders
  for insert with check (auth.uid() = owner_id);
create policy "Service orders are owner-scoped update" on public.service_orders
  for update using (auth.uid() = owner_id);
create policy "Service orders are owner-scoped delete" on public.service_orders
  for delete using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.service_orders;
create trigger set_updated_at before update on public.service_orders
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory_products: catálogo de repuestos/accesorios con control de stock.
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
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

create index if not exists inventory_products_owner_id_idx on public.inventory_products (owner_id);
create index if not exists inventory_products_category_idx on public.inventory_products (owner_id, category);

alter table public.inventory_products enable row level security;

create policy "Inventory products are owner-scoped select" on public.inventory_products
  for select using (auth.uid() = owner_id);
create policy "Inventory products are owner-scoped insert" on public.inventory_products
  for insert with check (auth.uid() = owner_id);
create policy "Inventory products are owner-scoped update" on public.inventory_products
  for update using (auth.uid() = owner_id);
create policy "Inventory products are owner-scoped delete" on public.inventory_products
  for delete using (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.inventory_products;
create trigger set_updated_at before update on public.inventory_products
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- Migración: módulo de Inventario.
-- Corre esto en el SQL Editor de Supabase (una sola vez).
-- ============================================================================

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

drop policy if exists "Inventory products are owner-scoped select" on public.inventory_products;
create policy "Inventory products are owner-scoped select" on public.inventory_products
  for select using (auth.uid() = owner_id);
drop policy if exists "Inventory products are owner-scoped insert" on public.inventory_products;
create policy "Inventory products are owner-scoped insert" on public.inventory_products
  for insert with check (auth.uid() = owner_id);
drop policy if exists "Inventory products are owner-scoped update" on public.inventory_products;
create policy "Inventory products are owner-scoped update" on public.inventory_products
  for update using (auth.uid() = owner_id);
drop policy if exists "Inventory products are owner-scoped delete" on public.inventory_products;
create policy "Inventory products are owner-scoped delete" on public.inventory_products
  for delete using (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.inventory_products;
create trigger set_updated_at before update on public.inventory_products
  for each row execute procedure public.set_updated_at();

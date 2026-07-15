-- ============================================================================
-- Migración: módulo de Ventas de accesorios (cargadores, forros, vidrios,
-- etc. — todo lo que no es una reparación con orden de servicio).
-- Corre esto en el SQL Editor de Supabase, una sola vez, completo.
-- ============================================================================

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
drop policy if exists "Sales: shop members select" on public.sales;
create policy "Sales: shop members select" on public.sales
  for select using (shop_id in (select public.user_shop_ids()));
drop policy if exists "Sales: shop members insert" on public.sales;
create policy "Sales: shop members insert" on public.sales
  for insert with check (shop_id in (select public.user_shop_ids()));
drop policy if exists "Sales: only admins delete" on public.sales;
create policy "Sales: only admins delete" on public.sales
  for delete using (public.is_shop_admin(shop_id));

alter table public.sale_items enable row level security;
drop policy if exists "Sale items: shop members select" on public.sale_items;
create policy "Sale items: shop members select" on public.sale_items
  for select using (sale_id in (select id from public.sales where shop_id in (select public.user_shop_ids())));
drop policy if exists "Sale items: shop members insert" on public.sale_items;
create policy "Sale items: shop members insert" on public.sale_items
  for insert with check (sale_id in (select id from public.sales where shop_id in (select public.user_shop_ids())));

-- ---------------------------------------------------------------------------
-- create_sale: registra una venta completa (uno o varios productos) en una
-- sola operación atómica — o se registra todo y se descuenta todo el stock,
-- o si algo falla (ej. no hay suficiente stock de un producto) no se
-- registra nada a medias. Esto evita el peor escenario: cobrar algo que
-- luego resulta que no tenías en stock.
-- ---------------------------------------------------------------------------
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
begin
  select shop_id into v_shop_id from public.shop_members where user_id = auth.uid() limit 1;
  if v_shop_id is null then
    raise exception 'No perteneces a ningún taller.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  -- Primera pasada: valida que haya stock suficiente de TODO antes de
  -- registrar nada (bloquea las filas para evitar ventas simultáneas
  -- que dejen el stock en negativo).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from public.inventory_products
      where id = (v_item ->> 'product_id')::uuid and shop_id = v_shop_id
      for update;
    if v_product is null then
      raise exception 'Uno de los productos no existe o no pertenece a tu taller.';
    end if;
    if v_product.stock_qty < v_qty then
      raise exception 'Stock insuficiente de "%": quedan % y pediste %.', v_product.name, v_product.stock_qty, v_qty;
    end if;
  end loop;

  insert into public.sales (owner_id, shop_id, client_name, total_cents)
  values (auth.uid(), v_shop_id, nullif(trim(coalesce(p_client_name, '')), ''), 0)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from public.inventory_products where id = (v_item ->> 'product_id')::uuid;
    v_subtotal := v_product.sale_price_cents * v_qty;
    v_total := v_total + v_subtotal;

    insert into public.sale_items (sale_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents)
    values (v_sale_id, v_product.id, v_product.name, v_product.sale_price_cents, v_qty, v_subtotal);

    update public.inventory_products set stock_qty = stock_qty - v_qty where id = v_product.id;
  end loop;

  update public.sales set total_cents = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(text, jsonb) to authenticated;

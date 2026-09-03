-- ============================================================================
-- Migración: método de pago en reparaciones y ventas.
--
-- Antes no se registraba CÓMO pagó el cliente (efectivo, Nequi, Daviplata,
-- Bold), así que al cerrar el mes no había forma de cuadrar la caja contra lo
-- que entró a cada billetera / datáfono.
--
-- Agrega una columna `payment_method` (nullable — una reparación puede entrar
-- al taller sin estar pagada todavía) a `service_orders` y a `sales`, y
-- actualiza las funciones `create_sale` y `update_sale` para recibir y guardar
-- el método (las ventas solo se insertan vía RPC `security definer`, no por
-- update directo, así que el método tiene que viajar por ahí).
--
-- Aditiva y segura. Corre esto completo en el SQL Editor de Supabase, una
-- sola vez, JUNTO CON EL DEPLOY del cambio de código.
-- ============================================================================

-- 1. Columnas nuevas ---------------------------------------------------------
alter table public.service_orders
  add column if not exists payment_method text
  check (payment_method is null or payment_method in ('efectivo', 'nequi', 'daviplata', 'bold'));

alter table public.sales
  add column if not exists payment_method text
  check (payment_method is null or payment_method in ('efectivo', 'nequi', 'daviplata', 'bold'));

-- 2. create_sale(): ahora recibe y guarda el método de pago -----------------
--    Se agrega un tercer parámetro con default null, así que las llamadas
--    viejas de 2 argumentos siguen funcionando. Hay que dropear la firma
--    anterior primero para que no queden las dos y la llamada sea ambigua.
drop function if exists public.create_sale(text, jsonb);

create or replace function public.create_sale(
  p_client_name text,
  p_items jsonb,
  p_payment_method text default null
)
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
  v_cost bigint;
  v_method text := nullif(trim(coalesce(p_payment_method, '')), '');
begin
  if v_method is not null and v_method not in ('efectivo', 'nequi', 'daviplata', 'bold') then
    raise exception 'Método de pago inválido: %', v_method;
  end if;

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

  insert into public.sales (owner_id, shop_id, client_name, total_cents, payment_method)
  values (auth.uid(), v_shop_id, nullif(trim(coalesce(p_client_name, '')), ''), 0, v_method)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_product_id is not null then
      select * into v_product from public.inventory_products where id = v_product_id;
      v_name := v_product.name;
      v_price := v_product.sale_price_cents;
      v_cost := v_product.cost_price_cents;
      update public.inventory_products set stock_qty = stock_qty - v_qty where id = v_product.id;
    else
      v_name := coalesce(v_item ->> 'custom_name', 'Ítem sin nombre');
      v_price := coalesce((v_item ->> 'custom_price_cents')::bigint, 0);
      v_cost := coalesce((v_item ->> 'custom_cost_cents')::bigint, 0);
    end if;

    v_subtotal := v_price * v_qty;
    v_total := v_total + v_subtotal;

    insert into public.sale_items
      (sale_id, product_id, product_name, unit_price_cents, unit_cost_cents, quantity, subtotal_cents)
    values
      (v_sale_id, v_product_id, v_name, v_price, v_cost, v_qty, v_subtotal);
  end loop;

  update public.sales set total_cents = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(text, jsonb, text) to authenticated;

-- 3. update_sale(): también corrige el método de pago ----------------------
drop function if exists public.update_sale(uuid, text, jsonb);

create or replace function public.update_sale(
  p_sale_id uuid,
  p_client_name text,
  p_items jsonb,
  p_payment_method text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_price bigint;
  v_cost bigint;
  v_qty integer;
  v_total bigint := 0;
  v_method text := nullif(trim(coalesce(p_payment_method, '')), '');
begin
  if v_method is not null and v_method not in ('efectivo', 'nequi', 'daviplata', 'bold') then
    raise exception 'Método de pago inválido: %', v_method;
  end if;

  select shop_id into v_shop_id from public.sales where id = p_sale_id;
  if v_shop_id is null then
    raise exception 'Venta no encontrada.';
  end if;
  if v_shop_id not in (select public.user_shop_ids()) then
    raise exception 'No tienes acceso a esta venta.';
  end if;

  update public.sales
    set client_name = nullif(trim(coalesce(p_client_name, '')), ''),
        payment_method = v_method
    where id = p_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item ->> 'id')::uuid;
    v_price := coalesce((v_item ->> 'unit_price_cents')::bigint, 0);
    v_cost := coalesce((v_item ->> 'unit_cost_cents')::bigint, 0);

    select quantity into v_qty from public.sale_items where id = v_item_id and sale_id = p_sale_id;
    if v_qty is null then
      continue;
    end if;

    update public.sale_items
      set unit_price_cents = v_price, unit_cost_cents = v_cost, subtotal_cents = v_price * v_qty
      where id = v_item_id and sale_id = p_sale_id;

    v_total := v_total + (v_price * v_qty);
  end loop;

  update public.sales set total_cents = v_total where id = p_sale_id;
end;
$$;

grant execute on function public.update_sale(uuid, text, jsonb, text) to authenticated;

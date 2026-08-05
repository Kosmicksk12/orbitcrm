-- ============================================================================
-- Migración: costo de productos y de cada ítem vendido, para calcular
-- ganancia neta real en Ventas (no solo el total facturado). También agrega
-- poder editar una venta ya registrada (nombre del cliente, precio y costo
-- de cada ítem) sin tener que eliminarla y volver a crearla.
-- Corre esto completo en el SQL Editor de Supabase.
-- ============================================================================

alter table public.inventory_products
  add column if not exists cost_price_cents bigint not null default 0;

alter table public.sale_items
  add column if not exists unit_cost_cents bigint not null default 0;

-- ---------------------------------------------------------------------------
-- Reemplaza create_sale(): ahora también guarda el costo de cada ítem.
-- Para productos de Inventario, el costo se toma automáticamente del
-- producto (no se confía en lo que mande el navegador). Para ítems
-- personalizados (fuera de stock), el costo viene de custom_cost_cents.
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
  v_product_id uuid;
  v_name text;
  v_price bigint;
  v_cost bigint;
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

grant execute on function public.create_sale(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- update_sale(): corrige el nombre del cliente y el precio/costo de cada
-- ítem de una venta ya registrada (por ejemplo, cuando al vender un ítem
-- personalizado no se sabía todavía cuánto costó el repuesto). No cambia
-- cantidades ni toca el stock — para eso se sigue usando eliminar + crear.
-- ---------------------------------------------------------------------------
create or replace function public.update_sale(p_sale_id uuid, p_client_name text, p_items jsonb)
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
begin
  select shop_id into v_shop_id from public.sales where id = p_sale_id;
  if v_shop_id is null then
    raise exception 'Venta no encontrada.';
  end if;
  if v_shop_id not in (select public.user_shop_ids()) then
    raise exception 'No tienes acceso a esta venta.';
  end if;

  update public.sales
    set client_name = nullif(trim(coalesce(p_client_name, '')), '')
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

grant execute on function public.update_sale(uuid, text, jsonb) to authenticated;

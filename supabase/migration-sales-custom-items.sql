-- ============================================================================
-- Migración: ítems personalizados en Ventas (cosas que no viven en
-- Inventario, como vidrios templados que se piden por encargo) + poder
-- eliminar una venta (devuelve el stock de los productos que sí tenía).
-- Reemplaza por completo la función create_sale() y agrega delete_sale().
-- Corre esto completo en el SQL Editor.
-- ============================================================================

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

  -- Validación de stock: solo para ítems que sí vienen de Inventario.
  -- Los ítems personalizados (product_id nulo) no se validan porque no
  -- descuentan stock.
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

-- ---------------------------------------------------------------------------
-- delete_sale: elimina una venta y devuelve al stock cualquier producto de
-- Inventario que tuviera (los ítems personalizados simplemente desaparecen,
-- nunca afectaron stock). Solo administradores pueden hacerlo.
-- ---------------------------------------------------------------------------
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

# Rediseño visual OrbitCRM — qué cambió

5 archivos, solo estilos (clases de Tailwind y tokens de color). Ninguna
línea de lógica, ningún componente movido de lugar, ninguna función tocada.

## Cómo aplicarlo
Reemplaza estos 5 archivos en tu proyecto por los de este zip (misma ruta
exacta que ya tienen):

1. `tailwind.config.ts` — paleta de colores nueva: fondo, superficie, línea
   más definidos; azul corporativo `#2647E0` como acento en modo claro,
   celeste `#5FC7F0` como acento en modo oscuro; nuevo color `nav` (navy
   `#121A2E`) exclusivo para el sidebar; sombras más presentes.
2. `app/layout.tsx` — solo se actualizó el color de la barra del navegador
   (`themeColor`) para que coincida con los nuevos tonos. Nada más.
3. `components/ui/Button.tsx` — botones con sombra propia, más peso
   (`font-semibold`), y una micro-animación de escala al hacer clic
   (`active:scale-[0.98]`) para que se sientan táctiles/premium.
4. `components/layout/Sidebar.tsx` — sidebar ahora navy oscuro con barra
   izquierda celeste en el ítem activo, en vez del fondo lila tenue de
   antes.
5. `components/layout/PageHeader.tsx` — títulos de página con más peso
   (`font-bold`) y tracking ajustado.
6. `components/layout/MobileNav.tsx` — la barra inferior de navegación en
   móvil ahora también es navy (antes se quedaba blanca porque el sidebar
   navy está oculto en pantallas chicas). Así el celular tiene la misma
   identidad que el escritorio.

## Qué NO cambió
- Ningún archivo de `lib/`, `supabase/`, `hooks/`, ni las páginas de
  `app/(dashboard)/*` — toda tu lógica de datos, Supabase, cálculos y
  rutas quedan exactamente igual.
- `components/ui/Primitives.tsx` (Card, Badge, Avatar) y
  `components/ui/Field.tsx` (inputs) no se tocaron — como ya usaban los
  tokens de color del `tailwind.config.ts`, heredan el nuevo estilo
  automáticamente sin necesidad de editarlos.
- `components/layout/Topbar.tsx` y `MobileNav.tsx` tampoco se tocaron por
  el mismo motivo.

## Después de reemplazar los archivos
Solo corre tu proyecto como siempre (`npm run dev` o `npm run build`). No
hace falta instalar nada nuevo ni migrar datos.

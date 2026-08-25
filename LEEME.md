# Rediseño + rebranding a Danivo CRM — qué cambió

25 archivos. Todo es CSS/clases de Tailwind, texto de marca, un ícono SVG
y sus versiones PNG. Ninguna línea de lógica, ninguna consulta a
Supabase, ningún componente movido de lugar.

## Cómo aplicarlo
Reemplaza cada archivo de este zip en tu proyecto por el de la misma ruta
exacta (las rutas ya vienen organizadas igual que tu repo). Incluye
archivos binarios (.png, .ico) — cópialos igual que los demás, no hay
que hacer nada especial con ellos.

### Bloque 1 — Paleta de colores y sidebar
- `tailwind.config.ts` — fondo, superficie, línea, azul corporativo,
  celeste en oscuro, navy para sidebar/nav, sombras.
- `app/layout.tsx` — color de la barra del navegador (`themeColor`), más
  metadatos de marca (ver bloque 2).
- `components/ui/Button.tsx` — sombra y micro-animación en botones.
- `components/layout/Sidebar.tsx` — sidebar navy con barra celeste activa.
- `components/layout/PageHeader.tsx` — títulos con más peso.
- `components/layout/MobileNav.tsx` — barra inferior navy en móvil.

### Bloque 2 — Rebranding "OrbitCRM" → "Danivo CRM"
- `components/ui/Logo.tsx` — ícono nuevo: arcos concéntricos de "flujo"
  que forman una D (concepto Digital Flow), en vez de la órbita anterior.
  Este SVG es la fuente original de la que se generaron todos los PNG.
- `components/layout/Topbar.tsx` y `app/(auth)/login/page.tsx` —
  wordmark "OrbitCRM" → "Danivo" (junto al ícono).
- `components/layout/Sidebar.tsx` — wordmark y pie de página
  ("Danivo CRM v1.0").
- `app/layout.tsx` — título de pestaña, descripción SEO,
  `applicationName` → "Danivo CRM".
- `public/manifest.webmanifest` — nombre de la PWA + colores del splash
  screen.
- `components/orders/WarrantyClient.tsx`, `app/garantia/[id]/page.tsx`,
  `components/pwa/InstallPrompt.tsx`, `components/pwa/ServiceWorkerRegister.tsx`,
  `components/settings/TeamSettings.tsx`, `components/settings/SettingsClient.tsx`,
  `components/inventory/QuickPartsSearch.tsx` — menciones sueltas de
  "OrbitCRM" en textos de la interfaz.

### Bloque 3 — Íconos nuevos (rediseño de alto impacto: degradado + glow)
Todos con el mismo diseño del logo, sobre fondo azul corporativo
`#2647E0`:
- `public/favicon.ico` (16/32px, pestaña del navegador)
- `public/icons/favicon-16.png`, `favicon-32.png`
- `public/icons/icon-192.png`, `icon-512.png` (PWA estándar)
- `public/icons/icon-maskable-192.png`, `icon-maskable-512.png` (Android,
  con margen de seguridad para que el sistema no recorte el ícono)
- `public/icons/apple-touch-icon.png` (180px, iOS "agregar a inicio")

## Después de reemplazar los archivos
npm run dev como siempre. Sin instalar nada nuevo. Si tu navegador te
sigue mostrando el favicon viejo, es caché — recarga con Ctrl+Shift+R
(o borra caché del sitio).

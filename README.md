# OrbitCRM

CRM ligero y production-ready construido con Next.js 14 (App Router), TypeScript, Tailwind CSS y Supabase. Funciona como sitio web y como PWA instalable en iOS, Android y escritorio desde una única base de código.

## ⚠️ Nota importante sobre este entrega

Este proyecto fue escrito en un entorno sin acceso a red, por lo que **no se pudo ejecutar `npm install` ni `npm run build` para verificarlo compilando de extremo a extremo**. El código fue revisado cuidadosamente (incluyendo un chequeo de sintaxis/tipos con `tsc`), pero el primer paso que debes hacer es:

```bash
npm install
npm run build
```

Si algo falla, pégame el error exacto y lo corrijo de inmediato.

## 1. Requisitos

- Node.js ≥ 18.18
- Una cuenta gratuita de [Supabase](https://supabase.com)
- Una cuenta de [Vercel](https://vercel.com) (para desplegar)

## 2. Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a **SQL Editor** y pega el contenido de [`supabase/schema.sql`](./supabase/schema.sql). Ejecútalo una vez — crea las tablas `profiles`, `companies`, `contacts`, `deals`, `activities`, todas con Row Level Security activado y políticas que limitan cada fila a su dueño (`auth.uid()`).
3. Ve a **Authentication → Providers** y confirma que **Email** esté habilitado. Si quieres que los usuarios entren sin confirmar correo (más rápido para probar), desactiva "Confirm email" en **Authentication → Settings**.
4. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Rellena `.env.local` con los valores de Supabase del paso anterior.

## 4. Ejecutar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Crea una cuenta desde `/login` (pestaña "Regístrate").

## 5. Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel: **Add New → Project** → importa el repo.
3. En **Environment Variables** añade `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL` (la URL final de producción, ej. `https://tu-app.vercel.app`).
4. Deploy. Vercel detecta Next.js automáticamente — no necesitas configuración adicional.
5. Vuelve a Supabase → **Authentication → URL Configuration** y añade tu dominio de Vercel a **Site URL** y **Redirect URLs** para que la confirmación de correo funcione en producción.

## 6. Probar la instalación como PWA

- **Android / Chrome / Edge (desktop):** abre el sitio, espera el banner "Instala OrbitCRM" o usa el ícono de instalación en la barra de direcciones.
- **iPhone / Safari:** abre el sitio en Safari (no en la app de Chrome para iOS, que no soporta instalación), toca **Compartir** → **Añadir a pantalla de inicio**. El banner en la app te lo recuerda automáticamente.
- Verifica que abre en pantalla completa (sin barra del navegador), respeta el notch/home indicator, y que el ícono se ve correctamente en la pantalla de inicio.
- Para probar el modo offline: instala la app, ábrela, luego activa "modo avión". Las páginas ya visitadas deben seguir cargando desde caché; las nuevas mostrarán una pantalla de "sin conexión" elegante en vez de un error del navegador.
- Para probar auto-actualización: haz un cambio, redespliega, vuelve a abrir la app instalada — debe aparecer un toast de "Nueva versión disponible" y refrescar sola.

## 7. Estructura del proyecto

```
app/
  (auth)/login/           Página de login/registro
  (dashboard)/            Área autenticada (protegida por middleware.ts)
    dashboard/             Panel con métricas
    contacts/              CRUD de contactos + detalle con timeline
    companies/              CRUD de empresas
    deals/                  Pipeline Kanban con drag-and-drop nativo
    settings/                Perfil, tema, cerrar sesión
  layout.tsx               Fuentes, metadata PWA, providers globales
  globals.css               Design tokens y utilidades
components/
  ui/                       Design system (Button, Input, Modal, Toast, etc.)
  layout/                   Sidebar, Topbar, MobileNav, PageHeader
  pwa/                      InstallPrompt, ServiceWorkerRegister
  contacts/ companies/ deals/  Componentes específicos de cada módulo
lib/
  supabase/                 Clientes de Supabase (browser/server)
  types.ts                  Tipos del dominio CRM
  utils.ts                  Formateo de moneda/fecha, helpers
supabase/schema.sql          Esquema completo con RLS
public/
  manifest.webmanifest       Manifest PWA
  sw.js                      Service worker (cache-first estáticos, network-first navegación)
  icons/                     Íconos en todas las resoluciones (incluye maskable)
```

## 8. Decisiones de arquitectura

- **Auth simple, sin roles**: cada usuario ve solo sus propios datos vía RLS en Postgres. Si más adelante necesitas equipos/roles, el patrón natural es añadir una tabla `teams` + `team_members` y cambiar las políticas RLS de `auth.uid() = owner_id` a una función que verifique membresía del equipo.
- **Sin librería de drag-and-drop**: el Kanban usa la API nativa HTML5 Drag and Drop para evitar una dependencia externa y mantener el bundle ligero.
- **Sin librería de iconos externa**: set de iconos SVG hecho a mano en `components/ui/Icons.tsx`.
- **Service worker escrito a mano** (sin `next-pwa`): da control total sobre qué se cachea (nunca se cachean llamadas a Supabase) y cómo se notifica la actualización al usuario.

## 9. Generar íconos con más fidelidad (opcional)

Los íconos incluidos se generaron con Python/Pillow dibujando el logo directamente (círculo + punto sobre fondo índigo), ya que el entorno de desarrollo no tuvo acceso a un rasterizador de SVG. Si quieres regenerarlos desde `design/icon-source.svg` con más fidelidad (por ejemplo con degradados o tipografía personalizada), puedes usar cualquier herramienta con acceso a red, como:

```bash
npx pwa-asset-generator design/icon-source.svg public/icons --background "#3B45F0" --padding "10%"
```

o subir `design/icon-source.svg` a [realfavicongenerator.net](https://realfavicongenerator.net).

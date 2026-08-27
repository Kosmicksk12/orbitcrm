// Danivo CRM — service worker DESACTIVADO.
//
// El SW offline anterior podía quedar "envenenado" tras un deploy (cambio de
// versión + reinstalación de la PWA) y servir /offline.html en bucle aunque
// hubiera conexión. Esta versión se autodesregistra, borra todas las cachés y
// recarga las pestañas: la app vuelve a cargar directo de la red.
//
// No hay handler de 'fetch': el navegador va directo a la red siempre.
// Si más adelante se quiere soporte offline, se reintroduce con una
// estrategia más robusta (y filenames de assets versionados).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* noop */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* noop */
      }
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch {
        /* noop */
      }
    })()
  );
});

"use client";

import { useEffect } from "react";

/**
 * El service worker offline se desactivó: en la práctica quedaba
 * "envenenado" tras algunos deploys y servía la página "sin conexión" en
 * bucle. Ahora este componente solo se asegura de desregistrar cualquier
 * SW viejo que siga vivo en el navegador del usuario y de limpiar sus
 * cachés, para que la app cargue siempre directo de la red.
 *
 * El propio /sw.js también se autodesregistra (ver public/sw.js), así que
 * los clientes que ni siquiera pueden abrir la app se recuperan solos en
 * cuanto el navegador revisa el /sw.js.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .getRegistrations?.()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});

    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}

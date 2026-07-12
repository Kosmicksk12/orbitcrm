"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toaster";

/**
 * Registers the service worker and watches for new versions. When a new
 * service worker finishes installing (i.e. there's an update waiting), we
 * surface a toast so the user can refresh on their own terms instead of the
 * app silently swapping code under them mid-session.
 */
export function ServiceWorkerRegister() {
  const { toast } = useToast();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // A new worker was found — track it until it finishes installing.
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
            }
          });
        });

        // Check for a new version every time the app regains focus.
        const onVisible = () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        // Offline-first is a progressive enhancement — silently no-op if
        // registration fails (e.g. unsupported browser, dev over http).
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;
    toast({
      title: "Nueva versión disponible",
      description: "Toca para actualizar OrbitCRM ahora.",
      variant: "default",
    });
    // Auto-activate after showing the toast; the controllerchange listener
    // above reloads the page once the new worker takes control.
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingWorker]);

  return null;
}

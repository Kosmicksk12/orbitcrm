"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@/components/ui/Icons";

const DISMISS_KEY = "orbitcrm:install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag when launched from Home Screen.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    if (isIOS()) {
      // iOS never fires beforeinstallprompt — show manual instructions
      // after a short delay so it doesn't compete with the initial load.
      const t = window.setTimeout(() => {
        setPlatform("ios");
        setVisible(true);
      }, 2500);
      return () => window.clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible || !platform) return null;

  return (
    <div
      className="fixed inset-x-3 z-40 mx-auto max-w-md animate-slide-up rounded-2xl border border-line bg-surface p-4 shadow-popover dark:border-line-dark dark:bg-surface-dark no-print"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
      role="dialog"
      aria-label="Instalar aplicación"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent dark:bg-accent/15">
          <IconDownload width={20} height={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink dark:text-ink-dark">
            Instala OrbitCRM
          </p>
          {platform === "android" ? (
            <p className="mt-0.5 text-sm text-ink-muted dark:text-ink-dark-muted">
              Añádelo a tu pantalla de inicio para abrirlo como una app, sin barra del navegador.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-ink-muted dark:text-ink-dark-muted">
              Toca <span className="font-medium">Compartir</span> ⬆️ y luego{" "}
              <span className="font-medium">&quot;Añadir a pantalla de inicio&quot;</span>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {platform === "android" && (
              <Button size="sm" onClick={handleInstall}>
                Instalar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

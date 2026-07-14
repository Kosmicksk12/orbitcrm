"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toaster";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { Card } from "@/components/ui/Primitives";
import { Skeleton } from "@/components/ui/States";
import { IconLogout } from "@/components/ui/Icons";
import { TeamSettings } from "./TeamSettings";

type Theme = "system" | "light" | "dark";
const THEME_KEY = "orbitcrm:theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function SettingsClient() {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme) || "system";
    setTheme(stored);

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, shop_name")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(profile?.full_name ?? "");
      setShopName(profile?.shop_name ?? "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleThemeChange(next: Theme) {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, shop_name: shopName.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo guardar", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Perfil actualizado", variant: "success" });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Ajustes" description="Gestiona tu perfil y preferencias." />

      <div className="space-y-4 p-4 sm:p-6">
        <Card className="p-6">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">Perfil</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <FieldWrapper label="Correo electrónico" htmlFor="settings-email">
                <Input id="settings-email" value={email} disabled />
              </FieldWrapper>
              <FieldWrapper label="Nombre completo" htmlFor="settings-name">
                <Input
                  id="settings-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </FieldWrapper>
              <FieldWrapper label="Nombre del taller" htmlFor="settings-shop" hint="Aparece en el comprobante de garantía impreso.">
                <Input
                  id="settings-shop"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Fixit Phone"
                />
              </FieldWrapper>
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">Apariencia</h2>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
            Elige cómo se ve OrbitCRM en este dispositivo.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  theme === t
                    ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent/15 dark:text-accent-400"
                    : "border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:text-ink-dark-muted dark:hover:bg-white/5"
                }`}
              >
                {t === "light" ? "Claro" : t === "dark" ? "Oscuro" : "Sistema"}
              </button>
            ))}
          </div>
        </Card>

        <TeamSettings />

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold text-ink dark:text-ink-dark">Sesión</h2>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
            Cierra tu sesión en este dispositivo.
          </p>
          <Button variant="secondary" className="mt-4" onClick={handleSignOut}>
            <IconLogout width={16} height={16} />
            Cerrar sesión
          </Button>
        </Card>
      </div>
    </div>
  );
}

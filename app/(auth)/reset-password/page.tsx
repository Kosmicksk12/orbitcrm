"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";

type Status = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === "checking" ? "ready" : s));
    });

    const timeout = window.setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStatus("success");
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1800);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 dark:bg-bg-dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/20 blur-[110px] dark:bg-accent/25"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={44} />
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">
              Nueva contraseña
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
              {status === "ready" && "Elige tu nueva contraseña."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card dark:border-line-dark dark:bg-surface-dark">
          {status === "checking" && (
            <p className="py-6 text-center text-sm text-ink-muted dark:text-ink-dark-muted">
              Verificando tu enlace…
            </p>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <p className="text-sm font-medium text-ink dark:text-ink-dark">
                Este enlace ya no es válido
              </p>
              <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
                Puede que haya expirado o ya se haya usado. Pide uno nuevo.
              </p>
              <Link
                href="/forgot-password"
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                Solicitar un nuevo enlace
              </Link>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <p className="text-sm font-medium text-ink dark:text-ink-dark">
                Contraseña actualizada
              </p>
              <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
                Ya puedes entrar con tu nueva contraseña — te llevamos al panel…
              </p>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger dark:bg-danger/10"
                >
                  {error}
                </div>
              )}

              <FieldWrapper label="Nueva contraseña" htmlFor="password" required>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FieldWrapper>

              <FieldWrapper label="Confirma la contraseña" htmlFor="confirmPassword" required>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </FieldWrapper>

              <Button type="submit" className="w-full" loading={loading}>
                Guardar nueva contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

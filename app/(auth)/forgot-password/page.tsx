"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { isValidEmail } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Ingresa un correo válido.");
      return;
    }
    setError("");
    setLoading(true);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    setLoading(false);
    if (err) {
      setError("No pudimos procesar la solicitud. Intenta de nuevo en un momento.");
      return;
    }
    setSent(true);
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
              Recuperar contraseña
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
              Te enviamos un enlace para crear una nueva.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card dark:border-line-dark dark:bg-surface-dark">
            <p className="text-sm font-medium text-ink dark:text-ink-dark">Revisa tu correo</p>
            <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
              Si <strong>{email}</strong> tiene una cuenta con nosotros, ahí te llegará el enlace para
              restablecer tu contraseña. Puede tardar un par de minutos — revisa también spam.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-card dark:border-line-dark dark:bg-surface-dark"
            noValidate
          >
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger dark:bg-danger/10"
              >
                {error}
              </div>
            )}

            <FieldWrapper label="Correo electrónico" htmlFor="email" error={error} required>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                error={!!error}
                required
              />
            </FieldWrapper>

            <Button type="submit" className="w-full" loading={loading}>
              Enviar enlace
            </Button>

            <p className="text-center text-sm text-ink-muted dark:text-ink-dark-muted">
              <Link href="/login" className="font-medium text-accent hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

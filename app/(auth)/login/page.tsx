"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, FieldWrapper } from "@/components/ui/Field";
import { isValidEmail } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  function validate() {
    const next: typeof errors = {};
    if (!isValidEmail(email)) next.email = "Ingresa un correo válido.";
    if (password.length < 8) next.password = "Mínimo 8 caracteres.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrors({ form: "Correo o contraseña incorrectos." });
        setLoading(false);
        return;
      }
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || undefined } },
    });
    if (error) {
      setErrors({ form: error.message.includes("already") ? "Ese correo ya está registrado." : "No pudimos crear tu cuenta. Intenta de nuevo." });
      setLoading(false);
      return;
    }
    setConfirmSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 dark:bg-bg-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-white">
            O
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink dark:text-ink-dark">
              OrbitCRM
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
              {mode === "sign-in" ? "Ingresa a tu cuenta" : "Crea tu cuenta gratis"}
            </p>
          </div>
        </div>

        {confirmSent ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-card dark:border-line-dark dark:bg-surface-dark">
            <p className="text-sm font-medium text-ink dark:text-ink-dark">Revisa tu correo</p>
            <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">
              Te enviamos un enlace de confirmación a <strong>{email}</strong>.
            </p>
            <button
              onClick={() => {
                setConfirmSent(false);
                setMode("sign-in");
              }}
              className="mt-4 text-sm font-medium text-accent hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-card dark:border-line-dark dark:bg-surface-dark"
            noValidate
          >
            {errors.form && (
              <div
                role="alert"
                className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger dark:bg-danger/10"
              >
                {errors.form}
              </div>
            )}

            {mode === "sign-up" && (
              <FieldWrapper label="Nombre completo" htmlFor="fullName">
                <Input
                  id="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ana Martínez"
                />
              </FieldWrapper>
            )}

            <FieldWrapper label="Correo electrónico" htmlFor="email" error={errors.email} required>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                error={!!errors.email}
                required
              />
            </FieldWrapper>

            <FieldWrapper label="Contraseña" htmlFor="password" error={errors.password} required>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                error={!!errors.password}
                required
              />
            </FieldWrapper>

            <Button type="submit" className="w-full" loading={loading}>
              {mode === "sign-in" ? "Ingresar" : "Crear cuenta"}
            </Button>

            <p className="text-center text-sm text-ink-muted dark:text-ink-dark-muted">
              {mode === "sign-in" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setErrors({});
                }}
                className="font-medium text-accent hover:underline"
              >
                {mode === "sign-in" ? "Regístrate" : "Ingresa"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

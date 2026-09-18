import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, setToken, setUser } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceso clínico — MediCore OS" },
      { name: "description", content: "Acceso seguro al sistema clínico MediCore OS." },
      { property: "og:title", content: "Acceso clínico — MediCore OS" },
      {
        property: "og:description",
        content: "Acceso unificado para pacientes, médicos y administración.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<"login" | "forgot" | "register" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!password.trim()) {
      setError("Por favor ingresa tu contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiFetch<{
        access_token: string;
        token_type: string;
        usuario: import("@/lib/api").Usuario;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          correo: email.trim(),
          password: password,
        }),
      });

      setToken(res.access_token);
      setUser(res.usuario);

      // Redirección dinámica basada en el rol del backend
      if (res.usuario.rol === "paciente") {
        navigate({ to: "/paciente" });
      } else if (res.usuario.rol === "medico") {
        navigate({ to: "/medico" });
      } else if (res.usuario.rol === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/paciente" });
      }
    } catch (err: any) {
      setError(err.message || "Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  if (showSplash) {
    return (
      <main className="grid min-h-screen place-items-center overflow-hidden bg-background" aria-label="Iniciando MediCore OS">
        <div className="animate-fade-in text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-lg bg-primary text-primary-foreground shadow-2xl shadow-primary/20">
            <HeartPulse className="size-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-foreground">MediCore OS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entorno clínico seguro</p>
          <div className="mx-auto mt-7 h-0.5 w-32 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full origin-left animate-[pulse_1.2s_ease-in-out_infinite] bg-primary" />
          </div>
        </div>
      </main>
    );
  }

  if (view === "verify") {
    return (
      <AuthLayout>
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold">Verifica tu correo</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Te enviamos un enlace de verificación a <span className="text-foreground">{email || "tu correo"}</span>.
          </p>
          <Button className="mt-7 w-full" onClick={() => setView("login")}>Volver al acceso</Button>
          <p className="mt-4 text-xs text-muted-foreground">Demostración visual: no se envió ningún correo.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {view !== "login" && (
        <Button variant="ghost" size="sm" className="mb-5 -ml-3" onClick={() => setView("login")}>
          <ArrowLeft /> Volver
        </Button>
      )}
      {view === "login" && (
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          setError={setError}
          loading={loading}
          onSubmit={signIn}
          onForgot={() => setView("forgot")}
          onRegister={() => setView("register")}
          onGoogle={() => navigate({ to: "/paciente" })}
        />
      )}
      {view === "forgot" && <ForgotForm email={email} setEmail={setEmail} onComplete={() => setView("verify")} />}
      {view === "register" && <RegisterForm email={email} setEmail={setEmail} onComplete={() => setView("verify")} />}
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="absolute inset-x-0 top-0 h-px bg-primary/50" />
      <section className="w-full max-w-[430px] animate-fade-in">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground"><HeartPulse /></span>
          <div><p className="font-display text-lg font-semibold">MediCore OS</p><p className="text-[11px] text-muted-foreground">Clinical Management System</p></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-2xl shadow-background md:p-8">{children}</div>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Conexión segura y protegida</div>
      </section>
    </main>
  );
}

function Field({ label, icon: Icon, ...props }: React.ComponentProps<typeof Input> & { label: string; icon: typeof Mail }) {
  return <label className="block text-sm"><span className="mb-2 block text-muted-foreground">{label}</span><span className="relative block"><Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-10" {...props} /></span></label>;
}

function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  error,
  setError,
  loading,
  onSubmit,
  onForgot,
  onRegister,
  onGoogle,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onForgot: () => void;
  onRegister: () => void;
  onGoogle: () => void;
}) {
  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold">Accede a tu cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ingresa tus credenciales para continuar.</p>
      </div>
      <form className="space-y-5" onSubmit={onSubmit}>
        <Field
          label="Correo electrónico"
          icon={Mail}
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="tu@medicore.com"
          required
        />
        <div>
          <Field
            label="Contraseña"
            icon={LockKeyhole}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            required
          />
          <div className="mt-2 text-right">
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onForgot}>
              ¿Olvidaste tu contraseña?
            </Button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Ingresando..." : <>Ingresar <ArrowRight /></>}
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o continúa con
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="h-11 w-full bg-background/30" onClick={onGoogle}>
        <GoogleMark /> Continuar con Google
      </Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta? <Button variant="link" className="h-auto p-0" onClick={onRegister}>Regístrate</Button>
      </p>
      <p className="mt-5 border-t border-border pt-4 text-center text-[11px] leading-5 text-muted-foreground">
        Demo: paciente@medicore.com, medico@medicore.com o admin@medicore.com (Contraseña: Password123!).
      </p>
    </>
  );
}

function ForgotForm({ email, setEmail, onComplete }: { email: string; setEmail: (value: string) => void; onComplete: () => void }) {
  return <><h1 className="font-display text-2xl font-semibold">Recupera tu acceso</h1><p className="mt-2 mb-7 text-sm leading-6 text-muted-foreground">Escribe el correo asociado a tu cuenta.</p><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); onComplete(); }}><Field label="Correo electrónico" icon={Mail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Button className="h-11 w-full" type="submit">Enviar enlace</Button></form><p className="mt-5 text-xs leading-5 text-muted-foreground">Si el correo existe, te mostraremos la confirmación del envío.</p></>;
}

function RegisterForm({ email, setEmail, onComplete }: { email: string; setEmail: (value: string) => void; onComplete: () => void }) {
  return <><h1 className="font-display text-2xl font-semibold">Crea tu cuenta</h1><p className="mt-2 mb-7 text-sm text-muted-foreground">Completa tus datos para comenzar.</p><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onComplete(); }}><Field label="Nombre completo" icon={UserRound} required /><Field label="Correo electrónico" icon={Mail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><Field label="Contraseña" icon={LockKeyhole} type="password" required /><Field label="Confirmar contraseña" icon={LockKeyhole} type="password" required /><Button className="mt-2 h-11 w-full" type="submit">Crear cuenta</Button></form></>;
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="currentColor" opacity=".8" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="currentColor" opacity=".6" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="currentColor" opacity=".9" d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

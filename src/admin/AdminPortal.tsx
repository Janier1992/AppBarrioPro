import React from "react";
import { LogOut, ScrollText, ShieldCheck, Store, Users } from "lucide-react";
import { APP_NAME } from "../lib/brand";
import { auth, type MockUser } from "../lib/insforge";
import { getAdminApi, isDemoAdmin, type AdminApi } from "../lib/admin";
import AccountsView from "./AccountsView";
import AuditView from "./AuditView";

type Gate = "loading" | "signedOut" | "denied" | "ok";

/**
 * Portal de soporte (/admin). Solo entra quien está en la tabla "admins" de la base de datos; esa
 * verificación la hace el servidor en cada operación (aquí solo se decide qué pantalla mostrar).
 */
export default function AdminPortal() {
  const [user, setUser] = React.useState<MockUser | null>(null);
  const [gate, setGate] = React.useState<Gate>("loading");
  const [api, setApi] = React.useState<AdminApi | null>(null);
  const [tab, setTab] = React.useState<"accounts" | "audit">("accounts");

  React.useEffect(() => {
    document.title = `Soporte · ${APP_NAME}`;
    // El portal no debe aparecer en buscadores.
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) {
        setGate("signedOut");
        return;
      }
      setGate("loading");
      try {
        const a = await getAdminApi();
        if (await a.isAdmin()) {
          setApi(a);
          setGate("ok");
        } else {
          setGate("denied");
        }
      } catch {
        setGate("denied");
      }
    });
    return () => {
      unsubscribe();
      document.head.querySelector('meta[name="robots"]')?.remove();
    };
  }, []);

  if (gate === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg" id="admin-loading">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }
  if (gate === "signedOut") return <AdminLogin />;
  if (gate === "denied") {
    return (
      <Shell>
        <div className="max-w-md mx-auto mt-16 rounded-2xl border border-brand-border bg-white p-7 text-center space-y-4" id="admin-denied">
          <ShieldCheck className="mx-auto text-rose-600" size={36} aria-hidden="true" />
          <h1 className="text-xl font-semibold">Sin permisos de soporte</h1>
          <p className="text-sm text-brand-muted">
            La cuenta {user?.email} no está autorizada para entrar a este portal. Si crees que es un error, pide que te agreguen como administrador.
          </p>
          <div className="flex gap-2 justify-center">
            <a href="/" className="h-10 px-4 rounded-xl border border-brand-border text-sm font-medium flex items-center hover:bg-brand-bg">Ir a la app</a>
            <button onClick={() => auth.signOut()} className="h-10 px-4 rounded-xl bg-brand-text text-brand-bg text-sm font-medium cursor-pointer">Cerrar sesión</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-brand-muted truncate max-w-[220px]" id="admin-user">{user?.email}</span>
          <a href="/" className="text-sm font-medium text-brand-primary hover:underline">Ir a la app</a>
          <button onClick={() => auth.signOut()} className="h-9 px-3 rounded-xl border border-brand-border text-sm flex items-center gap-1.5 hover:bg-brand-bg cursor-pointer" id="admin-signout">
            <LogOut size={15} aria-hidden="true" /> Salir
          </button>
        </div>
      }
    >
      {isDemoAdmin() && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900" id="admin-demo-note">
          Modo demostración: datos ficticios, no se conecta a InsForge.
        </p>
      )}
      <nav className="mb-6 flex gap-2" aria-label="Secciones del portal">
        {([["accounts", "Cuentas", Users], ["audit", "Bitácora", ScrollText]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            id={`admin-tab-${id}`}
            className={`h-10 px-4 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer ${tab === id ? "bg-brand-text text-brand-bg" : "border border-brand-border hover:bg-brand-bg"}`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>
      {api && (tab === "accounts" ? <AccountsView api={api} /> : <AuditView api={api} />)}
    </Shell>
  );
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans" id="admin-portal">
      <header className="border-b border-brand-border bg-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center"><Store size={17} aria-hidden="true" /></div>
            <span className="font-semibold text-lg tracking-tight">{APP_NAME} <span className="text-brand-muted font-normal">· Soporte</span></span>
          </div>
          {right}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await auth.signInWithPassword(email.trim(), password);
    } catch (err: any) {
      setError("Correo o contraseña incorrectos.");
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={submit} className="max-w-sm mx-auto mt-14 rounded-2xl border border-brand-border bg-white p-7 space-y-4" id="admin-login">
        <div className="text-center space-y-1">
          <ShieldCheck className="mx-auto text-brand-primary" size={32} aria-hidden="true" />
          <h1 className="text-xl font-semibold">Acceso de soporte</h1>
          <p className="text-sm text-brand-muted">Solo para el equipo autorizado.</p>
        </div>
        <div>
          <label htmlFor="admin-email" className="block text-xs font-medium text-brand-muted mb-1">Correo</label>
          <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white" />
        </div>
        <div>
          <label htmlFor="admin-password" className="block text-xs font-medium text-brand-muted mb-1">Contraseña</label>
          <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white" />
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="w-full h-11 rounded-xl bg-brand-primary text-white font-semibold text-sm cursor-pointer disabled:opacity-60" id="admin-login-submit">
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <a href="/" className="block text-center text-sm text-brand-muted hover:text-brand-text">Volver a la app</a>
      </form>
    </Shell>
  );
}

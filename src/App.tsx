// ======================================================
// Archivo: App.tsx
// Responsabilidad: Componente raíz de presentación y enrutado del aplicativo
// Módulo: Capa de Presentación (Presentation Layer)
// Descripción: Controla el flujo principal del ciclo de vida del frontend, incluyendo
//              autenticación, bloqueo por PIN, cambio de temas, alertas y navegación.
// Dependencias: React, insforge.ts, lucide-react, motion, subcomponentes perezosos.
// Observaciones: Ninguna
// ======================================================

// 1. Librerías externas
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Sparkles, 
  CheckSquare, 
  Settings as SettingsIcon, 
  LogOut, 
  LogIn, 
  Lock, 
  Unlock, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Boxes,
  ShoppingCart,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  DollarSign,
  ChevronDown,
  User,
  Sun,
  Moon,
  Download
} from "lucide-react";

// 2. Servicios
import { 
  auth, 
  db, 
  subscribeToData,
  MockUser
} from "./lib/insforge";

// 3. Componentes
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const Checklist = React.lazy(() => import("./components/Checklist"));
const Settings = React.lazy(() => import("./components/Settings"));
const Inventory = React.lazy(() => import("./components/Inventory"));
const Sales = React.lazy(() => import("./components/Sales"));
const Deudas = React.lazy(() => import("./components/Deudas"));
const Onboarding = React.lazy(() => import("./components/Onboarding"));

import AIAssistantChat from "./components/AIAssistantChat";
import GlobalSearch from "./components/GlobalSearch";

// 4. Utilidades
import { 
  auditAndAlertLowStock, 
  auditAndAlertUnfinishedTasks 
} from "./lib/notifications";

// 5. Tipos
import { 
  Product, 
  Sale, 
  Task, 
  BusinessProfile,
  Debt
} from "./types";

export default function App() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // PWA Install Prompt — captura el evento nativo del navegador para instalación
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    // Detecta si ya está instalada como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsPwaInstalled(true);
    }
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => setIsPwaInstalled(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Screen size detection for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // App States sourced from Firestore
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [inventoryFilterCritical, setInventoryFilterCritical] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  // Security Lock States
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Local Auth Form States
  const [loginMode, setLoginMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [loadingAuthSubmit, setLoadingAuthSubmit] = useState(false);

  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem("hasCompletedOnboarding") === "true";
  });

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // If signed out, clean up local states
      if (!currentUser) {
        setProducts([]);
        setSales([]);
        setTasks([]);
        setDebts([]);
        setProfile(null);
        setIsLocked(false);
      }
    });
    return unsubscribe;
  }, []);

  // Listen to updates when authenticated
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // 1. Profile Config
        let prof = await db.getProfile(user.uid);
        if (!prof) {
          const pendingName = localStorage.getItem("pending_business_name");
          prof = {
            businessName: pendingName || (user.displayName && !user.displayName.includes("@") ? user.displayName : "Mi Negocio"),
            address: "Dirección de local",
            phone: "",
            email: user.email || "",
            hours: "08:00 - 20:00",
            lowStockThreshold: 5,
            securityPin: "",
            theme: "light",
            updatedAt: new Date().toISOString()
          };
          await db.saveProfile(user.uid, prof);
          if (pendingName) {
            localStorage.removeItem("pending_business_name");
          }
        }
        setProfile(prof);
        
        // Se sincroniza el estado de onboarding únicamente al cargar los datos del perfil
        if (prof.hasCompletedOnboarding) {
          setHasCompletedOnboarding(true);
        } else {
          setHasCompletedOnboarding(false);
        }

        // 2. Products
        const prods = await db.getProducts(user.uid);
        setProducts(prods);

        // 3. Sales
        const sls = await db.getSales(user.uid);
        sls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setSales(sls);

        // 4. Tasks
        const tsks = await db.getTasks(user.uid);
        tsks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(tsks);

        // 5. Debts
        const dbts = await db.getDebts(user.uid);
        dbts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDebts(dbts);
      } catch (err) {
        console.error("Error loading data from InsForge:", err);
      }
    };

    loadData();

    // Subscribe to database changes
    const unsubscribe = subscribeToData(() => {
      loadData();
    });

    return unsubscribe;
  }, [user]);

  // Background monitoring for critical stock levels and unfinished checklist items
  useEffect(() => {
    if (!user) return;

    // Run initial assessment check after a brief delay to allow Firestore states to synchronize
    const initialCheckTimer = setTimeout(() => {
      auditAndAlertLowStock(products);
      auditAndAlertUnfinishedTasks(tasks);
    }, 4000);

    // Setup background interval checker to run audits periodically (every 45 seconds)
    // Works seamlessly while the browser tab remains open in the background.
    const backgroundAuditInterval = setInterval(() => {
      auditAndAlertLowStock(products);
      auditAndAlertUnfinishedTasks(tasks);
    }, 45000);

    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(backgroundAuditInterval);
    };
  }, [user, products, tasks]);

  // Reset inventory critical stock filter when navigating away from Inventory tab
  useEffect(() => {
    if (activeTab !== "inventory") {
      setInventoryFilterCritical(false);
    }
  }, [activeTab]);

  // Synchronize dark/light theme preference with DOM classes
  useEffect(() => {
    if (profile?.theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [profile?.theme]);

  /**
   * @function handleIniciarSesionGoogle
   * @description Realiza la autenticación mediante ventana emergente de Google Auth.
   * Paso 1: Levantar popup de autenticación con el proveedor de Google.
   * Paso 2: Registrar errores eventuales de red o rechazos.
   */
  const handleIniciarSesionGoogle = async () => {
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  /**
   * @function handleCerrarSesionGoogle
   * @description Finaliza de forma segura la sesión del usuario activo.
   */
  const handleCerrarSesionGoogle = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Signout failed:", error);
    }
  };

  /**
   * @function handleDesbloquearConPin
   * @description Valida el PIN de seguridad para liberar el protector de pantalla de la tienda.
   * Paso 1: Evitar recargas accidentales del formulario.
   * Paso 2: Cotejar string de entrada contra el PIN almacenado en el perfil.
   * Paso 3: Retornar error de PIN incorrecto o autorizar visibilidad.
   */
  const handleDesbloquearConPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile && pinInput === profile.securityPin) {
      setIsLocked(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("PIN incorrecto. Inténtalo de nuevo.");
      setPinInput("");
    }
  };

  // Critical Low stock alert items banner
  const umbralCritico = Number(profile?.umbralStockCritico ?? profile?.lowStockThreshold ?? 5);
  const lowStockItems = products.filter(p => Number(p.stock) <= umbralCritico);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-brand-text" id="auth-loading-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
          <p className="text-sm font-semibold tracking-wide uppercase text-brand-muted animate-pulse">Abriendo BarrioPro...</p>
        </div>
      </div>
    );
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setLoadingAuthSubmit(true);

    try {
      if (loginMode === "signin") {
        await auth.signInWithPassword(authEmail, authPassword);
      } else {
        localStorage.setItem("pending_business_name", authName);
        await auth.signUp(authEmail, authPassword, authName);
        setAuthSuccess(
          "¡Registro exitoso! Se ha enviado un enlace de confirmación a tu correo electrónico. Por favor verifica tu cuenta antes de iniciar sesión."
        );
        setLoginMode("signin");
        setAuthPassword("");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setAuthError(err.message || "Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setLoadingAuthSubmit(false);
    }
  };

  // Auth Guard / Login screen
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4" id="login-container">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-brand-border flex flex-col items-center space-y-6"
        >
          {/* Logo illustration */}
          <div className="rounded-2xl bg-brand-primary p-4 shadow-sm text-white flex justify-center items-center">
            <LayoutDashboard size={40} />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-brand-text tracking-tight">BarrioPro</h1>
            <p className="text-brand-muted text-sm max-w-xs leading-relaxed mx-auto">
              Gestión inteligente de inventario, finanzas y recomendaciones para comercios tradicionales de barrio.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="w-full grid grid-cols-2 p-1 bg-brand-bg rounded-2xl border border-brand-border">
            <button
              onClick={() => {
                setLoginMode("signin");
                setAuthError("");
                setAuthSuccess("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                loginMode === "signin" 
                  ? "bg-white text-brand-primary shadow-sm" 
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setLoginMode("signup");
                setAuthError("");
                setAuthSuccess("");
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                loginMode === "signup" 
                  ? "bg-white text-brand-primary shadow-sm" 
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Success / Error Messages */}
          {authSuccess && (
            <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium leading-relaxed">
              {authSuccess}
            </div>
          )}
          {authError && (
            <div className="w-full p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium leading-relaxed">
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
            {loginMode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-text block">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Abasto San José"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-text block">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-text block">Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full rounded-2xl border border-brand-border px-4 py-3 text-sm bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loadingAuthSubmit}
              className="w-full rounded-2xl bg-brand-primary hover:bg-brand-primary-dark active:scale-98 py-3.5 text-sm font-bold text-white transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingAuthSubmit ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : loginMode === "signin" ? (
                "Ingresar"
              ) : (
                "Crear Cuenta"
              )}
            </button>
          </form>

          {/* PWA Install Button */}
          {!isPwaInstalled && (
            <div className="w-full space-y-3">
              {deferredInstallPrompt ? (
                <button
                  id="pwa-install-btn"
                  onClick={async () => {
                    deferredInstallPrompt.prompt();
                    const { outcome } = await deferredInstallPrompt.userChoice;
                    if (outcome === "accepted") {
                      setDeferredInstallPrompt(null);
                      setIsPwaInstalled(true);
                    }
                  }}
                  className="w-full rounded-2xl border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 active:scale-98 px-5 py-3.5 text-sm font-bold text-brand-primary transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Download size={18} />
                  Instalar App en este Dispositivo
                </button>
              ) : (
                <div className="w-full rounded-2xl border border-brand-border bg-brand-bg px-5 py-3.5 text-xs text-brand-muted text-center leading-relaxed">
                  <Download size={14} className="inline mr-1.5 mb-0.5" />
                  Para instalar: en tu navegador usa <strong>"Agregar a pantalla de inicio"</strong> o el ícono de instalación en la barra de dirección.
                </div>
              )}
              <p className="text-[10px] text-brand-muted text-center">
                Tus datos son almacenados de forma segura en la nube de InsForge.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // PIN App Lock screen
  if (isLocked && profile?.securityPin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4" id="pin-lock-container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm border border-brand-border text-center space-y-6"
        >
          <div className="mx-auto rounded-full bg-amber-50/50 p-4 text-brand-accent w-16 h-16 flex items-center justify-center">
            <Lock size={32} />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-brand-text">Aplicación Bloqueada</h2>
            <p className="text-xs text-brand-muted">Ingresa el PIN de seguridad de {profile.businessName} para continuar.</p>
          </div>

          <form onSubmit={handleDesbloquearConPin} className="space-y-4">
            <input
              type="password"
              maxLength={4}
              pattern="\d{4}"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
              placeholder="••••"
              className="w-full rounded-2xl border border-brand-border px-4 py-3.5 text-center text-2xl font-mono tracking-widest bg-brand-bg focus:bg-white focus:border-brand-primary focus:outline-hidden"
              autoFocus
              required
            />
            {pinError && <p className="text-[11px] font-semibold text-rose-500">{pinError}</p>}

            <button
              type="submit"
              className="w-full rounded-2xl bg-brand-primary hover:bg-brand-primary-dark font-bold text-sm text-white py-3.5 shadow-sm transition-colors"
            >
              Desbloquear
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderDesktopSidebar = () => {
    const handleTabClick = (tab: typeof activeTab) => {
      setActiveTab(tab);
    };

    const sections = [
      {
        title: "MENÚ PRINCIPAL",
        items: [
          { id: "dashboard", label: "Panel de Control", icon: LayoutDashboard },
          { id: "inventory", label: "Inventario", icon: Boxes },
          { id: "sales", label: "Caja y Ventas", icon: ShoppingCart },
        ] as const,
      },
      {
        title: "RUTINAS Y ASISTENCIA",
        items: [
          { id: "checklist", label: "Checklist Diario", icon: CheckSquare },
          { id: "debts", label: "Deudas", icon: DollarSign },
        ] as const,
      },
      {
        title: "CONFIGURACIÓN",
        items: [
          { id: "settings", label: "Ajustes de Negocio", icon: SettingsIcon },
        ] as const,
      },
    ];

    if (isSidebarCollapsed) {
      const collapsedItems = [
        { id: "dashboard", label: "Panel de Control", icon: LayoutDashboard },
        { id: "inventory", label: "Inventario", icon: Boxes },
        { id: "sales", label: "Caja y Ventas", icon: ShoppingCart },
        { id: "checklist", label: "Checklist Diario", icon: CheckSquare },
        { id: "debts", label: "Deudas", icon: DollarSign },
        { id: "settings", label: "Ajustes de Negocio", icon: SettingsIcon },
      ] as const;

      return (
        <div className="flex-1 flex flex-col justify-between py-6 space-y-6 overflow-y-auto">
          <div className="flex flex-col items-center gap-6">
            {/* Collapse/Expand toggle at top */}
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-95"
              title="Expandir menú"
              id="expand-sidebar-btn"
            >
              <ChevronRight size={20} />
            </button>

            {/* Flat icon list with size 24 icons */}
            <div className="flex flex-col items-center gap-3 w-full px-2">
              {collapsedItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer relative group ${
                      isActive
                        ? "bg-[#2E3A2E] text-white shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    title={item.label}
                    id={`sidebar-link-${item.id}`}
                  >
                    <Icon size={24} />
                    {/* Minimal Hover Tooltip */}
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-[#2E3A2E] border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all duration-150 shadow-lg z-50 whitespace-nowrap pointer-events-none">
                      {item.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Business Mini Avatar */}
          {profile && (
            <div className="flex flex-col items-center pb-4">
              <div 
                className="h-10 w-10 rounded-xl bg-[#2E3A2E] border border-white/10 flex items-center justify-center text-xs font-extrabold text-emerald-400 uppercase tracking-wider animate-pulse"
                title={profile.businessName}
              >
                {profile.businessName.slice(0, 2)}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col justify-between p-4 space-y-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Collapse/Expand toggle inside main view */}
          <div className="flex justify-end px-3">
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-95"
              title="Colapsar menú"
              id="collapse-sidebar-btn"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase px-3 block">
                {sec.title}
              </span>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                        isActive
                          ? "bg-[#2E3A2E] text-white shadow-xs font-bold"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                      id={`sidebar-link-${item.id}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon size={24} className={isActive ? "text-white" : "text-white/80 group-hover:text-white"} />
                        {item.label}
                      </span>
                      {isActive && <ChevronRight size={12} className="opacity-80" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Brand/Business info widget at bottom of sidebar */}
        {profile && (
          <div className="rounded-2xl border border-white/10 bg-[#2E3A2E] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Negocio Activo</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white truncate">{profile.businessName}</p>
              <p className="text-[9px] text-white/60 truncate">{profile.address || "Sin dirección"}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex font-sans w-full overflow-hidden" id="app-root-layout">
      {/* Onboarding Overlay */}
      <AnimatePresence>
        {!hasCompletedOnboarding && (
          <Onboarding 
            onComplete={async () => {
              setHasCompletedOnboarding(true);
              localStorage.setItem("hasCompletedOnboarding", "true");
              if (profile && user) {
                try {
                  const updatedProfile = { ...profile, hasCompletedOnboarding: true };
                  setProfile(updatedProfile);
                  await db.saveProfile(user.uid, updatedProfile);
                } catch (error) {
                  console.error("Error al actualizar estado de onboarding en el perfil:", error);
                }
              }
            }} 
          />
        )}
      </AnimatePresence>

      {/* 1. PERSISTENT SIDEBAR FOR DESKTOP */}
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? "w-[72px]" : "w-[250px]"} bg-[#3A4A3A] border-r border-white/10 flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-300`} id="desktop-sidebar">
        {/* Brand Header */}
        <div className={`p-4 border-b border-white/10 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="rounded-xl bg-[#2E3A2E] p-2 text-white">
            <LayoutDashboard size={20} />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="font-extrabold text-base text-white tracking-tight">BarrioPro</h1>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Gestión Local</span>
            </div>
          )}
        </div>
        {/* Navigation links */}
        {renderDesktopSidebar()}
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-extrabold text-base text-brand-text tracking-tight flex items-center gap-2">
                {profile?.businessName || "Mi Negocio"}
              </h1>
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-brand-muted">
                {profile?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {profile.address}
                  </span>
                )}
                {profile?.hours && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {profile.hours}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-4" id="header-global-search">
            <GlobalSearch 
              products={products}
              tasks={tasks}
              debts={debts}
              onSelectResult={(tab, query) => {
                setGlobalSearchTerm(query);
                setInventoryFilterCritical(false);
                setActiveTab(tab);
              }}
            />
          </div>

          {/* Header Options */}
          <div className="flex items-center gap-3 text-brand-text">
            {/* Lock lock button */}
            {profile?.securityPin && (
              <button
                onClick={() => setIsLocked(true)}
                className="rounded-xl border border-brand-border p-2.5 text-brand-muted hover:text-brand-accent hover:bg-brand-bg transition-colors cursor-pointer"
                title="Bloquear panel"
              >
                <Lock size={16} />
              </button>
            )}

            {/* User Profile Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 rounded-2xl border border-brand-border px-3 py-1.5 hover:bg-brand-bg transition-all cursor-pointer text-left"
                id="user-profile-menu-button"
              >
                {profile?.logoUrl ? (
                  <img 
                    src={profile.logoUrl} 
                    alt="Logo" 
                    className="h-8 w-8 rounded-full object-cover border border-brand-border shadow-xs shrink-0 bg-white" 
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-[11px] tracking-wide shadow-xs shrink-0 uppercase">
                    {profile?.businessName ? profile.businessName.substring(0, 2) : "US"}
                  </div>
                )}
                <div className="hidden sm:flex flex-col select-none">
                  <span className="text-xs font-bold text-brand-text leading-tight">{profile?.businessName || "Mi Negocio"}</span>
                  <span className="text-[9px] text-brand-muted leading-tight truncate max-w-[110px]">{user.email}</span>
                </div>
                <ChevronDown size={14} className={`text-brand-muted transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isProfileDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                  
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-brand-border bg-white p-2 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-brand-border flex items-center gap-2">
                      {profile?.logoUrl ? (
                        <img 
                          src={profile.logoUrl} 
                          alt="Logo" 
                          className="h-8 w-8 rounded-full object-cover border border-brand-border shadow-xs shrink-0 bg-white" 
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-xs shrink-0 uppercase">
                          {profile?.businessName ? profile.businessName.substring(0, 2) : "US"}
                        </div>
                      )}
                      <div className="truncate min-w-0">
                        <p className="text-xs font-bold text-brand-text truncate">{profile?.businessName || "Mi Negocio"}</p>
                        <p className="text-[9px] text-brand-muted truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      {/* Option 1: View Profile */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setActiveTab("settings");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-text rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
                      >
                        <User size={14} className="text-brand-muted" />
                        <span>Ver Perfil / Ajustes</span>
                      </button>

                      {/* Option 2: Toggle Theme */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!profile) return;
                          const nextTheme = profile.theme === "light" ? "dark" : "light";
                          const updated = { ...profile, theme: nextTheme };
                          setProfile(updated);
                          setIsProfileDropdownOpen(false);
                          await db.saveProfile(user.uid, updated);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {profile?.theme === "dark" ? (
                            <Moon size={14} className="text-brand-muted" />
                          ) : (
                            <Sun size={14} className="text-brand-muted" />
                          )}
                          <span>Tema: {profile?.theme === "dark" ? "Oscuro" : "Claro"}</span>
                        </div>
                        <div className={`h-4 w-8 rounded-full p-0.5 transition-colors duration-200 ${profile?.theme === "dark" ? "bg-brand-primary" : "bg-gray-200"}`}>
                          <div className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ${profile?.theme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      </button>
                    </div>

                    <div className="border-t border-brand-border mt-1 pt-1">
                      {/* Option 3: Sign Out */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleCerrarSesionGoogle();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 rounded-xl hover:bg-rose-50/50 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Critical low stock alert banner */}
        {lowStockItems.length > 0 && (
          <div 
            onClick={() => {
              setInventoryFilterCritical(true);
              setActiveTab("inventory");
            }}
            className="bg-amber-50 hover:bg-amber-100/80 border-b border-amber-100 px-6 py-2.5 text-amber-800 text-[11px] font-medium flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shrink-0 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 animate-bounce" />
              Atención: Tienes {lowStockItems.length} productos con inventario críticamente bajo.
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInventoryFilterCritical(true);
                setActiveTab("inventory");
              }}
              className="text-amber-950 underline font-semibold hover:text-amber-900 flex-shrink-0 cursor-pointer text-xs"
            >
              Revisar Inventario
            </button>
          </div>
        )}

        {/* Main Content Viewport - added bottom padding pb-24 for mobile tabbar buffer */}
        <div className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <React.Suspense fallback={
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
                </div>
              }>
                {activeTab === "dashboard" && (
                  <Dashboard 
                    products={products} 
                    sales={sales} 
                    userId={user.uid} 
                    onNavigateToCriticalStock={() => {
                      setInventoryFilterCritical(true);
                      setActiveTab("inventory");
                    }}
                  />
                )}
                {activeTab === "inventory" && (
                  <Inventory 
                    products={products} 
                    profile={profile} 
                    userId={user.uid} 
                    initialFilterCritical={inventoryFilterCritical} 
                    searchQueryParam={globalSearchTerm}
                    onClearSearchParam={() => setGlobalSearchTerm("")}
                  />
                )}
                {activeTab === "sales" && (
                  <Sales products={products} sales={sales} userId={user.uid} />
                )}
                {activeTab === "debts" && (
                  <Deudas 
                    debts={debts} 
                    userId={user.uid} 
                    searchQueryParam={globalSearchTerm}
                    onClearSearchParam={() => setGlobalSearchTerm("")}
                  />
                )}
                {activeTab === "checklist" && (
                  <Checklist 
                    tasks={tasks} 
                    userId={user.uid} 
                    searchQueryParam={globalSearchTerm}
                    onClearSearchParam={() => setGlobalSearchTerm("")}
                  />
                )}
                {activeTab === "settings" && (
                  <Settings products={products} profile={profile} userId={user.uid} />
                )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="border-t border-brand-border py-4 px-6 pb-24 lg:pb-4 text-center text-[10px] text-brand-muted bg-white shrink-0">
          &copy; {new Date().getFullYear()} BarrioPro. Herramientas sencillas para el comercio local.
        </footer>
      </div>

      {/* 3. FIXED BOTTOM NAVIGATION BAR FOR MOBILE (iOS/Android style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#3A4A3A] border-t border-white/10 h-[56px] flex items-center justify-around px-2 lg:hidden shadow-xl" id="mobile-bottom-nav">
        {[
          { id: "dashboard", label: "Panel", icon: LayoutDashboard },
          { id: "inventory", label: "Inventario", icon: Boxes },
          { id: "sales", label: "Ventas", icon: ShoppingCart },
          { id: "checklist", label: "Checklist", icon: CheckSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsMobileMoreOpen(false);
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 h-full cursor-pointer transition-all active:scale-95"
              id={`mobile-nav-${item.id}`}
            >
              <Icon 
                size={24} 
                className={`transition-colors duration-150 ${
                  isActive ? "text-[#4CAF50] scale-105" : "text-white/70"
                }`} 
              />
              <span 
                className={`text-[9px] mt-0.5 transition-colors duration-150 font-semibold ${
                  isActive ? "text-[#4CAF50] font-bold" : "text-white/60"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsMobileMoreOpen(prev => !prev)}
          className="flex flex-col items-center justify-center flex-1 py-1 h-full cursor-pointer transition-all active:scale-95 animate-none"
          id="mobile-nav-more"
        >
          <MoreVertical 
            size={24} 
            className={`transition-colors duration-150 ${
              isMobileMoreOpen || activeTab === "debts" || activeTab === "settings"
                ? "text-[#4CAF50] scale-105"
                : "text-white/70"
            }`} 
          />
          <span 
            className={`text-[9px] mt-0.5 transition-colors duration-150 font-semibold ${
              isMobileMoreOpen || activeTab === "debts" || activeTab === "settings"
                ? "text-[#4CAF50] font-bold"
                : "text-white/60"
            }`}
          >
            Más
          </span>
        </button>

        {/* Floating "Más" Popover Menu */}
        <AnimatePresence>
          {isMobileMoreOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/30 z-30 lg:hidden"
                onClick={() => setIsMobileMoreOpen(false)}
              />
              {/* Popover */}
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="fixed bottom-[64px] right-4 z-40 w-48 bg-[#3A4A3A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5"
                id="mobile-more-popover"
              >
                <button
                  onClick={() => {
                    setActiveTab("debts");
                    setIsMobileMoreOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === "debts"
                      ? "bg-[#2E3A2E] text-[#4CAF50]"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                  id="mobile-popover-debts"
                >
                  <DollarSign size={18} />
                  Deudas
                </button>
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setIsMobileMoreOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold cursor-pointer transition-colors ${
                    activeTab === "settings"
                      ? "bg-[#2E3A2E] text-[#4CAF50]"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                  id="mobile-popover-settings"
                >
                  <SettingsIcon size={18} />
                  Ajustes de Negocio
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
      
      {/* Floating AI Assistant Chat Bot */}
      <AIAssistantChat products={products} sales={sales} userId={user.uid} geminiApiKey={profile?.geminiApiKey} />
    </div>
  );
}

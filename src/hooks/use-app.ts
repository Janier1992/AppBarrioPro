import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  auth, 
  db, 
  subscribeToData,
  isInsForgeConfigured,
  MockUser
} from "../lib/insforge";
import {
  auditAndAlertLowStock,
  auditAndAlertUnfinishedTasks
} from "../lib/notifications";
import { verifyPin, isHashedPin, hashPin, markSessionUnlocked, clearSessionUnlocked, isSessionUnlocked } from "../lib/pin";
import { translateAuthError } from "../lib/authErrors";
import { decideAccess, fetchSubscription, loadCachedSubscription, saveCachedSubscription, type AccessDecision } from "../lib/subscription";
import { isCriticalStock } from "../lib/stock";
import { nextTheme, resolveTheme } from "../lib/theme";
import { 
  Product, 
  Sale, 
  Task, 
  BusinessProfile,
  Debt
} from "../types";

export function useApp() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings">("dashboard");
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // PWA Install Prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
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
  // ?registro=1 (enlace de la prueba gratis en /planes) abre directamente "Crear Cuenta".
  const [loginMode, setLoginMode] = useState<"signin" | "signup">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("registro") === "1" ? "signup" : "signin"
  );
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
      
      if (!currentUser) {
        setProducts([]);
        setSales([]);
        setTasks([]);
        setDebts([]);
        setProfile(null);
        setIsLocked(false);
        clearSessionUnlocked();
      }
    });
    return unsubscribe;
  }, []);

  // ---- Suscripción (prueba de 7 días / pago mensual) ----
  // El bloqueo real lo hace la base de datos; aquí se decide qué pantalla mostrar. En modo demostración
  // (sin InsForge) no hay suscripciones: siempre hay acceso.
  const [access, setAccess] = useState<AccessDecision | null>(() => (isInsForgeConfigured() ? null : { hasAccess: true, info: null, source: "unknown" }));
  const refreshSubscription = useCallback(async () => {
    if (!user || !isInsForgeConfigured()) return;
    const fresh = await fetchSubscription();
    if (fresh) saveCachedSubscription(user.uid, fresh);
    setAccess(decideAccess(fresh, loadCachedSubscription(user.uid)));
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (isInsForgeConfigured()) setAccess(null);
      return;
    }
    refreshSubscription();
    // Se vuelve a consultar al regresar a la app y cada 10 minutos: si la prueba o el mes vencen con la
    // app abierta, la pantalla de suscripción aparece sola.
    const onFocus = () => refreshSubscription();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(refreshSubscription, 10 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [user, refreshSubscription]);
  const hasAccess = access?.hasAccess === true;

  // Listen to updates when authenticated
  const loadDataInFlightRef = useRef(false);
  useEffect(() => {
    if (!user || !hasAccess) return;

    const loadData = async () => {
      // loadData() se dispara al montar Y en cada notifySubscribers() de
      // toda la app (cualquier guardado en cualquier módulo). Para una
      // tienda recién registrada, dos invocaciones que se solapan pueden
      // ver ambas "sin perfil todavía" y disparar dos altas de perfil a la
      // vez — la segunda choca con la restricción UNIQUE de "userId" en
      // InsForge y falla. Este candado evita que se solapen.
      if (loadDataInFlightRef.current) return;
      loadDataInFlightRef.current = true;
      try {
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
        
        if (prof.hasCompletedOnboarding) {
          setHasCompletedOnboarding(true);
        } else {
          setHasCompletedOnboarding(false);
        }

        const prods = await db.getProducts(user.uid);
        setProducts(prods);

        const sls = await db.getSales(user.uid);
        sls.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setSales(sls);

        const tsks = await db.getTasks(user.uid);
        tsks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(tsks);

        const dbts = await db.getDebts(user.uid);
        dbts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDebts(dbts);
      } catch (err) {
        console.error("Error loading data from InsForge:", err);
      } finally {
        loadDataInFlightRef.current = false;
      }
    };

    loadData();

    const unsubscribe = subscribeToData(() => {
      loadData();
    });

    return unsubscribe;
  }, [user, hasAccess]);

  // Background monitoring
  useEffect(() => {
    if (!user) return;

    const initialCheckTimer = setTimeout(() => {
      auditAndAlertLowStock(products);
      auditAndAlertUnfinishedTasks(tasks);
    }, 4000);

    const backgroundAuditInterval = setInterval(() => {
      auditAndAlertLowStock(products);
      auditAndAlertUnfinishedTasks(tasks);
    }, 45000);

    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(backgroundAuditInterval);
    };
  }, [user, products, tasks]);

  // Reset inventory critical stock filter when navigating away
  useEffect(() => {
    if (activeTab !== "inventory") {
      setInventoryFilterCritical(false);
    }
  }, [activeTab]);

  // Bloqueo real por PIN: antes "isLocked" solo se ponía en true con el
  // botón de candado manual, así que recargar la página o volver a abrir la
  // PWA entraba directo al panel sin pedir el PIN (protección falsa). Ahora,
  // si la tienda tiene un PIN configurado y esta pestaña/sesión del
  // navegador todavía no se desbloqueó, se bloquea automáticamente.
  useEffect(() => {
    if (profile?.securityPin && !isSessionUnlocked()) {
      setIsLocked(true);
    }
  }, [profile?.securityPin]);

  // Synchronize dark/light theme preference
  useEffect(() => {
    if (resolveTheme(profile?.theme) === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [profile?.theme]);

  const handleIniciarSesionGoogle = async () => {
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleToggleTheme = async () => {
    if (!profile || !user) return;
    const updated = { ...profile, theme: nextTheme(profile.theme) };
    // Optimista: actualiza el estado compartido (y por tanto la clase "dark"
    // del documento) de inmediato, sin esperar el viaje de ida y vuelta a la
    // base de datos. Antes existían dos implementaciones de este mismo
    // interruptor (aquí y en AppHeader.tsx) y una de ellas no lo hacía,
    // causando que el cambio de tema pareciera necesitar dos clics.
    setProfile(updated);
    await db.saveProfile(user.uid, updated);
  };

  const handleCerrarSesionGoogle = async () => {
    clearSessionUnlocked();
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Signout failed:", error);
    }
  };

  const handleDesbloquearConPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile && verifyPin(pinInput, profile.securityPin)) {
      markSessionUnlocked();
      setIsLocked(false);
      setPinInput("");
      setPinError("");

      // Migración transparente: si el PIN todavía estaba en texto plano
      // (guardado antes de introducir el hasheo), lo re-guardamos hasheado.
      if (user && !isHashedPin(profile.securityPin)) {
        db.saveProfile(user.uid, {
          ...profile,
          securityPin: hashPin(pinInput),
          updatedAt: new Date().toISOString()
        }).catch(err => console.warn("No se pudo migrar el PIN a formato hasheado:", err));
      }
    } else {
      setPinError("PIN incorrecto. Inténtalo de nuevo.");
      setPinInput("");
    }
  };

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
      setAuthError(translateAuthError(err?.message));
    } finally {
      setLoadingAuthSubmit(false);
    }
  };

  const umbralCritico = Number(profile?.umbralStockCritico ?? profile?.lowStockThreshold ?? 5);
  const lowStockItems = products.filter(isCriticalStock);

  return {
    user,
    authLoading,
    access,
    refreshSubscription,
    activeTab,
    setActiveTab,
    isMobileMoreOpen,
    setIsMobileMoreOpen,
    isProfileDropdownOpen,
    setIsProfileDropdownOpen,
    deferredInstallPrompt,
    setDeferredInstallPrompt,
    isPwaInstalled,
    setIsPwaInstalled,
    products,
    sales,
    tasks,
    debts,
    profile,
    setProfile,
    inventoryFilterCritical,
    setInventoryFilterCritical,
    globalSearchTerm,
    setGlobalSearchTerm,
    isLocked,
    setIsLocked,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    loginMode,
    setLoginMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authError,
    setAuthError,
    authSuccess,
    setAuthSuccess,
    loadingAuthSubmit,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    handleIniciarSesionGoogle,
    handleCerrarSesionGoogle,
    handleToggleTheme,
    handleDesbloquearConPin,
    handleAuthSubmit,
    umbralCritico,
    lowStockItems
  };
}

import React, { useState, useEffect } from "react";
import { 
  auth, 
  db, 
  subscribeToData,
  MockUser
} from "../lib/insforge";
import { 
  auditAndAlertLowStock, 
  auditAndAlertUnfinishedTasks 
} from "../lib/notifications";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Screen size detection
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
      }
    };

    loadData();

    const unsubscribe = subscribeToData(() => {
      loadData();
    });

    return unsubscribe;
  }, [user]);

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

  // Synchronize dark/light theme preference
  useEffect(() => {
    if (profile?.theme === "dark") {
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

  const handleCerrarSesionGoogle = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Signout failed:", error);
    }
  };

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

  const umbralCritico = Number(profile?.umbralStockCritico ?? profile?.lowStockThreshold ?? 5);
  const lowStockItems = products.filter(p => Number(p.stock) <= umbralCritico);

  return {
    user,
    authLoading,
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMoreOpen,
    setIsMobileMoreOpen,
    isMobile,
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
    handleDesbloquearConPin,
    handleAuthSubmit,
    umbralCritico,
    lowStockItems
  };
}

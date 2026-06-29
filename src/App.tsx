// ======================================================
// Archivo: App.tsx
// Responsabilidad: Componente raíz de presentación y enrutado del aplicativo
// Módulo: Capa de Presentación (Presentation Layer)
// Descripción: Controla el flujo principal del ciclo de vida del frontend, incluyendo
//              autenticación, bloqueo por PIN, cambio de temas, alertas y navegación.
// Dependencias: React, useApp hook, subcomponentes visuales.
// ======================================================

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  AlertTriangle,
  Boxes,
  ShoppingCart,
  CheckSquare,
  DollarSign,
  MoreVertical
} from "lucide-react";

import { useApp } from "./hooks/use-app";
import { db } from "./lib/insforge";

// Componentes perezosos
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const Checklist = React.lazy(() => import("./components/Checklist"));
const Settings = React.lazy(() => import("./components/Settings"));
const Inventory = React.lazy(() => import("./components/Inventory"));
const Sales = React.lazy(() => import("./components/Sales"));
const Deudas = React.lazy(() => import("./components/Deudas"));
const Onboarding = React.lazy(() => import("./components/Onboarding"));

import AIAssistantChat from "./components/AIAssistantChat";
import AppLoginScreen from "./components/AppLoginScreen";
import AppLockScreen from "./components/AppLockScreen";
import AppSidebar from "./components/AppSidebar";
import AppHeader from "./components/AppHeader";

export default function App() {
  const {
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
  } = useApp();

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

  // Auth Guard
  if (!user) {
    return (
      <AppLoginScreen
        loginMode={loginMode}
        setLoginMode={setLoginMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authName={authName}
        setAuthName={setAuthName}
        authError={authError}
        setAuthError={setAuthError}
        authSuccess={authSuccess}
        setAuthSuccess={setAuthSuccess}
        loadingAuthSubmit={loadingAuthSubmit}
        isPwaInstalled={isPwaInstalled}
        deferredInstallPrompt={deferredInstallPrompt}
        setDeferredInstallPrompt={setDeferredInstallPrompt}
        setIsPwaInstalled={setIsPwaInstalled}
        handleAuthSubmit={handleAuthSubmit}
      />
    );
  }

  // PIN App Lock screen
  if (isLocked && profile?.securityPin) {
    return (
      <AppLockScreen
        profile={profile}
        pinInput={pinInput}
        setPinInput={setPinInput}
        pinError={pinError}
        setPinError={setPinError}
        setIsLocked={setIsLocked}
        handleDesbloquearConPin={handleDesbloquearConPin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex font-sans w-full overflow-hidden" id="app-root-layout">
      {/* Onboarding Overlay */}
      <AnimatePresence mode="wait">
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
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          profile={profile}
        />
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <AppHeader
          profile={profile}
          setProfile={setProfile}
          user={user}
          products={products}
          tasks={tasks}
          debts={debts}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          isProfileDropdownOpen={isProfileDropdownOpen}
          setIsProfileDropdownOpen={setIsProfileDropdownOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setInventoryFilterCritical={setInventoryFilterCritical}
          setGlobalSearchTerm={setGlobalSearchTerm}
          handleCerrarSesionGoogle={handleCerrarSesionGoogle}
        />

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

        {/* Main Content Viewport */}
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

      {/* 3. FIXED BOTTOM NAVIGATION BAR FOR MOBILE */}
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

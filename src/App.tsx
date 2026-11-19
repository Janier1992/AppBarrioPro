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
  Store,
  AlertTriangle,
  Boxes,
  Home,
  Receipt,
  ListChecks,
  Wallet,
  SlidersHorizontal,
  Ellipsis
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
import ToastContainer from "./components/ToastContainer";
import NotificationPrompt from "./components/NotificationPrompt";
import { APP_NAME, APP_TAGLINE } from "./lib/brand";

export default function App() {
  const {
    user,
    authLoading,
    activeTab,
    setActiveTab,
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
    handleToggleTheme,
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
          <p className="text-sm font-semibold tracking-wide uppercase text-brand-muted animate-pulse">Abriendo {APP_NAME}...</p>
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
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? "w-[72px]" : "w-[232px]"} bg-brand-bg border-r border-brand-border flex-col shrink-0 h-screen sticky top-0 transition-all duration-300`} id="desktop-sidebar">
        {/* Brand Header */}
        <div className={`px-5 pt-7 pb-5 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="h-7 w-7 shrink-0 rounded-lg bg-brand-primary text-white flex items-center justify-center">
            <Store size={16} strokeWidth={2} />
          </div>
          {!isSidebarCollapsed && (
            <h1 className="font-semibold text-lg text-brand-text tracking-tight">{APP_NAME}</h1>
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
          handleToggleTheme={handleToggleTheme}
        />

        <NotificationPrompt />

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
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
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
                  <Settings
                    products={products}
                    profile={profile}
                    userId={user.uid}
                    handleToggleTheme={handleToggleTheme}
                    isPwaInstalled={isPwaInstalled}
                    deferredInstallPrompt={deferredInstallPrompt}
                    setDeferredInstallPrompt={setDeferredInstallPrompt}
                    setIsPwaInstalled={setIsPwaInstalled}
                  />
                )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="py-4 px-6 pb-24 lg:pb-4 text-center text-[11px] text-brand-muted shrink-0">
          &copy; {new Date().getFullYear()} {APP_NAME}. {APP_TAGLINE}
        </footer>
      </div>

      {/* 3. FIXED BOTTOM NAVIGATION BAR FOR MOBILE */}
      <nav aria-label="Principal" className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-border grid grid-cols-5 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden" id="mobile-bottom-nav">
        {[
          { id: "dashboard", label: "Inicio", icon: Home },
          { id: "sales", label: "Ventas", icon: Receipt },
          { id: "inventory", label: "Inventario", icon: Boxes },
          { id: "debts", label: "Deudas", icon: Wallet },
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
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-xl text-[11px] cursor-pointer transition-colors ${
                isActive ? "text-brand-primary font-semibold" : "text-brand-muted font-medium"
              }`}
              id={`mobile-nav-${item.id}`}
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsMobileMoreOpen(prev => !prev)}
          aria-expanded={isMobileMoreOpen}
          className={`flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-xl text-[11px] cursor-pointer transition-colors ${
            isMobileMoreOpen || activeTab === "checklist" || activeTab === "settings"
              ? "text-brand-primary font-semibold"
              : "text-brand-muted font-medium"
          }`}
          id="mobile-nav-more"
        >
          <Ellipsis size={22} strokeWidth={1.8} />
          <span>Más</span>
        </button>

        {/* Menú "Más": Tareas y Ajustes */}
        <AnimatePresence>
          {isMobileMoreOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                onClick={() => setIsMobileMoreOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.12 }}
                className="fixed bottom-[76px] right-4 z-40 w-52 bg-white border border-brand-border rounded-2xl shadow-lg overflow-hidden"
                id="mobile-more-popover"
              >
                {[
                  { id: "checklist", label: "Tareas", icon: ListChecks },
                  { id: "settings", label: "Ajustes", icon: SlidersHorizontal },
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
                      className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-left text-sm cursor-pointer transition-colors ${
                        isActive ? "text-brand-primary font-semibold bg-[#EAF2ED]" : "text-brand-text hover:bg-brand-bg"
                      }`}
                      id={`mobile-popover-${item.id}`}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {item.label}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Floating AI Assistant Chat Bot */}
      <AIAssistantChat products={products} sales={sales} userId={user.uid} geminiApiKey={profile?.geminiApiKey} />

      <ToastContainer />
    </div>
  );
}

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
import { Home, Boxes, Wallet, Plus, Ellipsis } from "lucide-react";

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
import AppTopNav from "./components/AppTopNav";
import MoreMenuList from "./components/MoreMenuList";
import ToastContainer from "./components/ToastContainer";
import NotificationPrompt from "./components/NotificationPrompt";
import { APP_NAME } from "./lib/brand";

export default function App() {
  const {
    user,
    authLoading,
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
    handleCerrarSesionGoogle,
    handleToggleTheme,
    handleDesbloquearConPin,
    handleAuthSubmit
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

  // En Vender y Cobrar no hay menú inferior: el tendero se concentra en terminar la venta.
  const hideMobileNav = activeTab === "sales";
  const isMoreActive = isMobileMoreOpen || activeTab === "checklist" || activeTab === "settings";

  const mobileTabClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-xl text-[11px] cursor-pointer transition-colors ${
      isActive ? "text-brand-primary font-semibold" : "text-brand-muted font-medium"
    }`;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans w-full" id="app-root-layout">
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

      {/* Barra superior (solo escritorio) */}
      <AppTopNav
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setInventoryFilterCritical={setInventoryFilterCritical}
        isProfileDropdownOpen={isProfileDropdownOpen}
        setIsProfileDropdownOpen={setIsProfileDropdownOpen}
        setIsLocked={setIsLocked}
        handleToggleTheme={handleToggleTheme}
        handleCerrarSesionGoogle={handleCerrarSesionGoogle}
      />

      <NotificationPrompt />

      {/* Contenido */}
      <main className="flex-1 w-full min-w-0 max-w-5xl mx-auto px-5 lg:px-10 pt-6 lg:pt-10 pb-28 lg:pb-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
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
                  debts={debts}
                  tasks={tasks}
                  userId={user.uid}
                  onNavigate={(tab) => {
                    setInventoryFilterCritical(tab === "inventory");
                    setActiveTab(tab);
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
                <Sales products={products} sales={sales} userId={user.uid} onBack={() => setActiveTab("dashboard")} />
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
      </main>

      {/* Barra inferior móvil: 4 destinos + "Vender" grande al centro + "Más" */}
      <nav
        aria-label="Principal"
        className={`${hideMobileNav ? "hidden" : "grid"} fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-border grid-cols-5 items-end px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden`}
        id="mobile-bottom-nav"
      >
        <button onClick={() => { setInventoryFilterCritical(false); setActiveTab("dashboard"); setIsMobileMoreOpen(false); }} aria-current={activeTab === "dashboard" ? "page" : undefined} className={mobileTabClass(activeTab === "dashboard")} id="mobile-nav-dashboard">
          <Home size={24} strokeWidth={1.9} />
          <span>Hoy</span>
        </button>
        <button onClick={() => { setInventoryFilterCritical(false); setActiveTab("inventory"); setIsMobileMoreOpen(false); }} aria-current={activeTab === "inventory" ? "page" : undefined} className={mobileTabClass(activeTab === "inventory")} id="mobile-nav-inventory">
          <Boxes size={24} strokeWidth={1.9} />
          <span>Productos</span>
        </button>
        <button onClick={() => { setActiveTab("sales"); setIsMobileMoreOpen(false); }} className="flex flex-col items-center justify-start gap-1 min-h-[56px] text-[11px] font-semibold text-brand-primary cursor-pointer" id="mobile-nav-sales">
          <span className="-mt-[22px] h-14 w-14 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-[0_6px_16px_rgba(47,107,79,0.28)]">
            <Plus size={26} strokeWidth={2.2} />
          </span>
          <span>Vender</span>
        </button>
        <button onClick={() => { setActiveTab("debts"); setIsMobileMoreOpen(false); }} aria-current={activeTab === "debts" ? "page" : undefined} className={mobileTabClass(activeTab === "debts")} id="mobile-nav-debts">
          <Wallet size={24} strokeWidth={1.9} />
          <span>Fiados</span>
        </button>
        <button onClick={() => setIsMobileMoreOpen((prev) => !prev)} aria-expanded={isMobileMoreOpen} className={mobileTabClass(isMoreActive)} id="mobile-nav-more">
          <Ellipsis size={24} strokeWidth={1.9} />
          <span>Más</span>
        </button>

        <AnimatePresence>
          {isMobileMoreOpen && (
            <>
              <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setIsMobileMoreOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.12 }}
                className="fixed bottom-[84px] right-4 z-40 w-60 bg-white border border-brand-border rounded-2xl shadow-lg overflow-hidden"
                id="mobile-more-popover"
              >
                <MoreMenuList
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  profile={profile}
                  setIsLocked={setIsLocked}
                  handleToggleTheme={handleToggleTheme}
                  handleCerrarSesionGoogle={handleCerrarSesionGoogle}
                  onClose={() => setIsMobileMoreOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Asistente IA: se abre desde "Pregúntale a Tiendly" (Inicio) o desde el menú "Más" */}
      <AIAssistantChat products={products} sales={sales} userId={user.uid} />

      <ToastContainer />
    </div>
  );
}

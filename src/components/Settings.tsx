import React from "react";
import { Product, BusinessProfile } from "../types";
import { useSettings } from "../hooks/use-settings";
import { Download } from "lucide-react";
import SettingsProfile from "./SettingsProfile";
import SettingsCatalog from "./SettingsCatalog";
import SettingsSecurity from "./SettingsSecurity";
import SettingsNotifications from "./SettingsNotifications";
import Dialogs from "./Dialogs";

interface SettingsProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
  handleToggleTheme: () => void;
  isPwaInstalled: boolean;
  deferredInstallPrompt: any;
  setDeferredInstallPrompt: (val: any) => void;
  setIsPwaInstalled: (val: boolean) => void;
}

export default function Settings({
  products,
  profile,
  userId,
  handleToggleTheme,
  isPwaInstalled,
  deferredInstallPrompt,
  setDeferredInstallPrompt,
  setIsPwaInstalled
}: SettingsProps) {
  const {
    confirmDialog,
    setConfirmDialog,
    alertDialog,
    setAlertDialog,
    activeSection,
    setActiveSection,
    permissionState,
    notifPrefs,
    businessName,
    setBusinessName,
    address,
    setAddress,
    phone,
    setPhone,
    email,
    setEmail,
    hours,
    setHours,
    lowStockThreshold,
    setLowStockThreshold,
    logoUrl,
    setLogoUrl,
    loadingProfile,
    prodName,
    setProdName,
    sku,
    setSku,
    category,
    setCategory,
    stock,
    setStock,
    minStock,
    setMinStock,
    price,
    setPrice,
    cost,
    setCost,
    loadingProduct,
    securityPin,
    setSecurityPin,
    loadingSecurity,
    loadingDemo,
    handleGuardarConfiguracionPerfil,
    handleRegistrarNuevoProducto,
    handleGuardarPinDeSeguridad,
    handleExportarExcel,
    handleCargarDatosDeDemostracion,
    handleEliminarProductoDeInventario,
    handleSolicitarPermisoNotificaciones,
    handleAlternarPreferenciaNotificaciones,
    handleEnviarNotificacionDePrueba
  } = useSettings({ products, profile, userId });

  return (
    <div className="space-y-6" id="settings-container">
      <div className="space-y-1">
        <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Ajustes</h2>
        <p className="text-sm text-brand-muted">Datos de tu tienda, seguridad y preferencias.</p>
      </div>

      {!isPwaInstalled && deferredInstallPrompt && (
        <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-brand-primary">
            <Download size={18} />
            <p className="text-xs font-semibold">Instala Tiendly en este dispositivo para abrirlo como una app, aún sin internet.</p>
          </div>
          <button
            onClick={async () => {
              deferredInstallPrompt.prompt();
              const { outcome } = await deferredInstallPrompt.userChoice;
              if (outcome === "accepted") {
                setDeferredInstallPrompt(null);
                setIsPwaInstalled(true);
              }
            }}
            className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Instalar App
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="settings-layout-grid">
        {/* Sidebar tabs */}
        <div className="md:col-span-1 flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-brand-border pb-4 md:pb-0 md:pr-4 overflow-x-auto">
          <button
            onClick={() => setActiveSection("profile")}
            className={`flex-1 text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSection === "profile" ? "bg-brand-primary/10 text-brand-primary" : "text-brand-muted hover:bg-brand-bg"}`}
          >
            Perfil del Negocio
          </button>
          <button
            onClick={() => setActiveSection("inventory")}
            className={`flex-1 text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSection === "inventory" ? "bg-brand-primary/10 text-brand-primary" : "text-brand-muted hover:bg-brand-bg"}`}
          >
            Gestión de Catálogo
          </button>
          <button
            onClick={() => setActiveSection("security")}
            className={`flex-1 text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSection === "security" ? "bg-brand-primary/10 text-brand-primary" : "text-brand-muted hover:bg-brand-bg"}`}
          >
            Seguridad e Inicialización
          </button>
          <button
            onClick={() => setActiveSection("notifications")}
            className={`flex-1 text-left px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeSection === "notifications" ? "bg-brand-primary/10 text-brand-primary" : "text-brand-muted hover:bg-brand-bg"}`}
          >
            Notificaciones Locales
          </button>
        </div>

        {/* Configuration Views */}
        <div className="md:col-span-3">
          {activeSection === "profile" && (
            <SettingsProfile
              userId={userId}
              businessName={businessName}
              setBusinessName={setBusinessName}
              address={address}
              setAddress={setAddress}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              hours={hours}
              setHours={setHours}
              lowStockThreshold={lowStockThreshold}
              setLowStockThreshold={setLowStockThreshold}
              theme={profile?.theme || "light"}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              loadingProfile={loadingProfile}
              handleToggleTheme={handleToggleTheme}
              handleGuardarConfiguracionPerfil={handleGuardarConfiguracionPerfil}
            />
          )}

          {activeSection === "inventory" && (
            <SettingsCatalog
              userId={userId}
              products={products}
              prodName={prodName}
              setProdName={setProdName}
              sku={sku}
              setSku={setSku}
              category={category}
              setCategory={setCategory}
              stock={stock}
              setStock={setStock}
              minStock={minStock}
              setMinStock={setMinStock}
              price={price}
              setPrice={setPrice}
              cost={cost}
              setCost={setCost}
              loadingProduct={loadingProduct}
              handleExportarExcel={handleExportarExcel}
              handleRegistrarNuevoProducto={handleRegistrarNuevoProducto}
              handleEliminarProductoDeInventario={handleEliminarProductoDeInventario}
            />
          )}

          {activeSection === "security" && (
            <SettingsSecurity
              securityPin={securityPin}
              setSecurityPin={setSecurityPin}
              loadingSecurity={loadingSecurity}
              loadingDemo={loadingDemo}
              handleGuardarPinDeSeguridad={handleGuardarPinDeSeguridad}
              handleCargarDatosDeDemostracion={handleCargarDatosDeDemostracion}
            />
          )}

          {activeSection === "notifications" && (
            <SettingsNotifications
              permissionState={permissionState}
              notifPrefs={notifPrefs}
              handleSolicitarPermisoNotificaciones={handleSolicitarPermisoNotificaciones}
              handleAlternarPreferenciaNotificaciones={handleAlternarPreferenciaNotificaciones}
              handleEnviarNotificacionDePrueba={handleEnviarNotificacionDePrueba}
            />
          )}
        </div>
      </div>

      <Dialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
        confirmLabel="Confirmar"
      />
    </div>
  );
}

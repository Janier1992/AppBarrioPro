import React from "react";
import { Product, BusinessProfile } from "../types";
import { useSettings } from "../hooks/use-settings";
import { Settings as SettingsIcon } from "lucide-react";
import SettingsProfile from "./SettingsProfile";
import SettingsCatalog from "./SettingsCatalog";
import SettingsSecurity from "./SettingsSecurity";
import SettingsNotifications from "./SettingsNotifications";

interface SettingsProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
}

export default function Settings({ products, profile, userId }: SettingsProps) {
  const {
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
    theme,
    setTheme,
    logoUrl,
    setLogoUrl,
    geminiApiKey,
    setGeminiApiKey,
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
    handleToggleTheme,
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
        <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
          <SettingsIcon size={22} className="text-brand-muted" />
          Ajustes de Cuenta y Negocio
        </h2>
        <p className="text-xs text-brand-muted">Configura tu perfil, maneja tu catálogo de productos y gestiona la seguridad de tus datos.</p>
      </div>

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
              theme={theme}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              loadingProfile={loadingProfile}
              handleToggleTheme={handleToggleTheme}
              handleGuardarConfiguracionPerfil={handleGuardarConfiguracionPerfil}
            />
          )}

          {activeSection === "inventory" && (
            <SettingsCatalog
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
    </div>
  );
}

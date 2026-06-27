import React, { useState } from "react";
import { Product, BusinessProfile } from "../types";
import { db } from "../lib/insforge";
import { loadDemoDataToFirestore } from "../lib/demoData";
import { Settings as SettingsIcon, Plus, Trash2, Shield, RefreshCw, Layers, Edit3, ShoppingBag, Bell, CheckSquare, AlertTriangle, Download, Sun, Moon, Sparkles } from "lucide-react";
import { 
  retrieveStoredPreferences, 
  persistPreferences, 
  requestNotificationPermission, 
  triggerSystemNotification, 
  verifyNotificationSupport, 
  NotificationPreference 
} from "../lib/notifications";

interface SettingsProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
}

export default function Settings({ products, profile, userId }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<"profile" | "inventory" | "security" | "notifications">("profile");

  // Notification states
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => 
    verifyNotificationSupport() ? window.Notification.permission : "default"
  );
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference>(() => retrieveStoredPreferences());

  // Profile Form States
  const [businessName, setBusinessName] = useState(profile?.businessName || "Mi Negocio");
  const [address, setAddress] = useState(profile?.address || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [hours, setHours] = useState(profile?.hours || "08:00 - 20:00");
  const [lowStockThreshold, setLowStockThreshold] = useState(profile?.lowStockThreshold || 5);
  const [theme, setTheme] = useState<"light" | "dark">(profile?.theme || "light");
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || "");
  const [geminiApiKey, setGeminiApiKey] = useState(profile?.geminiApiKey || "");
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Sync state with profile prop
  React.useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName || "Mi Negocio");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setHours(profile.hours || "08:00 - 20:00");
      setLowStockThreshold(profile.lowStockThreshold || 5);
      setSecurityPin(profile.securityPin || "");
      setTheme(profile.theme || "light");
      setLogoUrl(profile.logoUrl || "");
      setGeminiApiKey(profile.geminiApiKey || "");
    }
  }, [profile]);

  const handleToggleTheme = async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      if (profile) {
        await db.saveProfile(userId, {
          ...profile,
          theme: nextTheme,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  // New Product Form States
  const [prodName, setProdName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Abarrotes");
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [price, setPrice] = useState(1.0);
  const [cost, setCost] = useState(0.6);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Security Form States
  const [securityPin, setSecurityPin] = useState(profile?.securityPin || "");
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // Demo loading state
  const [loadingDemo, setLoadingDemo] = useState(false);

  /**
   * @function handleGuardarConfiguracionPerfil
   * @description Almacena y actualiza la información principal de la tienda en Firestore.
   * Paso 1: Obtener la referencia de documento único en la subcolección de configuración de perfil.
   * Paso 2: Ejecutar actualización asíncrona de campos clave (nombre, dirección, horario, umbral).
   */
  const handleGuardarConfiguracionPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const updatedProfile: BusinessProfile = {
        id: profile?.id || "config",
        businessName,
        address,
        phone,
        email,
        hours,
        lowStockThreshold,
        umbralStockCritico: lowStockThreshold,
        securityPin: profile?.securityPin || "",
        theme,
        logoUrl,
        geminiApiKey,
        updatedAt: new Date().toISOString()
      };
      await db.saveProfile(userId, updatedProfile);
      alert("Configuración de perfil guardada con éxito.");
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  /**
   * @function handleRegistrarNuevoProducto
   * @description Registra un nuevo producto en el catálogo e inventario físico de BarrioPro.
   * Paso 1: Validar nombre no vacío.
   * Paso 2: Armar entidad Product con SKU personalizado o autogenerado.
   * Paso 3: Disparar inserción en Firestore e inicializar campos del formulario.
   */
  const handleRegistrarNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    setLoadingProduct(true);
    try {
      const newProd: Omit<Product, "id"> = {
        name: prodName.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        stock: Number(stock),
        minStock: Number(minStock),
        price: Number(price),
        cost: Number(cost),
        updatedAt: new Date().toISOString()
      };

      await db.addProduct(userId, newProd);
      
      // Reiniciar estado
      setProdName("");
      setSku("");
      setStock(10);
      setMinStock(5);
      setPrice(1.0);
      setCost(0.6);
      alert("Producto agregado al inventario.");
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoadingProduct(false);
    }
  };

  /**
   * @function handleGuardarPinDeSeguridad
   * @description Almacena un PIN confidencial de 4 dígitos para resguardar la caja registradora.
   * Paso 1: Localizar referencia del documento de perfil de tienda.
   * Paso 2: Actualizar el campo securityPin en Firestore con marcas temporales de auditoría.
   */
  const handleGuardarPinDeSeguridad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSecurity(true);
    try {
      if (profile) {
        await db.saveProfile(userId, {
          ...profile,
          securityPin,
          updatedAt: new Date().toISOString()
        });
      }
      alert("PIN de seguridad guardado.");
    } catch (error) {
      console.error("Error saving security PIN:", error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  /**
   * @function handleExportarExcel
   * @description Exporta la base de datos de productos actual a formato CSV compatible con Microsoft Excel.
   */
  const handleExportarExcel = () => {
    if (products.length === 0) {
      alert("No hay productos en el inventario para exportar.");
      return;
    }

    const headers = ["Nombre", "SKU", "Categoría", "Stock Actual", "Umbral Mínimo", "Precio Venta (COP)", "Costo (COP)", "Última Actualización"];
    const rows = products.map(p => [
      p.name,
      p.sku,
      p.category,
      p.stock,
      p.minStock,
      p.price,
      p.cost,
      p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("es-CO") : ""
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const text = String(val === undefined || val === null ? "" : val);
        if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_barriopro_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * @function handleCargarDatosDeDemostracion
   * @description Puebla la base de datos de manera ficticia con productos, transacciones y checklist de prueba.
   * Paso 1: Confirmar acción mediante diálogo de alerta.
   * Paso 2: Invocar generador de datos masivo por lotes.
   * Paso 3: Forzar recarga de navegador para instanciar las escuchas en tiempo real.
   */
  const handleCargarDatosDeDemostracion = async () => {
    if (!window.confirm("¿Estás seguro de que deseas cargar datos de demostración? Esto agregará productos, ventas históricas y checklists predefinidos a tu cuenta para que explores BarrioPro al instante.")) return;
    setLoadingDemo(true);
    try {
      await loadDemoDataToFirestore(userId);
      alert("¡Datos de demostración cargados exitosamente! Disfruta explorando la aplicación.");
      window.location.reload(); // Refresh to bind snapshots cleanly
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDemo(false);
    }
  };

  /**
   * @function handleEliminarProductoDeInventario
   * @description Remueve permanentemente un artículo de la base de datos.
   * Paso 1: Validar intencionalidad del usuario.
   * Paso 2: Invocar deleteDoc especificando la ruta exacta.
   */
  const handleEliminarProductoDeInventario = async (id: string) => {
    if (!window.confirm("¿Seguro de eliminar este producto del inventario?")) return;
    try {
      await db.deleteProduct(userId, id);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  /**
   * @function handleSolicitarPermisoNotificaciones
   * @description Solicita permisos de notificación al navegador web nativo.
   * Paso 1: Disparar petición de permisos asíncrona.
   * Paso 2: Actualizar estado de interfaz y emitir una alerta de prueba inicial si se concede.
   */
  const handleSolicitarPermisoNotificaciones = async () => {
    const perm = await requestNotificationPermission();
    setPermissionState(perm);
    if (perm === "granted") {
      triggerSystemNotification(
        "🔔 Notificaciones Habilitadas",
        "¡Excelente! BarrioPro te alertará cuando el stock esté bajo o tengas tareas del checklist pendientes."
      );
    } else if (perm === "denied") {
      alert("Permiso denegado. Para recibir notificaciones, por favor habilítalas manualmente en la configuración de tu navegador para este sitio.");
    }
  };

  /**
   * @function handleAlternarPreferenciaNotificaciones
   * @description Modifica y persiste una preferencia específica para notificaciones (ej: alertas de stock).
   * Paso 1: Replicar estado anterior invirtiendo el trigger booleano deseado.
   * Paso 2: Escribir cambios al localStorage del cliente de forma inmediata.
   */
  const handleAlternarPreferenciaNotificaciones = (key: keyof NotificationPreference) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key],
    };
    setNotifPrefs(updated);
    persistPreferences(updated);
  };

  /**
   * @function handleEnviarNotificacionDePrueba
   * @description Envía de forma inmediata una notificación push para certificar el soporte local.
   * Paso 1: Validar permiso de notificación otorgado.
   * Paso 2: Disparar payload de prueba del sistema.
   */
  const handleEnviarNotificacionDePrueba = () => {
    if (permissionState !== "granted") {
      alert("Por favor, solicita y concede permisos de notificación antes de enviar una prueba.");
      return;
    }
    triggerSystemNotification(
      "🚀 Prueba de BarrioPro",
      "Esta es una alerta de prueba. ¡El sistema de notificaciones en segundo plano está operando con éxito!"
    );
  };

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
            <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-6">
              <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3">Editar Información de la Tienda</h3>
              <form onSubmit={handleGuardarConfiguracionPerfil} className="space-y-4">
                {/* Logo del Negocio */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-brand-muted">Logo del Negocio</label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative group">
                        <img 
                          src={logoUrl} 
                          alt="Logo del negocio" 
                          className="h-20 w-20 rounded-2xl object-cover border border-brand-border bg-brand-bg shadow-xs" 
                        />
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                          title="Eliminar logo"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-brand-border flex items-center justify-center text-brand-muted bg-brand-bg shrink-0">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-file-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-text hover:bg-brand-bg transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus size={12} />
                        Cargar Imagen
                      </label>
                      <p className="text-[10px] text-brand-muted leading-relaxed">
                        Recomendado: Formatos JPG, PNG. Tamaño máximo 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Nombre Comercial del Negocio</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Horario de Atención</label>
                    <input
                      type="text"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Ej: 08:00 - 20:00"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Dirección Física del Local</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle Principal 123, Barrio El Prado"
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: +57 300 123 4567"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: negocio@correo.com"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Umbral de Stock Bajo General (Alerta)</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    min="1"
                  />
                </div>

                <div className="border-t border-brand-border pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="text-brand-primary animate-pulse" size={14} />
                    Configuración de Inteligencia Artificial (Gemini)
                  </h4>
                  <div className="p-4 border border-brand-border rounded-xl bg-slate-50/50 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-brand-text mb-1">Clave API de Gemini (API Key)</label>
                      <input
                        type="password"
                        placeholder="Ingresa tu clave de Google AI Studio (AI_KEY)"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-brand-muted leading-relaxed">
                      BarrioPro utiliza la Inteligencia Artificial de Gemini en modalidad multitenant. Cada comerciante puede ingresar su propia clave API obtenida gratuitamente desde Google AI Studio para que el asesor reciba las sugerencias e interactúe con el inventario de su negocio en tiempo real.
                    </p>
                  </div>
                </div>

                <div className="border-t border-brand-border pt-4">
                  <div className="flex items-center justify-between p-4 border border-brand-border rounded-xl bg-slate-50/50">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                        {theme === "light" ? (
                          <Sun size={14} className="text-amber-500 animate-pulse" />
                        ) : (
                          <Moon size={14} className="text-indigo-400" />
                        )}
                        <span>Tema de la Aplicación</span>
                      </p>
                      <p className="text-[11px] text-brand-muted leading-relaxed">
                        Elige entre el modo claro y el modo oscuro para BarrioPro. La preferencia se guardará en tu perfil.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-brand-muted">
                        {theme === "light" ? "Modo Claro" : "Modo Oscuro"}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleTheme}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${theme === "dark" ? "bg-brand-primary" : "bg-gray-200"}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingProfile}
                  className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loadingProfile ? <RefreshCw size={16} className="animate-spin" /> : "Guardar Perfil de Tienda"}
                </button>
              </form>
            </div>
          )}

          {activeSection === "inventory" && (
            <div className="space-y-6">
              {/* Export to Excel banner */}
              <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-brand-text">Exportar Inventario a Excel</h4>
                  <p className="text-xs text-brand-muted">Descarga una copia completa de tu catálogo de productos en formato CSV compatible con Microsoft Excel.</p>
                </div>
                <button
                  type="button"
                  onClick={handleExportarExcel}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <Download size={14} />
                  Exportar a Excel
                </button>
              </div>

              {/* Add product */}
              <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
                  <Plus size={18} className="text-brand-primary" />
                  Agregar Nuevo Producto al Catálogo
                </h3>

                <form onSubmit={handleRegistrarNuevoProducto} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-brand-muted mb-1">Nombre del Producto</label>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ej: Pan Tajado Grande"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden"
                    >
                      <option value="Abarrotes">Abarrotes</option>
                      <option value="Ferretería">Ferretería</option>
                      <option value="Droguería">Droguería</option>
                      <option value="Carnicería">Carnicería</option>
                      <option value="Legumbrería">Legumbrería</option>
                      <option value="Tienda Digital (Accesorios)">Tienda Digital (Accesorios)</option>
                      <option value="Papelería">Papelería</option>
                      <option value="Otros Comercios">Otros Comercios</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">SKU / Código</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Autogenerado"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Stock Actual</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={minStock}
                      onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Precio de Venta ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">Costo Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                      min="0"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loadingProduct}
                      className="w-full rounded-xl bg-brand-primary py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingProduct ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                      Registrar
                    </button>
                  </div>
                </form>
              </div>

              {/* List products */}
              <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
                  <Layers size={18} className="text-brand-primary" />
                  Inventario Registrado ({products.length})
                </h3>

                {products.length === 0 ? (
                  <div className="text-center py-8 text-brand-muted">
                    <ShoppingBag className="mx-auto mb-2 text-brand-border" size={32} />
                    <p className="text-xs">No hay productos registrados en tu base de datos todavía.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-brand-muted">
                      <thead>
                        <tr className="border-b border-brand-border text-brand-muted font-bold uppercase tracking-wider">
                          <th className="py-3 px-2">Producto</th>
                          <th className="py-3 px-2">Categoría</th>
                          <th className="py-3 px-2">SKU</th>
                          <th className="py-3 px-2 text-right">Stock</th>
                          <th className="py-3 px-2 text-right">Precio</th>
                          <th className="py-3 px-2 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-bg">
                        {products.map((p) => (
                          <tr key={p.id} className="hover:bg-brand-bg">
                            <td className="py-3 px-2 font-semibold text-brand-text">{p.name}</td>
                            <td className="py-3 px-2">{p.category}</td>
                            <td className="py-3 px-2 font-mono text-brand-muted">{p.sku}</td>
                            <td className="py-3 px-2 text-right">
                              <span className={`font-semibold ${p.minStock > 0 && p.stock < p.minStock ? 'text-brand-accent font-bold' : 'text-brand-text'}`}>
                                {p.stock}
                              </span>{" "}
                              / <span className="text-brand-muted">{p.minStock}</span>
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-brand-text">${p.price.toFixed(2)}</td>
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => handleEliminarProductoDeInventario(p.id!)}
                                className="text-brand-muted hover:text-rose-600 p-1 rounded-lg hover:bg-brand-bg cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              {/* Security PIN code config */}
              <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-brand-text text-sm border-b border-brand-border pb-3 flex items-center gap-2">
                  <Shield size={18} className="text-brand-primary" />
                  PIN de Acceso Local
                </h3>
                <p className="text-xs text-brand-muted">Configura un PIN numérico básico de 4 dígitos para proteger la privacidad de tu panel en caso de compartir el dispositivo con clientes.</p>

                <form onSubmit={handleGuardarPinDeSeguridad} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-medium text-brand-muted mb-1">PIN de Seguridad (4 dígitos)</label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Ej: 1234"
                      className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden font-mono tracking-widest text-center text-lg bg-white text-brand-text placeholder-brand-muted"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingSecurity}
                    className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingSecurity ? <RefreshCw size={16} className="animate-spin" /> : "Guardar PIN"}
                  </button>
                </form>
              </div>

              {/* Demo initial seeding */}
              <div className="rounded-2xl border border-brand-border bg-brand-bg p-6 shadow-xs space-y-3">
                <h3 className="font-bold text-brand-text text-sm">Cargar Datos de Demostración</h3>
                <p className="text-xs text-brand-muted leading-relaxed">
                  ¿Es tu primera vez usando BarrioPro? Carga al instante un catálogo completo de abarrotes de barrio, checklists preconfigurados, preparaciones del Modo Maleta, historial financiero del mes y un perfil comercial ficticio para ver cómo cobra vida el panel de control.
                </p>

                <button
                  type="button"
                  onClick={handleCargarDatosDeDemostracion}
                  disabled={loadingDemo}
                  className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold text-xs px-5 py-3 transition-all flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {loadingDemo ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    "¡Cargar Datos de Demostración Ahora!"
                  )}
                </button>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-brand-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
                    <Bell size={18} className="text-brand-primary" />
                    Notificaciones de Sistema y Alertas
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">Controla las alertas automáticas de inventario crítico y checklists pendientes en segundo plano.</p>
                </div>
              </div>

              {/* Status Alert Badge */}
              <div className="p-4 rounded-xl bg-brand-bg flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-brand-text">Estado de Permisos del Navegador</p>
                  <p className="text-[11px] text-brand-muted leading-relaxed">
                    {permissionState === "granted" 
                      ? "✅ Las notificaciones están autorizadas en este dispositivo. Las alertas se emitirán incluso si la pestaña está inactiva o en segundo plano." 
                      : permissionState === "denied" 
                      ? "❌ Permiso Denegado. Las notificaciones están bloqueadas. Debes restaurarlas manualmente desde la barra de direcciones de tu navegador." 
                      : "⚠️ El permiso de notificaciones aún no ha sido solicitado. Actívalas para recibir recordatorios en tiempo real."}
                  </p>
                </div>
                {permissionState !== "granted" && (
                  <button
                    onClick={handleSolicitarPermisoNotificaciones}
                    className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer shrink-0"
                  >
                    Permitir Notificaciones
                  </button>
                )}
              </div>

              {/* Preferences Toggles */}
              <div className="space-y-4">
                <h4 className="font-bold text-brand-text text-xs tracking-wider uppercase">Triggers de Alerta Personalizables</h4>
                
                {/* 1. Low stock toggle */}
                <div className="flex items-start justify-between p-4 border border-brand-border rounded-xl">
                  <div className="space-y-1 max-w-md">
                    <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-500" />
                      Alertas de Stock Mínimo y Crítico
                    </p>
                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      Envía una notificación emergente instantánea cuando la cantidad de algún producto caiga a su nivel mínimo de seguridad o quede en cero.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAlternarPreferenciaNotificaciones("enableStockAlerts")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${notifPrefs.enableStockAlerts ? "bg-brand-primary" : "bg-gray-200"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.enableStockAlerts ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {/* 2. Checklist pending tasks toggle */}
                <div className="flex items-start justify-between p-4 border border-brand-border rounded-xl">
                  <div className="space-y-1 max-w-md">
                    <p className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-brand-primary" />
                      Recordatorios de Checklist Diario
                    </p>
                    <p className="text-[11px] text-brand-muted leading-relaxed">
                      Recibe recordatorios inteligentes de manera periódica si dejas tareas sin finalizar durante tus jornadas laborales del día.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAlternarPreferenciaNotificaciones("enableChecklistAlerts")}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${notifPrefs.enableChecklistAlerts ? "bg-brand-primary" : "bg-gray-200"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.enableChecklistAlerts ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>

              {/* Testing suite */}
              <div className="p-5 border border-dashed border-brand-border rounded-xl space-y-3 bg-brand-bg/40">
                <p className="text-xs font-bold text-brand-text">🛠️ Diagnóstico de Notificaciones</p>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Utiliza este panel para enviar un mensaje simulado. Minimiza la aplicación o cambia de pestaña inmediatamente después de presionar el botón de prueba para experimentar cómo se recibe en segundo plano en tu sistema operativo.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEnviarNotificacionDePrueba}
                    className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Bell size={14} />
                    Enviar Notificación de Prueba
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

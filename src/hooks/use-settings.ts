import React, { useState, useEffect } from "react";
import { Product, BusinessProfile } from "../types";
import { db } from "../lib/insforge";
import { loadDemoDataToFirestore } from "../lib/demoData";
import { 
  retrieveStoredPreferences, 
  persistPreferences, 
  requestNotificationPermission, 
  triggerSystemNotification, 
  verifyNotificationSupport, 
  NotificationPreference 
} from "../lib/notifications";

interface UseSettingsProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
}

export function useSettings({ products, profile, userId }: UseSettingsProps) {
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

  // Sync state with profile prop
  useEffect(() => {
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

  const handleCargarDatosDeDemostracion = async () => {
    if (!window.confirm("¿Estás seguro de que deseas cargar datos de demostración? Esto agregará productos, ventas históricas y checklists predefinidos a tu cuenta para que explores BarrioPro al instante.")) return;
    setLoadingDemo(true);
    try {
      await loadDemoDataToFirestore(userId);
      alert("¡Datos de demostración cargados exitosamente! Disfruta explorando la aplicación.");
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleEliminarProductoDeInventario = async (id: string) => {
    if (!window.confirm("¿Seguro de eliminar este producto del inventario?")) return;
    try {
      await db.deleteProduct(userId, id);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

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

  const handleAlternarPreferenciaNotificaciones = (key: keyof NotificationPreference) => {
    const updated = {
      ...notifPrefs,
      [key]: !notifPrefs[key],
    };
    setNotifPrefs(updated);
    persistPreferences(updated);
  };

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

  return {
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
  };
}

// ======================================================
// Archivo: insforge.ts
// Responsabilidad: Gestor centralizado de base de datos y autenticación
// Módulo: Capa de Datos (Data Layer)
// Descripción: Define y expone los métodos para interactuar con el SDK de InsForge,
//              proporcionando mecanismos de respaldo offline mediante localStorage.
// Dependencias: @insforge/sdk, types.ts
// Observaciones: Mantiene compatibilidad de firmas con flujos previos.
// ======================================================

import { createClient } from "@insforge/sdk";
import insforgeConfig from "../../insforge-applet-config.json";
import { Product, Sale, Task, Debt, BusinessProfile } from "../types";

// Resolución de credenciales buscando primero las variables de entorno de Vite
const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || insforgeConfig.baseUrl;
const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY || insforgeConfig.anonKey;

// Inicialización del cliente de InsForge de forma segura
let insforgeClient: ReturnType<typeof createClient> | null = null;
try {
  if (INSFORGE_URL && INSFORGE_ANON_KEY) {
    // Se elimina cualquier barra inclinada al final de la URL para evitar problemas de enrutamiento
    const cleanUrl = INSFORGE_URL.replace(/\/+$/, "");
    insforgeClient = createClient({
      baseUrl: cleanUrl,
      anonKey: INSFORGE_ANON_KEY
    });
  }
} catch (error) {
  console.error("No se pudo inicializar el cliente de InsForge:", error);
}

// Exportación del cliente de InsForge
export const insforge = insforgeClient;

// Estructuras de datos para el flujo de sesión y usuarios
export interface MockUser {
  uid: string;
  displayName: string;
  email: string;
}

export interface InsForgeUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    [key: string]: unknown;
  };
}

export interface InsForgeSession {
  user?: InsForgeUser;
}

export interface InsForgeAuthResponse {
  data?: {
    session?: InsForgeSession;
    user?: InsForgeUser;
    subscription?: {
      unsubscribe: () => void;
    };
  };
  error?: unknown;
}

// Lista de suscriptores para notificar cambios en el estado de autenticación (Patrón Observer)
const authListeners = new Set<(user: MockUser | null) => void>();

// Control de suscripción activa a eventos en tiempo real
let isAuthSubscribed = false;

// Suscripción al listener en tiempo real de cambios en el estado de sesión de InsForge
function setupAuthSubscription(): void {
  if (isAuthSubscribed || !insforge || !isInsForgeConfigured()) return;
  isAuthSubscribed = true;
  try {
    insforge.auth.onAuthStateChange((_event: string, session: InsForgeSession | null) => {
      const user = session?.user;
      if (user) {
        const userObj: MockUser = {
          uid: user.id,
          displayName: user.user_metadata?.name || user.email || "Tendero",
          email: user.email || ""
        };
        auth.currentUser = userObj;
        localStorage.setItem("barriopro_user", JSON.stringify(userObj));
        localStorage.removeItem("barriopro_explicit_signout");
        authListeners.forEach(cb => cb(userObj));
      } else {
        auth.currentUser = null;
        localStorage.removeItem("barriopro_user");
        authListeners.forEach(cb => cb(null));
      }
    });
  } catch (error) {
    console.warn("Error al suscribirse a los cambios de sesión de InsForge:", error);
  }
}

// Envoltura de Autenticación que expone las firmas requeridas por la aplicación
export const auth = {
  currentUser: null as MockUser | null,
  
  onAuthStateChanged: (callback: (user: MockUser | null) => void) => {
    authListeners.add(callback);
    
    const defaultUser: MockUser = {
      uid: "dev-user-id-01",
      displayName: "Tendero BarrioPro",
      email: "tendero@barriopro.com"
    };

    const isConfigured = isInsForgeConfigured();
    const savedUser = localStorage.getItem("barriopro_user");
    const isExplicitSignOut = localStorage.getItem("barriopro_explicit_signout") === "true";
    let currentUser: MockUser | null = null;

    // 1. Carga de sesión inicial local para evitar demoras visuales
    if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
      try {
        currentUser = JSON.parse(savedUser) as MockUser;
      } catch (error) {
        console.warn("Error al procesar el usuario guardado:", error);
        localStorage.removeItem("barriopro_user");
      }
    }

    if (!isConfigured && !isExplicitSignOut && !currentUser) {
      currentUser = defaultUser;
    }
    
    auth.currentUser = currentUser;
    callback(currentUser);

    // 2. Verificación de sesión en el servidor y enlace en tiempo real si está configurado
    if (insforge && isConfigured) {
      setupAuthSubscription();
      
      // Consulta al servidor de autenticación para asegurar la vigencia de la sesión
      insforge.auth.getCurrentUser()
        .then((response: unknown) => {
          const authResponse = response as InsForgeAuthResponse;
          const user = authResponse.data?.user;
          if (user) {
            const userObj: MockUser = {
              uid: user.id,
              displayName: user.user_metadata?.name || user.email || "Tendero",
              email: user.email || ""
            };
            auth.currentUser = userObj;
            localStorage.setItem("barriopro_user", JSON.stringify(userObj));
            localStorage.removeItem("barriopro_explicit_signout");
            callback(userObj);
          } else {
            // Limpia sesión si el servidor reporta que ya no está autenticado
            auth.currentUser = null;
            localStorage.removeItem("barriopro_user");
            callback(null);
          }
        })
        .catch((error: unknown) => {
          console.warn("No se pudo validar el usuario en el servidor de InsForge:", error);
          auth.currentUser = null;
          localStorage.removeItem("barriopro_user");
          callback(null);
        });
    }

    return () => {
      authListeners.delete(callback);
    };
  },

  signInWithGoogle: async () => {
    localStorage.removeItem("barriopro_explicit_signout");
    if (insforge) {
      try {
        await insforge.auth.signInWithOAuth("google");
        return;
      } catch (e) {
        console.error("signInWithGoogle via InsForge failed, falling back to local login", e);
      }
    }
    
    // Local fallback login
    const mock: MockUser = {
      uid: "dev-user-id-01",
      displayName: "Tendero BarrioPro",
      email: "tendero@barriopro.com"
    };
    auth.currentUser = mock;
    localStorage.setItem("barriopro_user", JSON.stringify(mock));
    window.location.reload();
  },

  signInWithPassword: async (email: string, password: string) => {
    localStorage.removeItem("barriopro_explicit_signout");
    if (insforge) {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Actively update session user and notify listeners
      const user = data?.session?.user || data?.user;
      if (user) {
        const userObj: MockUser = {
          uid: user.id,
          displayName: user.user_metadata?.name || user.email || "Tendero",
          email: user.email || ""
        };
        auth.currentUser = userObj;
        localStorage.setItem("barriopro_user", JSON.stringify(userObj));
        authListeners.forEach(cb => cb(userObj));
      }
      return data;
    }
    
    // Local fallback login
    const mock: MockUser = {
      uid: "dev-user-id-01",
      displayName: email.split("@")[0],
      email: email
    };
    auth.currentUser = mock;
    localStorage.setItem("barriopro_user", JSON.stringify(mock));
    window.location.reload();
  },

  signUp: async (email: string, password: string, name?: string) => {
    if (insforge) {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        options: {
          data: name ? { name } : undefined
        }
      });
      if (error) throw error;
      return data;
    }
    
    // Local fallback login
    const mock: MockUser = {
      uid: "dev-user-id-01",
      displayName: name || email.split("@")[0],
      email: email
    };
    auth.currentUser = mock;
    localStorage.setItem("barriopro_user", JSON.stringify(mock));
    window.location.reload();
  },

  signOut: async () => {
    localStorage.setItem("barriopro_explicit_signout", "true");
    localStorage.removeItem("barriopro_user");
    auth.currentUser = null;

    if (insforge) {
      try {
        await insforge.auth.signOut();
      } catch (e) {
        console.warn("signOut via InsForge failed, clearing local session", e);
      }
    }
    authListeners.forEach(cb => cb(null));
    window.location.reload();
  }
};

// Database operation codes for logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleDatabaseError(error: unknown, op: OperationType, path: string) {
  console.error(`InsForge Database Error during ${op} on ${path}:`, error);
  throw new Error(error instanceof Error ? error.message : String(error));
}

// Reactivity Subscribers
type Callback = () => void;
const subscribers = new Set<Callback>();

export function subscribeToData(callback: Callback) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

// Helper to check if InsForge is configured
function isInsForgeConfigured(): boolean {
  return !!insforge && 
         typeof INSFORGE_URL === "string" && INSFORGE_URL !== "" && 
         typeof INSFORGE_ANON_KEY === "string" && !INSFORGE_ANON_KEY.includes("your-anon-key");
}

// Database Service Layer
export const db = {
  // 1. PROFILE
  getProfile: async (userId: string): Promise<BusinessProfile | null> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge.database
          .from("profile")
          .select("*")
          .eq("userId", userId)
          .single();
        if (!error && data) return data as BusinessProfile;
      } catch (e) {
        console.warn("Profile fetch failed, using local profile:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_profile_${userId}`);
    return local ? JSON.parse(local) : null;
  },

  saveProfile: async (userId: string, profile: BusinessProfile): Promise<void> => {
    // Make sure profile contains a non-null id matching its schema constraint
    const profileWithId = {
      ...profile,
      id: profile.id || `prof_${userId}`,
      userId
    };

    // Write locally
    localStorage.setItem(`barriopro_profile_${userId}`, JSON.stringify(profileWithId));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("profile")
          .upsert(profileWithId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to save profile to InsForge:", e);
      }
    }
  },

  // 2. PRODUCTS
  getProducts: async (userId: string): Promise<Product[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge.database
          .from("products")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Product[];
      } catch (e) {
        console.warn("Products fetch failed, using local products:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  saveProductsList: (userId: string, products: Product[]) => {
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(products));
    notifySubscribers();
  },

  addProduct: async (userId: string, product: Omit<Product, "id">): Promise<string> => {
    const id = `prod_${Math.random().toString(36).substring(2, 9)}`;
    const newProduct: Product = { ...product, id };

    // Update locally
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    const list: Product[] = local ? JSON.parse(local) : [];
    list.push(newProduct);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("products")
          .insert({ ...newProduct, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add product to InsForge:", e);
      }
    }
    return id;
  },

  updateProduct: async (userId: string, productId: string, updates: Partial<Product>): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    let list: Product[] = local ? JSON.parse(local) : [];
    list = list.map(p => p.id === productId ? { ...p, ...updates } : p);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("products")
          .update(updates)
          .eq("id", productId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update product in InsForge:", e);
      }
    }
  },

  deleteProduct: async (userId: string, productId: string): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    let list: Product[] = local ? JSON.parse(local) : [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("products")
          .delete()
          .eq("id", productId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete product from InsForge:", e);
      }
    }
  },

  // 3. SALES
  getSales: async (userId: string): Promise<Sale[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge.database
          .from("sales")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Sale[];
      } catch (e) {
        console.warn("Sales fetch failed, using local sales:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  saveSalesList: (userId: string, sales: Sale[]) => {
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(sales));
    notifySubscribers();
  },

  addSale: async (userId: string, sale: Omit<Sale, "id">): Promise<string> => {
    const id = `sale_${Math.random().toString(36).substring(2, 9)}`;
    const newSale: Sale = { ...sale, id };

    // Update locally
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    list.push(newSale);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("sales")
          .insert({ ...newSale, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add sale to InsForge:", e);
      }
    }
    return id;
  },

  deleteSale: async (userId: string, id: string): Promise<void> => {
    // Actualización local
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(filtered));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("sales")
          .delete()
          .eq("id", id)
          .eq("userId", userId);
        if (error) throw error;
      } catch (error) {
        console.error("Error al eliminar la venta de InsForge:", error);
      }
    }
  },

  updateSale: async (userId: string, id: string, sale: Partial<Sale>): Promise<void> => {
    // Actualización local
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    const updated = list.map(s => s.id === id ? { ...s, ...sale } : s);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(updated));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("sales")
          .update(sale)
          .eq("id", id)
          .eq("userId", userId);
        if (error) throw error;
      } catch (error) {
        console.error("Error al actualizar la venta en InsForge:", error);
      }
    }
  },

  // 4. TASKS (CHECKLIST)
  getTasks: async (userId: string): Promise<Task[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge.database
          .from("tasks")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Task[];
      } catch (e) {
        console.warn("Tasks fetch failed, using local tasks:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  saveTasksList: (userId: string, tasks: Task[]) => {
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(tasks));
    notifySubscribers();
  },

  addTask: async (userId: string, task: Omit<Task, "id">): Promise<string> => {
    const id = `task_${Math.random().toString(36).substring(2, 9)}`;
    const newTask: Task = { ...task, id };

    // Update locally
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    const list: Task[] = local ? JSON.parse(local) : [];
    list.push(newTask);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("tasks")
          .insert({ ...newTask, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add task to InsForge:", e);
      }
    }
    return id;
  },

  updateTask: async (userId: string, taskId: string, updates: Partial<Task>): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    let list: Task[] = local ? JSON.parse(local) : [];
    list = list.map(t => t.id === taskId ? { ...t, ...updates } : t);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("tasks")
          .update(updates)
          .eq("id", taskId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update task in InsForge:", e);
      }
    }
  },

  deleteTask: async (userId: string, taskId: string): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    let list: Task[] = local ? JSON.parse(local) : [];
    list = list.filter(t => t.id !== taskId);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("tasks")
          .delete()
          .eq("id", taskId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete task from InsForge:", e);
      }
    }
  },

  // 5. DEBTS
  getDebts: async (userId: string): Promise<Debt[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge.database
          .from("debts")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Debt[];
      } catch (e) {
        console.warn("Debts fetch failed, using local debts:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  saveDebtsList: (userId: string, debts: Debt[]) => {
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(debts));
    notifySubscribers();
  },

  addDebt: async (userId: string, debt: Omit<Debt, "id">): Promise<string> => {
    const id = `debt_${Math.random().toString(36).substring(2, 9)}`;
    const newDebt: Debt = { ...debt, id };

    // Update locally
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    const list: Debt[] = local ? JSON.parse(local) : [];
    list.push(newDebt);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("debts")
          .insert({ ...newDebt, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add debt to InsForge:", e);
      }
    }
    return id;
  },

  updateDebt: async (userId: string, debtId: string, updates: Partial<Debt>): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    let list: Debt[] = local ? JSON.parse(local) : [];
    list = list.map(d => d.id === debtId ? { ...d, ...updates } : d);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("debts")
          .update(updates)
          .eq("id", debtId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update debt in InsForge:", e);
      }
    }
  },

  deleteDebt: async (userId: string, debtId: string): Promise<void> => {
    // Update locally
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    let list: Debt[] = local ? JSON.parse(local) : [];
    list = list.filter(d => d.id !== debtId);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    notifySubscribers();

    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge.database
          .from("debts")
          .delete()
          .eq("id", debtId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete debt from InsForge:", e);
      }
    }
  }
};

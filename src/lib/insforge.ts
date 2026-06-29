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
    (insforge.auth as any).onAuthStateChange((_event: string, session: InsForgeSession | null) => {
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

    if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
      try {
        currentUser = JSON.parse(savedUser) as MockUser;
      } catch (error) {
        console.warn("Error al procesar el usuario guardado:", error);
        localStorage.removeItem("barriopro_user");
      }
    }

    if (!isConfigured && !isExplicitSignOut && !currentUser && !import.meta.env.PROD) {
      currentUser = defaultUser;
    }
    
    auth.currentUser = currentUser;
    callback(currentUser);

    if (insforge && isConfigured) {
      setupAuthSubscription();
      
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
        await (insforge.auth as any).signInWithOAuth("google");
        return;
      } catch (e) {
        console.error("signInWithGoogle via InsForge failed, falling back to local login", e);
      }
    }
    
    if (import.meta.env.PROD) throw new Error("InsForge no está configurado.");
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

      const user = (data as any)?.session?.user || data?.user;
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
    
    if (import.meta.env.PROD) throw new Error("InsForge no está configurado.");
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
        name,
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined
      });
      if (error) throw error;
      return data;
    }
    
    if (import.meta.env.PROD) throw new Error("InsForge no está configurado.");
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
export function isInsForgeConfigured(): boolean {
  return !!insforge && 
         typeof INSFORGE_URL === "string" && INSFORGE_URL !== "" && 
         typeof INSFORGE_ANON_KEY === "string" && !INSFORGE_ANON_KEY.includes("your-anon-key");
}

// Re-export db service layer
export { db } from "./db";

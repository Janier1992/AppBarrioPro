// ======================================================
// Archivo: src/types.ts
// Responsabilidad: Modelos de datos del negocio (producto, venta, tarea, fiado y perfil) compartidos por toda la
//   app.
// ======================================================

export interface Product {
  id?: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id?: string;
  items: SaleItem[];
  total: number;
  timestamp: string;
  clientId?: string;
  clientName?: string;
  paymentMethod?: "Efectivo" | "Tarjeta" | "Transferencia" | "Fiado";
}

export interface Task {
  id?: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface BusinessProfile {
  id?: string;
  businessName: string;
  address: string;
  phone?: string;
  email?: string;
  hours: string;
  lowStockThreshold: number;
  umbralStockCritico?: number;
  securityPin: string;
  theme?: "light" | "dark";
  hasCompletedOnboarding?: boolean;
  logoUrl?: string;
  updatedAt: string;
}

export interface Debt {
  id?: string;
  clientName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paid: boolean;
  createdAt: string;
  paidAt?: string;
}



// ---- Tipos de apoyo para pantallas (gráficos y PWA) ----

/** Un día en el gráfico de ventas de los últimos 7 días (pantalla "Hoy"). */
export interface PuntoVentasDia {
  date: string;
  monto: number;
  ventas: number;
}

/** Un día del mes en el gráfico mensual. */
export interface PuntoVentasMes {
  day: number;
  monto: number;
  ventas: number;
}

/** Producto más vendido (nombre y unidades). */
export interface ProductoPopular {
  name: string;
  count: number;
}

/** Un día de la semana en el historial de ventas. */
export interface PuntoVentasSemana {
  name: string;
  "Total Ventas": number;
  Transacciones: number;
}

/** Evento `beforeinstallprompt` del navegador (aún no está en los tipos estándar de TypeScript). */
export interface EventoInstalacionPwa extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

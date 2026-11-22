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



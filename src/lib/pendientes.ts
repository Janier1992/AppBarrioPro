// ======================================================
// Archivo: pendientes.ts
// Responsabilidad: Unir en una sola lista "Para hoy" lo que antes vivía en tres
//   secciones (stock crítico, fiados por cobrar y tareas), ordenado por urgencia.
// Sin dependencias de React ni de red: se prueba de forma aislada (pendientes.test.ts).
// ======================================================

import { Debt, Product, Task } from "../types";
import { isCriticalStock } from "./stock";
import { formatMoney } from "./format";

type PendienteKind = "debt" | "stock" | "task";

export interface Pendiente {
  /** Identificador estable para usar como `key` y para actuar sobre el elemento original. */
  id: string;
  kind: PendienteKind;
  title: string;
  detail: string;
  /** Texto del botón de acción ("Cobrar", "Pedir", "Listo"). */
  action: string;
  /** Verdadero para lo que no debería esperar (fiado vencido, producto casi agotado). */
  urgent: boolean;
}

interface BuildOptions {
  products: Product[];
  debts: Debt[];
  tasks: Task[];
  /** Cuántos pendientes mostrar como máximo (por defecto 5). */
  limit?: number;
  /** Fecha de referencia; inyectable para pruebas. */
  today?: Date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Orden de prioridad: fiados vencidos → productos que se acaban → fiados por vencer → tareas.
 * Un tendero necesita primero cobrar y no quedarse sin mercancía; las rutinas van al final.
 */
export function buildPendientes({ products, debts, tasks, limit = 5, today = new Date() }: BuildOptions): Pendiente[] {
  const todayStart = startOfDay(today);

  const pendingDebts = debts
    .filter((d) => !d.paid && d.id)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const toDebt = (d: Debt): Pendiente => {
    const overdue = new Date(d.dueDate).getTime() < todayStart;
    return {
      id: `debt:${d.id}`,
      kind: "debt",
      title: `Cobrar a ${d.clientName}`,
      detail: overdue ? `Te debe ${formatMoney(d.amount)} · vencido` : `Te debe ${formatMoney(d.amount)}`,
      action: "Cobrar",
      urgent: overdue,
    };
  };

  const overdueDebts = pendingDebts.filter((d) => new Date(d.dueDate).getTime() < todayStart).map(toDebt);
  const upcomingDebts = pendingDebts.filter((d) => new Date(d.dueDate).getTime() >= todayStart).map(toDebt);

  // Lo más agotado primero: menor proporción stock/mínimo.
  const stockItems: Pendiente[] = products
    .filter((p) => p.id && isCriticalStock(p))
    .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1))
    .map((p) => ({
      id: `stock:${p.id}`,
      kind: "stock",
      title: `Reponer ${p.name}`,
      detail: `Quedan ${p.stock} · mínimo ${p.minStock}`,
      action: "Pedir",
      urgent: true,
    }));

  const taskItems: Pendiente[] = tasks
    .filter((t) => !t.completed && t.id)
    .map((t) => ({
      id: `task:${t.id}`,
      kind: "task",
      title: t.text,
      detail: "Pendiente de hoy",
      action: "Listo",
      urgent: false,
    }));

  return [...overdueDebts, ...stockItems, ...upcomingDebts, ...taskItems].slice(0, limit);
}

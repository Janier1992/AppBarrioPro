// ======================================================
// Archivo: navigation.ts
// Responsabilidad: Destinos de la aplicación. Los identificadores se conservan
//   (dashboard, sales, inventory, debts, checklist, settings) para no tocar el estado
//   ni los hooks; solo cambia cómo se presentan: Hoy, Vender, Productos, Fiados…
// ======================================================

export type AppTab = "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings";

/** Los cuatro destinos del uso diario (barra inferior en móvil, menú lateral en escritorio). */
export const MAIN_TABS: ReadonlyArray<{ id: AppTab; label: string }> = [
  { id: "dashboard", label: "Hoy" },
  { id: "inventory", label: "Productos" },
  { id: "sales", label: "Vender" },
  { id: "debts", label: "Fiados" },
];

/** Destinos que viven dentro del menú "Más". */
export const MORE_TABS: ReadonlyArray<AppTab> = ["checklist", "settings"];

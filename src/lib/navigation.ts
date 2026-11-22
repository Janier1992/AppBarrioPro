// ======================================================
// Archivo: navigation.ts
// Responsabilidad: Destinos de la aplicación. Los identificadores se conservan
//   (dashboard, sales, inventory, debts, checklist, settings) para no tocar el estado
//   ni los hooks; solo cambia cómo se presentan: Hoy, Vender, Productos, Fiados…
// ======================================================

export type AppTab = "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings" | "support";

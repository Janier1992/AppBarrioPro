// ======================================================
// Archivo: brand.ts
// Responsabilidad: Fuente única de verdad de la marca visible de la aplicación.
// Importante: las claves internas de localStorage conservan el prefijo histórico
//   "barriopro_" a propósito. Renombrarlas haría que los usuarios existentes
//   perdieran su PIN, su sesión y su caché offline. NO las cambies sin escribir
//   antes una migración que copie los datos de las claves viejas a las nuevas.
// ======================================================

export const APP_NAME = "Tiendly";

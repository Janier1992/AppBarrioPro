// ======================================================
// Archivo: businessTypes.ts
// Responsabilidad: Tipos de negocio de barrio que Tiendly atiende y lo que cambia para cada uno:
//   categorías sugeridas para el catálogo y tareas sugeridas de apertura/cierre.
// Diseño: sin pantallas ni campos nuevos en la base de datos. El tipo se guarda en este
//   dispositivo (localStorage) y solo afecta a SUGERENCIAS; el tendero puede escribir cualquier
//   categoría. Así la app sigue siendo igual de simple para todos los negocios.
// ======================================================

export interface BusinessType {
  id: string;
  label: string;
  /** Categorías sugeridas para el catálogo de este tipo de negocio. */
  categories: string[];
  /** Tareas sugeridas de apertura, operación y cierre. */
  tasks: string[];
}

export const BUSINESS_TYPES: ReadonlyArray<BusinessType> = [
  {
    id: "tienda",
    label: "Tienda de barrio",
    categories: ["Abarrotes", "Lácteos", "Bebidas", "Aseo", "Snacks", "Carnes y embutidos", "Frutas y verduras"],
    tasks: ["Abrir caja y contar el efectivo", "Revisar productos próximos a vencer", "Reponer bebidas y neveras", "Cuadrar la caja al cierre"],
  },
  {
    id: "panaderia",
    label: "Panadería o pastelería",
    categories: ["Pan", "Pasteles y tortas", "Galletas", "Bebidas", "Lácteos", "Insumos"],
    tasks: ["Encender hornos y vitrinas", "Contar el pan del día anterior", "Registrar lo que se produjo hoy", "Cuadrar la caja al cierre"],
  },
  {
    id: "fruver",
    label: "Fruver o verdulería",
    categories: ["Frutas", "Verduras", "Hortalizas", "Tubérculos", "Hierbas y condimentos", "Huevos"],
    tasks: ["Recibir y revisar el surtido", "Retirar producto en mal estado", "Actualizar precios del día", "Cuadrar la caja al cierre"],
  },
  {
    id: "ferreteria",
    label: "Ferretería",
    categories: ["Herramientas", "Tornillería", "Eléctricos", "Plomería", "Pinturas", "Construcción"],
    tasks: ["Abrir caja y contar el efectivo", "Revisar herramientas prestadas", "Hacer pedido de lo que se acaba", "Cuadrar la caja al cierre"],
  },
  {
    id: "papeleria",
    label: "Papelería",
    categories: ["Cuadernos", "Útiles escolares", "Oficina", "Impresión y copias", "Regalos", "Tecnología"],
    tasks: ["Abrir caja y revisar la fotocopiadora", "Reponer cuadernos y útiles", "Registrar copias e impresiones", "Cuadrar la caja al cierre"],
  },
  {
    id: "drogueria",
    label: "Droguería o botica",
    categories: ["Medicamentos", "Cuidado personal", "Vitaminas", "Bebés", "Primeros auxilios", "Aseo"],
    tasks: ["Revisar fechas de vencimiento", "Verificar el control de medicamentos", "Hacer pedido de lo que se acaba", "Cuadrar la caja al cierre"],
  },
  {
    id: "otro",
    label: "Otro negocio",
    categories: ["General"],
    tasks: ["Abrir caja y contar el efectivo", "Revisar lo que se está acabando", "Cuadrar la caja al cierre"],
  },
];

const STORAGE_PREFIX = "tiendly_business_type_";

export function getBusinessType(id: string | null | undefined): BusinessType | undefined {
  return BUSINESS_TYPES.find((t) => t.id === id);
}

/** Lee el tipo de negocio elegido en este dispositivo para este usuario (o undefined si no eligió). */
export function loadBusinessType(userId: string): BusinessType | undefined {
  try {
    return getBusinessType(localStorage.getItem(STORAGE_PREFIX + userId));
  } catch {
    return undefined;
  }
}

export function saveBusinessType(userId: string, id: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, id);
  } catch {
    // Sin almacenamiento disponible (modo privado): la elección solo dura la sesión.
  }
}

/** Quita acentos y pasa a minúsculas para comparar categorías ("Droguería" = "drogueria"). */
function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/**
 * Categorías para mostrar: las del tipo de negocio elegido + las que ya usan los productos
 * del tendero (así una categoría importada desde Excel nunca desaparece). Sin duplicados
 * (ignora mayúsculas y acentos), conservando la primera escritura.
 */
export function mergeCategories(suggested: string[], productCategories: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [...productCategories, ...suggested]) {
    const name = (raw || "").trim();
    if (!name) continue;
    const key = fold(name);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result.sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Normaliza la categoría de una fila importada: si coincide (sin acentos/mayúsculas) con una
 * conocida usa la forma conocida; si no, CONSERVA lo que escribió el tendero. Vacío → "General".
 */
export function normalizeCategory(raw: unknown, known: string[]): string {
  const text = String(raw ?? "").trim();
  if (!text) return "General";
  const match = known.find((c) => fold(c) === fold(text));
  return match ?? text.charAt(0).toUpperCase() + text.slice(1);
}

/** Categorías para mostrar a este usuario: sugeridas por su tipo de negocio + las de sus productos. */
export function categoryOptions(userId: string, productCategories: Array<string | undefined>): string[] {
  const type = loadBusinessType(userId) ?? BUSINESS_TYPES[0];
  return mergeCategories(type.categories, productCategories);
}

/** Categoría por defecto de un producto nuevo. */
export function defaultCategory(userId: string): string {
  return (loadBusinessType(userId) ?? BUSINESS_TYPES[0]).categories[0] ?? "General";
}

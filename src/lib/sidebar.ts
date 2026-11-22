/** Preferencia del menú lateral de escritorio (expandido con nombres o compacto solo con iconos). */
const KEY = "tiendly_sidebar_collapsed";

export function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(KEY, String(collapsed));
  } catch {
    /* sin almacenamiento: la preferencia solo dura la sesión */
  }
}

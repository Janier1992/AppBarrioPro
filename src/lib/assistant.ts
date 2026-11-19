// ======================================================
// Archivo: assistant.ts
// Responsabilidad: Abrir el asistente de IA desde cualquier pantalla sin pasar
//   props por toda la jerarquía (la caja "Pregúntale a Tiendly" de Inicio, el menú "Más", etc.).
// ======================================================

export const OPEN_ASSISTANT_EVENT = "tiendly:open-assistant";

export function openAssistant(): void {
  window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
}

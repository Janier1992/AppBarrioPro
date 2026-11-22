// ======================================================
// Archivo: toast.ts
// Responsabilidad: Store mínimo de avisos (éxito/error/info) visibles en
//                   toda la app, para reemplazar los console.error
//                   silenciosos y los alert()/confirm() nativos del
//                   navegador que se repetían en cada módulo.
// ======================================================

type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((cb) => cb(toasts));
}

export function subscribeToToasts(callback: Listener): () => void {
  listeners.add(callback);
  callback(toasts);
  return () => listeners.delete(callback);
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function showToast(message: string, type: ToastType = "info", durationMs = 5000): void {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  toasts = [...toasts, { id, type, message }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
}

export const showSuccessToast = (message: string) => showToast(message, "success");
export const showErrorToast = (message: string) => showToast(message, "error", 7000);

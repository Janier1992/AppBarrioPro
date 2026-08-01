import { useState } from "react";

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface AlertDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "info" | "success" | "warning";
}

/**
 * Diálogos de confirmación/alerta propios de la app, para no depender de
 * los confirm()/alert() nativos del navegador (inconsistentes visualmente
 * y bloqueantes). Mismo patrón usado originalmente solo en Inventario,
 * ahora compartido por Checklist, Deudas y Ventas.
 */
export function useDialogs() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [alertDialog, setAlertDialog] = useState<AlertDialogState | null>(null);

  const confirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const alert = (title: string, message: string, type: AlertDialogState["type"] = "info") => {
    setAlertDialog({ isOpen: true, title, message, type });
  };

  return { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, confirm, alert };
}

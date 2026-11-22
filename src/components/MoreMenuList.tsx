import React from "react";
import { LifeBuoy, ListChecks, SlidersHorizontal, Sparkles, Moon, Sun, Lock, LogOut } from "lucide-react";
import { BusinessProfile } from "../types";
import { openAssistant } from "../lib/assistant";
import type { AppTab } from "../lib/navigation";

interface MoreMenuListProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  profile: BusinessProfile | null;
  setIsLocked: (val: boolean) => void;
  handleToggleTheme: () => void;
  handleCerrarSesionGoogle: () => void;
  /** Respuestas de soporte sin leer (punto en el ítem Soporte). */
  supportUnread?: number;
  /** Cierra el menú contenedor (menú inferior en móvil o desplegable en escritorio). */
  onClose: () => void;
}

const itemClass =
  "w-full flex items-center gap-3 px-4 min-h-[48px] text-left text-sm cursor-pointer transition-colors hover:bg-brand-bg";

/**
 * Lo que no es de uso diario vive aquí: Tareas, Ajustes, Asistente IA, tema, bloqueo y cerrar sesión.
 * Se reutiliza en el menú "Más" del móvil y en el desplegable del avatar en escritorio.
 */
export default function MoreMenuList({
  activeTab,
  setActiveTab,
  profile,
  setIsLocked,
  handleToggleTheme,
  handleCerrarSesionGoogle,
  supportUnread = 0,
  onClose,
}: MoreMenuListProps) {
  const go = (tab: AppTab) => {
    setActiveTab(tab);
    onClose();
  };

  const pageItems = [
    { id: "checklist" as const, label: "Tareas", icon: ListChecks },
    { id: "settings" as const, label: "Ajustes", icon: SlidersHorizontal },
    { id: "support" as const, label: "Soporte", icon: LifeBuoy },
  ];

  return (
    <div className="py-1">
      {pageItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => go(id)}
          aria-current={activeTab === id ? "page" : undefined}
          className={`${itemClass} ${activeTab === id ? "text-brand-primary font-semibold bg-[#EAF2ED]" : "text-brand-text"}`}
          id={`more-menu-${id}`}
        >
          <Icon size={18} strokeWidth={1.8} />
          {label}
          {id === "support" && supportUnread > 0 && (
            <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-brand-primary text-white text-[11px] font-semibold flex items-center justify-center" aria-label={`${supportUnread} respuesta(s) nueva(s)`}>{supportUnread}</span>
          )}
        </button>
      ))}

      <button
        onClick={() => {
          onClose();
          openAssistant();
        }}
        className={`${itemClass} text-brand-text`}
        id="more-menu-assistant"
      >
        <Sparkles size={18} strokeWidth={1.8} />
        Asistente IA
      </button>

      <div className="my-1 h-px bg-brand-border" />

      <button
        onClick={() => {
          onClose();
          handleToggleTheme();
        }}
        className={`${itemClass} text-brand-text`}
      >
        {profile?.theme === "dark" ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        {profile?.theme === "dark" ? "Tema claro" : "Tema oscuro"}
      </button>

      {profile?.securityPin && (
        <button
          onClick={() => {
            onClose();
            setIsLocked(true);
          }}
          className={`${itemClass} text-brand-text`}
        >
          <Lock size={18} strokeWidth={1.8} />
          Bloquear
        </button>
      )}

      <button
        onClick={() => {
          onClose();
          handleCerrarSesionGoogle();
        }}
        className={`${itemClass} text-rose-700`}
      >
        <LogOut size={18} strokeWidth={1.8} />
        Cerrar sesión
      </button>
    </div>
  );
}

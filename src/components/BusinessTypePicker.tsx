import React, { useState } from "react";
import { BUSINESS_TYPES, loadBusinessType, saveBusinessType } from "../lib/businessTypes";

interface BusinessTypePickerProps {
  userId: string;
  /** "chips": fichas para elegir con un toque (Hoy). "select": lista compacta (Ajustes). */
  variant?: "chips" | "select";
  onChange?: (typeId: string) => void;
}

/**
 * Elegir el tipo de negocio no cambia ninguna pantalla: solo afina las sugerencias de
 * categorías y tareas. Por eso es opcional y se resuelve con un toque.
 */
export default function BusinessTypePicker({ userId, variant = "chips", onChange }: BusinessTypePickerProps) {
  const [selected, setSelected] = useState<string | undefined>(() => loadBusinessType(userId)?.id);

  const choose = (id: string) => {
    saveBusinessType(userId, id);
    setSelected(id);
    onChange?.(id);
  };

  if (variant === "select") {
    return (
      <div className="space-y-1.5">
        <label htmlFor="business-type" className="block text-xs font-semibold text-brand-muted">Tipo de negocio</label>
        <select
          id="business-type"
          value={selected ?? ""}
          onChange={(e) => choose(e.target.value)}
          className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
        >
          <option value="" disabled>Elige tu tipo de negocio</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <p className="text-xs text-brand-muted">Solo cambia las categorías y tareas que te sugerimos; no limita nada.</p>
      </div>
    );
  }

  return (
    <section aria-label="Tipo de negocio" className="rounded-2xl border border-brand-border bg-white p-5 space-y-3">
      <p className="text-[15px] font-medium">¿Qué tipo de negocio tienes?</p>
      <div className="flex flex-wrap gap-2">
        {BUSINESS_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={selected === t.id}
            onClick={() => choose(t.id)}
            className={`h-10 px-4 rounded-full text-sm border transition-colors cursor-pointer ${
              selected === t.id
                ? "bg-brand-text border-brand-text text-white font-medium"
                : "bg-white border-[#E2E1DB] text-brand-text hover:bg-brand-bg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-brand-muted">Así te sugerimos las categorías y tareas de tu negocio. Puedes cambiarlo cuando quieras en Ajustes.</p>
    </section>
  );
}

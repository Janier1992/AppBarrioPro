import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  id?: string;
}

/**
 * Campo de contraseña con botón (ojo) para mostrar u ocultar los caracteres.
 * Es accesible: el botón tiene etiqueta y estado `aria-pressed`, y no roba el foco del formulario con Tab inesperado.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[52px] rounded-[14px] border border-[#E2E1DB] pl-4 pr-12 text-[15px] bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-[52px] items-center justify-center text-brand-muted hover:text-brand-text cursor-pointer"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

import { useId } from "react";

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Categorías sugeridas (del tipo de negocio + las que ya usan los productos). */
  options: string[];
  className?: string;
}

/**
 * Campo de categoría "elegir o escribir": muestra las sugerencias, pero acepta cualquier texto,
 * para que cualquier tipo de negocio organice su catálogo sin quedar limitado a una lista fija.
 */
export default function CategoryInput({ value, onChange, options, className }: CategoryInputProps) {
  const listId = useId();
  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Elige o escribe una categoría"
        autoComplete="off"
        className={
          className ??
          "w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden placeholder-brand-muted"
        }
      />
      <datalist id={listId}>
        {options.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

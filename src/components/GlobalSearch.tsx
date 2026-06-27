import React, { useState, useEffect, useRef, useMemo } from "react";
import { Product, Task, Debt } from "../types";
import { Search, Boxes, CheckSquare, DollarSign, ArrowRight, X, Command } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface GlobalSearchProps {
  products: Product[];
  tasks: Task[];
  debts: Debt[];
  onSelectResult: (tab: "inventory" | "checklist" | "debts", searchQuery: string) => void;
}

export default function GlobalSearch({ products, tasks, debts, onSelectResult }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items based on the search query
  const results = useMemo(() => {
    if (!query.trim()) return { products: [], tasks: [], debts: [] };
    const cleanQuery = query.toLowerCase().trim();

    const filteredProducts = products.filter(
      p => p.name.toLowerCase().includes(cleanQuery) || p.category.toLowerCase().includes(cleanQuery)
    ).slice(0, 5); // Limit results for clean UI

    const filteredTasks = tasks.filter(
      t => t.text.toLowerCase().includes(cleanQuery)
    ).slice(0, 5);

    const filteredDebts = debts.filter(
      d => d.clientName.toLowerCase().includes(cleanQuery)
    ).slice(0, 5);

    return {
      products: filteredProducts,
      tasks: filteredTasks,
      debts: filteredDebts
    };
  }, [query, products, tasks, debts]);

  const hasResults = results.products.length > 0 || results.tasks.length > 0 || results.debts.length > 0;

  const handleItemClick = (tab: "inventory" | "checklist" | "debts", name: string) => {
    onSelectResult(tab, name);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-md" ref={containerRef} id="global-search-container">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 text-brand-muted shrink-0" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar productos, tareas o deudas..."
          className="w-full pl-10 pr-20 py-2.5 text-xs bg-brand-bg hover:bg-gray-100/75 focus:bg-white rounded-xl border border-brand-border focus:border-brand-primary focus:outline-hidden transition-all text-brand-text placeholder-brand-muted/85 font-medium shadow-2xs"
          id="global-search-input"
        />
        
        {/* Shortcut and Clear Indicators */}
        <div className="absolute right-3.5 flex items-center gap-1.5 pointer-events-none">
          {query ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-brand-muted hover:text-brand-text hover:bg-gray-200 pointer-events-auto cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-brand-border bg-white text-[10px] text-brand-muted font-mono font-bold shadow-2xs">
              <Command size={9} />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Overlay Results */}
      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 mt-2 max-h-[420px] overflow-y-auto bg-white border border-brand-border rounded-2xl shadow-lg z-50 p-4 space-y-4"
            id="global-search-dropdown"
          >
            {!hasResults ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-brand-muted font-medium">No se encontraron resultados para "{query}"</p>
                <p className="text-[10px] text-brand-muted/70">Intenta buscando por nombre, categoría o palabra clave.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. PRODUCTOS */}
                {results.products.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-primary uppercase tracking-wider px-1">
                      <Boxes size={12} />
                      <span>Productos ({results.products.length})</span>
                    </div>
                    <div className="space-y-1">
                      {results.products.map((p) => {
                        const isLowStock = p.minStock > 0 && p.stock < p.minStock;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleItemClick("inventory", p.name)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer group border border-transparent hover:border-brand-border/40"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-brand-muted">
                                <span className="bg-brand-primary/5 text-brand-primary px-1.5 py-0.5 rounded-md font-semibold">
                                  {p.category}
                                </span>
                                <span>Ref: {p.sku || "Sin SKU"}</span>
                              </div>
                            </div>
                            <div className="text-right space-y-0.5 shrink-0">
                              <p className="text-xs font-mono font-extrabold text-brand-text">
                                ${p.price.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                              </p>
                              <span
                                className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  isLowStock
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                }`}
                              >
                                {p.stock} u.
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. TAREAS */}
                {results.tasks.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-brand-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-primary uppercase tracking-wider px-1">
                      <CheckSquare size={12} />
                      <span>Tareas de Checklist ({results.tasks.length})</span>
                    </div>
                    <div className="space-y-1">
                      {results.tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleItemClick("checklist", t.text)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer group border border-transparent hover:border-brand-border/40"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                            <p className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors truncate">
                              {t.text}
                            </p>
                            <p className="text-[9px] text-brand-muted font-mono">
                              Creada: {new Date(t.createdAt).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                t.completed
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                              }`}
                            >
                              {t.completed ? "Completada" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. DEUDAS */}
                {results.debts.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-brand-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand-primary uppercase tracking-wider px-1">
                      <DollarSign size={12} />
                      <span>Deudas / Cuentas por Cobrar ({results.debts.length})</span>
                    </div>
                    <div className="space-y-1">
                      {results.debts.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleItemClick("debts", d.clientName)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer group border border-transparent hover:border-brand-border/40"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-brand-text group-hover:text-brand-primary transition-colors">
                              {d.clientName}
                            </p>
                            <p className="text-[9px] text-brand-muted">
                              Vence: {new Date(d.dueDate).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                          <div className="text-right space-y-0.5 shrink-0">
                            <p className="text-xs font-mono font-extrabold text-rose-600">
                              ${d.amount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                            </p>
                            <span
                              className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                d.paid
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-rose-50 text-rose-600 border border-rose-100"
                              }`}
                            >
                              {d.paid ? "Pagado" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

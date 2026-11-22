import React, { useState } from "react";
import {
  Boxes, Home, ListChecks, LogOut, Lock, Moon, PanelLeftClose, PanelLeftOpen,
  Plus, SlidersHorizontal, Sparkles, Store, Sun, Wallet,
} from "lucide-react";
import { BusinessProfile } from "../types";
import { APP_NAME } from "../lib/brand";
import { openAssistant } from "../lib/assistant";
import type { AppTab } from "../lib/navigation";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "../lib/sidebar";

interface AppSidebarProps {
  profile: BusinessProfile | null;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  setInventoryFilterCritical: (val: boolean) => void;
  setIsLocked: (val: boolean) => void;
  handleToggleTheme: () => void;
  handleCerrarSesionGoogle: () => void;
}

function initialsOf(name?: string): string {
  return (name || "Mi tienda").trim().slice(0, 2).toUpperCase();
}

/**
 * Menú lateral de escritorio (pantallas de 1024 px o más). Se puede contraer a una columna
 * de solo iconos para dar más espacio al contenido y volver a expandir; la preferencia se recuerda.
 * En móvil no se muestra: ahí la navegación es la barra inferior de App.tsx.
 */
export default function AppSidebar({
  profile,
  activeTab,
  setActiveTab,
  setInventoryFilterCritical,
  setIsLocked,
  handleToggleTheme,
  handleCerrarSesionGoogle,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    saveSidebarCollapsed(next);
  };

  const itemBase = `flex items-center rounded-xl text-[15px] font-medium transition-colors cursor-pointer h-11 ${
    collapsed ? "justify-center w-11 mx-auto" : "gap-3 px-3 w-full text-left"
  }`;

  const goTo = (tab: AppTab) => {
    if (tab === "inventory") setInventoryFilterCritical(false);
    setActiveTab(tab);
  };

  const mainItems = [
    { id: "dashboard" as const, label: "Hoy", icon: Home },
    { id: "inventory" as const, label: "Productos", icon: Boxes },
    { id: "sales" as const, label: "Vender", icon: Plus, accent: true },
    { id: "debts" as const, label: "Fiados", icon: Wallet },
  ];
  const moreItems = [
    { id: "checklist" as const, label: "Tareas", icon: ListChecks },
    { id: "settings" as const, label: "Ajustes", icon: SlidersHorizontal },
  ];

  const tabClass = (isActive: boolean, accent?: boolean) => {
    if (isActive) return `${itemBase} ${accent ? "bg-brand-primary text-white" : "bg-brand-text text-brand-bg"}`;
    if (accent) return `${itemBase} bg-brand-primary/10 text-brand-primary font-semibold hover:bg-brand-primary/20`;
    return `${itemBase} text-brand-muted hover:text-brand-text hover:bg-brand-bg`;
  };
  const plainClass = `${itemBase} text-brand-muted hover:text-brand-text hover:bg-brand-bg`;

  const label = (text: string) => (collapsed ? <span className="sr-only">{text}</span> : <span className="truncate">{text}</span>);

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen bg-white border-r border-brand-border transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
      id="desktop-sidebar"
      data-collapsed={collapsed}
      aria-label="Menú lateral"
    >
      <div className={`flex items-center h-[72px] shrink-0 ${collapsed ? "justify-center" : "justify-between pl-5 pr-3"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Store size={17} strokeWidth={2} />
            </div>
            <span className="font-semibold text-lg tracking-tight truncate">{APP_NAME}</span>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Mostrar el menú" : "Ocultar el menú"}
          aria-expanded={!collapsed}
          title={collapsed ? "Mostrar el menú" : "Ocultar el menú"}
          className="h-10 w-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg cursor-pointer"
          id="sidebar-toggle"
        >
          {collapsed ? <PanelLeftOpen size={20} strokeWidth={1.8} /> : <PanelLeftClose size={20} strokeWidth={1.8} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        <nav aria-label="Principal" className="space-y-1">
          {mainItems.map(({ id, label: text, icon: Icon, accent }) => (
            <button
              key={id}
              onClick={() => goTo(id)}
              aria-current={activeTab === id ? "page" : undefined}
              title={collapsed ? text : undefined}
              className={tabClass(activeTab === id, accent)}
              id={`sidebar-${id}`}
            >
              <Icon size={20} strokeWidth={1.9} className="shrink-0" />
              {label(text)}
            </button>
          ))}
        </nav>

        <div className="space-y-1">
          {!collapsed ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">Más</p>
          ) : (
            <div className="mx-3 h-px bg-brand-border" />
          )}
          {moreItems.map(({ id, label: text, icon: Icon }) => (
            <button
              key={id}
              onClick={() => goTo(id)}
              aria-current={activeTab === id ? "page" : undefined}
              title={collapsed ? text : undefined}
              className={tabClass(activeTab === id)}
              id={`more-menu-${id}`}
            >
              <Icon size={20} strokeWidth={1.8} className="shrink-0" />
              {label(text)}
            </button>
          ))}
          <button
            onClick={() => openAssistant()}
            title={collapsed ? "Asistente IA" : undefined}
            className={plainClass}
            id="more-menu-assistant"
          >
            <Sparkles size={20} strokeWidth={1.8} className="shrink-0" />
            {label("Asistente IA")}
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t border-brand-border p-3 space-y-1">
        <button
          onClick={handleToggleTheme}
          title={collapsed ? (profile?.theme === "dark" ? "Tema claro" : "Tema oscuro") : undefined}
          className={plainClass}
          id="sidebar-theme"
        >
          {profile?.theme === "dark" ? <Sun size={20} strokeWidth={1.8} className="shrink-0" /> : <Moon size={20} strokeWidth={1.8} className="shrink-0" />}
          {label(profile?.theme === "dark" ? "Tema claro" : "Tema oscuro")}
        </button>
        {profile?.securityPin && (
          <button onClick={() => setIsLocked(true)} title={collapsed ? "Bloquear" : undefined} className={plainClass} id="sidebar-lock">
            <Lock size={20} strokeWidth={1.8} className="shrink-0" />
            {label("Bloquear")}
          </button>
        )}
        <button
          onClick={handleCerrarSesionGoogle}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={`${itemBase} text-rose-700 hover:bg-rose-500/10`}
          id="sidebar-logout"
        >
          <LogOut size={20} strokeWidth={1.8} className="shrink-0" />
          {label("Cerrar sesión")}
        </button>

        <div className={`flex items-center pt-2 ${collapsed ? "justify-center" : "gap-2.5 px-1"}`} title={collapsed ? profile?.businessName || "Mi tienda" : undefined}>
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-brand-border shrink-0" />
          ) : (
            <span className="h-9 w-9 rounded-full bg-brand-primary/10 text-brand-primary text-[13px] font-semibold flex items-center justify-center shrink-0">
              {initialsOf(profile?.businessName)}
            </span>
          )}
          {!collapsed && <span className="text-sm font-medium truncate">{profile?.businessName || "Mi tienda"}</span>}
        </div>
      </div>
    </aside>
  );
}

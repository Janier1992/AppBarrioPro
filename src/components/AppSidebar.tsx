import React from "react";
import {
  Home,
  Boxes,
  Receipt,
  ListChecks,
  Wallet,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { BusinessProfile } from "../types";

export type AppTab = "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings";

interface AppSidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  profile: BusinessProfile | null;
}

// Un solo grupo de destinos, en el orden en que el tendero los usa a diario.
const NAV_ITEMS = [
  { id: "dashboard", label: "Inicio", icon: Home },
  { id: "sales", label: "Ventas", icon: Receipt },
  { id: "inventory", label: "Inventario", icon: Boxes },
  { id: "debts", label: "Deudas", icon: Wallet },
  { id: "checklist", label: "Tareas", icon: ListChecks },
  { id: "settings", label: "Ajustes", icon: SlidersHorizontal },
] as const;

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

export default function AppSidebar({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  profile
}: AppSidebarProps) {
  return (
    <div className="flex-1 flex flex-col justify-between py-4 overflow-y-auto">
      <nav aria-label="Principal" className={`flex flex-col gap-0.5 ${isSidebarCollapsed ? "px-3 items-center" : "px-4"}`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`flex items-center rounded-[10px] text-sm transition-colors cursor-pointer border ${
                isSidebarCollapsed ? "h-10 w-10 justify-center" : "h-10 w-full gap-3 px-3"
              } ${
                isActive
                  ? "bg-white border-brand-border text-brand-text font-medium"
                  : "border-transparent text-brand-muted hover:text-brand-text hover:bg-white/70"
              }`}
              id={`sidebar-link-${item.id}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`flex flex-col gap-3 ${isSidebarCollapsed ? "items-center px-3" : "px-4"}`}>
        {profile && (
          <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? "" : "px-2"}`} title={profile.businessName}>
            <div className="h-8 w-8 shrink-0 rounded-full bg-[#EAF2ED] text-brand-primary text-[13px] font-semibold flex items-center justify-center">
              {initialsOf(profile.businessName)}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-brand-text truncate">{profile.businessName}</p>
                <p className="text-xs text-brand-muted truncate">Mi tienda</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`flex items-center rounded-[10px] text-xs text-brand-muted hover:text-brand-text hover:bg-white/70 cursor-pointer transition-colors ${
            isSidebarCollapsed ? "h-10 w-10 justify-center" : "h-9 gap-2 px-3 self-start"
          }`}
          title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          aria-label={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          id={isSidebarCollapsed ? "expand-sidebar-btn" : "collapse-sidebar-btn"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.8} /> : <><PanelLeftClose size={18} strokeWidth={1.8} /> Ocultar menú</>}
        </button>
      </div>
    </div>
  );
}

import React from "react";
import { 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  CheckSquare, 
  DollarSign, 
  Settings as SettingsIcon, 
  ChevronRight, 
  ChevronLeft 
} from "lucide-react";
import { BusinessProfile } from "../types";

interface AppSidebarProps {
  activeTab: "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings";
  setActiveTab: (tab: "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings") => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  profile: BusinessProfile | null;
}

export default function AppSidebar({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  profile
}: AppSidebarProps) {
  const sections = [
    {
      title: "MENÚ PRINCIPAL",
      items: [
        { id: "dashboard", label: "Panel de Control", icon: LayoutDashboard },
        { id: "inventory", label: "Inventario", icon: Boxes },
        { id: "sales", label: "Caja y Ventas", icon: ShoppingCart },
      ] as const,
    },
    {
      title: "RUTINAS Y ASISTENCIA",
      items: [
        { id: "checklist", label: "Checklist Diario", icon: CheckSquare },
        { id: "debts", label: "Deudas", icon: DollarSign },
      ] as const,
    },
    {
      title: "CONFIGURACIÓN",
      items: [
        { id: "settings", label: "Ajustes de Negocio", icon: SettingsIcon },
      ] as const,
    },
  ];

  if (isSidebarCollapsed) {
    const collapsedItems = [
      { id: "dashboard", label: "Panel de Control", icon: LayoutDashboard },
      { id: "inventory", label: "Inventario", icon: Boxes },
      { id: "sales", label: "Caja y Ventas", icon: ShoppingCart },
      { id: "checklist", label: "Checklist Diario", icon: CheckSquare },
      { id: "debts", label: "Deudas", icon: DollarSign },
      { id: "settings", label: "Ajustes de Negocio", icon: SettingsIcon },
    ] as const;

    return (
      <div className="flex-1 flex flex-col justify-between py-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-95"
            title="Expandir menú"
            id="expand-sidebar-btn"
          >
            <ChevronRight size={20} />
          </button>

          <div className="flex flex-col items-center gap-3 w-full px-2">
            {collapsedItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer relative group ${
                    isActive
                      ? "bg-[#2E3A2E] text-white shadow-xs"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  title={item.label}
                  id={`sidebar-link-${item.id}`}
                >
                  <Icon size={24} />
                  <div className="absolute left-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-[#2E3A2E] border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all duration-150 shadow-lg z-50 whitespace-nowrap pointer-events-none">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {profile && (
          <div className="flex flex-col items-center pb-4">
            <div 
              className="h-10 w-10 rounded-xl bg-[#2E3A2E] border border-white/10 flex items-center justify-center text-xs font-extrabold text-emerald-400 uppercase tracking-wider animate-pulse"
              title={profile.businessName}
            >
              {profile.businessName.slice(0, 2)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 space-y-6 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex justify-end px-3">
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-all active:scale-95"
            title="Colapsar menú"
            id="collapse-sidebar-btn"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase px-3 block">
              {sec.title}
            </span>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                      isActive
                        ? "bg-[#2E3A2E] text-white shadow-xs font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    id={`sidebar-link-${item.id}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={24} className={isActive ? "text-white" : "text-white/80 group-hover:text-white"} />
                      {item.label}
                    </span>
                    {isActive && <ChevronRight size={12} className="opacity-80" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {profile && (
        <div className="rounded-2xl border border-white/10 bg-[#2E3A2E] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Negocio Activo</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-white truncate">{profile.businessName}</p>
            <p className="text-[9px] text-white/60 truncate">{profile.address || "Sin dirección"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

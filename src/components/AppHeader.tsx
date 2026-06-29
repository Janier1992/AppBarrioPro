import React from "react";
import { MapPin, Clock, Lock, ChevronDown, User, Moon, Sun, LogOut } from "lucide-react";
import { BusinessProfile, Product, Task, Debt } from "../types";
import { db, MockUser } from "../lib/insforge";
import GlobalSearch from "./GlobalSearch";

interface AppHeaderProps {
  profile: BusinessProfile | null;
  setProfile: (p: BusinessProfile | null) => void;
  user: MockUser;
  products: Product[];
  tasks: Task[];
  debts: Debt[];
  isLocked: boolean;
  setIsLocked: (val: boolean) => void;
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (val: boolean) => void;
  activeTab: "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings";
  setActiveTab: (tab: "dashboard" | "inventory" | "sales" | "checklist" | "debts" | "settings") => void;
  setInventoryFilterCritical: (val: boolean) => void;
  setGlobalSearchTerm: (val: string) => void;
  handleCerrarSesionGoogle: () => void;
}

export default function AppHeader({
  profile,
  setProfile,
  user,
  products,
  tasks,
  debts,
  isLocked,
  setIsLocked,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  activeTab,
  setActiveTab,
  setInventoryFilterCritical,
  setGlobalSearchTerm,
  handleCerrarSesionGoogle
}: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between shadow-xs shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-extrabold text-brand-text tracking-tight flex items-center gap-2">
            {profile?.businessName || "Mi Negocio"}
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-brand-muted">
            {profile?.address && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {profile.address}
              </span>
            )}
            {profile?.hours && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {profile.hours}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-4" id="header-global-search">
        <GlobalSearch 
          products={products}
          tasks={tasks}
          debts={debts}
          onSelectResult={(tab, query) => {
            setGlobalSearchTerm(query);
            setInventoryFilterCritical(false);
            setActiveTab(tab);
          }}
        />
      </div>

      {/* Header Options */}
      <div className="flex items-center gap-3 text-brand-text">
        {/* Lock lock button */}
        {profile?.securityPin && (
          <button
            onClick={() => setIsLocked(true)}
            className="rounded-xl border border-brand-border p-2.5 text-brand-muted hover:text-brand-accent hover:bg-brand-bg transition-colors cursor-pointer"
            title="Bloquear panel"
          >
            <Lock size={16} />
          </button>
        )}

        {/* User Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-2 rounded-2xl border border-brand-border px-3 py-1.5 hover:bg-brand-bg transition-all cursor-pointer text-left"
            id="user-profile-menu-button"
          >
            {profile?.logoUrl ? (
              <img 
                src={profile.logoUrl} 
                alt="Logo" 
                className="h-8 w-8 rounded-full object-cover border border-brand-border shadow-xs shrink-0 bg-white" 
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-[11px] tracking-wide shadow-xs shrink-0 uppercase">
                {profile?.businessName ? profile.businessName.substring(0, 2) : "US"}
              </div>
            )}
            <div className="hidden sm:flex flex-col select-none">
              <span className="text-xs font-bold text-brand-text leading-tight">{profile?.businessName || "Mi Negocio"}</span>
              <span className="text-[9px] text-brand-muted leading-tight truncate max-w-[110px]">{user.email}</span>
            </div>
            <ChevronDown size={14} className={`text-brand-muted transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isProfileDropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-brand-border bg-white p-2 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-brand-border flex items-center gap-2">
                  {profile?.logoUrl ? (
                    <img 
                      src={profile.logoUrl} 
                      alt="Logo" 
                      className="h-8 w-8 rounded-full object-cover border border-brand-border shadow-xs shrink-0 bg-white" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-xs shrink-0 uppercase">
                      {profile?.businessName ? profile.businessName.substring(0, 2) : "US"}
                    </div>
                  )}
                  <div className="truncate min-w-0">
                    <p className="text-xs font-bold text-brand-text truncate">{profile?.businessName || "Mi Negocio"}</p>
                    <p className="text-[9px] text-brand-muted truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="py-1">
                  {/* Option 1: View Profile */}
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setActiveTab("settings");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-text rounded-xl hover:bg-brand-bg transition-colors cursor-pointer text-left"
                  >
                    <User size={14} className="text-brand-muted" />
                    <span>Ver Perfil / Ajustes</span>
                  </button>

                  {/* Option 2: Toggle Theme */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!profile) return;
                      const nextTheme: "light" | "dark" = profile.theme === "light" ? "dark" : "light";
                      const updated = { ...profile, theme: nextTheme };
                      setProfile(updated);
                      setIsProfileDropdownOpen(false);
                      await db.saveProfile(user.uid, updated);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-brand-text rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {profile?.theme === "dark" ? (
                        <Moon size={14} className="text-brand-muted" />
                      ) : (
                        <Sun size={14} className="text-brand-muted" />
                      )}
                      <span>Tema: {profile?.theme === "dark" ? "Oscuro" : "Claro"}</span>
                    </div>
                    <div className={`h-4 w-8 rounded-full p-0.5 transition-colors duration-200 ${profile?.theme === "dark" ? "bg-brand-primary" : "bg-gray-200"}`}>
                      <div className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ${profile?.theme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>

                <div className="border-t border-brand-border mt-1 pt-1">
                  {/* Option 3: Sign Out */}
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleCerrarSesionGoogle();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 rounded-xl hover:bg-rose-50/50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

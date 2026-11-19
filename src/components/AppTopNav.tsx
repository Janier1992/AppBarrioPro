import React from "react";
import { Store } from "lucide-react";
import { BusinessProfile } from "../types";
import { APP_NAME } from "../lib/brand";
import { MAIN_TABS } from "../lib/navigation";
import type { AppTab } from "../lib/navigation";
import MoreMenuList from "./MoreMenuList";

interface AppTopNavProps {
  profile: BusinessProfile | null;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  setInventoryFilterCritical: (val: boolean) => void;
  isProfileDropdownOpen: boolean;
  setIsProfileDropdownOpen: (val: boolean) => void;
  setIsLocked: (val: boolean) => void;
  handleToggleTheme: () => void;
  handleCerrarSesionGoogle: () => void;
}

function initialsOf(name?: string): string {
  return (name || "Mi tienda").trim().slice(0, 2).toUpperCase();
}

/**
 * Barra superior de escritorio: marca, los 4 destinos diarios y el avatar con el menú "Más".
 * En móvil no se muestra: ahí la navegación es la barra inferior de App.tsx.
 */
export default function AppTopNav({
  profile,
  activeTab,
  setActiveTab,
  setInventoryFilterCritical,
  isProfileDropdownOpen,
  setIsProfileDropdownOpen,
  setIsLocked,
  handleToggleTheme,
  handleCerrarSesionGoogle,
}: AppTopNavProps) {
  return (
    <header className="hidden lg:flex items-center justify-between gap-6 px-10 py-4 bg-white border-b border-brand-border shrink-0" id="desktop-top-nav">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-brand-primary text-white flex items-center justify-center">
          <Store size={16} strokeWidth={2} />
        </div>
        <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
      </div>

      <nav aria-label="Principal" className="flex items-center gap-1">
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "inventory") setInventoryFilterCritical(false);
                setActiveTab(tab.id);
              }}
              aria-current={isActive ? "page" : undefined}
              className={`h-10 px-[18px] rounded-full text-[15px] font-medium transition-colors cursor-pointer ${
                isActive ? "bg-brand-text text-white" : "text-brand-muted hover:text-brand-text hover:bg-brand-bg"
              }`}
              id={`topnav-${tab.id}`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="relative">
        <button
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          aria-expanded={isProfileDropdownOpen}
          aria-label="Menú de mi tienda"
          className="flex items-center gap-2.5 rounded-full border border-brand-border bg-white pl-1.5 pr-4 h-11 hover:bg-brand-bg cursor-pointer"
          id="user-profile-menu-button"
        >
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-brand-border" />
          ) : (
            <span className="h-8 w-8 rounded-full bg-[#EAF2ED] text-brand-primary text-[13px] font-semibold flex items-center justify-center">
              {initialsOf(profile?.businessName)}
            </span>
          )}
          <span className="text-sm font-medium max-w-[140px] truncate">{profile?.businessName || "Mi tienda"}</span>
        </button>

        {isProfileDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-brand-border bg-white shadow-lg z-50 overflow-hidden">
              <MoreMenuList
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                profile={profile}
                setIsLocked={setIsLocked}
                handleToggleTheme={handleToggleTheme}
                handleCerrarSesionGoogle={handleCerrarSesionGoogle}
                onClose={() => setIsProfileDropdownOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

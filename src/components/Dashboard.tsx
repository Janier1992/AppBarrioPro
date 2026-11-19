import React from "react";
import { Product, Sale } from "../types";
import { useDashboard } from "../hooks/use-dashboard";
import { Download, PlusCircle, RefreshCw } from "lucide-react";
import { formatCurrency } from "../lib/format";
import DashboardCharts from "./DashboardCharts";
import QuickSaleModal from "./QuickSaleModal";

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  userId: string;
  onNavigateToCriticalStock?: () => void;
}

export default function Dashboard({ 
  products, 
  sales, 
  userId, 
  onNavigateToCriticalStock 
}: DashboardProps) {
  const {
    showAddSaleModal,
    setShowAddSaleModal,
    quickCart,
    setQuickCart,
    quickSearch,
    setQuickSearch,
    activeQuickIndex,
    setActiveQuickIndex,
    loadingSale,
    loadingDemo,
    handleQuickSearchChange,
    handleAddToQuickCart,
    handleUpdateQuickQuantity,
    handleRemoveFromQuickCart,
    handleCargarDatosDeDemostracion,
    totalSalesCount,
    todayStr,
    todayTotalEarnings,
    yesterdayTotalEarnings,
    growthPercent,
    criticalProducts,
    popularItems,
    chartData,
    mensualData,
    totalVentasMes,
    totalTransaccionesMes,
    exportingPdf,
    handleExportPDF,
    handleRegistrarVentaRapida,
    filteredModalProducts,
    obtenerNombreMesActual
  } = useDashboard({ products, sales, userId });

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Encabezado: título y acciones (una sola acción principal) */}
      <header className="flex flex-wrap items-end justify-between gap-4" id="hero-metrics-card">
        <div className="space-y-1.5">
          <span className="text-[13px] text-brand-muted first-letter:uppercase">
            {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <h1 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Resumen de hoy</h1>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {products.length === 0 && (
            <button
              onClick={handleCargarDatosDeDemostracion}
              disabled={loadingDemo}
              className="flex items-center gap-2 h-11 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 text-sm font-medium transition-colors hover:bg-amber-100 cursor-pointer disabled:opacity-50"
              id="btn-load-demo"
            >
              {loadingDemo ? <RefreshCw size={16} className="animate-spin" /> : "Sembrar Datos Demo"}
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="flex items-center gap-2 h-11 rounded-xl border border-[#E2E1DB] bg-white text-brand-text px-4 text-sm font-medium transition-colors hover:bg-brand-bg cursor-pointer disabled:opacity-50"
            id="btn-export-pdf-report"
          >
            <Download size={16} className={exportingPdf ? "animate-bounce" : ""} />
            {exportingPdf ? "Exportando..." : "Exportar reporte"}
          </button>
          <button
            onClick={() => setShowAddSaleModal(true)}
            className="flex items-center gap-2 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-5 text-sm font-medium transition-colors cursor-pointer"
            id="btn-add-quick-sale"
          >
            <PlusCircle size={16} />
            Registrar venta
          </button>
        </div>
      </header>

      {/* Tres cifras: lo primero que el tendero quiere saber */}
      <section aria-label="Resumen del día" className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-brand-border bg-white p-5 sm:p-6 space-y-2.5">
          <p className="text-[13px] text-brand-muted">Ventas de hoy</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">{formatCurrency(todayTotalEarnings)}</span>
            {growthPercent !== 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${growthPercent > 0 ? "bg-[#EAF2ED] text-brand-primary" : "bg-rose-50 text-rose-700"}`}>
                {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
              </span>
            )}
          </div>
          <p className="text-[13px] text-brand-muted">Ayer: {formatCurrency(yesterdayTotalEarnings)}</p>
        </div>

        <button
          type="button"
          onClick={onNavigateToCriticalStock}
          className="text-left rounded-2xl border border-brand-border bg-white p-5 sm:p-6 space-y-2.5 hover:bg-brand-bg transition-colors cursor-pointer"
        >
          <p className="text-[13px] text-brand-muted">Con stock crítico</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums ${criticalProducts.length > 0 ? "text-[#A24A16]" : ""}`}>{criticalProducts.length}</span>
            <span className="text-sm text-brand-muted">productos</span>
          </div>
          <p className="text-[13px] text-brand-muted">Toca para ver qué reponer</p>
        </button>

        <div className="rounded-2xl border border-brand-border bg-white p-5 sm:p-6 space-y-2.5">
          <p className="text-[13px] text-brand-muted">Transacciones</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">{totalSalesCount}</span>
            <span className="text-sm text-brand-muted">en total</span>
          </div>
          <p className="text-[13px] text-brand-muted">{sales.filter(s => s.timestamp.startsWith(todayStr)).length} registradas hoy</p>
        </div>
      </section>

      {/* Main Grid: Charts & Widgets */}
      <DashboardCharts
        sales={sales}
        products={products}
        criticalProducts={criticalProducts}
        chartData={chartData}
        mensualData={mensualData}
        totalVentasMes={totalVentasMes}
        totalTransaccionesMes={totalTransaccionesMes}
        popularItems={popularItems}
        onNavigateToCriticalStock={onNavigateToCriticalStock}
        obtenerNombreMesActual={obtenerNombreMesActual}
      />

      {/* Register Sale Modal */}
      <QuickSaleModal
        showAddSaleModal={showAddSaleModal}
        setShowAddSaleModal={setShowAddSaleModal}
        products={products}
        quickCart={quickCart}
        setQuickCart={setQuickCart}
        quickSearch={quickSearch}
        setQuickSearch={setQuickSearch}
        handleQuickSearchChange={handleQuickSearchChange}
        activeQuickIndex={activeQuickIndex}
        setActiveQuickIndex={setActiveQuickIndex}
        loadingSale={loadingSale}
        handleAddToQuickCart={handleAddToQuickCart}
        handleUpdateQuickQuantity={handleUpdateQuickQuantity}
        handleRemoveFromQuickCart={handleRemoveFromQuickCart}
        handleRegistrarVentaRapida={handleRegistrarVentaRapida}
        filteredModalProducts={filteredModalProducts}
      />
    </div>
  );
}

import React from "react";
import { Product, Sale } from "../types";
import { useDashboard } from "../hooks/use-dashboard";
import { Download, PlusCircle, RefreshCw } from "lucide-react";
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
      {/* iOS Weather-app style Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary to-brand-primary-dark p-8 text-white shadow-sm" id="hero-metrics-card">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold tracking-wider text-white/70 uppercase">Panel de Control</span>
            <h1 className="text-4xl font-bold tracking-tight">BarrioPro</h1>
            <p className="text-white/90 text-sm">Tus finanzas y stock optimizados al instante</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {products.length === 0 && (
              <button
                onClick={handleCargarDatosDeDemostracion}
                disabled={loadingDemo}
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 text-sm font-semibold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                id="btn-load-demo"
              >
                {loadingDemo ? <RefreshCw size={18} className="animate-spin" /> : "Sembrar Datos Demo"}
              </button>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-3 text-sm font-semibold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
              id="btn-export-pdf-report"
            >
              <Download size={18} className={exportingPdf ? "animate-bounce" : ""} />
              {exportingPdf ? "Exportando..." : "Exportar Reporte PDF"}
            </button>
            <button
              onClick={() => setShowAddSaleModal(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-bg hover:text-brand-primary-dark transition-all active:scale-95 shadow-xs cursor-pointer"
              id="btn-add-quick-sale"
            >
              <PlusCircle size={18} />
              Registrar Venta
            </button>
          </div>
        </div>

        {/* Hero Grid Metrics */}
        <div className="relative z-10 mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-6">
          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Ventas de Hoy</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">${todayTotalEarnings.toFixed(2)}</span>
              {growthPercent !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growthPercent > 0 ? 'bg-white/20 text-white' : 'bg-rose-500/30 text-rose-100'}`}>
                  {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </div>
            <p className="text-white/60 text-[11px]">Ayer: ${yesterdayTotalEarnings.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Inventario Crítico</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold" onClick={onNavigateToCriticalStock}>{criticalProducts.length}</span>
              <span className="text-white/85 text-sm">productos</span>
            </div>
            <p className="text-white/60 text-[11px]">Revisar sección de reposición</p>
          </div>

          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Transacciones</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{totalSalesCount}</span>
              <span className="text-white/85 text-sm">totales</span>
            </div>
            <p className="text-white/60 text-[11px]">{sales.filter(s => s.timestamp.startsWith(todayStr)).length} registradas hoy</p>
          </div>
        </div>
      </div>

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

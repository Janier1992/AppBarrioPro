/**
 * @file Sales.tsx
 * @description Simplified POS module for neighborhood businesses.
 * @design Centered around absolute simplicity and zero friction. Connects directly with Firestore.
 */

import React from "react";
import { Product, Sale } from "../types";
import { useSales } from "../hooks/use-sales";
import { ShoppingCart, Download, RefreshCw, Check } from "lucide-react";
import POSCatalog from "./POSCatalog";
import POSCart from "./POSCart";
import SalesHistory from "./SalesHistory";
import EditSaleModal from "./EditSaleModal";

interface SalesProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export default function Sales({ products, sales, userId }: SalesProps) {
  const {
    cart,
    catalogSearch,
    activeCatalogIndex,
    setActiveCatalogIndex,
    selectedCatalogCategory,
    clientName,
    setClientName,
    paymentMethod,
    setPaymentMethod,
    loading,
    successMessage,
    exportingPdf,
    lastRegisteredSale,
    dueDate,
    setDueDate,
    editingSale,
    setEditingSale,
    editClientName,
    setEditClientName,
    editPaymentMethod,
    setEditPaymentMethod,
    editTotal,
    setEditTotal,
    handleCatalogSearchChange,
    handleCategoryChange,
    handleAddToCart,
    handleUpdateQuantity,
    handleRemoveFromCart,
    handleClearCart,
    handleGenerateReceiptPDF,
    handleExportPDF,
    handleStartEditSale,
    handleSaveEditSale,
    handleDeleteSale,
    handleRegistrarVenta,
    currentMonthSales,
    currentWeekSalesData,
    totalWeeklySales,
    filteredCatalogProducts,
    catalogCategories,
    todaySalesData,
    lastTenSales
  } = useSales({ products, sales, userId });

  return (
    <div className="space-y-6" id="sales-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-brand-text">Caja y Ventas</h2>
          <p className="text-xs text-brand-muted">Registra transacciones de forma inmediata y mantén al día tus ventas diarias.</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exportingPdf || currentMonthSales.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          {exportingPdf ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download size={14} />
              Exportar Ventas del Mes (PDF)
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-xs font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {lastRegisteredSale && (
            <button
              onClick={() => handleGenerateReceiptPDF(lastRegisteredSale)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-auto shrink-0"
            >
              <Download size={14} />
              <span>Imprimir Recibo PDF</span>
            </button>
          )}
        </div>
      )}

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sales-layout">
        {/* Left POS Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
            {/* POS Workspace Header */}
            <div className="p-5 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand-primary" />
                <h3 className="font-extrabold text-sm text-brand-text">Punto de Venta Interactiva (POS)</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-muted bg-white px-3 py-1.5 rounded-lg border border-brand-border font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Terminal Activo
              </div>
            </div>

            {/* POS Workspace Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-border">
              {/* POS Left Pane: Catalog */}
              <POSCatalog
                filteredCatalogProducts={filteredCatalogProducts}
                catalogSearch={catalogSearch}
                catalogCategories={catalogCategories}
                selectedCatalogCategory={selectedCatalogCategory}
                activeCatalogIndex={activeCatalogIndex}
                cart={cart}
                handleCatalogSearchChange={handleCatalogSearchChange}
                handleCategoryChange={handleCategoryChange}
                handleAddToCart={handleAddToCart}
                setActiveCatalogIndex={setActiveCatalogIndex}
              />

              {/* POS Right Pane: Cart */}
              <POSCart
                cart={cart}
                clientName={clientName}
                setClientName={setClientName}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                dueDate={dueDate}
                setDueDate={setDueDate}
                loading={loading}
                handleUpdateQuantity={handleUpdateQuantity}
                handleRemoveFromCart={handleRemoveFromCart}
                handleClearCart={handleClearCart}
                handleRegistrarVenta={handleRegistrarVenta}
              />
            </div>
          </div>
        </div>

        {/* Right Stats & History Column */}
        <div className="lg:col-span-4 space-y-6">
          <SalesHistory
            sales={sales}
            todaySalesData={todaySalesData}
            lastTenSales={lastTenSales}
            currentWeekSalesData={currentWeekSalesData}
            totalWeeklySales={totalWeeklySales}
            handleStartEditSale={handleStartEditSale}
            handleDeleteSale={handleDeleteSale}
          />
        </div>
      </div>

      {/* Modal para Editar Venta */}
      <EditSaleModal
        editingSale={editingSale}
        setEditingSale={setEditingSale}
        editClientName={editClientName}
        setEditClientName={setEditClientName}
        editPaymentMethod={editPaymentMethod}
        setEditPaymentMethod={setEditPaymentMethod}
        editTotal={editTotal}
        setEditTotal={setEditTotal}
        handleSaveEditSale={handleSaveEditSale}
      />
    </div>
  );
}

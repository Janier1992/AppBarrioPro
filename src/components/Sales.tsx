/**
 * @file Sales.tsx
 * @description Simplified POS module for neighborhood businesses.
 * @design Centered around absolute simplicity and zero friction. Connects directly with Firestore.
 */

import React from "react";
import { Product, Sale } from "../types";
import { useSales } from "../hooks/use-sales";
import { Download, RefreshCw, Check } from "lucide-react";
import POSCatalog from "./POSCatalog";
import POSCart from "./POSCart";
import SalesHistory from "./SalesHistory";
import EditSaleModal from "./EditSaleModal";
import Dialogs from "./Dialogs";

interface SalesProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export default function Sales({ products, sales, userId }: SalesProps) {
  const {
    confirmDialog,
    setConfirmDialog,
    alertDialog,
    setAlertDialog,
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
          <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Nueva venta</h2>
          <p className="text-sm text-brand-muted">Toca un producto para agregarlo al carrito.</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exportingPdf || currentMonthSales.length === 0}
          className="flex items-center gap-2 h-11 px-4 bg-white border border-[#E2E1DB] hover:bg-brand-bg text-brand-text text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          {exportingPdf ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download size={14} />
              Exportar ventas del mes
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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto shrink-0"
            >
              <Download size={14} />
              <span>Imprimir Recibo PDF</span>
            </button>
          )}
        </div>
      )}

      {/* Punto de venta: catálogo a la izquierda, carrito siempre a la vista a la derecha */}
      <div className="space-y-10" id="sales-layout">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
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

      <Dialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
        confirmLabel="Confirmar"
      />
    </div>
  );
}

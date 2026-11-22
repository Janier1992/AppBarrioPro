/**
 * @file Sales.tsx
 * @description Simplified POS module for neighborhood businesses.
 * @design Centered around absolute simplicity and zero friction. Connects directly with Firestore.
 */

import React from "react";
import { Product, Sale } from "../types";
import { useSales } from "../hooks/use-sales";
import { Download, RefreshCw, Check, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import POSCatalog from "./POSCatalog";
import POSCart from "./POSCart";
import SalesHistory from "./SalesHistory";
import EditSaleModal from "./EditSaleModal";
import Dialogs from "./Dialogs";
import { formatMoney } from "../lib/format";

interface SalesProps {
  products: Product[];
  sales: Sale[];
  userId: string;
  /** Vuelve a Hoy (flecha de la pantalla Vender en móvil). */
  onBack?: () => void;
}

export default function Sales({ products, sales, userId, onBack }: SalesProps) {
  // En móvil "Cobrar" es una pantalla completa; en escritorio el carrito siempre está a la vista.
  const [showCheckout, setShowCheckout] = React.useState(false);
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

  React.useEffect(() => {
    if (cart.length === 0) setShowCheckout(false);
  }, [cart.length]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="space-y-6" id="sales-container">
      {/* Encabezado: flecha (móvil) + título */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Volver a Hoy"
            className="lg:hidden h-11 w-11 shrink-0 rounded-full border border-[#E2E1DB] bg-white flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Nueva venta</h2>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {lastRegisteredSale && (
            <button
              onClick={() => handleGenerateReceiptPDF(lastRegisteredSale)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 h-10 flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto shrink-0"
            >
              <Download size={14} />
              <span>Imprimir recibo</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start" id="sales-layout">
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

        {/* Carrito: columna fija en escritorio; pantalla "Cobrar" a pantalla completa en móvil */}
        <div
          className={
            showCheckout
              ? "fixed inset-0 z-50 overflow-y-auto bg-brand-bg p-5 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0"
              : "hidden lg:block"
          }
          id="checkout-panel"
        >
          <button
            onClick={() => setShowCheckout(false)}
            aria-label="Volver a la venta"
            className="lg:hidden mb-4 h-11 w-11 rounded-full border border-[#E2E1DB] bg-white flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
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

      {/* Barra "N productos · $total · Cobrar" (solo móvil, aparece al agregar productos) */}
      {cart.length > 0 && !showCheckout && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-brand-bg via-brand-bg to-transparent">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full h-16 rounded-[20px] bg-[#111110] text-white flex items-center justify-between pl-6 pr-3 cursor-pointer"
            id="checkout-bar"
          >
            <span className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-[#C9C8C1]">{cartCount} {cartCount === 1 ? "producto" : "productos"}</span>
              <span className="text-xl font-semibold tracking-tight tabular-nums">{formatMoney(cartTotal)}</span>
            </span>
            <span className="h-11 px-5 rounded-[14px] bg-brand-primary text-base font-semibold flex items-center gap-1.5">
              Cobrar <ArrowRight size={18} strokeWidth={2.2} />
            </span>
          </button>
        </div>
      )}

      {/* Ventas del día y reporte: plegados */}
      <details className="group rounded-2xl border border-brand-border bg-white">
        <summary className="flex items-center justify-between gap-3 px-6 min-h-[56px] cursor-pointer list-none text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          Ver ventas registradas
          <ChevronDown size={18} className="text-brand-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 sm:px-6 pb-6 space-y-5">
          <button
            onClick={handleExportPDF}
            disabled={exportingPdf || currentMonthSales.length === 0}
            className="flex items-center gap-2 h-11 px-4 bg-white border border-[#E2E1DB] hover:bg-brand-bg text-brand-text text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
          <SalesHistory
            todaySalesData={todaySalesData}
            lastTenSales={lastTenSales}
            currentWeekSalesData={currentWeekSalesData}
            totalWeeklySales={totalWeeklySales}
            handleStartEditSale={handleStartEditSale}
            handleDeleteSale={handleDeleteSale}
          />
        </div>
      </details>

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

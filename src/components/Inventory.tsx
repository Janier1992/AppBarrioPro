import React from "react";
import { Product, BusinessProfile } from "../types";
import { useInventory } from "../hooks/use-inventory";
import { isCriticalStock } from "../lib/stock";
import {
  Plus,
  Search,
  AlertCircle,
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import InventoryAddForm from "./InventoryAddForm";
import InventoryBulkUpload from "./InventoryBulkUpload";
import InventoryTable from "./InventoryTable";
import EditProductModal from "./EditProductModal";
import Dialogs from "./Dialogs";

interface InventoryProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
  initialFilterCritical?: boolean;
  searchQueryParam?: string;
  onClearSearchParam?: () => void;
}

export default function Inventory({ 
  products, 
  profile, 
  userId, 
  initialFilterCritical = false,
  searchQueryParam = "",
  onClearSearchParam
}: InventoryProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    showAddForm,
    setShowAddForm,
    showBulkUpload,
    setShowBulkUpload,
    bulkFile,
    setBulkFile,
    bulkProducts,
    setBulkProducts,
    bulkErrors,
    setBulkErrors,
    isProcessingBulk,
    bulkProgress,
    bulkSuccessCount,
    filterCriticalOnly,
    setFilterCriticalOnly,
    prodName,
    setProdName,
    sku,
    setSku,
    category,
    setCategory,
    stock,
    setStock,
    minStock,
    setMinStock,
    price,
    setPrice,
    cost,
    setCost,
    loadingProduct,
    editingProduct,
    setEditingProduct,
    editName,
    setEditName,
    editSku,
    setEditSku,
    editCategory,
    setEditCategory,
    editStock,
    setEditStock,
    editMinStock,
    setEditMinStock,
    editPrice,
    setEditPrice,
    editCost,
    setEditCost,
    savingEdit,
    confirmDialog,
    setConfirmDialog,
    alertDialog,
    setAlertDialog,
    categories,
    formCategories,
    umbralCritico,
    handleRegistrarNuevoProducto,
    handleEliminarProductoDeInventario,
    handleAjustarStockRapido,
    handleDragOver,
    handleDrop,
    handleFileChange,
    processFile,
    handleDescargarPlantilla,
    handleIniciarCargaMasiva,
    handleCargarDatosEdicion,
    handleGuardarEdicionProducto,
    handleAlternarOrdenamiento,
    sortedProducts,
    totalProductsCount,
    criticalStockCount,
    totalValuation,
    totalInvestment,
    sortOrder
  } = useInventory({
    products,
    profile,
    userId,
    initialFilterCritical,
    searchQueryParam,
    onClearSearchParam
  });

  return (
    <div className="space-y-6" id="inventory-container">
      {/* Header with Title and Quick Add Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Boxes size={22} className="text-brand-primary" />
            Catálogo e Inventario de Productos
          </h2>
          <p className="text-xs text-brand-muted">Monitorea niveles de stock, costos, precios y categorías de tus mercancías.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setShowBulkUpload(prev => !prev);
              setShowAddForm(false);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer ${
              showBulkUpload 
                ? "bg-slate-700 hover:bg-slate-800 text-white" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <FileSpreadsheet size={16} />
            {showBulkUpload ? "Cerrar Carga" : "Carga Masiva (Excel)"}
          </button>
          <button
            onClick={() => {
              setShowAddForm(prev => !prev);
              setShowBulkUpload(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-3 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            {showAddForm ? "Cerrar Formulario" : "Nuevo Producto"}
          </button>
        </div>
      </div>

      {/* Mini metrics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="inventory-metrics">
        <div className="rounded-2xl border border-brand-border bg-white p-4 flex items-center gap-3 shadow-2xs">
          <div className="rounded-xl bg-brand-primary/10 p-2.5 text-brand-primary flex-shrink-0">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Productos</p>
            <p className="text-lg font-bold text-brand-text">{totalProductsCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 flex items-center gap-3 shadow-2xs">
          <div className={`rounded-xl p-2.5 flex-shrink-0 ${criticalStockCount > 0 ? "bg-amber-50 text-brand-accent border border-amber-100" : "bg-brand-primary/10 text-brand-primary"}`}>
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Bajo Stock</p>
            <p className={`text-lg font-bold ${criticalStockCount > 0 ? "text-brand-accent" : "text-brand-text"}`}>{criticalStockCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 flex items-center gap-3 shadow-2xs">
          <div className="rounded-xl bg-green-50 text-emerald-700 p-2.5 flex-shrink-0 border border-green-100">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Valor Estimado</p>
            <p className="text-lg font-bold text-brand-text">${totalValuation.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-4 flex items-center gap-3 shadow-2xs">
          <div className="rounded-xl bg-blue-50 text-blue-700 p-2.5 flex-shrink-0 border border-blue-100">
            <Boxes size={20} />
          </div>
          <div>
            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Inversión Stock</p>
            <p className="text-lg font-bold text-brand-text">${totalInvestment.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Add product form */}
      {showAddForm && (
        <InventoryAddForm
          prodName={prodName}
          setProdName={setProdName}
          sku={sku}
          setSku={setSku}
          category={category}
          setCategory={setCategory}
          stock={stock}
          setStock={setStock}
          minStock={minStock}
          setMinStock={setMinStock}
          price={price}
          setPrice={setPrice}
          cost={cost}
          setCost={setCost}
          loadingProduct={loadingProduct}
          formCategories={formCategories}
          handleRegistrarNuevoProducto={handleRegistrarNuevoProducto}
          setShowAddForm={setShowAddForm}
        />
      )}

      {/* Carga Masiva (Excel/CSV) Form */}
      {showBulkUpload && (
        <InventoryBulkUpload
          bulkFile={bulkFile}
          setBulkFile={setBulkFile}
          bulkProducts={bulkProducts}
          setBulkProducts={setBulkProducts}
          bulkErrors={bulkErrors}
          setBulkErrors={setBulkErrors}
          isProcessingBulk={isProcessingBulk}
          bulkProgress={bulkProgress}
          bulkSuccessCount={bulkSuccessCount}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleFileChange={handleFileChange}
          handleDescargarPlantilla={handleDescargarPlantilla}
          handleIniciarCargaMasiva={handleIniciarCargaMasiva}
          setShowBulkUpload={setShowBulkUpload}
        />
      )}

      {/* Search and Filters Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-brand-border shadow-2xs">
        {/* Search Input & Critical stock filter toggle */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-brand-muted" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-xs focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterCriticalOnly(prev => !prev)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
              filterCriticalOnly 
                ? "bg-amber-600 text-white border-amber-700 shadow-sm" 
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50"
            }`}
          >
            <AlertTriangle size={14} className={filterCriticalOnly ? "animate-pulse" : ""} />
            <span>Stock Crítico ({products.filter(isCriticalStock).length})</span>
          </button>
        </div>

        {/* Categories filters scroll */}
        <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none" id="categories-filter-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex-shrink-0 cursor-pointer ${selectedCategory === cat ? "bg-brand-primary text-white" : "bg-brand-bg text-brand-muted hover:bg-brand-border/30 border border-transparent hover:border-brand-border"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table view */}
      <InventoryTable
        sortedProducts={sortedProducts}
        umbralCritico={umbralCritico}
        sortBy={sortBy}
        sortOrder={sortOrder}
        handleAlternarOrdenamiento={handleAlternarOrdenamiento}
        handleAjustarStockRapido={handleAjustarStockRapido}
        handleCargarDatosEdicion={handleCargarDatosEdicion}
        handleEliminarProductoDeInventario={handleEliminarProductoDeInventario}
      />

      {/* Modal para Editar Producto */}
      <EditProductModal
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        editName={editName}
        setEditName={setEditName}
        editSku={editSku}
        setEditSku={setEditSku}
        editCategory={editCategory}
        setEditCategory={setEditCategory}
        editStock={editStock}
        setEditStock={setEditStock}
        editMinStock={editMinStock}
        setEditMinStock={setEditMinStock}
        editPrice={editPrice}
        setEditPrice={setEditPrice}
        editCost={editCost}
        setEditCost={setEditCost}
        savingEdit={savingEdit}
        formCategories={formCategories}
        handleGuardarEdicionProducto={handleGuardarEdicionProducto}
      />

      <Dialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
        confirmLabel="Confirmar Eliminación"
      />
    </div>
  );
}

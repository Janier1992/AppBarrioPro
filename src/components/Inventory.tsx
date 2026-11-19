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
      {/* Encabezado: título y acciones */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Inventario</h2>
          <p className="text-sm text-brand-muted">{totalProductsCount} productos · {criticalStockCount} con stock crítico</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setShowBulkUpload(prev => !prev);
              setShowAddForm(false);
            }}
            className="flex items-center gap-2 h-11 rounded-xl border border-[#E2E1DB] bg-white text-brand-text hover:bg-brand-bg px-4 text-sm font-medium transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            {showBulkUpload ? "Cerrar carga" : "Importar Excel"}
          </button>
          <button
            onClick={() => {
              setShowAddForm(prev => !prev);
              setShowBulkUpload(false);
            }}
            className="flex items-center gap-2 h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-5 text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} />
            {showAddForm ? "Cerrar formulario" : "Agregar producto"}
          </button>
        </div>
      </div>

      {/* Cifras del inventario */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="inventory-metrics">
        {[
          { label: "Productos", value: String(totalProductsCount), warn: false },
          { label: "Con stock bajo", value: String(criticalStockCount), warn: criticalStockCount > 0 },
          { label: "Valor estimado", value: "$" + totalValuation.toFixed(2), warn: false },
          { label: "Inversión en stock", value: "$" + totalInvestment.toFixed(2), warn: false },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-brand-border bg-white p-5 space-y-2">
            <p className="text-[13px] text-brand-muted">{m.label}</p>
            <p className={"text-2xl font-semibold tracking-tight tabular-nums " + (m.warn ? "text-[#A24A16]" : "text-brand-text")}>{m.value}</p>
          </div>
        ))}
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

      {/* Búsqueda y filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-brand-muted" size={18} strokeWidth={1.8} />
            <label htmlFor="inventory-search" className="sr-only">Buscar en el inventario</label>
            <input
              id="inventory-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto"
              className="w-full h-11 rounded-xl border border-[#E2E1DB] pl-11 pr-4 text-sm focus:border-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterCriticalOnly(prev => !prev)}
            aria-pressed={filterCriticalOnly}
            className={"flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-[13px] transition-colors border shrink-0 cursor-pointer " + (filterCriticalOnly ? "bg-brand-text text-white border-brand-text font-medium" : "bg-white text-brand-text border-[#E2E1DB] hover:bg-brand-bg")}
          >
            <AlertTriangle size={14} className={filterCriticalOnly ? "" : "text-[#A24A16]"} />
            <span>Stock crítico · {products.filter(isCriticalStock).length}</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none" id="categories-filter-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={"h-9 px-4 rounded-full text-[13px] transition-colors flex-shrink-0 cursor-pointer border " + (selectedCategory === cat ? "bg-brand-text border-brand-text text-white font-medium" : "bg-white border-[#E2E1DB] text-brand-text hover:bg-brand-bg")}
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

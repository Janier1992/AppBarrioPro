// ======================================================
// Archivo: src/components/Inventory.tsx
// Responsabilidad: Pantalla "Productos": filtros y búsqueda, lista (celular) o tabla (escritorio), alta de
//   productos, carga masiva desde Excel/CSV y cifras del inventario.
// ======================================================

import { Product, BusinessProfile } from "../types";
import { useInventory } from "../hooks/use-inventory";
import { isCriticalStock } from "../lib/stock";
import { Plus, Search, FileSpreadsheet, ChevronDown } from "lucide-react";
import InventoryAddForm from "./InventoryAddForm";
import InventoryBulkUpload from "./InventoryBulkUpload";
import InventoryTable from "./InventoryTable";
import InventoryList from "./InventoryList";
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
    handleRegistrarNuevoProducto,
    handleEliminarProductoDeInventario,
    handleAjustarStockRapido,
    handleDragOver,
    handleDrop,
    handleFileChange,
    handleDescargarPlantilla,
    handleIniciarCargaMasiva,
    handleCargarDatosEdicion,
    handleGuardarEdicionProducto,
    handleAlternarOrdenamiento,
    sortedProducts,
    totalProductsCount,
    criticalStockCount,
    totalValuation,
    totalInvestment
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
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Productos</h2>
          <p className="text-sm text-brand-muted">{totalProductsCount} productos · {criticalStockCount} se acaban</p>
        </div>
        <div className="hidden sm:flex flex-wrap gap-2.5">
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
            {showAddForm ? "Cerrar formulario" : "Nuevo producto"}
          </button>
        </div>
      </div>

      {/* Cifras del inventario (plegadas) */}
      <details className="group rounded-2xl border border-brand-border bg-white">
        <summary className="flex items-center justify-between gap-3 px-6 min-h-[56px] cursor-pointer list-none text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          Ver cifras del inventario
          <ChevronDown size={18} className="text-brand-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 sm:px-6 pb-6">
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

        </div>
      </details>

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
        />
      )}

      {/* Búsqueda y filtros */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-3.5 text-brand-muted" size={18} strokeWidth={1.8} />
          <label htmlFor="inventory-search" className="sr-only">Buscar producto</label>
          <input
            id="inventory-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto"
            className="w-full h-12 rounded-full border border-[#E2E1DB] pl-11 pr-4 text-[15px] focus:border-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" id="categories-filter-scroll">
          <button
            type="button"
            onClick={() => setFilterCriticalOnly(false)}
            aria-pressed={!filterCriticalOnly}
            className={"h-10 px-[18px] rounded-full text-sm transition-colors shrink-0 cursor-pointer border " + (!filterCriticalOnly ? "bg-brand-text border-brand-text text-white font-medium" : "bg-white border-[#E2E1DB] text-brand-text hover:bg-brand-bg")}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterCriticalOnly(true)}
            aria-pressed={filterCriticalOnly}
            className={"h-10 px-[18px] rounded-full text-sm transition-colors shrink-0 cursor-pointer border " + (filterCriticalOnly ? "bg-brand-text border-brand-text text-white font-medium" : "bg-white border-[#E2E1DB] text-brand-text hover:bg-brand-bg")}
          >
            Se acaban · {products.filter(isCriticalStock).length}
          </button>
          {categories.filter((cat) => cat !== categories[0]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={"h-10 px-[18px] rounded-full text-sm transition-colors shrink-0 cursor-pointer border " + (selectedCategory === cat ? "bg-[#EAF2ED] border-brand-primary text-[#1F3D2E] font-medium" : "bg-white border-[#E2E1DB] text-brand-muted hover:bg-brand-bg")}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowBulkUpload(prev => !prev);
            setShowAddForm(false);
          }}
          className="sm:hidden flex items-center gap-2 text-sm font-medium text-brand-primary cursor-pointer"
        >
          <FileSpreadsheet size={16} />
          {showBulkUpload ? "Cerrar carga" : "Importar desde Excel"}
        </button>
      </div>

      {/* Main Table view */}
      <div className="hidden md:block">
        <InventoryTable
          sortedProducts={sortedProducts}
          handleAlternarOrdenamiento={handleAlternarOrdenamiento}
          handleAjustarStockRapido={handleAjustarStockRapido}
          handleCargarDatosEdicion={handleCargarDatosEdicion}
          handleEliminarProductoDeInventario={handleEliminarProductoDeInventario}
        />
      </div>
      <div className="md:hidden">
        <InventoryList products={sortedProducts} onRestock={handleCargarDatosEdicion} />
      </div>

      {/* Botón flotante: nuevo producto (móvil) */}
      <button
        onClick={() => {
          setShowAddForm(prev => !prev);
          setShowBulkUpload(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="sm:hidden fixed right-5 bottom-24 z-30 h-[52px] px-[22px] rounded-full bg-brand-primary text-white text-[15px] font-semibold flex items-center gap-2 shadow-[0_6px_16px_rgba(47,107,79,0.28)] cursor-pointer"
      >
        <Plus size={18} strokeWidth={2.2} />
        {showAddForm ? "Cerrar" : "Nuevo producto"}
      </button>


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

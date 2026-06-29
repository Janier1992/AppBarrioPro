import React from "react";
import { FileSpreadsheet, Download, Upload, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";

interface InventoryBulkUploadProps {
  bulkFile: File | null;
  setBulkFile: (file: File | null) => void;
  bulkProducts: any[];
  setBulkProducts: (products: any[]) => void;
  bulkErrors: string[];
  setBulkErrors: (errors: string[]) => void;
  isProcessingBulk: boolean;
  bulkProgress: number;
  bulkSuccessCount: number;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDescargarPlantilla: () => void;
  handleIniciarCargaMasiva: () => void;
  setShowBulkUpload: (val: boolean) => void;
}

export default function InventoryBulkUpload({
  bulkFile,
  setBulkFile,
  bulkProducts,
  setBulkProducts,
  bulkErrors,
  setBulkErrors,
  isProcessingBulk,
  bulkProgress,
  bulkSuccessCount,
  handleDragOver,
  handleDrop,
  handleFileChange,
  handleDescargarPlantilla,
  handleIniciarCargaMasiva,
  setShowBulkUpload
}: InventoryBulkUploadProps) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/5 p-6 shadow-xs space-y-6 animate-in slide-in-from-top duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border pb-4">
        <div className="space-y-1">
          <h3 className="font-bold text-emerald-700 text-sm flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            Carga Masiva de Productos desde Excel / CSV
          </h3>
          <p className="text-xs text-brand-muted">
            Importa decenas de productos de una sola vez. Nuestro sistema mapea automáticamente tus columnas.
          </p>
        </div>
        <button
          onClick={handleDescargarPlantilla}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Download size={14} />
          Descargar Plantilla de Ejemplo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zona de Carga y Arrastre */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-text uppercase tracking-wider">
              Selecciona o Arrastra el Archivo
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                bulkFile
                  ? "border-emerald-500 bg-emerald-50/20"
                  : "border-brand-border hover:border-emerald-500 hover:bg-emerald-50/10"
              }`}
              onClick={() => document.getElementById("bulk-file-input")?.click()}
            >
              <input
                id="bulk-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isProcessingBulk}
              />

              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bulkFile ? "bg-emerald-100 text-emerald-600" : "bg-brand-bg text-brand-muted"}`}>
                <Upload size={22} className={isProcessingBulk ? "animate-bounce" : ""} />
              </div>

              {bulkFile ? (
                <div className="space-y-1 text-center">
                  <p className="text-xs font-bold text-brand-text break-all">{bulkFile.name}</p>
                  <p className="text-[10px] text-brand-muted font-mono">
                    {(bulkFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <p className="text-xs font-bold text-brand-text">
                    Arrastra tu archivo aquí o haz clic para buscar
                  </p>
                  <p className="text-[10px] text-brand-muted">
                    Formatos soportados: .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tips de Formato */}
          <div className="bg-slate-50 border border-brand-border rounded-xl p-4 text-[11px] text-brand-muted leading-relaxed space-y-1">
            <p className="font-bold text-brand-text text-xs mb-1">💡 Consejos para la carga:</p>
            <p>• La columna <strong className="text-emerald-700">Nombre</strong> es la única obligatoria.</p>
            <p>• Las categorías se mapearán automáticamente (ej: Abarrotes, Ferretería, Droguería, Carnicería, Legumbrería, Papelería, Tienda Digital). Si no coinciden, se guardarán en <strong className="text-brand-text">"Otros Comercios"</strong>.</p>
            <p>• Si el <strong className="text-emerald-700">SKU / Código</strong> está vacío, BarrioPro generará uno único al azar.</p>
          </div>
        </div>

        {/* Previsualización y Ejecución */}
        <div className="lg:col-span-7 space-y-4">
          {bulkFile ? (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Válidos para Cargar</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {bulkProducts.length} productos
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${bulkErrors.length > 0 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-50 border-brand-border text-brand-muted"}`}>
                  <span className="text-[10px] font-bold uppercase block">Errores de Validación</span>
                  <span className="text-lg font-black font-mono">
                    {bulkErrors.length} omitidos
                  </span>
                </div>
              </div>

              {/* Validation errors panel if any */}
              {bulkErrors.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 max-h-[120px] overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle size={13} />
                    Errores detectados en el archivo:
                  </p>
                  <ul className="text-[10px] text-amber-700 list-disc list-inside space-y-0.5">
                    {bulkErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mini-table preview of products to be imported */}
              {bulkProducts.length > 0 && (
                <div className="border border-brand-border rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 border-b border-brand-border px-3 py-2 text-[10px] font-bold text-brand-muted uppercase tracking-wider flex justify-between items-center">
                    <span>Vista Previa de Productos (Primeros 4)</span>
                    <span className="text-[9px] font-normal text-brand-muted lowercase">Solo informativo</span>
                  </div>
                  <div className="divide-y divide-brand-bg text-[11px] max-h-[160px] overflow-y-auto">
                    {bulkProducts.slice(0, 4).map((p, i) => (
                      <div key={i} className="p-2.5 flex justify-between items-center gap-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-brand-text">{p.name}</p>
                          <div className="flex gap-2 text-[10px] text-brand-muted">
                            <span>Categoría: {p.category}</span>
                            <span>•</span>
                            <span className="font-mono">SKU: {p.sku}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-brand-text font-mono">${p.price.toLocaleString("es-CO")}</p>
                          <p className="text-[10px] text-brand-muted font-mono">Stock: {p.stock} unid.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress block during upload */}
              {isProcessingBulk && (
                <div className="bg-brand-bg border border-brand-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-brand-text">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-brand-primary" />
                      Cargando productos a la nube...
                    </span>
                    <span className="font-mono text-brand-primary">
                      {bulkSuccessCount} / {bulkProducts.length} ({bulkProgress}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${bulkProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkFile(null);
                    setBulkProducts([]);
                    setBulkErrors([]);
                  }}
                  disabled={isProcessingBulk}
                  className="rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Limpiar Archivo
                </button>
                <button
                  type="button"
                  onClick={handleIniciarCargaMasiva}
                  disabled={isProcessingBulk || bulkProducts.length === 0}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                >
                  {isProcessingBulk ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Iniciar Carga Masiva
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center p-8 text-center text-brand-muted space-y-2">
              <FileSpreadsheet size={32} className="text-brand-border" />
              <p className="text-xs font-medium text-brand-text">No hay ningún archivo cargado todavía</p>
              <p className="text-[10px] max-w-xs">
                Sube un archivo de Excel con tu inventario a la izquierda para ver un resumen de las validaciones y productos listos para importar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

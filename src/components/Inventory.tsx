import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Product, BusinessProfile } from "../types";
import { db } from "../lib/insforge";
import { 
  Plus, 
  Search, 
  Trash2, 
  Layers, 
  AlertCircle, 
  PlusCircle, 
  MinusCircle, 
  ArrowUpDown, 
  Tag, 
  CheckCircle2,
  Package,
  Boxes,
  DollarSign,
  RefreshCw,
  Edit2,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";

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
  // Navigation tabs inside Inventory if any, or just single-view split-screen
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(initialFilterCritical);

  React.useEffect(() => {
    setFilterCriticalOnly(initialFilterCritical);
    if (initialFilterCritical) {
      setSearchQuery("");
      setSelectedCategory("Todas");
    }
  }, [initialFilterCritical]);

  React.useEffect(() => {
    if (searchQueryParam) {
      setSearchQuery(searchQueryParam);
      setFilterCriticalOnly(false);
      setSelectedCategory("Todas");
      if (onClearSearchParam) {
        onClearSearchParam();
      }
    }
  }, [searchQueryParam]);

  // New Product Form States
  const [prodName, setProdName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Abarrotes");
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [price, setPrice] = useState(1.0);
  const [cost, setCost] = useState(0.6);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Editing Product States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editCategory, setEditCategory] = useState("Abarrotes");
  const [editStock, setEditStock] = useState(10);
  const [editMinStock, setEditMinStock] = useState(5);
  const [editPrice, setEditPrice] = useState(1.0);
  const [editCost, setEditCost] = useState(0.6);
  const [savingEdit, setSavingEdit] = useState(false);

  // --- Estados de Diálogos y Alertas Personalizados ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "warning";
  } | null>(null);

  // Available categories adapted for established neighborhood commerce types
  const categories = [
    "Todas", 
    "Abarrotes", 
    "Ferretería", 
    "Droguería", 
    "Carnicería", 
    "Legumbrería", 
    "Tienda Digital (Accesorios)", 
    "Papelería", 
    "Otros Comercios"
  ];
  const formCategories = categories.filter(c => c !== "Todas");

  /**
   * @function handleRegistrarNuevoProducto
   * @description Registra un nuevo producto en el catálogo y base de datos Firestore de BarrioPro.
   * Paso 1: Sanitizar entradas del usuario (quitar espacios en blanco).
   * Paso 2: Construir el objeto de tipo Product con su SKU único (autogenerado si es omitido).
   * Paso 3: Subir el documento a Firestore e inicializar el formulario de entrada.
   * @param {React.FormEvent} e - Evento de envío de formulario.
   */
  const handleRegistrarNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    setLoadingProduct(true);
    try {
      const newProd: Omit<Product, "id"> = {
        name: prodName.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        category,
        stock: Number(stock),
        minStock: Number(minStock),
        price: Number(price),
        cost: Number(cost),
        updatedAt: new Date().toISOString()
      };

      await db.addProduct(userId, newProd);
      
      // Reiniciar estado de inputs y ocultar formulario
      setProdName("");
      setSku("");
      setStock(10);
      setMinStock(5);
      setPrice(1.0);
      setCost(0.6);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoadingProduct(false);
    }
  };

  /**
   * @function handleEliminarProductoDeInventario
   * @description Solicita confirmación y elimina físicamente un artículo del inventario.
   * @param {string} id - Identificador único del producto en Firestore.
   */
  const handleEliminarProductoDeInventario = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Producto del Inventario",
      message: "¿Estás seguro de que deseas eliminar permanentemente este producto del inventario? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await db.deleteProduct(userId, id);
          setAlertDialog({
            isOpen: true,
            title: "Producto Eliminado",
            message: "El artículo ha sido eliminado del inventario con éxito.",
            type: "success"
          });
        } catch (error) {
          console.error("Error deleting product:", error);
        }
      }
    });
  };

  /**
   * @function handleAjustarStockRapido
   * @description Ajusta rápidamente la cantidad física de stock de un producto (p. ej. sumas o restas de 1).
   * Paso 1: Calcular la nueva cantidad salvaguardando que no sea inferior a cero.
   * Paso 2: Actualizar el campo en Firestore con la marca de tiempo de auditoría.
   * @param {Product} product - Instancia del producto a modificar.
   * @param {number} amount - Magnitud del cambio en el stock (positivo o negativo).
   */
  const handleAjustarStockRapido = async (product: Product, amount: number) => {
    if (!product.id) return;
    const newStock = Math.max(0, product.stock + amount);
    try {
      await db.updateProduct(userId, product.id, {
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adjusting stock:", error);
    }
  };

  /**
   * @function handleDragOver
   * @description Evita que el navegador abra el archivo por defecto.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * @function handleDrop
   * @description Obtiene el archivo arrastrado y lo pasa para su procesamiento.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  /**
   * @function handleFileChange
   * @description Maneja la selección manual del archivo de Excel/CSV.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  /**
   * @function processFile
   * @description Lee un archivo .xlsx, .xls o .csv, valida las columnas obligatorias, realiza mapeo inteligente y actualiza la lista de productos previsualizados.
   */
  const processFile = async (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");
    if (!isExcel && !isCsv) {
      alert("Por favor selecciona un archivo de Excel (.xlsx, .xls) o un CSV (.csv).");
      return;
    }

    setBulkFile(file);
    setBulkProducts([]);
    setBulkErrors([]);
    setBulkSuccessCount(0);
    setBulkProgress(0);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet);

        if (rows.length === 0) {
          setBulkErrors(["El archivo está vacío o no contiene filas con datos."]);
          return;
        }

        const mappedRows: any[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2; // Número de fila real para retroalimentación amigable

          const getVal = (keywords: string[], defaultVal: any = "") => {
            const foundKey = Object.keys(row).find(k => 
              keywords.some(keyword => k.toLowerCase().trim().includes(keyword.toLowerCase()))
            );
            return foundKey !== undefined ? row[foundKey] : defaultVal;
          };

          const rawName = getVal(["nombre", "name", "producto", "artículo", "articulo"]);
          const rawSku = getVal(["sku", "código", "codigo", "code"]);
          const rawCategory = getVal(["categoría", "categoria", "category"]);
          const rawStock = getVal(["stock", "cantidad", "stock actual", "quantity", "cant"]);
          const rawMinStock = getVal(["stock mínimo", "stock minimo", "min_stock", "minstock", "alerta", "mínimo", "minimo"]);
          const rawPrice = getVal(["precio de venta", "precio venta", "precio", "price", "venta", "publico", "p. venta"]);
          const rawCost = getVal(["costo unitario", "costo", "cost", "unitario", "c. unitario", "costo unit"]);

          if (!rawName || String(rawName).trim() === "") {
            errors.push(`Fila ${rowNum}: El 'Nombre del Producto' es obligatorio.`);
            return;
          }

          // Validación de números enteros y flotantes
          const parsedStock = parseInt(rawStock);
          const stockVal = isNaN(parsedStock) ? 0 : Math.max(0, parsedStock);

          const parsedMinStock = parseInt(rawMinStock);
          const minStockVal = isNaN(parsedMinStock) ? 5 : Math.max(0, parsedMinStock);

          const parsedPrice = parseFloat(rawPrice);
          const priceVal = isNaN(parsedPrice) ? 0.0 : Math.max(0, parsedPrice);

          const parsedCost = parseFloat(rawCost);
          const costVal = isNaN(parsedCost) ? 0.0 : Math.max(0, parsedCost);

          // Estandarización de categorías a nuestro enum de BarrioPro
          let catVal = "Otros Comercios";
          const normalizedCat = String(rawCategory || "").trim().toLowerCase();
          if (normalizedCat.includes("abarrote")) catVal = "Abarrotes";
          else if (normalizedCat.includes("ferre")) catVal = "Ferretería";
          else if (normalizedCat.includes("drog") || normalizedCat.includes("medic") || normalizedCat.includes("farmac")) catVal = "Droguería";
          else if (normalizedCat.includes("carn") || normalizedCat.includes("res") || normalizedCat.includes("cerdo") || normalizedCat.includes("pollo")) catVal = "Carnicería";
          else if (normalizedCat.includes("legum") || normalizedCat.includes("verdu") || normalizedCat.includes("fruta") || normalizedCat.includes("fruver") || normalizedCat.includes("legumbr")) catVal = "Legumbrería";
          else if (normalizedCat.includes("digit") || normalizedCat.includes("acces") || normalizedCat.includes("cel") || normalizedCat.includes("tecno")) catVal = "Tienda Digital (Accesorios)";
          else if (normalizedCat.includes("papel") || normalizedCat.includes("util") || normalizedCat.includes("librer") || normalizedCat.includes("cuadern")) catVal = "Papelería";
          else {
            // Buscar coincidencia exacta
            const exactCat = categories.find(c => c.toLowerCase() === normalizedCat);
            if (exactCat && exactCat !== "Todas") catVal = exactCat;
          }

          mappedRows.push({
            name: String(rawName).trim(),
            sku: String(rawSku || "").trim() || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
            category: catVal,
            stock: stockVal,
            minStock: minStockVal,
            price: priceVal,
            cost: costVal,
            updatedAt: new Date().toISOString()
          });
        });

        setBulkProducts(mappedRows);
        setBulkErrors(errors);
      } catch (err) {
        console.error("Error al leer archivo Excel: ", err);
        setBulkErrors(["Error al interpretar el archivo. Asegúrate de que no esté protegido o corrupto."]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /**
   * @function handleDescargarPlantilla
   * @description Genera dinámicamente un archivo .xlsx de ejemplo con los encabezados adecuados para facilitarle la vida al usuario.
   */
  const handleDescargarPlantilla = async () => {
    try {
      const templateData = [
        {
          "Nombre del Producto": "Arroz Diana 1kg",
          "SKU / Código": "ARR-101",
          "Categoría": "Abarrotes",
          "Stock Actual": 50,
          "Stock Mínimo": 10,
          "Precio de Venta": 4500,
          "Costo Unitario": 3200
        },
        {
          "Nombre del Producto": "Martillo de Uña 16oz",
          "SKU / Código": "FER-202",
          "Categoría": "Ferretería",
          "Stock Actual": 15,
          "Stock Mínimo": 3,
          "Precio de Venta": 18000,
          "Costo Unitario": 12500
        },
        {
          "Nombre del Producto": "Leche Entera Colanta 1L",
          "SKU / Código": "LAC-303",
          "Categoría": "Lácteos",
          "Stock Actual": 24,
          "Stock Mínimo": 6,
          "Precio de Venta": 3900,
          "Costo Unitario": 2900
        },
        {
          "Nombre del Producto": "Tomate Chonto 1kg",
          "SKU / Código": "LEG-404",
          "Categoría": "Legumbres",
          "Stock Actual": 12,
          "Stock Mínimo": 4,
          "Precio de Venta": 3000,
          "Costo Unitario": 1800
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Productos");
      XLSX.writeFile(workbook, "Plantilla_Carga_Masiva_BarrioPro.xlsx");
    } catch (error) {
      alert("Error al descargar la plantilla.");
    }
  };

  /**
   * @function handleIniciarCargaMasiva
   * @description Inserta secuencialmente todos los productos precargados en la colección de Firestore, actualizando el progreso visual.
   */
  const handleIniciarCargaMasiva = async () => {
    if (bulkProducts.length === 0) return;

    setIsProcessingBulk(true);
    setBulkProgress(0);
    let successCount = 0;

    for (let i = 0; i < bulkProducts.length; i++) {
      try {
        await db.addProduct(userId, bulkProducts[i]);
        successCount++;
        setBulkSuccessCount(successCount);
        setBulkProgress(Math.round(((i + 1) / bulkProducts.length) * 100));
      } catch (error) {
        console.error("Error al cargar producto masivo individual: ", error);
      }
    }

    setIsProcessingBulk(false);

    setAlertDialog({
      isOpen: true,
      title: "Carga Masiva Completada",
      message: `¡Fantástico! Se han cargado con éxito ${successCount} de ${bulkProducts.length} productos nuevos a tu inventario de BarrioPro.`,
      type: "success"
    });

    // Resetear estados de carga masiva
    setBulkFile(null);
    setBulkProducts([]);
    setBulkErrors([]);
    setShowBulkUpload(false);
  };

  /**
   * @function handleCargarDatosEdicion
   * @description Carga la información de un producto seleccionado para desplegar el modal de edición.
   * @param {Product} product - Producto a editar.
   */
  const handleCargarDatosEdicion = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSku(product.sku || "");
    setEditCategory(product.category);
    setEditStock(product.stock);
    setEditMinStock(product.minStock || 5);
    setEditPrice(product.price);
    setEditCost(product.cost !== undefined ? product.cost : 0.0);
  };

  /**
   * @function handleGuardarEdicionProducto
   * @description Envía los campos modificados del producto a Firestore y cierra el modal.
   * Paso 1: Validar que el nombre del producto no esté vacío.
   * Paso 2: Ejecutar updateDoc con los valores numéricos sanitizados.
   * Paso 3: Limpiar el estado de edición.
   * @param {React.FormEvent} e - Evento de envío del formulario.
   */
  const handleGuardarEdicionProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id || !editName.trim()) return;

    setSavingEdit(true);
    try {
      await db.updateProduct(userId, editingProduct.id, {
        name: editName.trim(),
        sku: editSku.trim(),
        category: editCategory,
        stock: Number(editStock),
        minStock: Number(editMinStock),
        price: Number(editPrice),
        cost: Number(editCost),
        updatedAt: new Date().toISOString()
      });
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
    } finally {
      setSavingEdit(false);
    }
  };

  // --- Lógica de Filtros y Ordenamiento ---
  const umbralCritico = Number(profile?.umbralStockCritico ?? profile?.lowStockThreshold ?? 5);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
    const matchesCritical = !filterCriticalOnly || Number(p.stock) <= umbralCritico;
    return matchesSearch && matchesCategory && matchesCritical;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let factor = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "name") {
      return a.name.localeCompare(b.name) * factor;
    } else if (sortBy === "stock") {
      return (a.stock - b.stock) * factor;
    } else if (sortBy === "price") {
      return (a.price - b.price) * factor;
    }
    return 0;
  });

  /**
   * @function handleAlternarOrdenamiento
   * @description Alterna la columna o la dirección de ordenamiento actual de la tabla de productos.
   * @param {"name" | "stock" | "price"} field - Campo objetivo por el cual ordenar.
   */
  const handleAlternarOrdenamiento = (field: "name" | "stock" | "price") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Summary Metrics
  const totalProductsCount = products.length;
  const criticalStockCount = products.filter(p => p.stock <= umbralCritico).length;
  const totalValuation = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const totalInvestment = products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);

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
        <div className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-6 shadow-xs space-y-4 animate-in slide-in-from-top duration-300">
          <h3 className="font-bold text-brand-primary text-sm flex items-center gap-2">
            <Plus size={18} />
            Agregar Nuevo Producto al Catálogo
          </h3>

          <form onSubmit={handleRegistrarNuevoProducto} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-brand-muted mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ej: Pan Tajado Grande"
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden"
              >
                {formCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">SKU / Código</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Autogenerado"
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Stock Actual</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Precio de Venta ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                min="0"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingProduct}
                className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-5 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loadingProduct ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                Registrar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Carga Masiva (Excel/CSV) Form */}
      {showBulkUpload && (
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
            {/* Zona de Carga y Arrastre (Col 5) */}
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

            {/* Previsualización y Ejecución (Col 7) */}
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
            <span>Stock Crítico ({products.filter(p => p.stock <= umbralCritico).length})</span>
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
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
          <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
            <Layers size={18} className="text-brand-primary" />
            Productos Registrados ({sortedProducts.length})
          </h3>
          <span className="text-[11px] text-brand-muted font-medium">Click en columnas para ordenar</span>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="text-center py-12 text-brand-muted">
            <Package className="mx-auto mb-3 text-brand-border" size={40} />
            <p className="text-sm font-medium text-brand-text">No se encontraron productos</p>
            <p className="text-xs mt-1">Prueba cambiando los filtros o agrega un nuevo producto para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-brand-muted">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted font-bold uppercase tracking-wider bg-brand-bg/40">
                  <th onClick={() => handleAlternarOrdenamiento("name")} className="py-3 px-3 cursor-pointer hover:text-brand-text select-none rounded-l-xl">
                    <span className="flex items-center gap-1">
                      Producto
                      <ArrowUpDown size={12} className="text-brand-muted" />
                    </span>
                  </th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3 font-mono">SKU</th>
                  <th onClick={() => handleAlternarOrdenamiento("stock")} className="py-3 px-3 text-right cursor-pointer hover:text-brand-text select-none">
                    <span className="flex items-center justify-end gap-1">
                      Stock / Alerta
                      <ArrowUpDown size={12} className="text-brand-muted" />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-right">Costo Unit.</th>
                  <th onClick={() => handleAlternarOrdenamiento("price")} className="py-3 px-3 text-right cursor-pointer hover:text-brand-text select-none">
                    <span className="flex items-center justify-end gap-1">
                      P. Venta
                      <ArrowUpDown size={12} className="text-brand-muted" />
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center">Ajuste Rápido</th>
                  <th className="py-3 px-3 text-center rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-bg">
                {sortedProducts.map((p) => {
                  const isStockBajo = p.stock <= umbralCritico;
                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors border-b border-brand-border ${
                        isStockBajo 
                          ? "bg-amber-50/50 hover:bg-amber-100/40 border-l-4 border-l-amber-500" 
                          : "hover:bg-brand-bg"
                      }`}
                    >
                      <td className="py-3.5 px-3 font-semibold text-brand-text">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          {isStockBajo && (
                            <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 mt-0.5 animate-pulse">
                              <AlertCircle size={10} className="text-amber-600" />
                              Stock Crítico
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-bg border border-brand-border text-brand-text">
                          <Tag size={10} className="text-brand-primary" />
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-brand-muted">{p.sku}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`font-bold text-sm ${isStockBajo ? "text-amber-700 font-extrabold" : "text-brand-text"}`}>
                          {p.stock}
                        </span>{" "}
                        / <span className="text-brand-muted" title="Umbral de stock crítico">{umbralCritico}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-brand-muted">
                        ${p.cost !== undefined ? p.cost.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-brand-text">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleAjustarStockRapido(p, -1)}
                            className="text-brand-muted hover:text-rose-600 p-1 transition-transform active:scale-90 cursor-pointer"
                            title="Descontar 1 de stock"
                          >
                            <MinusCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleAjustarStockRapido(p, 1)}
                            className="text-brand-muted hover:text-brand-primary p-1 transition-transform active:scale-90 cursor-pointer"
                            title="Aumentar 1 de stock"
                          >
                            <PlusCircle size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleCargarDatosEdicion(p)}
                            className="text-brand-muted hover:text-brand-primary p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
                            title="Editar producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleEliminarProductoDeInventario(p.id!)}
                            className="text-brand-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Editar Producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-brand-border bg-brand-bg/30 px-6 py-4">
              <h3 className="font-bold text-brand-text text-sm flex items-center gap-2">
                <Edit2 size={16} className="text-brand-primary" />
                Editar Producto: <span className="text-brand-primary">{editingProduct.name}</span>
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-brand-muted hover:text-brand-text rounded-lg p-1 transition-colors cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleGuardarEdicionProducto} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-brand-muted mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Categoría</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-brand-border px-3 py-2.5 text-sm bg-white text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden"
                  >
                    {formCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">SKU / Código</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Precio de Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text"
                    min="0"
                  />
                </div>
              </div>

              {/* Botonera del Modal */}
              <div className="flex justify-end gap-2 border-t border-brand-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-5 py-2 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación Personalizado */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-brand-text text-base">{confirmDialog.title}</h4>
                <p className="text-xs text-brand-muted leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Alerta Personalizado */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                alertDialog.type === "success" 
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-600" 
                  : alertDialog.type === "warning"
                  ? "bg-amber-50 border border-amber-100 text-amber-600"
                  : "bg-brand-primary/10 border border-brand-primary/20 text-brand-primary"
              }`}>
                {alertDialog.type === "success" ? (
                  <CheckCircle2 size={24} />
                ) : alertDialog.type === "warning" ? (
                  <AlertCircle size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-brand-text text-base">{alertDialog.title}</h4>
                <p className="text-xs text-brand-muted leading-relaxed">{alertDialog.message}</p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setAlertDialog(null)}
                  className="rounded-xl bg-brand-primary hover:bg-brand-primary-dark px-6 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { readSpreadsheetRows, SpreadsheetFormatError } from "../lib/spreadsheet";
import { toCsv } from "../lib/csv";
import { Product, BusinessProfile } from "../types";
import { db } from "../lib/insforge";
import { isCriticalStock } from "../lib/stock";
import { useDialogs } from "./use-dialogs";
import { showErrorToast } from "../lib/toast";
import { categoryOptions, defaultCategory, normalizeCategory } from "../lib/businessTypes";

interface UseInventoryProps {
  products: Product[];
  profile: BusinessProfile | null;
  userId: string;
  initialFilterCritical?: boolean;
  searchQueryParam?: string;
  onClearSearchParam?: () => void;
}

export function useInventory({
  products,
  profile,
  userId,
  initialFilterCritical = false,
  searchQueryParam = "",
  onClearSearchParam
}: UseInventoryProps) {
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

  useEffect(() => {
    setFilterCriticalOnly(initialFilterCritical);
    if (initialFilterCritical) {
      setSearchQuery("");
      setSelectedCategory("Todas");
    }
  }, [initialFilterCritical]);

  useEffect(() => {
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
  const [category, setCategory] = useState(() => defaultCategory(userId));
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [price, setPrice] = useState(1.0);
  const [cost, setCost] = useState(0.6);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Editing Product States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editCategory, setEditCategory] = useState(() => defaultCategory(userId));
  const [editStock, setEditStock] = useState(10);
  const [editMinStock, setEditMinStock] = useState(5);
  const [editPrice, setEditPrice] = useState(1.0);
  const [editCost, setEditCost] = useState(0.6);
  const [savingEdit, setSavingEdit] = useState(false);

  // --- Diálogos y Alertas Personalizados (compartidos, ver use-dialogs.ts) ---
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, alert: showAlertDialog } = useDialogs();

  // Categorías: las sugeridas para el tipo de negocio + las que ya usan los productos
  // (así una categoría escrita a mano o importada desde Excel nunca desaparece).
  const categories = useMemo(
    () => ["Todas", ...categoryOptions(userId, products.map((p) => p.category))],
    [userId, products]
  );
  const formCategories = categories.filter(c => c !== "Todas");

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
      
      setProdName("");
      setSku("");
      setStock(10);
      setMinStock(5);
      setPrice(1.0);
      setCost(0.6);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding product:", error);
      showErrorToast("No se pudo guardar el producto. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleEliminarProductoDeInventario = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Eliminar Producto del Inventario",
      message: "¿Estás seguro de que deseas eliminar permanentemente este producto del inventario? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await db.deleteProduct(userId, id);
          showAlertDialog("Producto Eliminado", "El artículo ha sido eliminado del inventario con éxito.", "success");
        } catch (error) {
          console.error("Error deleting product:", error);
          showErrorToast("No se pudo eliminar el producto. Verifica tu conexión e inténtalo de nuevo.");
        }
      }
    });
  };

  const handleAjustarStockRapido = async (product: Product, amount: number) => {
    if (!product.id) return;
    try {
      await db.adjustStock(userId, product.id, amount);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      showErrorToast("No se pudo ajustar el stock. Verifica tu conexión e inténtalo de nuevo.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const MAX_BULK_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const MAX_BULK_ROWS = 5000;

  const processFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xls")) {
      alert("El formato .xls antiguo ya no se admite. En Excel usa Guardar como → .xlsx (o .csv) y vuelve a subirlo.");
      return;
    }
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
      alert("Por favor selecciona un archivo de Excel (.xlsx) o un CSV (.csv).");
      return;
    }

    // Se limita el tamaño del archivo y el número de filas como protección frente a archivos maliciosos o enormes.
    if (file.size > MAX_BULK_FILE_SIZE_BYTES) {
      alert("El archivo supera el tamaño máximo permitido (5 MB). Divide tu inventario en archivos más pequeños.");
      return;
    }

    setBulkFile(file);
    setBulkProducts([]);
    setBulkErrors([]);
    setBulkSuccessCount(0);
    setBulkProgress(0);

    try {
      {
        let rows: any[] = await readSpreadsheetRows(file);

        if (rows.length === 0) {
          setBulkErrors(["El archivo está vacío o no contiene filas con datos."]);
          return;
        }

        const mappedRows: any[] = [];
        const errors: string[] = [];

        if (rows.length > MAX_BULK_ROWS) {
          errors.push(`El archivo tiene ${rows.length} filas; solo se procesarán las primeras ${MAX_BULK_ROWS}. Divide el archivo en partes más pequeñas.`);
          rows = rows.slice(0, MAX_BULK_ROWS);
        }

        rows.forEach((row, index) => {
          const rowNum = index + 2;

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

          const parsedStock = parseInt(rawStock);
          const stockVal = isNaN(parsedStock) ? 0 : Math.max(0, parsedStock);

          const parsedMinStock = parseInt(rawMinStock);
          const minStockVal = isNaN(parsedMinStock) ? 5 : Math.max(0, parsedMinStock);

          const parsedPrice = parseFloat(rawPrice);
          const priceVal = isNaN(parsedPrice) ? 0.0 : Math.max(0, parsedPrice);

          const parsedCost = parseFloat(rawCost);
          const costVal = isNaN(parsedCost) ? 0.0 : Math.max(0, parsedCost);

          const catVal = normalizeCategory(rawCategory, formCategories);

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
      }
    } catch (err) {
      console.error("Error al leer el archivo: ", err);
      setBulkErrors([
        err instanceof SpreadsheetFormatError
          ? err.message
          : "Error al interpretar el archivo. Asegúrate de que no esté protegido o corrupto.",
      ]);
    }
  };

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
        }
      ];

      // Plantilla en CSV (se abre directo en Excel y evita depender de una librería para escribir .xlsx).
      const headers = Object.keys(templateData[0]);
      const csv = toCsv(headers, templateData.map((row) => headers.map((h) => (row as Record<string, unknown>)[h])));
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "Plantilla_Carga_Masiva_Tiendly.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      showErrorToast("Error al descargar la plantilla.");
    }
  };

  const handleIniciarCargaMasiva = async () => {
    if (bulkProducts.length === 0) return;

    setIsProcessingBulk(true);
    setBulkProgress(0);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < bulkProducts.length; i++) {
      try {
        await db.addProduct(userId, bulkProducts[i]);
        successCount++;
        setBulkSuccessCount(successCount);
      } catch (error) {
        console.error("Error al cargar producto masivo individual: ", error);
        failedCount++;
      } finally {
        setBulkProgress(Math.round(((i + 1) / bulkProducts.length) * 100));
      }
    }

    setIsProcessingBulk(false);

    showAlertDialog(
      failedCount > 0 ? "Carga Masiva Completada con Errores" : "Carga Masiva Completada",
      failedCount > 0
        ? `Se cargaron ${successCount} de ${bulkProducts.length} productos. ${failedCount} no se pudieron guardar por un problema de conexión — revisa tu inventario y vuelve a intentar con esos productos si hace falta.`
        : `¡Fantástico! Se han cargado con éxito ${successCount} de ${bulkProducts.length} productos nuevos a tu inventario de Tiendly.`,
      failedCount > 0 ? "warning" : "success"
    );

    setBulkFile(null);
    setBulkProducts([]);
    setBulkErrors([]);
    setShowBulkUpload(false);
  };

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
      showErrorToast("No se pudieron guardar los cambios del producto. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setSavingEdit(false);
    }
  };

  const umbralCritico = Number(profile?.umbralStockCritico ?? profile?.lowStockThreshold ?? 5);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "Todas" || p.category === selectedCategory;
      const matchesCritical = !filterCriticalOnly || isCriticalStock(p);
      return matchesSearch && matchesCategory && matchesCritical;
    });
  }, [products, searchQuery, selectedCategory, filterCriticalOnly]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
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
  }, [filteredProducts, sortBy, sortOrder]);

  const handleAlternarOrdenamiento = (field: "name" | "stock" | "price") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const totalProductsCount = products.length;
  const criticalStockCount = products.filter(isCriticalStock).length;
  const totalValuation = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const totalInvestment = products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
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
    filteredProducts,
    sortedProducts,
    totalProductsCount,
    criticalStockCount,
    totalValuation,
    totalInvestment
  };
}

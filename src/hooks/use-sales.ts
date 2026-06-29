import React, { useState, useMemo } from "react";
import { Product, Sale } from "../types";
import { db } from "../lib/insforge";
import { generateReceiptPDF, exportSalesPDF } from "../lib/pdf";

interface UseSalesProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export function useSales({ products, sales, userId }: UseSalesProps) {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState("Todas");
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Transferencia" | "Fiado">("Efectivo");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lastRegisteredSale, setLastRegisteredSale] = useState<Sale | null>(null);
  const [dueDate, setDueDate] = useState("");

  // Edit/Delete Sale States
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Transferencia" | "Fiado">("Efectivo");
  const [editTotal, setEditTotal] = useState(0);

  const handleCatalogSearchChange = (val: string) => {
    setCatalogSearch(val);
    setActiveCatalogIndex(0);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCatalogCategory(cat);
    setActiveCatalogIndex(0);
  };

  const handleAddToCart = (product: Product) => {
    setSuccessMessage("");
    setLastRegisteredSale(null);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`No puedes agregar más unidades de ${product.name}. Stock máximo alcanzado (${product.stock}).`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    if (qty > item.product.stock) {
      alert(`No puedes agregar más unidades de ${item.product.name}. Stock disponible: ${item.product.stock}`);
      return;
    }
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return sales
      .filter(s => {
        const d = new Date(s.timestamp);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [sales]);

  const statsMes = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;
    let fiado = 0;
    
    currentMonthSales.forEach(s => {
      total += s.total;
      if (s.paymentMethod === "Tarjeta") {
        tarjeta += s.total;
      } else if (s.paymentMethod === "Transferencia") {
        transferencia += s.total;
      } else if (s.paymentMethod === "Fiado") {
        fiado += s.total;
      } else {
        efectivo += s.total;
      }
    });

    return {
      total,
      count: currentMonthSales.length,
      efectivo,
      tarjeta,
      transferencia,
      fiado,
      promedio: currentMonthSales.length > 0 ? total / currentMonthSales.length : 0
    };
  }, [currentMonthSales]);

  const currentWeekSalesData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const daysMap: { [key: number]: { name: string; total: number; count: number } } = {
      1: { name: "Lunes", total: 0, count: 0 },
      2: { name: "Martes", total: 0, count: 0 },
      3: { name: "Miércoles", total: 0, count: 0 },
      4: { name: "Jueves", total: 0, count: 0 },
      5: { name: "Viernes", total: 0, count: 0 },
      6: { name: "Sábado", total: 0, count: 0 },
      0: { name: "Domingo", total: 0, count: 0 },
    };

    sales.forEach(sale => {
      const saleDate = new Date(sale.timestamp);
      if (saleDate >= startOfWeek && saleDate <= endOfWeek) {
        const day = saleDate.getDay();
        if (daysMap[day] !== undefined) {
          daysMap[day].total += sale.total;
          daysMap[day].count += 1;
        }
      }
    });

    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map(d => ({
      name: daysMap[d].name,
      "Total Ventas": daysMap[d].total,
      "Transacciones": daysMap[d].count,
    }));
  }, [sales]);

  const totalWeeklySales = useMemo(() => {
    return currentWeekSalesData.reduce((acc, curr) => acc + curr["Total Ventas"], 0);
  }, [currentWeekSalesData]);

  const handleGenerateReceiptPDF = (sale: Sale) => {
    generateReceiptPDF(sale);
  };

  const handleExportPDF = () => {
    setExportingPdf(true);
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const now = new Date();
    const currentMonthName = meses[now.getMonth()];
    const currentYear = now.getFullYear();

    exportSalesPDF(currentMonthSales, statsMes, currentMonthName, currentYear);
    setExportingPdf(false);
  };

  const availableProducts = useMemo(() => {
    return [...products]
      .filter(p => p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const catalogCategories = useMemo(() => {
    const cats = new Set<string>();
    availableProducts.forEach(p => {
      if (p.category) {
        cats.add(p.category);
      }
    });
    return ["Todas", ...Array.from(cats).sort()];
  }, [availableProducts]);

  const filteredCatalogProducts = useMemo(() => {
    return availableProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
      const matchesCategory = selectedCatalogCategory === "Todas" || p.category === selectedCatalogCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableProducts, catalogSearch, selectedCatalogCategory]);

  const todaySalesData = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTransactions = sales.filter(s => new Date(s.timestamp).toDateString() === todayStr);
    const totalVentas = todayTransactions.reduce((sum, s) => sum + s.total, 0);
    return {
      total: totalVentas,
      count: todayTransactions.length
    };
  }, [sales]);

  const lastTenSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [sales]);

  const handleStartEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditClientName(sale.clientName || "");
    setEditPaymentMethod((sale.paymentMethod as any) || "Efectivo");
    setEditTotal(sale.total);
  };

  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !editingSale.id) return;
    try {
      const oldPaymentMethod = editingSale.paymentMethod;
      const oldTotal = editingSale.total;
      const oldClientName = editingSale.clientName;

      const updatedFields = {
        clientName: editClientName.trim() || "Consumidor Final",
        paymentMethod: editPaymentMethod,
        total: editTotal
      };

      await db.updateSale(userId, editingSale.id, updatedFields);

      if (oldPaymentMethod === "Fiado" && editPaymentMethod !== "Fiado") {
        try {
          const userDebts = await db.getDebts(userId);
          const matchingDebt = userDebts.find(d => d.clientName === oldClientName && Math.abs(d.amount - oldTotal) < 0.01 && !d.paid);
          if (matchingDebt && matchingDebt.id) {
            await db.deleteDebt(userId, matchingDebt.id);
          }
        } catch (error) {
          console.error("Error al eliminar la deuda al cambiar método de pago:", error);
        }
      }
      else if (oldPaymentMethod !== "Fiado" && editPaymentMethod === "Fiado") {
        try {
          const defaultDueDate = new Date();
          defaultDueDate.setDate(defaultDueDate.getDate() + 15);
          const formattedDueDate = defaultDueDate.toISOString().split("T")[0];

          const newDebt = {
            clientName: editClientName.trim() || "Cliente Sin Nombre",
            amount: editTotal,
            dueDate: formattedDueDate,
            paid: false,
            createdAt: new Date().toISOString()
          };
          await db.addDebt(userId, newDebt);
        } catch (error) {
          console.error("Error al registrar deuda automática al cambiar método de pago:", error);
        }
      }
      else if (oldPaymentMethod === "Fiado" && editPaymentMethod === "Fiado") {
        try {
          const userDebts = await db.getDebts(userId);
          const matchingDebt = userDebts.find(d => d.clientName === oldClientName && Math.abs(d.amount - oldTotal) < 0.01 && !d.paid);
          if (matchingDebt && matchingDebt.id) {
            await db.updateDebt(userId, matchingDebt.id, {
              clientName: editClientName.trim(),
              amount: editTotal
            });
          }
        } catch (error) {
          console.error("Error al actualizar la deuda vinculada:", error);
        }
      }

      setEditingSale(null);
      alert("Venta actualizada correctamente.");
    } catch (err) {
      console.error("Error editing sale:", err);
      alert("Error al intentar guardar los cambios.");
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta venta registrada? Esta acción restaurará el stock de los productos vendidos y eliminará la cuenta fiada asociada si corresponde.")) return;
    try {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (!saleToDelete) return;

      await db.deleteSale(userId, saleId);

      if (saleToDelete.paymentMethod === "Fiado") {
        try {
          const userDebts = await db.getDebts(userId);
          const matchingDebt = userDebts.find(d => d.clientName === saleToDelete.clientName && Math.abs(d.amount - saleToDelete.total) < 0.01 && !d.paid);
          if (matchingDebt && matchingDebt.id) {
            await db.deleteDebt(userId, matchingDebt.id);
          }
        } catch (error) {
          console.error("Error al intentar auto-eliminar deuda asociada:", error);
        }
      }

      if (saleToDelete.items) {
        for (const item of saleToDelete.items) {
          const prod = products.find(p => p.id === item.productId || p.name === item.name);
          if (prod && prod.id) {
            await db.updateProduct(userId, prod.id, {
              stock: prod.stock + item.quantity,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      alert("Venta eliminada correctamente.");
    } catch (error) {
      console.error("Error al eliminar venta:", error);
      alert("No se pudo eliminar la venta.");
    }
  };

  const handleRegistrarVenta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        alert(`No hay suficiente stock para el producto "${item.product.name}". Disponible: ${item.product.stock}`);
        return;
      }
    }

    setLoading(true);
    setSuccessMessage("");

    if (paymentMethod === "Fiado") {
      if (!clientName.trim()) {
        alert("Por favor ingresa el nombre del cliente para registrar la venta a crédito (Fiado).");
        setLoading(false);
        return;
      }
      if (!dueDate) {
        alert("Por favor ingresa la fecha de vencimiento para la cuenta fiada.");
        setLoading(false);
        return;
      }
    }

    try {
      const saleTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const saleItems = cart.map(item => ({
        productId: item.product.id || "",
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      const newSale: Omit<Sale, "id"> = {
        items: saleItems,
        total: saleTotal,
        timestamp: new Date().toISOString(),
        clientName: clientName.trim() || "Consumidor Final",
        paymentMethod: paymentMethod
      };

      const saleId = await db.addSale(userId, newSale);

      if (paymentMethod === "Fiado") {
        try {
          const newDebt = {
            clientName: clientName.trim(),
            amount: saleTotal,
            dueDate: dueDate,
            paid: false,
            createdAt: new Date().toISOString()
          };
          await db.addDebt(userId, newDebt);
        } catch (debtError) {
          console.error("Error al registrar la deuda automáticamente en InsForge:", debtError);
        }
      }

      for (const item of cart) {
        const finalStock = Math.max(0, item.product.stock - item.quantity);
        await db.updateProduct(userId, item.product.id!, {
          stock: finalStock,
          updatedAt: new Date().toISOString()
        });
      }

      setSuccessMessage(`¡Venta de ${cart.length} productos registrada con éxito! Total: $${saleTotal.toLocaleString("es-CO")}`);
      
      const registeredSale: Sale = {
        ...newSale,
        id: saleId
      };
      setLastRegisteredSale(registeredSale);
      
      setCart([]);
      setClientName("");
      setDueDate("");
      setPaymentMethod("Efectivo");
    } catch (error) {
      console.error("Error completing sale checkout:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    cart,
    setCart,
    catalogSearch,
    setCatalogSearch,
    activeCatalogIndex,
    setActiveCatalogIndex,
    selectedCatalogCategory,
    setSelectedCatalogCategory,
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
    statsMes,
    currentWeekSalesData,
    totalWeeklySales,
    availableProducts,
    catalogCategories,
    filteredCatalogProducts,
    todaySalesData,
    lastTenSales
  };
}

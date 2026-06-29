import React, { useState, useMemo } from "react";
import { Product, Sale } from "../types";
import { db } from "../lib/insforge";
import { loadDemoDataToFirestore } from "../lib/demoData";
import { jsPDF } from "jspdf";

interface UseDashboardProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export function useDashboard({ products, sales, userId }: UseDashboardProps) {
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [quickCart, setQuickCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [activeQuickIndex, setActiveQuickIndex] = useState(0);
  const [loadingSale, setLoadingSale] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleQuickSearchChange = (val: string) => {
    setQuickSearch(val);
    setActiveQuickIndex(0);
  };

  const handleAddToQuickCart = (product: Product) => {
    setQuickCart(prev => {
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

  const handleUpdateQuickQuantity = (productId: string, qty: number) => {
    const item = quickCart.find(i => i.product.id === productId);
    if (!item) return;
    if (qty > item.product.stock) {
      alert(`No puedes agregar más unidades de ${item.product.name}. Stock disponible: ${item.product.stock}`);
      return;
    }
    if (qty <= 0) {
      handleRemoveFromQuickCart(productId);
      return;
    }
    setQuickCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveFromQuickCart = (productId: string) => {
    setQuickCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const filteredModalProducts = useMemo(() => {
    const available = products.filter(p => p.stock > 0);
    if (!quickSearch.trim()) return available;
    const query = quickSearch.toLowerCase();
    return available.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, quickSearch]);

  const handleCargarDatosDeDemostracion = async () => {
    if (!window.confirm("¿Deseas cargar productos de muestra y ventas ficticias? Esto agregará stock inicial, checklists y ventas de los últimos días para ver el panel en acción.")) return;
    setLoadingDemo(true);
    try {
      await loadDemoDataToFirestore(userId);
      alert("¡Datos de muestra y ventas ficticias cargados exitosamente!");
      window.location.reload();
    } catch (error) {
      console.error("Error al poblar datos de muestra en Firestore:", error);
    } finally {
      setLoadingDemo(false);
    }
  };

  const totalSalesCount = sales.length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySales = useMemo(() => sales.filter(s => s.timestamp.startsWith(todayStr)), [sales, todayStr]);
  const todayTotalEarnings = useMemo(() => todaySales.reduce((acc, curr) => acc + curr.total, 0), [todaySales]);

  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const yesterdaySales = useMemo(() => sales.filter(s => s.timestamp.startsWith(yesterdayStr)), [sales, yesterdayStr]);
  const yesterdayTotalEarnings = useMemo(() => yesterdaySales.reduce((acc, curr) => acc + curr.total, 0), [yesterdaySales]);

  const growthPercent = useMemo(() => {
    if (yesterdayTotalEarnings > 0) {
      return Math.round(((todayTotalEarnings - yesterdayTotalEarnings) / yesterdayTotalEarnings) * 100);
    } else if (todayTotalEarnings > 0) {
      return 100;
    }
    return 0;
  }, [todayTotalEarnings, yesterdayTotalEarnings]);

  const criticalProducts = useMemo(() => products.filter(p => p.stock <= (p.minStock * 0.15)), [products]);

  const popularItems = useMemo(() => {
    const productSalesCount: { [key: string]: { count: number; name: string } } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSalesCount[item.name]) {
          productSalesCount[item.name] = { count: 0, name: item.name };
        }
        productSalesCount[item.name].count += item.quantity;
      });
    });
    return Object.values(productSalesCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [sales]);

  const chartData = useMemo(() => {
    const daysData = [];
    const localeOptions: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric" };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const daySales = sales.filter(s => s.timestamp.split("T")[0] === dateStr);
      const total = daySales.reduce((sum, s) => sum + s.total, 0);
      
      daysData.push({
        date: date.toLocaleDateString("es-ES", localeOptions),
        monto: parseFloat(total.toFixed(2)),
        ventas: daySales.length,
      });
    }
    return daysData;
  }, [sales]);

  const obtenerNombreMesActual = () => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[new Date().getMonth()];
  };

  const mensualData = useMemo(() => {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();
    const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();

    const dataMes = [];
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const ventasDelDia = sales.filter(s => {
        try {
          const parts = s.timestamp.split("T")[0].split("-");
          if (parts.length === 3) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const d = parseInt(parts[2]);
            return y === añoActual && m === mesActual && d === dia;
          }
        } catch (e) {
          console.error("Error procesando fecha de venta:", e);
        }
        return false;
      });

      const totalDia = ventasDelDia.reduce((sum, s) => sum + s.total, 0);

      dataMes.push({
        day: dia,
        monto: parseFloat(totalDia.toFixed(2)),
        ventas: ventasDelDia.length
      });
    }

    return dataMes;
  }, [sales]);

  const totalVentasMes = useMemo(() => mensualData.reduce((sum, d) => sum + d.monto, 0), [mensualData]);
  const totalTransaccionesMes = useMemo(() => mensualData.reduce((sum, d) => sum + d.ventas, 0), [mensualData]);

  const handleExportPDF = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const todayStrFormatted = new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const currentMonthName = obtenerNombreMesActual();
      const primaryColor = [74, 90, 64]; 
      const textColor = [31, 41, 55];
      const lightGray = [107, 114, 128];

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("BARRIOPRO — REPORTE DE GESTIÓN", 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Informe Financiero e Inventario  |  Generado: ${todayStrFormatted}`, 15, 28);

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`1. RESUMEN DE VENTAS DE ${currentMonthName.toUpperCase()}`, 15, 48);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 50, 195, 50);

      doc.setFillColor(249, 250, 251);
      doc.rect(15, 54, 180, 26, "F");
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.rect(15, 54, 180, 26, "S");

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total Vendido en el Mes:", 20, 61);
      doc.setFont("helvetica", "normal");
      doc.text(`$${totalVentasMes.toFixed(2)}`, 85, 61);

      doc.setFont("helvetica", "bold");
      doc.text("Transacciones Realizadas:", 20, 67);
      doc.setFont("helvetica", "normal");
      doc.text(`${totalTransaccionesMes} ventas`, 85, 67);

      doc.setFont("helvetica", "bold");
      doc.text("Monto de Ticket Promedio:", 20, 73);
      doc.setFont("helvetica", "normal");
      const ticketPromedio = totalTransaccionesMes > 0 ? (totalVentasMes / totalTransaccionesMes) : 0;
      doc.text(`$${ticketPromedio.toFixed(2)} por venta`, 85, 73);

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("2. DESGLOSE DE VENTAS DIARIAS", 15, 90);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 92, 195, 92);

      doc.setFillColor(74, 90, 64);
      doc.rect(15, 96, 180, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Fecha / Día", 20, 101.5);
      doc.text("Monto Recaudado", 85, 101.5);
      doc.text("Ventas Concretadas", 150, 101.5);

      let currentY = 104;
      const filteredDays = mensualData.filter(d => d.ventas > 0);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      if (filteredDays.length === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(15, currentY, 180, 8, "F");
        doc.text("No se registran transacciones de venta en el mes actual.", 20, currentY + 5.5);
        currentY += 8;
      } else {
        filteredDays.forEach((d, idx) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
          }
          if (idx % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(15, currentY, 180, 6, "F");
          }
          doc.text(`Día ${d.day} de ${currentMonthName}`, 20, currentY + 4);
          doc.text(`$${d.monto.toFixed(2)}`, 85, currentY + 4);
          doc.text(`${d.ventas} transacción(es)`, 150, currentY + 4);
          currentY += 6;
        });
      }

      currentY += 8;
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("3. ESTADO Y VALORIZACIÓN DEL INVENTARIO", 15, currentY);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 6;

      const totalUniqueProducts = products.length;
      const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);
      const inventoryTotalValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
      const inventoryTotalCost = products.reduce((acc, p) => acc + (p.stock * (p.cost || 0)), 0);
      const expectedProfit = inventoryTotalValue - inventoryTotalCost;

      doc.setFillColor(249, 250, 251);
      doc.rect(15, currentY, 180, 32, "F");
      doc.setDrawColor(229, 231, 235);
      doc.rect(15, currentY, 180, 32, "S");

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      
      doc.text("Productos Únicos Registrados:", 20, currentY + 6);
      doc.setFont("helvetica", "normal");
      doc.text(`${totalUniqueProducts} productos`, 90, currentY + 6);

      doc.setFont("helvetica", "bold");
      doc.text("Total Unidades Disponibles:", 20, currentY + 12);
      doc.setFont("helvetica", "normal");
      doc.text(`${totalUnits} unidades en stock`, 90, currentY + 12);

      doc.setFont("helvetica", "bold");
      doc.text("Inversión en Bodega (Costo total):", 20, currentY + 18);
      doc.setFont("helvetica", "normal");
      doc.text(`$${inventoryTotalCost.toFixed(2)}`, 90, currentY + 18);

      doc.setFont("helvetica", "bold");
      doc.text("Valor de Venta del Stock:", 20, currentY + 24);
      doc.setFont("helvetica", "normal");
      doc.text(`$${inventoryTotalValue.toFixed(2)}`, 90, currentY + 24);

      doc.setFont("helvetica", "bold");
      doc.text("Margen Estimado de Ganancia:", 20, currentY + 30);
      doc.setFont("helvetica", "normal");
      doc.text(`$${expectedProfit.toFixed(2)}`, 90, currentY + 30);

      currentY += 38;

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(185, 28, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("4. ALERTAS DE REPOSICIÓN (STOCK CRÍTICO)", 15, currentY);

      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 6;

      const lowStockProducts = products.filter(p => p.stock <= (p.minStock * 0.15));

      if (lowStockProducts.length === 0) {
        doc.setTextColor(74, 90, 64);
        doc.setFont("helvetica", "bold");
        doc.text("¡Todo en orden! No tienes productos con stock crítico en este momento.", 20, currentY + 6);
        currentY += 12;
      } else {
        doc.setFillColor(185, 28, 28);
        doc.rect(15, currentY, 180, 8, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Producto", 20, currentY + 5.5);
        doc.text("Categoría", 85, currentY + 5.5);
        doc.text("Stock Act.", 140, currentY + 5.5);
        doc.text("Mínimo", 165, currentY + 5.5);
        doc.text("Pedir", 183, currentY + 5.5);

        currentY += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        lowStockProducts.forEach((p, idx) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
          }
          if (idx % 2 === 1) {
            doc.setFillColor(254, 242, 242);
            doc.rect(15, currentY, 180, 6, "F");
          }
          doc.setFont("helvetica", "bold");
          doc.text(p.name.substring(0, 32), 20, currentY + 4);
          doc.setFont("helvetica", "normal");
          doc.text(p.category || "Otros", 85, currentY + 4);
          
          doc.setTextColor(185, 28, 28);
          doc.setFont("helvetica", "bold");
          doc.text(`${p.stock}`, 142, currentY + 4);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFont("helvetica", "normal");

          doc.text(`${p.minStock}`, 167, currentY + 4);
          
          const suggestedToOrder = Math.max(10, p.minStock * 2 - p.stock);
          doc.setFont("helvetica", "bold");
          doc.text(`+${suggestedToOrder}`, 184, currentY + 4);
          doc.setFont("helvetica", "normal");

          currentY += 6;
        });
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.text(`Página ${i} de ${totalPages}`, 105, 287, { align: "center" });
        doc.text("Reporte Generado Automáticamente por BarrioPro — Tu Asistente Digital.", 15, 287);
      }

      doc.save(`Reporte_BarrioPro_${currentMonthName}_2026.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("No se pudo generar el reporte en PDF. Por favor reintenta.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleRegistrarVentaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCart.length === 0) return;

    for (const item of quickCart) {
      if (item.quantity > item.product.stock) {
        alert(`No hay suficiente stock para "${item.product.name}". Disponible: ${item.product.stock}`);
        return;
      }
    }

    setLoadingSale(true);
    try {
      const saleTotal = quickCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const saleItems = quickCart.map(item => ({
        productId: item.product.id || "",
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));

      const newSale: Omit<Sale, "id"> = {
        items: saleItems,
        total: Number(saleTotal.toFixed(2)),
        timestamp: new Date().toISOString()
      };

      await db.addSale(userId, newSale);

      for (const item of quickCart) {
        const updatedStock = Math.max(0, item.product.stock - item.quantity);
        await db.updateProduct(userId, item.product.id!, {
          stock: updatedStock,
          updatedAt: new Date().toISOString()
        });
      }
      
      setShowAddSaleModal(false);
      setQuickCart([]);
      setQuickSearch("");
    } catch (error) {
      console.error("Error in sale registration:", error);
    } finally {
      setLoadingSale(false);
    }
  };

  return {
    showAddSaleModal,
    setShowAddSaleModal,
    quickCart,
    setQuickCart,
    quickSearch,
    setQuickSearch,
    activeQuickIndex,
    setActiveQuickIndex,
    loadingSale,
    loadingDemo,
    handleQuickSearchChange,
    handleAddToQuickCart,
    handleUpdateQuickQuantity,
    handleRemoveFromQuickCart,
    handleCargarDatosDeDemostracion,
    totalSalesCount,
    todayStr,
    todaySales,
    todayTotalEarnings,
    yesterdayStr,
    yesterdaySales,
    yesterdayTotalEarnings,
    growthPercent,
    criticalProducts,
    popularItems,
    chartData,
    mensualData,
    totalVentasMes,
    totalTransaccionesMes,
    exportingPdf,
    handleExportPDF,
    handleRegistrarVentaRapida,
    filteredModalProducts,
    obtenerNombreMesActual
  };
}

import React, { useState, useMemo } from "react";
import { Product, Sale } from "../types";
import { loadDemoDataToFirestore } from "../lib/demoData";
import { isCriticalStock } from "../lib/stock";
import { registerSale } from "../lib/checkout";
import { showErrorToast, showSuccessToast } from "../lib/toast";
import { generateDashboardReportPDF } from "../lib/pdf";

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
          showErrorToast(`No puedes agregar más unidades de ${product.name}. Stock máximo alcanzado (${product.stock}).`);
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
      showErrorToast(`No puedes agregar más unidades de ${item.product.name}. Stock disponible: ${item.product.stock}`);
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
      // Ya no se recarga la página: el guardado ya notifica a la app para
      // refrescar los datos automáticamente (ver subscribeToData en insforge.ts).
      showSuccessToast("¡Datos de muestra y ventas ficticias cargados exitosamente!");
    } catch (error) {
      console.error("Error al poblar datos de muestra en Firestore:", error);
      showErrorToast("No se pudieron cargar los datos de muestra. Verifica tu conexión e inténtalo de nuevo.");
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

  const criticalProducts = useMemo(() => products.filter(isCriticalStock), [products]);

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
      generateDashboardReportPDF(products, mensualData, totalVentasMes, totalTransaccionesMes, obtenerNombreMesActual());
    } catch (err) {
      console.error("Error generating PDF:", err);
      showErrorToast("No se pudo generar el reporte en PDF. Por favor reintenta.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleRegistrarVentaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCart.length === 0) return;

    for (const item of quickCart) {
      if (item.quantity > item.product.stock) {
        showErrorToast(`No hay suficiente stock para "${item.product.name}". Disponible: ${item.product.stock}`);
        return;
      }
    }

    setLoadingSale(true);
    try {
      // "Venta Rápida" es un atajo de cobro en efectivo/mostrador: usa la
      // misma función de registro que el POS de Ventas (src/lib/checkout.ts)
      // para no mantener dos implementaciones de checkout por separado.
      await registerSale({ userId, cart: quickCart, clientName: "Consumidor Final", paymentMethod: "Efectivo" });

      setShowAddSaleModal(false);
      setQuickCart([]);
      setQuickSearch("");
      showSuccessToast("Venta registrada correctamente.");
    } catch (error) {
      console.error("Error in sale registration:", error);
      showErrorToast("No se pudo registrar la venta. Verifica tu conexión e inténtalo de nuevo.");
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

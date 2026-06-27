import React, { useState } from "react";
import { Product, Sale } from "../types";
import { AlertCircle, TrendingUp, Users, ShoppingBag, PlusCircle, CheckCircle2, RefreshCw, Sparkles, Download, Search, Trash2, Plus, Minus } from "lucide-react";
import { db } from "../lib/insforge";
import { loadDemoDataToFirestore } from "../lib/demoData";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-text text-white p-3 rounded-xl border border-brand-border shadow-md text-xs font-sans">
        <p className="font-bold mb-1 text-[10px] uppercase tracking-wider text-white/70">{label}</p>
        <p className="font-semibold text-white">Ventas: <span className="font-bold text-amber-400">${payload[0].value.toFixed(2)}</span></p>
        {payload[0].payload.ventas !== undefined && (
          <p className="text-white/80 text-[10px]">Transacciones: {payload[0].payload.ventas}</p>
        )}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-brand-text text-white p-3 rounded-xl border border-brand-border shadow-md text-xs font-sans">
        <p className="font-bold mb-1 text-[10px] uppercase tracking-wider text-white/70">Día {label}</p>
        <p className="font-semibold text-white">Total Vendido: <span className="font-bold text-amber-400">${payload[0].value.toFixed(2)}</span></p>
        {payload[0].payload.ventas !== undefined && (
          <p className="text-white/80 text-[10px]">Transacciones: {payload[0].payload.ventas}</p>
        )}
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  userId: string;
  onNavigateToCriticalStock?: () => void;
}

export default function Dashboard({ products, sales, userId, onNavigateToCriticalStock }: DashboardProps) {
  // --- Estados de la Interfaz de Usuario ---
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [quickCart, setQuickCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [activeQuickIndex, setActiveQuickIndex] = useState(0);
  const [loadingSale, setLoadingSale] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleQuickSearchChange = (val: string) => {
    setQuickSearch(val);
    setActiveQuickIndex(0);
  };

  // Quick Cart action helpers
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

  const filteredModalProducts = React.useMemo(() => {
    const available = products.filter(p => p.stock > 0);
    if (!quickSearch.trim()) return available;
    const query = quickSearch.toLowerCase();
    return available.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, quickSearch]);

  /**
   * @function handleCargarDatosDeDemostracion
   * @description Carga un conjunto completo de productos y transacciones ficticias en Firestore
   * para posibilitar una visualización realista de las finanzas y analíticas del comercio.
   * Paso 1: Confirmar acción mediante diálogo interactivo.
   * Paso 2: Invocar sembrador masivo en lote (writeBatch) a Firestore.
   * Paso 3: Recargar la ventana del navegador ante un éxito para refrescar la escucha en tiempo real.
   */
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

  // --- Variables Críticas y Cálculos de Rendimiento Financiero ---
  
  // totalSalesCount: Número total de transacciones históricas registradas para este usuario.
  const totalSalesCount = sales.length;
  
  // todayStr: Representación en cadena de la fecha actual en formato ISO (YYYY-MM-DD).
  const todayStr = new Date().toISOString().split("T")[0];
  
  // todaySales: Ventas concretadas durante la jornada de hoy.
  const todaySales = sales.filter(s => s.timestamp.startsWith(todayStr));
  
  // todayTotalEarnings: Sumatoria de los montos totales de ventas de hoy.
  const todayTotalEarnings = todaySales.reduce((acc, curr) => acc + curr.total, 0);

  // yesterdayStr: Cadena de la fecha correspondiente al día de ayer (YYYY-MM-DD).
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  // yesterdaySales: Ventas concretadas durante la jornada del día de ayer.
  const yesterdaySales = sales.filter(s => s.timestamp.startsWith(yesterdayStr));
  
  // yesterdayTotalEarnings: Sumatoria de los montos totales de ventas de ayer.
  const yesterdayTotalEarnings = yesterdaySales.reduce((acc, curr) => acc + curr.total, 0);

  // growthPercent: Porcentaje de incremento o decremento de ingresos hoy vs ayer.
  let growthPercent = 0;
  if (yesterdayTotalEarnings > 0) {
    growthPercent = Math.round(((todayTotalEarnings - yesterdayTotalEarnings) / yesterdayTotalEarnings) * 100);
  } else if (todayTotalEarnings > 0) {
    growthPercent = 100;
  }

  // criticalProducts: Colección de artículos cuyo stock actual está por debajo del límite mínimo.
  const criticalProducts = products.filter(p => p.minStock > 0 && p.stock < p.minStock);

  // productSalesCount: Mapa de frecuencias de unidades vendidas acumuladas para identificar recurrencias.
  const productSalesCount: { [key: string]: { count: number; name: string } } = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSalesCount[item.name]) {
        productSalesCount[item.name] = { count: 0, name: item.name };
      }
      productSalesCount[item.name].count += item.quantity;
    });
  });

  // popularItems: Array ordenado con los 4 productos con mayor volumen de venta histórica.
  const popularItems = Object.values(productSalesCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  /**
   * @function obtenerTendenciaVentasUltimosSieteDias
   * @description Agrupa y calcula el monto total de ventas y el conteo de transacciones
   * para cada uno de los últimos 7 días transcurridos hasta hoy inclusive.
   * Paso 1: Iterar hacia atrás por 7 días en zona horaria local.
   * Paso 2: Filtrar transacciones para cada fecha formateada.
   * Paso 3: Retornar lista estructurada para consumo directo del componente Recharts AreaChart.
   * @returns {Array<{ date: string, monto: number, ventas: number }>} Historial diario de ingresos.
   */
  const obtenerTendenciaVentasUltimosSieteDias = () => {
    const daysData = [];
    const localeOptions: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric" };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const daySales = sales.filter(s => {
        const saleDateStr = s.timestamp.split("T")[0];
        return saleDateStr === dateStr;
      });
      
      const total = daySales.reduce((sum, s) => sum + s.total, 0);
      
      daysData.push({
        date: date.toLocaleDateString("es-ES", localeOptions),
        monto: parseFloat(total.toFixed(2)),
        ventas: daySales.length,
      });
    }
    return daysData;
  };

  const chartData = obtenerTendenciaVentasUltimosSieteDias();

  /**
   * @function obtenerNombreMesActual
   * @description Obtiene el nombre del mes actual en español.
   */
  const obtenerNombreMesActual = () => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[new Date().getMonth()];
  };

  /**
   * @function obtenerVentasDiariasMesActual
   * @description Agrupa las ventas diarias del mes en curso para generar datos del BarChart de Recharts.
   */
  const obtenerVentasDiariasMesActual = () => {
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
  };

  const mensualData = obtenerVentasDiariasMesActual();
  const totalVentasMes = mensualData.reduce((sum, d) => sum + d.monto, 0);
  const totalTransaccionesMes = mensualData.reduce((sum, d) => sum + d.ventas, 0);

  const [exportingPdf, setExportingPdf] = useState(false);

  /**
   * @function handleExportPDF
   * @description Genera y descarga un reporte completo en PDF del resumen de ventas y estado de inventario.
   */
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

      // Colors matching BarrioPro palette (#4A5A40)
      const primaryColor = [74, 90, 64]; 
      const textColor = [31, 41, 55];
      const lightGray = [107, 114, 128];

      // 1. HEADER BANNER
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("BARRIOPRO — REPORTE DE GESTIÓN", 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Informe Financiero e Inventario  |  Generado: ${todayStrFormatted}`, 15, 28);

      // --- SECTION 1: FINANCIAL SUMMARY ---
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`1. RESUMEN DE VENTAS DE ${currentMonthName.toUpperCase()}`, 15, 48);

      // Accent Line
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 50, 195, 50);

      // Summary Table grid style
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


      // --- SECTION 2: DAILY SALES ---
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("2. DESGLOSE DE VENTAS DIARIAS", 15, 90);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(15, 92, 195, 92);

      // Table Header for sales
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


      // --- SECTION 3: INVENTORY VALUATION ---
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
      const inventoryTotalCost = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
      const expectedProfit = inventoryTotalValue - inventoryTotalCost;
      const criticalCount = products.filter(p => p.minStock > 0 && p.stock < p.minStock).length;

      // Stats Table grid
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


      // --- SECTION 4: LOW STOCK WARNINGS ---
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(185, 28, 28); // Alert Red color
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("4. ALERTAS DE REPOSICIÓN (STOCK CRÍTICO)", 15, currentY);

      doc.setDrawColor(185, 28, 28);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 6;

      const lowStockProducts = products.filter(p => p.minStock > 0 && p.stock < p.minStock);

      if (lowStockProducts.length === 0) {
        doc.setTextColor(74, 90, 64);
        doc.setFont("helvetica", "bold");
        doc.text("¡Todo en orden! No tienes productos con stock crítico en este momento.", 20, currentY + 6);
        currentY += 12;
      } else {
        // Red alert table header
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
          
          // Reorder suggested qty
          const suggestedToOrder = Math.max(10, p.minStock * 2 - p.stock);
          doc.setFont("helvetica", "bold");
          doc.text(`+${suggestedToOrder}`, 184, currentY + 4);
          doc.setFont("helvetica", "normal");

          currentY += 6;
        });
      }

      // Add footers with page numbers dynamically
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

  /**
   * @function handleRegistrarVentaRapida
   * @description Procesa la venta interactiva de múltiples productos directamente desde el panel principal.
   * Paso 1: Validar existencias del carrito rápido.
   * Paso 2: Crear el objeto Sale estructurado con marcas temporales ISO y montos calculados.
   * Paso 3: Subir documento a la subcolección de ventas en Firestore, descontar stock de cada ítem y restaurar estados.
   */
  const handleRegistrarVentaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCart.length === 0) return;

    // Validate stock
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

      // Deduct product stock in inventory
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

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* iOS Weather-app style Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary to-brand-primary-dark p-8 text-white shadow-sm" id="hero-metrics-card">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold tracking-wider text-white/70 uppercase">Panel de Control</span>
            <h1 className="text-4xl font-bold tracking-tight">BarrioPro</h1>
            <p className="text-white/90 text-sm">Tus finanzas y stock optimizados al instante</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 px-4 py-3 text-sm font-semibold transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
              id="btn-export-pdf-report"
            >
              <Download size={18} className={exportingPdf ? "animate-bounce" : ""} />
              {exportingPdf ? "Exportando..." : "Exportar Reporte PDF"}
            </button>
            <button
              onClick={() => setShowAddSaleModal(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-primary hover:bg-brand-bg hover:text-brand-primary-dark transition-all active:scale-95 shadow-xs cursor-pointer"
              id="btn-add-quick-sale"
            >
              <PlusCircle size={18} />
              Registrar Venta
            </button>
          </div>
        </div>

        {/* Hero Grid Metrics */}
        <div className="relative z-10 mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-6">
          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Ventas de Hoy</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">${todayTotalEarnings.toFixed(2)}</span>
              {growthPercent !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growthPercent > 0 ? 'bg-white/20 text-white' : 'bg-rose-500/30 text-rose-100'}`}>
                  {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </div>
            <p className="text-white/60 text-[11px]">Ayer: ${yesterdayTotalEarnings.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Inventario Crítico</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{criticalProducts.length}</span>
              <span className="text-white/85 text-sm">productos</span>
            </div>
            <p className="text-white/60 text-[11px]">Revisar sección de reposición</p>
          </div>

          <div className="space-y-1">
            <p className="text-white/75 text-xs font-medium">Transacciones</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold">{totalSalesCount}</span>
              <span className="text-white/85 text-sm">totales</span>
            </div>
            <p className="text-white/60 text-[11px]">{todaySales.length} registradas hoy</p>
          </div>
        </div>
      </div>


      {/* Main Grid: Weather widgets layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-widgets-grid">
        {/* Widget 1: Ventas Diarias Graph & Logs */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs" id="widget-sales-chart">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-brand-primary" size={20} />
              <h3 className="font-semibold text-brand-text text-base">Historial de Ventas</h3>
            </div>
            <span className="text-xs font-medium text-brand-muted">Últimos días</span>
          </div>

          {sales.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-2 text-brand-border" size={32} />
              <p className="text-sm text-brand-text">Aún no hay ventas registradas.</p>
              <p className="text-xs text-brand-muted mt-1">Usa "Registrar Venta" para empezar.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Responsive Sales Trend Line/Area Chart using Recharts */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A5A40" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4A5A40" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#717171", fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#717171", fontSize: 10, fontWeight: 500 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="monto" 
                      stroke="#4A5A40" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorMonto)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Transactions list */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Ventas Recientes</p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {sales.slice().reverse().slice(0, 5).map((sale, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-brand-bg p-3 hover:bg-brand-border/30 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-brand-text">
                          {sale.items.map(item => `${item.quantity}x ${item.name}`).join(", ") || "Venta general"}
                        </p>
                        <p className="text-[10px] text-brand-muted">
                          {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-brand-text">${sale.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget 2: Inventario Crítico list */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs" id="widget-critical-stock">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity" onClick={onNavigateToCriticalStock}>
              <AlertCircle className="text-brand-accent" size={20} />
              <h3 className="font-semibold text-brand-text text-base">Inventario Crítico</h3>
            </div>
            <span 
              onClick={onNavigateToCriticalStock}
              className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-brand-accent border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              {criticalProducts.length} productos bajos
            </span>
          </div>

          {criticalProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <CheckCircle2 className="mb-2 text-brand-primary" size={32} />
              <p className="text-sm font-medium text-brand-text">¡Todo en orden!</p>
              <p className="text-xs text-brand-muted mt-1">Todos tus productos tienen stock saludable.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {criticalProducts.map((product, i) => {
                  const stockPercent = (product.stock / (product.minStock || 1)) * 100;
                  return (
                    <div 
                      key={i} 
                      onClick={onNavigateToCriticalStock}
                      className="space-y-1.5 border-b border-brand-border pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-brand-text">{product.name}</p>
                          <p className="text-[10px] text-brand-muted">Categoría: {product.category || "General"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-brand-text">
                            {product.stock} / <span className="text-brand-muted">{product.minStock}</span>
                          </p>
                          <p className="text-[9px] text-rose-600 font-medium">Bajo stock</p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-brand-bg overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${stockPercent <= 30 ? 'bg-rose-500' : 'bg-brand-accent'}`}
                          style={{ width: `${Math.min(stockPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Widget Monthly Sales BarChart */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs" id="widget-monthly-bar-chart">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-brand-primary animate-pulse" size={20} />
            <h3 className="font-semibold text-brand-text text-base">Ventas Diarias — {obtenerNombreMesActual()}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-brand-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-brand-primary" />
              Total Vendido: <strong className="text-brand-text font-bold">${totalVentasMes.toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Transacciones: <strong className="text-brand-text font-bold">{totalTransaccionesMes}</strong>
            </span>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center text-center">
            <ShoppingBag className="mb-2 text-brand-border" size={32} />
            <p className="text-sm text-brand-text">Aún no hay ventas registradas este mes.</p>
            <p className="text-xs text-brand-muted mt-1">Las ventas diarias de {obtenerNombreMesActual()} se graficarán aquí.</p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mensualData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#717171", fontSize: 9, fontWeight: 500 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#717171", fontSize: 10, fontWeight: 500 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(74, 90, 64, 0.05)' }} />
                <Bar 
                  dataKey="monto" 
                  fill="#4A5A40" 
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Widget 3: Popular Products & Frequent Client Recurrences */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xs" id="widget-popular-items">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-brand-primary" size={20} />
            <h3 className="font-semibold text-brand-text text-base">Productos Más Vendidos y Recurrencia</h3>
          </div>
          <span className="text-xs text-brand-muted">Basado en transacciones</span>
        </div>

        {popularItems.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <Users className="mb-2 text-brand-border" size={24} />
            <p className="text-xs text-brand-muted">Registra ventas para identificar productos recurrentes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {popularItems.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-brand-border bg-brand-bg p-4 space-y-1">
                <span className="text-[10px] font-bold text-brand-primary bg-white border border-brand-border px-2 py-0.5 rounded-full inline-block mb-1">
                  N° {idx + 1} Popular
                </span>
                <p className="text-xs font-bold text-brand-text truncate">{item.name}</p>
                <div className="flex justify-between items-center text-[11px] text-brand-muted pt-1">
                  <span>Vendidos:</span>
                  <span className="font-bold text-brand-text">{item.count} unids.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Sale Modal */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 border border-brand-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <PlusCircle size={18} className="text-brand-primary" />
                Registrar Nueva Venta (Rápida)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddSaleModal(false);
                  setQuickCart([]);
                  setQuickSearch("");
                }}
                className="text-brand-muted hover:text-brand-text font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-brand-muted">No hay productos en el inventario para vender.</p>
                <p className="text-xs text-brand-muted mt-1">Por favor, agrega productos primero en Ajustes o carga datos demo.</p>
                <button
                  type="button"
                  onClick={() => setShowAddSaleModal(false)}
                  className="mt-4 rounded-xl bg-brand-bg px-4 py-2 text-xs font-semibold text-brand-text hover:bg-brand-border border border-transparent hover:border-brand-border cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegistrarVentaRapida} className="flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden min-h-0">
                  {/* Left Column: Product Selection Catalog */}
                  <div className="flex flex-col space-y-3 overflow-hidden">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">1. Buscar y Agregar (Usa ↑↓ y Enter)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-brand-muted">
                          <Search size={13} />
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar por nombre, SKU, categoría..."
                          value={quickSearch}
                          onChange={(e) => handleQuickSearchChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setActiveQuickIndex(prev => Math.min(filteredModalProducts.length - 1, prev + 1));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setActiveQuickIndex(prev => Math.max(0, prev - 1));
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              const selectedProd = filteredModalProducts[activeQuickIndex];
                              if (selectedProd) {
                                const inCart = quickCart.find(item => item.product.id === selectedProd.id);
                                const currentQty = inCart ? inCart.quantity : 0;
                                if (selectedProd.stock - currentQty > 0) {
                                  handleAddToQuickCart(selectedProd);
                                  setQuickSearch("");
                                  setActiveQuickIndex(0);
                                } else {
                                  alert(`No hay más stock disponible para ${selectedProd.name}.`);
                                }
                              }
                            }
                          }}
                          className="w-full rounded-xl border border-brand-border pl-8 pr-3 py-1.5 text-xs bg-brand-bg text-brand-text focus:bg-white focus:border-brand-primary focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[280px]">
                      {filteredModalProducts.length === 0 ? (
                        <p className="text-xs text-brand-muted py-8 text-center bg-slate-50 rounded-xl border border-dashed border-brand-border">
                          No se encontraron productos disponibles con stock.
                        </p>
                      ) : (
                        filteredModalProducts.map((p, idx) => {
                          const inCart = quickCart.find(item => item.product.id === p.id);
                          const currentQty = inCart ? inCart.quantity : 0;
                          const remainingStock = p.stock - currentQty;
                          const isOutOfStock = remainingStock <= 0;
                          const isActive = idx === activeQuickIndex;

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (!isOutOfStock) {
                                  handleAddToQuickCart(p);
                                  setActiveQuickIndex(idx);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group ${
                                isOutOfStock
                                  ? "opacity-40 bg-slate-50/50 border-dashed border-brand-border/40 cursor-not-allowed"
                                  : isActive
                                    ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary/10"
                                    : "bg-brand-bg hover:bg-brand-primary/5 hover:border-brand-primary/30 border-transparent"
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-brand-text truncate group-hover:text-brand-primary transition-colors">
                                    {p.name}
                                  </p>
                                  {isActive && !isOutOfStock && (
                                    <span className="text-[8px] bg-brand-primary text-white px-1 py-0.5 rounded font-black font-mono shrink-0 animate-pulse">
                                      ↵ ENTER
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-brand-muted">
                                  {p.category || "General"} • Stock: {remainingStock} disp.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-mono font-bold text-brand-text">
                                  ${p.price.toLocaleString("es-CO")}
                                </span>
                                <div className={`p-1 rounded-lg border bg-white ${isOutOfStock ? "text-slate-300 border-slate-100" : "text-brand-primary border-brand-border group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"}`}>
                                  <Plus size={10} />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Selected Items (Cart) */}
                  <div className="flex flex-col space-y-3 overflow-hidden bg-slate-55/20 border border-brand-border/30 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">2. Lista de Compra</label>
                      {quickCart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setQuickCart([])}
                          className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 size={10} /> Vaciar
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[240px]">
                      {quickCart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-brand-muted space-y-1">
                          <p className="text-xs font-bold">Carrito vacío</p>
                          <p className="text-[10px] text-brand-muted/70 max-w-[150px]">Presiona productos de la izquierda para agregarlos.</p>
                        </div>
                      ) : (
                        quickCart.map(item => (
                          <div
                            key={item.product.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-brand-border shadow-3xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-bold text-brand-text truncate">{item.product.name}</p>
                              <p className="text-[9px] text-brand-muted font-mono">
                                ${item.product.price.toLocaleString("es-CO")} c/u
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="flex items-center border border-brand-border rounded-lg bg-slate-50 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuickQuantity(item.product.id!, item.quantity - 1)}
                                  className="p-1 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                                >
                                  <Minus size={9} />
                                </button>
                                <span className="px-1.5 text-xs font-mono font-bold text-brand-text bg-white border-x border-brand-border min-w-[18px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuickQuantity(item.product.id!, item.quantity + 1)}
                                  className="p-1 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                                  disabled={item.quantity >= item.product.stock}
                                >
                                  <Plus size={9} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromQuickCart(item.product.id!)}
                                className="text-brand-muted hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-brand-border flex justify-between items-center text-xs font-bold text-brand-text font-mono shrink-0">
                      <span>TOTAL:</span>
                      <span className="text-emerald-700 font-extrabold text-sm">
                        ${quickCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-brand-border shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSaleModal(false);
                      setQuickCart([]);
                      setQuickSearch("");
                    }}
                    className="flex-1 rounded-xl border border-brand-border px-4 py-2.5 text-xs font-semibold text-brand-muted hover:bg-brand-bg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingSale || quickCart.length === 0}
                    className="flex-1 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-primary-dark transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loadingSale ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : `Confirmar Venta (${quickCart.reduce((sum, item) => sum + item.quantity, 0)} u.)`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

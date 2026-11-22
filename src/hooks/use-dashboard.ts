// ======================================================
// Archivo: src/hooks/use-dashboard.ts
// Responsabilidad: Lógica de la pantalla "Hoy": totales y gráficos, exportación del reporte en PDF y carga de datos
//   de ejemplo.
// ======================================================

import { useState, useMemo } from "react";
import { Product, Sale } from "../types";
import { cargarDatosDeDemostracion } from "../lib/demoData";
import { isCriticalStock } from "../lib/stock";
import { showErrorToast, showSuccessToast } from "../lib/toast";
import { generateDashboardReportPDF } from "../lib/pdf";

interface UseDashboardProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export function useDashboard({ products, sales, userId }: UseDashboardProps) {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleCargarDatosDeDemostracion = async () => {
    if (!window.confirm("¿Deseas cargar productos de muestra y ventas ficticias? Esto agregará stock inicial, checklists y ventas de los últimos días para ver el panel en acción.")) return;
    setLoadingDemo(true);
    try {
      await cargarDatosDeDemostracion(userId);
      // Ya no se recarga la página: el guardado ya notifica a la app para
      // refrescar los datos automáticamente (ver subscribeToData en insforge.ts).
      showSuccessToast("¡Datos de muestra y ventas ficticias cargados exitosamente!");
    } catch (error) {
      console.error("Error al cargar los datos de ejemplo:", error);
      showErrorToast("No se pudieron cargar los datos de muestra. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setLoadingDemo(false);
    }
  };

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
      console.error("Error al generar el PDF:", err);
      showErrorToast("No se pudo generar el reporte en PDF. Por favor reintenta.");
    } finally {
      setExportingPdf(false);
    }
  };

  return {
    loadingDemo,
    handleCargarDatosDeDemostracion,
    todayStr,
    todayTotalEarnings,
    growthPercent,
    criticalProducts,
    popularItems,
    chartData,
    mensualData,
    totalVentasMes,
    totalTransaccionesMes,
    exportingPdf,
    handleExportPDF,
    obtenerNombreMesActual
  };
}

import React, { useMemo } from "react";
import { Debt, Product, Sale, Task } from "../types";
import { useDashboard } from "../hooks/use-dashboard";
import { Plus, Sparkles, RefreshCw, Download, ChevronDown } from "lucide-react";
import { db } from "../lib/insforge";
import { formatMoney } from "../lib/format";
import { buildPendientes, Pendiente } from "../lib/pendientes";
import { openAssistant } from "../lib/assistant";
import { showErrorToast } from "../lib/toast";
import type { AppTab } from "../lib/navigation";
import DashboardCharts from "./DashboardCharts";

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  tasks: Task[];
  userId: string;
  onNavigate: (tab: AppTab) => void;
}

/**
 * Pantalla "Hoy": una cifra grande, una acción principal y una sola lista de pendientes
 * (stock que se acaba, fiados por cobrar y tareas). Los gráficos y el reporte quedan plegados.
 */
export default function Dashboard({ products, sales, debts, tasks, userId, onNavigate }: DashboardProps) {
  const {
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
  } = useDashboard({ products, sales, userId });

  const todaySalesCount = useMemo(() => sales.filter((s) => s.timestamp.startsWith(todayStr)).length, [sales, todayStr]);
  const pendientes = useMemo(() => buildPendientes({ products, debts, tasks }), [products, debts, tasks]);

  const handleAction = async (item: Pendiente) => {
    if (item.kind === "stock") return onNavigate("inventory");
    if (item.kind === "debt") return onNavigate("debts");
    // Tarea: se marca como hecha desde aquí mismo.
    try {
      await db.updateTask(userId, item.id.replace("task:", ""), { completed: true, completedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error al completar la tarea:", error);
      showErrorToast("No se pudo marcar la tarea. Verifica tu conexión e inténtalo de nuevo.");
    }
  };

  const growthText =
    growthPercent > 0 ? ` · ${growthPercent} % más que ayer` : growthPercent < 0 ? ` · ${Math.abs(growthPercent)} % menos que ayer` : "";

  return (
    <div className="space-y-8" id="dashboard-container">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-start" id="hero-metrics-card">
        {/* Columna 1: la cifra del día y la acción principal */}
        <div className="min-w-0 space-y-6">
          <p className="text-sm text-brand-muted first-letter:uppercase">
            {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
          </p>

          <section aria-label="Ventas de hoy" className="space-y-1.5">
            <p className="text-[15px] text-brand-muted">Hoy vendiste</p>
            <p className="text-5xl sm:text-6xl font-semibold tracking-[-0.04em] tabular-nums leading-none">
              {formatMoney(todayTotalEarnings)}
            </p>
            <p className="text-sm font-medium text-brand-primary">
              {todaySalesCount} {todaySalesCount === 1 ? "venta" : "ventas"}
              {growthText}
            </p>
          </section>

          <button
            onClick={() => onNavigate("sales")}
            className="w-full h-[60px] rounded-[18px] bg-brand-primary hover:bg-brand-primary-dark text-white text-[17px] font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            id="btn-add-quick-sale"
          >
            <Plus size={22} strokeWidth={2.2} />
            Nueva venta
          </button>

          {products.length === 0 && (
            <button
              onClick={handleCargarDatosDeDemostracion}
              disabled={loadingDemo}
              className="w-full h-12 rounded-2xl border border-[#E2E1DB] bg-white text-brand-text text-sm font-medium flex items-center justify-center gap-2 hover:bg-brand-bg cursor-pointer disabled:opacity-50"
              id="btn-load-demo"
            >
              {loadingDemo ? <RefreshCw size={16} className="animate-spin" /> : "Probar con datos de ejemplo"}
            </button>
          )}
        </div>

        {/* Columna 2: Para hoy */}
        <div className="min-w-0 space-y-5">
          <section aria-label="Para hoy">
            <h2 className="text-[13px] font-semibold tracking-wide text-brand-muted mb-1">PARA HOY</h2>
            {pendientes.length === 0 ? (
              <p className="py-6 text-[15px] text-brand-muted">Todo al día. No tienes nada pendiente.</p>
            ) : (
              <ul>
                {pendientes.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 min-h-[68px] border-b border-brand-border">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-base font-medium truncate">{item.title}</p>
                      <p className={`text-[13px] ${item.urgent ? "text-[#A24A16] font-medium" : "text-brand-muted"}`}>{item.detail}</p>
                    </div>
                    <button
                      onClick={() => handleAction(item)}
                      className="shrink-0 h-10 px-4 rounded-full border border-[#E2E1DB] bg-white text-sm font-medium hover:bg-brand-bg cursor-pointer"
                    >
                      {item.action}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            onClick={openAssistant}
            className="w-full h-[52px] rounded-full border border-[#E2E1DB] bg-white text-brand-muted text-[15px] flex items-center gap-2.5 px-5 hover:bg-brand-bg cursor-pointer text-left"
            id="ask-tiendly-button"
          >
            <Sparkles size={18} strokeWidth={1.8} className="text-brand-primary" />
            Pregúntale a Tiendly
          </button>
        </div>
      </div>

      {/* Detalle: gráficos y reporte, plegados para no abrumar */}
      <details className="group rounded-2xl border border-brand-border bg-white">
        <summary className="flex items-center justify-between gap-3 px-6 min-h-[56px] cursor-pointer list-none text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          Ver gráficos y reporte
          <ChevronDown size={18} className="text-brand-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 sm:px-6 pb-6 space-y-6">
          <button
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="flex items-center gap-2 h-11 rounded-xl border border-[#E2E1DB] bg-white text-sm font-medium px-4 hover:bg-brand-bg cursor-pointer disabled:opacity-50"
            id="btn-export-pdf-report"
          >
            <Download size={16} className={exportingPdf ? "animate-bounce" : ""} />
            {exportingPdf ? "Exportando..." : "Exportar reporte del mes"}
          </button>
          <DashboardCharts
            sales={sales}
            products={products}
            criticalProducts={criticalProducts}
            chartData={chartData}
            mensualData={mensualData}
            totalVentasMes={totalVentasMes}
            totalTransaccionesMes={totalTransaccionesMes}
            popularItems={popularItems}
            onNavigateToCriticalStock={() => onNavigate("inventory")}
            obtenerNombreMesActual={obtenerNombreMesActual}
          />
        </div>
      </details>
    </div>
  );
}

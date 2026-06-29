import React from "react";
import { TrendingUp, ClipboardList, BarChart3, Edit3, Trash2 } from "lucide-react";
import { Sale } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

interface SalesHistoryProps {
  sales: Sale[];
  todaySalesData: { total: number; count: number };
  lastTenSales: Sale[];
  currentWeekSalesData: any[];
  totalWeeklySales: number;
  handleStartEditSale: (sale: Sale) => void;
  handleDeleteSale: (saleId: string) => void;
}

export default function SalesHistory({
  sales,
  todaySalesData,
  lastTenSales,
  currentWeekSalesData,
  totalWeeklySales,
  handleStartEditSale,
  handleDeleteSale
}: SalesHistoryProps) {
  return (
    <div className="space-y-6">
      {/* Daily Summary Box */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-border pb-3">
          <TrendingUp size={18} className="text-brand-primary" />
          <h3 className="font-extrabold text-sm text-brand-text">Resumen Diario de Ventas</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Ventas de Hoy</span>
            <span className="text-xl font-black text-emerald-700 font-mono block mt-1">
              ${todaySalesData.total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">Transacciones de Hoy</span>
            <span className="text-xl font-black text-brand-text font-mono block mt-1">
              {todaySalesData.count} ventas
            </span>
          </div>
        </div>
      </div>

      {/* Last 10 Sales List */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-border pb-3 justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-brand-primary" />
            <h3 className="font-extrabold text-sm text-brand-text">Últimas 10 Ventas Registradas</h3>
          </div>
          <span className="text-[10px] text-brand-muted uppercase tracking-wider font-bold">Historial en Vivo</span>
        </div>

        {lastTenSales.length === 0 ? (
          <div className="text-xs text-brand-muted text-center py-12">
            Aún no has registrado ninguna venta hoy. ¡Registra tu primera venta a la izquierda!
          </div>
        ) : (
          <div className="divide-y divide-brand-bg max-h-[380px] overflow-y-auto pr-1 space-y-0.5">
            {lastTenSales.map((sale, i) => (
              <div key={sale.id || i} className="py-3.5 flex items-center justify-between gap-4 border-b last:border-b-0 border-slate-50">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-brand-text">
                      {sale.items && sale.items.length > 0 ? (
                        sale.items.length === 1 ? (
                          sale.items[0].name
                        ) : (
                          `${sale.items[0].name} y ${sale.items.length - 1} prod. más`
                        )
                      ) : (
                        "Venta general"
                      )}
                    </span>
                    {sale.items && sale.items.length === 1 && sale.items[0].quantity && (
                      <span className="text-[10px] font-bold text-brand-muted">
                        x{sale.items[0].quantity} unid.
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-brand-primary bg-brand-primary/5 border border-brand-primary/10 px-1.5 py-0.5 rounded uppercase">
                      {sale.paymentMethod || "Efectivo"}
                    </span>
                  </div>
                  
                  {sale.items && sale.items.length > 1 && (
                    <div className="text-[9px] text-brand-muted font-medium bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 inline-block max-w-full truncate">
                      Detalle: {sale.items.map(item => `${item.name} (${item.quantity}u)`).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-brand-muted flex-wrap">
                    <span className="font-semibold text-brand-muted/80 truncate max-w-[120px]">
                      Cliente: {sale.clientName || "Consumidor Final"}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(sale.timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right flex items-center gap-3">
                  <span className="font-mono font-black text-brand-text text-sm block">
                    ${sale.total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditSale(sale)}
                      className="p-1 rounded-lg border border-brand-border text-brand-muted hover:text-brand-primary hover:bg-brand-primary/5 transition-colors cursor-pointer"
                      title="Editar Venta"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSale(sale.id!)}
                      className="p-1 rounded-lg border border-brand-border text-brand-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar Venta"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* weekly sales chart */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6" id="weekly-sales-chart-container">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-primary" />
            <div>
              <h3 className="font-extrabold text-sm text-brand-text">Análisis de Ventas Diarias (Semana Actual)</h3>
              <p className="text-[11px] text-brand-muted">Monitorea y optimiza el flujo de ingresos diario en tu tienda.</p>
            </div>
          </div>
          <div className="bg-brand-primary/5 border border-brand-primary/10 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-brand-primary uppercase block tracking-wider">Total esta Semana</span>
            <span className="font-mono text-xs font-extrabold text-brand-text">
              ${totalWeeklySales.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-80 w-full" id="weekly-sales-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentWeekSalesData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand-primary, #4A5A40)" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="var(--color-brand-primary, #4A5A40)" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#717171" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={8}
              />
              <YAxis 
                stroke="#717171" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                dx={-4}
              />
              <Tooltip
                cursor={{ fill: "rgba(74, 90, 64, 0.05)", radius: 8 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const totalVentas = payload[0].value as number;
                    const transacciones = payload[0].payload["Transacciones"] as number;
                    return (
                      <div className="bg-brand-text text-white p-3 rounded-xl border border-brand-border shadow-md text-xs font-sans">
                        <p className="font-bold mb-1 text-[10px] uppercase tracking-wider text-white/70">{label}</p>
                        <p className="font-semibold text-white">Total Vendido: <span className="font-bold text-amber-400">${totalVentas.toLocaleString("es-CO", { minimumFractionDigits: 2 })}</span></p>
                        <p className="text-white/80 text-[10px] mt-0.5">Transacciones: {transacciones}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="Total Ventas" 
                fill="url(#colorSales)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              >
                {currentWeekSalesData.map((entry, index) => {
                  const now = new Date();
                  const currentDayIdx = now.getDay();
                  const spanishDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                  const todayName = spanishDays[currentDayIdx];
                  const isToday = entry.name === todayName;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isToday ? "var(--color-brand-accent, #D97706)" : "url(#colorSales)"} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

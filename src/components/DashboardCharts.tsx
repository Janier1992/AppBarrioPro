import React from "react";
import { TrendingUp, ShoppingBag, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { Sale, Product } from "../types";
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

interface DashboardChartsProps {
  sales: Sale[];
  products: Product[];
  criticalProducts: Product[];
  chartData: any[];
  mensualData: any[];
  totalVentasMes: number;
  totalTransaccionesMes: number;
  popularItems: any[];
  onNavigateToCriticalStock?: () => void;
  obtenerNombreMesActual: () => string;
}

export default function DashboardCharts({
  sales,
  products,
  criticalProducts,
  chartData,
  mensualData,
  totalVentasMes,
  totalTransaccionesMes,
  popularItems,
  onNavigateToCriticalStock,
  obtenerNombreMesActual
}: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Grid: 2 columns widgets */}
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

      {/* Widget 3: Popular Products */}
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
    </div>
  );
}

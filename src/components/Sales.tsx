/**
 * @file Sales.tsx
 * @description Simplified POS module for neighborhood businesses.
 * @design Centered around absolute simplicity and zero friction. Connects directly with Firestore.
 */

import React, { useState, useMemo } from "react";
import { Product, Sale } from "../types";
import { db } from "../lib/insforge";
import { ShoppingCart, Check, CreditCard, DollarSign, RefreshCw, User, ClipboardList, TrendingUp, Download, BarChart3, Plus, Minus, Trash2, Search, Edit3 } from "lucide-react";
import { jsPDF } from "jspdf";
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

interface SalesProps {
  products: Product[];
  sales: Sale[];
  userId: string;
}

export default function Sales({ products, sales, userId }: SalesProps) {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState("Todas");
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta">("Efectivo");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lastRegisteredSale, setLastRegisteredSale] = useState<Sale | null>(null);
  const [dueDate, setDueDate] = useState("");

  // Edit/Delete Sale States
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"Efectivo" | "Tarjeta" | "Fiado">("Efectivo");
  const [editTotal, setEditTotal] = useState(0);

  const handleCatalogSearchChange = (val: string) => {
    setCatalogSearch(val);
    setActiveCatalogIndex(0);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCatalogCategory(cat);
    setActiveCatalogIndex(0);
  };

  // Cart action helpers
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

  // Filter sales for the current month in chronological order (oldest first for reports)
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

  // Compute monthly statistics based on currentMonthSales
  const statsMes = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let tarjeta = 0;
    
    currentMonthSales.forEach(s => {
      total += s.total;
      if (s.paymentMethod === "Tarjeta") {
        tarjeta += s.total;
      } else {
        efectivo += s.total;
      }
    });

    return {
      total,
      count: currentMonthSales.length,
      efectivo,
      tarjeta,
      promedio: currentMonthSales.length > 0 ? total / currentMonthSales.length : 0
    };
  }, [currentMonthSales]);

  // Filter and group sales for the current week (Monday to Sunday)
  const currentWeekSalesData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    // Get Monday of the current week
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

  // Compute total weekly sales amount
  const totalWeeklySales = useMemo(() => {
    return currentWeekSalesData.reduce((acc, curr) => acc + curr["Total Ventas"], 0);
  }, [currentWeekSalesData]);

  /**
   * @function handleGenerateReceiptPDF
   * @description Genera y descarga un recibo en PDF en formato ticket de caja para una venta.
   */
  const handleGenerateReceiptPDF = (sale: Sale) => {
    try {
      const itemsCount = sale.items?.length || 0;
      const ticketHeight = Math.max(140, 80 + (itemsCount * 12));
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, ticketHeight]
      });

      const primaryColor = [74, 90, 64];
      const textColor = [33, 33, 33];

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("BarrioPro", 40, 12, { align: "center" });

      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("RECIBO DE VENTA", 40, 17, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(5, 20, 75, 20);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Ticket ID:", 5, 25);
      doc.setFont("helvetica", "normal");
      doc.text(sale.id || "N/A", 22, 25);

      doc.setFont("helvetica", "bold");
      doc.text("Fecha:", 5, 29);
      doc.setFont("helvetica", "normal");
      doc.text(new Date(sale.timestamp).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }), 22, 29);

      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", 5, 33);
      doc.setFont("helvetica", "normal");
      doc.text(sale.clientName || "Consumidor Final", 22, 33);

      doc.setFont("helvetica", "bold");
      doc.text("Pago:", 5, 37);
      doc.setFont("helvetica", "normal");
      doc.text(sale.paymentMethod || "Efectivo", 22, 37);

      doc.line(5, 41, 75, 41);

      doc.setFont("helvetica", "bold");
      doc.text("Producto", 5, 45);
      doc.text("Cant.", 45, 45, { align: "right" });
      doc.text("Precio", 58, 45, { align: "right" });
      doc.text("Total", 75, 45, { align: "right" });

      doc.line(5, 47, 75, 47);

      let currentY = 51;
      doc.setFont("helvetica", "normal");
      
      sale.items?.forEach((item) => {
        const nameText = item.name.length > 22 ? item.name.substring(0, 20) + ".." : item.name;
        doc.text(nameText, 5, currentY);
        doc.text(item.quantity.toString(), 45, currentY, { align: "right" });
        doc.text(`$${item.price.toFixed(0)}`, 58, currentY, { align: "right" });
        doc.text(`$${(item.quantity * item.price).toFixed(0)}`, 75, currentY, { align: "right" });
        currentY += 6;
      });

      doc.line(5, currentY - 2, 75, currentY - 2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("TOTAL:", 5, currentY + 3);
      doc.text(`$${sale.total.toLocaleString("es-CO")}`, 75, currentY + 3, { align: "right" });

      doc.line(5, currentY + 7, 75, currentY + 7);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("¡Gracias por apoyar el comercio local de tu barrio!", 40, currentY + 13, { align: "center" });

      doc.save(`Recibo_Venta_${sale.id || "ticket"}.pdf`);
    } catch (error) {
      console.error("Error al generar el recibo PDF:", error);
      alert("No se pudo generar el recibo en PDF.");
    }
  };

  /**
   * @function handleExportPDF
   * @description Generates a beautifully formatted PDF statement for current month sales.
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

      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      const now = new Date();
      const currentMonthName = meses[now.getMonth()];
      const currentYear = now.getFullYear();

      // Colors matching BarrioPro palette (#4A5A40)
      const primaryColor = [74, 90, 64]; 
      const textColor = [31, 41, 55];
      const secondaryColor = [107, 114, 128];

      let pageCount = 1;

      const drawHeader = (pageNum: number) => {
        // Header Banner
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 35, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("BARRIOPRO — HISTORIAL DE VENTAS", 15, 16);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(`Registro Completo de Caja  |  Mes: ${currentMonthName} de ${currentYear}  |  Generado: ${todayStrFormatted}`, 15, 26);
      };

      const drawFooter = (pageNum: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Página ${pageNum}`, 105, 287, { align: "center" });
        doc.text("BarrioPro AI — Tu asesor y mentor comercial", 15, 287);
        doc.text("Documento Oficial de Control de Caja", 195, 287, { align: "right" });
      };

      // Draw initial page decoration
      drawHeader(pageCount);

      // --- SECTION 1: MONTHLY FINANCIAL SUMMARY ---
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`1. RESUMEN FINANCIERO — ${currentMonthName.toUpperCase()} ${currentYear}`, 15, 45);

      // Accent Line
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.4);
      doc.line(15, 47, 195, 47);

      // Summary Grid Card
      doc.setFillColor(249, 250, 251);
      doc.rect(15, 51, 180, 28, "F");
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.rect(15, 51, 180, 28, "S");

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(9);
      
      // Left stats
      doc.setFont("helvetica", "bold");
      doc.text("Total Recaudado en el Mes:", 20, 58);
      doc.setFont("helvetica", "normal");
      doc.text(`$${statsMes.total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 72, 58);

      doc.setFont("helvetica", "bold");
      doc.text("Transacciones Concretadas:", 20, 64);
      doc.setFont("helvetica", "normal");
      doc.text(`${statsMes.count} ventas`, 72, 64);

      doc.setFont("helvetica", "bold");
      doc.text("Monto Promedio por Ticket:", 20, 70);
      doc.setFont("helvetica", "normal");
      doc.text(`$${statsMes.promedio.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 72, 70);

      // Right stats (split by payment method)
      doc.setFont("helvetica", "bold");
      doc.text("Ventas en Efectivo:", 125, 58);
      doc.setFont("helvetica", "normal");
      doc.text(`$${statsMes.efectivo.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 162, 58);

      doc.setFont("helvetica", "bold");
      doc.text("Ventas con Tarjeta:", 125, 64);
      doc.setFont("helvetica", "normal");
      doc.text(`$${statsMes.tarjeta.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 162, 64);

      // --- SECTION 2: DETAILED SALES LEDGER ---
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. DETALLE CRONOLÓGICO DE TRANSACCIONES", 15, 90);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.4);
      doc.line(15, 92, 195, 92);

      // Table Header
      const tableHeaderY = 96;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, tableHeaderY, 180, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Fecha y Hora", 18, tableHeaderY + 5.5);
      doc.text("Producto / Detalle", 55, tableHeaderY + 5.5);
      doc.text("Cant.", 108, tableHeaderY + 5.5, { align: "center" });
      doc.text("Cliente", 120, tableHeaderY + 5.5);
      doc.text("Método", 158, tableHeaderY + 5.5);
      doc.text("Total", 192, tableHeaderY + 5.5, { align: "right" });

      let currentY = 104;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(8);

      if (currentMonthSales.length === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(15, currentY, 180, 10, "F");
        doc.text("No se registran transacciones de venta en el mes actual.", 20, currentY + 6.5);
        currentY += 10;
      } else {
        currentMonthSales.forEach((sale, idx) => {
          if (currentY > 268) {
            drawFooter(pageCount);
            doc.addPage();
            pageCount++;
            drawHeader(pageCount);
            
            // Redraw table header on new page
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(15, 45, 180, 8, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.text("Fecha y Hora", 18, 50.5);
            doc.text("Producto / Detalle", 55, 50.5);
            doc.text("Cant.", 108, 50.5, { align: "center" });
            doc.text("Cliente", 120, 50.5);
            doc.text("Método", 158, 50.5);
            doc.text("Total", 192, 50.5, { align: "right" });

            currentY = 53;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFontSize(8);
          }

          // Alternating row colors
          if (idx % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(15, currentY, 180, 7, "F");
          }

          // Formatted DateTime
          const sDate = new Date(sale.timestamp);
          const formattedDate = sDate.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          });
          const formattedTime = sDate.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
          });
          const dateTimeStr = `${formattedDate} ${formattedTime}`;

          const itemsCount = sale.items?.length || 0;
          const rawItemName = sale.items?.[0]?.name || "Venta general";
          const displayItemName = itemsCount > 1 ? `${rawItemName} (+${itemsCount - 1} prod)` : rawItemName;
          const truncatedItemName = displayItemName.length > 28 ? displayItemName.substring(0, 26) + "..." : displayItemName;
          const qty = itemsCount === 1 ? (sale.items?.[0]?.quantity || 1) : sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 1;
          const client = sale.clientName || "Consumidor Final";
          const truncatedClient = client.length > 18 ? client.substring(0, 16) + "..." : client;
          const method = sale.paymentMethod || "Efectivo";

          doc.text(dateTimeStr, 18, currentY + 4.5);
          doc.text(truncatedItemName, 55, currentY + 4.5);
          doc.text(qty.toString(), 108, currentY + 4.5, { align: "center" });
          doc.text(truncatedClient, 120, currentY + 4.5);
          doc.text(method, 158, currentY + 4.5);
          
          const totalStr = `$${sale.total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
          doc.text(totalStr, 192, currentY + 4.5, { align: "right" });

          currentY += 7;
        });
      }

      drawFooter(pageCount);
      doc.save(`barriopro_ventas_${currentMonthName.toLowerCase()}_${currentYear}.pdf`);
    } catch (error) {
      console.error("Error generating sales PDF report:", error);
      alert("Ocurrió un error inesperado al intentar generar el PDF. Por favor, intente de nuevo.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Get active products for catalog (only products with stock > 0, sorted by name)
  const availableProducts = useMemo(() => {
    return [...products]
      .filter(p => p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Catalog categories calculation
  const catalogCategories = useMemo(() => {
    const cats = new Set<string>();
    availableProducts.forEach(p => {
      if (p.category) {
        cats.add(p.category);
      }
    });
    return ["Todas", ...Array.from(cats).sort()];
  }, [availableProducts]);

  // Catalog filtering
  const filteredCatalogProducts = useMemo(() => {
    return availableProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
      const matchesCategory = selectedCatalogCategory === "Todas" || p.category === selectedCatalogCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableProducts, catalogSearch, selectedCatalogCategory]);

  // Calculate today's sales and transaction count
  const todaySalesData = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTransactions = sales.filter(s => new Date(s.timestamp).toDateString() === todayStr);
    const totalVentas = todayTransactions.reduce((sum, s) => sum + s.total, 0);
    return {
      total: totalVentas,
      count: todayTransactions.length
    };
  }, [sales]);

  // Retrieve only the last 10 sales
  const lastTenSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [sales]);

  /**
   * @function handleStartEditSale
   * @description Inicializa los estados del formulario de edición con los datos de la venta seleccionada.
   */
  const handleStartEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditClientName(sale.clientName || "");
    setEditPaymentMethod((sale.paymentMethod as any) || "Efectivo");
    setEditTotal(sale.total);
  };

  /**
   * @function handleSaveEditSale
   * @description Modifica una venta registrada y actualiza o elimina la deuda asociada en el módulo correspondiente.
   */
  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !editingSale.id) return;
    try {
      const oldPaymentMethod = editingSale.paymentMethod;
      const oldTotal = editingSale.total;
      const oldClientName = editingSale.clientName;

      // 1. Guardar cambios en la venta
      const updatedFields = {
        clientName: editClientName.trim() || "Consumidor Final",
        paymentMethod: editPaymentMethod,
        total: editTotal
      };

      await db.updateSale(userId, editingSale.id, updatedFields);

      // 2. Alinear registros de deudas
      // Caso A: Cambió de Fiado a otro método -> Eliminar la deuda anterior
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
      // Caso B: Cambió de otro método a Fiado -> Crear nueva deuda automática
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
      // Caso C: Sigue siendo Fiado -> Actualizar los campos en la deuda asociada
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

  /**
   * @function handleDeleteSale
   * @description Elimina una venta registrada, restaura el stock y limpia la deuda si es una venta a crédito.
   */
  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta venta registrada? Esta acción restaurará el stock de los productos vendidos y eliminará la cuenta fiada asociada si corresponde.")) return;
    try {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (!saleToDelete) return;

      // 1. Eliminar la venta
      await db.deleteSale(userId, saleId);

      // 2. Eliminar deuda asociada si era Fiado
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

      // 3. Restaurar stock de los productos
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

  /**
   * @function handleRegistrarVenta
   * @description Validates fields, updates product stock in Firestore for all cart items, and appends sale transaction record.
   */
  const handleRegistrarVenta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    // Validate stocks before starting checkout
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

      // 1. Save Sale to InsForge
      const saleId = await db.addSale(userId, newSale);

      // Si el pago es fiado, registrar automáticamente la deuda en el módulo de Cuentas Pendientes (Deudas)
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

      // 2. Decrement inventory stock for each item
      for (const item of cart) {
        const finalStock = Math.max(0, item.product.stock - item.quantity);
        await db.updateProduct(userId, item.product.id!, {
          stock: finalStock,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Show Success banner
      setSuccessMessage(`¡Venta de ${cart.length} productos registrada con éxito! Total: $${saleTotal.toLocaleString("es-CO")}`);
      
      const registeredSale: Sale = {
        ...newSale,
        id: saleId
      };
      setLastRegisteredSale(registeredSale);
      
      // 4. Reset POS Form state
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

  return (
    <div className="space-y-6" id="sales-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-brand-text">Caja y Ventas</h2>
          <p className="text-xs text-brand-muted">Registra transacciones de forma inmediata y mantén al día tus ventas diarias.</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exportingPdf || currentMonthSales.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          {exportingPdf ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download size={14} />
              Exportar Ventas del Mes (PDF)
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-xs font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          {lastRegisteredSale && (
            <button
              onClick={() => handleGenerateReceiptPDF(lastRegisteredSale)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-auto shrink-0"
            >
              <Download size={14} />
              <span>Imprimir Recibo PDF</span>
            </button>
          )}
        </div>
      )}

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sales-layout">
        {/* Left POS Column - Now taking lg:col-span-8 for better widescreen usability */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
            {/* POS Workspace Header */}
            <div className="p-5 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand-primary" />
                <h3 className="font-extrabold text-sm text-brand-text">Punto de Venta Interactiva (POS)</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-muted bg-white px-3 py-1.5 rounded-lg border border-brand-border font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Terminal Activo
              </div>
            </div>

            {/* POS Workspace Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-brand-border">
              {/* POS Left Pane: Catalog */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-brand-text uppercase tracking-wider">1. Buscar Productos</h4>
                  <p className="text-[10px] text-brand-muted">Filtra por categoría o busca por nombre. Usa las flechas ↑↓ y presiona Enter para agregar.</p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-brand-muted">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={catalogSearch}
                    onChange={e => handleCatalogSearchChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveCatalogIndex(prev => Math.min(filteredCatalogProducts.length - 1, prev + 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveCatalogIndex(prev => Math.max(0, prev - 1));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const selectedProd = filteredCatalogProducts[activeCatalogIndex];
                        if (selectedProd) {
                          const inCart = cart.find(item => item.product.id === selectedProd.id);
                          const currentQty = inCart ? inCart.quantity : 0;
                          if (selectedProd.stock - currentQty > 0) {
                            handleAddToCart(selectedProd);
                            setCatalogSearch("");
                            setActiveCatalogIndex(0);
                          } else {
                            alert(`No hay más stock disponible para ${selectedProd.name}.`);
                          }
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-brand-border pl-9 pr-3.5 py-2 text-xs bg-brand-bg text-brand-text focus:bg-white focus:border-brand-primary focus:outline-hidden"
                  />
                </div>

                {/* Categories Scrollable Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {catalogCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
                        selectedCatalogCategory === cat
                          ? "bg-brand-primary/15 border-brand-primary/30 text-brand-primary"
                          : "bg-slate-50 border-brand-border/60 text-brand-muted hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Catalog Products List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredCatalogProducts.length === 0 ? (
                    <div className="text-center py-12 text-xs text-brand-muted space-y-1">
                      <p className="font-semibold">No se encontraron productos</p>
                      <p className="text-[10px] text-brand-muted/70">Asegúrate de registrar stock en Inventario.</p>
                    </div>
                  ) : (
                    filteredCatalogProducts.map((p, idx) => {
                      const inCart = cart.find(item => item.product.id === p.id);
                      const currentQty = inCart ? inCart.quantity : 0;
                      const remainingStock = p.stock - currentQty;
                      const isOutOfStock = remainingStock <= 0;
                      const isActive = idx === activeCatalogIndex;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (!isOutOfStock) {
                              handleAddToCart(p);
                              setActiveCatalogIndex(idx);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group ${
                            isOutOfStock
                              ? "opacity-50 bg-slate-50/50 border-dashed border-brand-border/40 cursor-not-allowed"
                              : isActive
                                ? "bg-brand-primary/10 border-brand-primary ring-2 ring-brand-primary/10"
                                : "bg-brand-bg hover:bg-brand-primary/5 hover:border-brand-primary/30 border-transparent"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2 min-w-0 flex-1">
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
                            <div className="flex items-center gap-1.5 text-[9px] text-brand-muted">
                              <span className="bg-white border border-brand-border/40 px-1.5 py-0.5 rounded-md font-bold">
                                {p.category}
                              </span>
                              <span>SKU: {p.sku || "N/A"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-xs font-mono font-black text-brand-text">
                                ${p.price.toLocaleString("es-CO")}
                              </p>
                              <p className="text-[9px] text-brand-muted font-semibold">
                                {isOutOfStock ? "Agotado" : `${remainingStock} disp.`}
                              </p>
                            </div>

                            <div className={`p-1.5 rounded-lg border transition-all ${
                              isOutOfStock 
                                ? "bg-slate-100 text-slate-400 border-slate-200" 
                                : isActive
                                  ? "bg-brand-primary text-white border-brand-primary shadow-2xs"
                                  : "bg-white text-brand-primary border-brand-border shadow-2xs group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary"
                            }`}>
                              <Plus size={12} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* POS Right Pane: Cart */}
              <div className="p-5 flex flex-col justify-between h-full bg-slate-50/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-brand-text uppercase tracking-wider">2. Detalle de Compra</h4>
                      <p className="text-[10px] text-brand-muted">Los productos elegidos aparecerán aquí.</p>
                    </div>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCart}
                        className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 size={11} />
                        Vaciar
                      </button>
                    )}
                  </div>

                  {/* Cart List */}
                  <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-brand-muted space-y-2">
                        <div className="p-3 bg-brand-bg rounded-full text-brand-muted/70">
                          <ShoppingCart size={18} />
                        </div>
                        <p className="text-[10px] font-bold">El carrito está vacío</p>
                        <p className="text-[9px] text-brand-muted/70 max-w-[150px]">Elige productos de la izquierda para agregarlos.</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-brand-border shadow-3xs"
                        >
                          <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                            <p className="text-xs font-bold text-brand-text truncate">{item.product.name}</p>
                            <p className="text-[9px] text-brand-primary font-mono font-bold">
                              ${item.product.price.toLocaleString("es-CO")} c/u
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-brand-border rounded-lg bg-brand-bg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.product.id!, item.quantity - 1)}
                                className="p-1 px-1.5 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="px-1.5 text-[11px] font-mono font-black text-brand-text bg-white border-x border-brand-border min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.product.id!, item.quantity + 1)}
                                className="p-1 px-1.5 hover:bg-slate-100 text-brand-muted transition-colors cursor-pointer"
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus size={10} />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product.id!)}
                              className="text-brand-muted hover:text-rose-600 p-1 rounded-md transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Checkout Summary & Submission */}
                <div className="pt-4 border-t border-brand-border space-y-3 mt-4">
                  {/* Client Name Input */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider">
                      Cliente {paymentMethod === "Fiado" ? "(Obligatorio)" : "(Opcional)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-brand-muted">
                        <User size={12} />
                      </span>
                      <input
                        type="text"
                        placeholder={paymentMethod === "Fiado" ? "Nombre del deudor (ej: Don Juan)" : "Ej: Consumidor Final, Juan..."}
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full rounded-lg border border-brand-border pl-8 pr-3 py-1.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
                        disabled={loading || cart.length === 0}
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("Efectivo");
                          setDueDate("");
                        }}
                        className={`py-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === "Efectivo"
                            ? "bg-brand-primary/15 border-brand-primary text-brand-primary font-black"
                            : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                        }`}
                        disabled={loading || cart.length === 0}
                      >
                        <DollarSign size={11} />
                        Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("Tarjeta");
                          setDueDate("");
                        }}
                        className={`py-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === "Tarjeta"
                            ? "bg-brand-primary/15 border-brand-primary text-brand-primary font-black"
                            : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                        }`}
                        disabled={loading || cart.length === 0}
                      >
                        <CreditCard size={11} />
                        Tarjeta
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("Fiado")}
                        className={`py-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === "Fiado"
                            ? "bg-brand-primary/15 border-brand-primary text-brand-primary font-black"
                            : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                        }`}
                        disabled={loading || cart.length === 0}
                      >
                        <ClipboardList size={11} />
                        Fiado
                      </button>
                    </div>
                  </div>

                  {/* Due Date Selector (Only shown if Fiado is selected) */}
                  {paymentMethod === "Fiado" && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="block text-[9px] font-bold text-brand-muted uppercase tracking-wider text-rose-700">Fecha de Pago (Vencimiento)</label>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-brand-border px-3 py-1.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden font-mono"
                        disabled={loading || cart.length === 0}
                      />
                    </div>
                  )}

                  {/* Total summary */}
                  <div className="bg-slate-100 rounded-xl p-3 border border-brand-border/60 flex justify-between items-center text-xs font-bold text-brand-text font-mono">
                    <span>TOTAL COMPRA:</span>
                    <span className="text-emerald-700 text-sm font-black">
                      ${cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={() => handleRegistrarVenta()}
                    disabled={loading || cart.length === 0}
                    className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-dark font-extrabold text-xs text-white py-3 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    Registrar Venta ({cart.reduce((sum, item) => sum + item.quantity, 0)} u.)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Stats & History Column - Now taking lg:col-span-4 to complement workspace ratio */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Summary Box (Replaces charts with clean simple text summary) */}
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
                      
                      {/* Compact items list details for multi-product orders */}
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
        </div>
      </div>

      {/* Análisis Visual de Ventas Semanales */}
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

        {/* Recharts Bar Chart */}
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

      {/* Modal para Editar Venta */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-brand-border shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-brand-bg pb-3">
              <h3 className="text-sm font-black text-brand-text flex items-center gap-1.5 uppercase">
                <Edit3 className="text-brand-primary" size={16} />
                Editar Detalle de Venta
              </h3>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="text-xs text-brand-muted hover:text-brand-text font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Nombre del Cliente</label>
                <input
                  type="text"
                  required={editPaymentMethod === "Fiado"}
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full rounded-xl border border-brand-border px-3.5 py-2.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden"
                  placeholder="Ej: Consumidor Final, Juan..."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Efectivo", "Tarjeta", "Fiado"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setEditPaymentMethod(method)}
                      className={`py-2.5 rounded-xl border text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        editPaymentMethod === method
                          ? "bg-brand-primary/15 border-brand-primary text-brand-primary"
                          : "bg-white border-brand-border text-brand-muted hover:bg-slate-50"
                      }`}
                    >
                      {method === "Efectivo" && <DollarSign size={10} />}
                      {method === "Tarjeta" && <CreditCard size={10} />}
                      {method === "Fiado" && <ClipboardList size={10} />}
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-wider">Total de la Venta ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editTotal}
                  onChange={(e) => setEditTotal(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-brand-border px-3.5 py-2.5 text-xs bg-white text-brand-text focus:border-brand-primary focus:outline-hidden font-mono font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 rounded-xl border border-brand-border text-brand-muted hover:bg-slate-50 font-bold text-xs py-3 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white font-extrabold text-xs py-3 shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

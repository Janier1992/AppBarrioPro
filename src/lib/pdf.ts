import { jsPDF } from "jspdf";
import { Sale, Product } from "../types";
import { isCriticalStock } from "./stock";

export const generateReceiptPDF = (sale: Sale) => {
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
    doc.text("Tiendly", 40, 12, { align: "center" });

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

export const exportSalesPDF = (
  currentMonthSales: Sale[],
  statsMes: { total: number; count: number; promedio: number; efectivo: number; tarjeta: number },
  currentMonthName: string,
  currentYear: number
) => {
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

    const primaryColor = [74, 90, 64]; 
    const textColor = [31, 41, 55];
    const secondaryColor = [107, 114, 128];

    let pageCount = 1;

    const drawHeader = (pageNum: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("TIENDLY — HISTORIAL DE VENTAS", 15, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Registro Completo de Caja  |  Mes: ${currentMonthName} de ${currentYear}  |  Generado: ${todayStrFormatted}`, 15, 26);
    };

    const drawFooter = (pageNum: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Página ${pageNum}`, 105, 287, { align: "center" });
      doc.text("Tiendly AI — Tu asesor y mentor comercial", 15, 287);
      doc.text("Documento Oficial de Control de Caja", 195, 287, { align: "right" });
    };

    drawHeader(pageCount);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`1. RESUMEN FINANCIERO — ${currentMonthName.toUpperCase()} ${currentYear}`, 15, 45);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.4);
    doc.line(15, 47, 195, 47);

    doc.setFillColor(249, 250, 251);
    doc.rect(15, 51, 180, 28, "F");
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.rect(15, 51, 180, 28, "S");

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(9);
    
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

    doc.setFont("helvetica", "bold");
    doc.text("Ventas en Efectivo:", 125, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`$${statsMes.efectivo.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 162, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Ventas con Tarjeta:", 125, 64);
    doc.setFont("helvetica", "normal");
    doc.text(`$${statsMes.tarjeta.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`, 162, 64);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. DETALLE CRONOLÓGICO DE TRANSACCIONES", 15, 90);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.4);
    doc.line(15, 92, 195, 92);

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

        if (idx % 2 === 1) {
          doc.setFillColor(249, 250, 251);
          doc.rect(15, currentY, 180, 7, "F");
        }

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
    doc.save(`tiendly_ventas_${currentMonthName.toLowerCase()}_${currentYear}.pdf`);
  } catch (error) {
    console.error("Error generating sales PDF report:", error);
    alert("Ocurrió un error inesperado al intentar generar el PDF. Por favor, intente de nuevo.");
  }
};

/**
 * Reporte general del Panel de Control (ventas del mes + estado del
 * inventario + alertas de stock crítico). Vivía antes embebido dentro de
 * useDashboard(); se movió aquí junto al resto de generadores de PDF.
 */
export const generateDashboardReportPDF = (
  products: Product[],
  mensualData: { day: number; monto: number; ventas: number }[],
  totalVentasMes: number,
  totalTransaccionesMes: number,
  currentMonthName: string
) => {
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

  const primaryColor = [74, 90, 64];
  const textColor = [31, 41, 55];
  const lightGray = [107, 114, 128];

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TIENDLY — REPORTE DE GESTIÓN", 15, 18);

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

  const lowStockProducts = products.filter(isCriticalStock);

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
    doc.text("Reporte Generado Automáticamente por Tiendly — Tu Asistente Digital.", 15, 287);
  }

  // Antes tenía el año "2026" escrito fijo en el nombre del archivo.
  doc.save(`Reporte_Tiendly_${currentMonthName}_${new Date().getFullYear()}.pdf`);
};

import { jsPDF } from "jspdf";
import { Sale } from "../types";

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
    doc.save(`barriopro_ventas_${currentMonthName.toLowerCase()}_${currentYear}.pdf`);
  } catch (error) {
    console.error("Error generating sales PDF report:", error);
    alert("Ocurrió un error inesperado al intentar generar el PDF. Por favor, intente de nuevo.");
  }
};

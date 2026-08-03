import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '../api';

/**
 * Export element to PDF
 * @param {HTMLElement} element - Element to export
 * @param {string} filename - Name of the PDF file
 * @param {object} options - Additional options
 */
export const exportElementToPDF = async (element, filename = 'document.pdf', options = {}) => {
  try {
    const {
      orientation = 'portrait',
      format = 'a4',
      quality = 0.95,
    } = options;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yPosition = 10;

    if (imgHeight > pdfHeight - 20) {
      let heightLeft = imgHeight;
      let page = 1;

      while (heightLeft > 0) {
        const pageHeight = page === 1 ? pdfHeight - 20 : pdfHeight - 10;
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);

        heightLeft -= pageHeight;
        yPosition = heightLeft > 0 ? -imgHeight + pageHeight - 10 : 0;

        if (heightLeft > 0) {
          pdf.addPage();
          page += 1;
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

/**
 * Export table/data as CSV then to PDF
 * @param {array} data - Array of objects
 * @param {array} columns - Column definitions
 * @param {string} filename - Name of the PDF file
 */
export const exportDataToPDF = (data, columns, filename = 'report.pdf') => {
  try {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginLeft = 10;
    const marginTop = 10;
    let currentY = marginTop;

    // Add title
    pdf.setFontSize(16);
    pdf.text(filename.replace('.pdf', ''), marginLeft, currentY);
    currentY += 10;

    // Add table
    pdf.setFontSize(10);
    const columnWidth = (pageWidth - 2 * marginLeft) / columns.length;

    // Header
    pdf.setFillColor(41, 128, 185);
    pdf.setTextColor(255, 255, 255);
    columns.forEach((col, index) => {
      pdf.rect(marginLeft + index * columnWidth, currentY, columnWidth, 7, 'F');
      pdf.text(col.label, marginLeft + index * columnWidth + 2, currentY + 5);
    });
    currentY += 7;

    // Body
    pdf.setTextColor(0, 0, 0);
    data.forEach((row) => {
      if (currentY > pageHeight - 10) {
        pdf.addPage();
        currentY = marginTop;
      }

      columns.forEach((col, index) => {
        const cellValue = String(row[col.key] || '').substring(0, 20);
        pdf.text(cellValue, marginLeft + index * columnWidth + 2, currentY + 5);
      });
      currentY += 7;
    });

    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting data to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

const formatProposalDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN');
};

const safeFilePart = (value) => String(value || 'proposal')
  .trim()
  .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
  .replace(/\s+/g, '-')
  .toLowerCase();

export const exportProposalToPDF = ({ project = {}, client = {} }) => {
  const proposalText = String(project.proposalText || '').trim();
  if (!proposalText) {
    throw new Error('No proposal text found');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (heightNeeded = 8) => {
    if (y + heightNeeded <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  pdf.setFontSize(20);
  pdf.setTextColor(28, 37, 54);
  pdf.text('Project Proposal', margin, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Generated on ${new Date().toLocaleString('en-IN')}`, margin, y);
  y += 10;

  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  const projectDetails = [
    ['Client', client.name || client.company || 'N/A'],
    ['Project', project.name || 'N/A'],
    ['Status', project.status || 'N/A'],
    ['Category', project.category || 'N/A'],
    ['Start Date', formatProposalDate(project.startDate)],
    ['Due Date', formatProposalDate(project.dueDate)],
  ];

  let detailsY = y + 8;
  projectDetails.forEach(([label, value], index) => {
    const columnX = index % 2 === 0 ? margin + 4 : margin + contentWidth / 2;
    if (index % 2 === 0 && index > 0) detailsY += 9;
    pdf.setFont(undefined, 'bold');
    pdf.text(`${label}:`, columnX, detailsY);
    pdf.setFont(undefined, 'normal');
    pdf.text(String(value), columnX + 24, detailsY);
  });

  y += 48;

  if (project.description) {
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.text('Project Summary', margin, y);
    y += 7;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(11);
    const summaryLines = pdf.splitTextToSize(String(project.description), contentWidth);
    summaryLines.forEach((line) => {
      ensureSpace(6);
      pdf.text(line, margin, y);
      y += 5.5;
    });
    y += 4;
  }

  ensureSpace(12);
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(12);
  pdf.text('Proposal', margin, y);
  y += 7;

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(11);
  const proposalLines = pdf.splitTextToSize(proposalText, contentWidth);
  proposalLines.forEach((line) => {
    ensureSpace(6);
    pdf.text(line, margin, y);
    y += 5.5;
  });

  const filename = `${safeFilePart(client.name || client.company || 'client')}-${safeFilePart(project.name || 'project')}-proposal.pdf`;
  pdf.save(filename);
};

/**
 * Export CSV file
 * @param {array} data - Array of objects
 * @param {string} filename - Name of the CSV file
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatCurrencyINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const getCompanyProfileForInvoice = async () => {
  try {
    const response = await api.get('/settings');
    const profile = response?.data?.settings?.companyProfile || {};
    return {
      name: profile.name || 'RISE WITH MEDIA',
      address: profile.address || '',
      email: profile.email || '',
      phone: profile.phone || '',
      gstNumber: profile.gstNumber || '',
      services: profile.services || 'Media & Marketing Operations Platform',
      logoUrl: profile.logoUrl || '',
    };
  } catch {
    return {
      name: 'RISE WITH MEDIA',
      address: '',
      email: '',
      phone: '',
      gstNumber: '',
      services: 'Media & Marketing Operations Platform',
      logoUrl: '',
    };
  }
};

const loadLogoImage = async (logoUrl) => {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Export Invoice to PDF
 * @param {object} invoice - Invoice data object
 * @param {object} options - Options (save: boolean, filename: string)
 */
export const exportInvoiceToPDF = async (invoice, options = {}) => {
  const { save = true } = options;
  const companyProfile = await getCompanyProfileForInvoice();
  const logoDataUrl = await loadLogoImage(companyProfile.logoUrl);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed = 10) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Header Banner / Logo
  pdf.setFillColor(15, 23, 42); // slate-900 header
  pdf.rect(0, 0, pageWidth, 28, 'F');

  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', margin, 7, 26, 14);
    } catch {
      // Ignore logo render issues and fall back to text branding
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  const companyTitleX = logoDataUrl ? margin + 32 : margin;
  pdf.text(companyProfile.name || 'RISE WITH MEDIA', companyTitleX, 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  const companyTagline = companyProfile.services || 'Media & Marketing Operations Platform';
  pdf.text(companyTagline, companyTitleX, 20);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text('INVOICE', pageWidth - margin, 15, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(invoice.invoiceNumber || 'INV-DRAFT', pageWidth - margin, 21, { align: 'right' });

  y = 35;

  // Invoice & Client Info Card
  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 36, 3, 3, 'FD');

  const clientName = invoice.clientDetails?.businessName || invoice.clientDetails?.name || invoice.client?.company || invoice.client?.name || invoice.clientName || 'Client';
  const clientEmail = invoice.clientDetails?.email || invoice.client?.email || '';
  const clientPhone = invoice.clientDetails?.phone || invoice.client?.phone || '';
  const projectName = invoice.projectName || invoice.project?.name || 'General Services';

  const issueDateStr = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A';
  const statusStr = (invoice.status || invoice.invoiceStatus || 'Draft').toUpperCase();

  // Left Column - Bill To
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Billed To:', margin + 4, y + 8);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text(String(clientName), margin + 4, y + 15);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  let clientInfoY = y + 21;
  if (projectName) {
    pdf.text(`Project: ${projectName}`, margin + 4, clientInfoY);
    clientInfoY += 5;
  }
  if (clientEmail || clientPhone) {
    pdf.text([clientEmail, clientPhone].filter(Boolean).join(' | '), margin + 4, clientInfoY);
  }

  // Right Column - Invoice Meta
  const rightX = margin + contentWidth / 2 + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  pdf.text('Invoice Date:', rightX, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(issueDateStr, rightX + 28, y + 8);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Due Date:', rightX, y + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(15, 23, 42);
  pdf.text(dueDateStr, rightX + 28, y + 15);

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Status:', rightX, y + 22);
  pdf.setFont('helvetica', 'bold');
  if (statusStr === 'PAID') pdf.setTextColor(22, 163, 74);
  else if (statusStr === 'OVERDUE') pdf.setTextColor(220, 38, 38);
  else pdf.setTextColor(37, 99, 235);
  pdf.text(statusStr, rightX + 28, y + 22);

  y += 44;

  // Table Headers
  const colX = {
    sno: margin + 2,
    service: margin + 12,
    qty: margin + 105,
    rate: margin + 130,
    amount: pageWidth - margin - 2,
  };

  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y + 8, pageWidth - margin, y + 8);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  pdf.text('#', colX.sno, y + 5.5);
  pdf.text('Service / Description', colX.service, y + 5.5);
  pdf.text('Qty', colX.qty, y + 5.5, { align: 'center' });
  pdf.text('Rate (Rs.)', colX.rate, y + 5.5, { align: 'right' });
  pdf.text('Amount (Rs.)', colX.amount, y + 5.5, { align: 'right' });

  y += 10;

  // Table Items
  const items = invoice.invoiceItems || invoice.lineItems || [
    {
      serviceName: 'Services Provided',
      description: invoice.description || invoice.serviceDetails || '',
      quantity: 1,
      rate: Number(invoice.totalAmount || invoice.total || invoice.amount || 0),
      amount: Number(invoice.totalAmount || invoice.total || invoice.amount || 0),
    },
  ];

  let rawSubtotal = 0;

  items.forEach((item, index) => {
    ensureSpace(12);
    const qty = Number(item.quantity || 1);
    const rate = Number(item.rate ?? item.unitPrice ?? 0);
    const itemAmount = Number(item.amount ?? (qty * rate));
    rawSubtotal += itemAmount;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);

    pdf.text(String(index + 1), colX.sno, y);

    const serviceTitle = item.serviceName || 'Service';
    pdf.setFont('helvetica', 'bold');
    pdf.text(serviceTitle, colX.service, y);
    pdf.setFont('helvetica', 'normal');

    let itemY = y;
    if (item.description) {
      itemY += 4.5;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      const descLines = pdf.splitTextToSize(item.description, 90);
      descLines.forEach((dLine) => {
        pdf.text(dLine, colX.service, itemY);
        itemY += 4;
      });
    }

    pdf.setFontSize(9);
    pdf.setTextColor(30, 41, 59);
    pdf.text(String(qty), colX.qty, y, { align: 'center' });
    pdf.text(rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.rate, y, { align: 'right' });
    pdf.text(itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), colX.amount, y, { align: 'right' });

    y = Math.max(itemY + 4, y + 8);
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, y - 2, pageWidth - margin, y - 2);
  });

  y += 4;
  ensureSpace(45);

  // Financial Calculations
  const discount = Number(invoice.discount || 0);
  const taxRate = Number(invoice.taxRate || 0);
  const subtotalAfterDiscount = Math.max(rawSubtotal - discount, 0);
  const taxAmount = taxRate > 0 ? (subtotalAfterDiscount * taxRate) / 100 : 0;
  const grandTotal = Number(invoice.totalAmount || invoice.total || (subtotalAfterDiscount + taxAmount));
  const paidAmount = Number(invoice.paidAmount || 0);
  const balanceAmount = Number(invoice.balanceAmount ?? Math.max(grandTotal - paidAmount, 0));

  // Bottom Summary Grid
  const summaryWidth = 80;
  const summaryX = pageWidth - margin - summaryWidth;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(summaryX, y, summaryWidth, taxRate > 0 || discount > 0 ? 46 : 34, 2, 2, 'FD');

  let sumY = y + 7;
  pdf.setFontSize(9);

  if (discount > 0 || taxRate > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Subtotal:', summaryX + 4, sumY);
    pdf.text(formatCurrencyINR(rawSubtotal), summaryX + summaryWidth - 4, sumY, { align: 'right' });
    sumY += 6;

    if (discount > 0) {
      pdf.text('Discount:', summaryX + 4, sumY);
      pdf.text(`- ${formatCurrencyINR(discount)}`, summaryX + summaryWidth - 4, sumY, { align: 'right' });
      sumY += 6;
    }

    if (taxRate > 0) {
      pdf.text(`Tax / GST (${taxRate}%):`, summaryX + 4, sumY);
      pdf.text(formatCurrencyINR(taxAmount), summaryX + summaryWidth - 4, sumY, { align: 'right' });
      sumY += 6;
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Total Amount:', summaryX + 4, sumY);
  pdf.text(formatCurrencyINR(grandTotal), summaryX + summaryWidth - 4, sumY, { align: 'right' });
  sumY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(22, 163, 74);
  pdf.text('Paid Amount:', summaryX + 4, sumY);
  pdf.text(formatCurrencyINR(paidAmount), summaryX + summaryWidth - 4, sumY, { align: 'right' });
  sumY += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('Balance Due:', summaryX + 4, sumY);
  pdf.text(formatCurrencyINR(balanceAmount), summaryX + summaryWidth - 4, sumY, { align: 'right' });

  // Notes & Payment Instructions (Left Side)
  const leftWidth = contentWidth - summaryWidth - 6;
  let notesY = y + 4;

  if (invoice.paymentLink) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(37, 99, 235);
    pdf.text('Payment Link:', margin, notesY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(String(invoice.paymentLink), margin, notesY + 5);
    notesY += 12;
  }

  if (invoice.paymentTerms || invoice.terms) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Payment Instructions / Terms:', margin, notesY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    const termsLines = pdf.splitTextToSize(String(invoice.paymentTerms || invoice.terms), leftWidth);
    notesY += 5;
    termsLines.forEach((tLine) => {
      pdf.text(tLine, margin, notesY);
      notesY += 4;
    });
    notesY += 2;
  }

  if (invoice.notes) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Notes:', margin, notesY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    const notesLines = pdf.splitTextToSize(String(invoice.notes), leftWidth);
    notesY += 5;
    notesLines.forEach((nLine) => {
      pdf.text(nLine, margin, notesY);
      notesY += 4;
    });
  }

  // Footer
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Thank you for working with Rise With Media. For support, contact finance@risewithmedia.com', margin, pageHeight - 8);
  pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 8, { align: 'right' });

  const fileName = `${(invoice.invoiceNumber || 'invoice').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
  if (save) {
    pdf.save(fileName);
  }
  return { pdf, fileName };
};

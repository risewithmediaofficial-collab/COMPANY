// =============================================
// RISE WITH MEDIA - FINANCE FORMATTERS & UTILITIES
// Indian Rupees formatting & Asia/Kolkata Timezone
// =============================================

export const formatINR = (value, includeDecimals = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return includeDecimals ? '₹0.00' : '₹0';
  }
  const num = Number(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
};

export const formatDateIST = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

export const formatDateTimeIST = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

export const exportToCSV = (filename, dataRows = [], headers = []) => {
  if (!dataRows || !dataRows.length) return;

  const headerKeys = headers.map((h) => (typeof h === 'string' ? h : h.label));
  const fieldKeys = headers.map((h) => (typeof h === 'string' ? h : h.key));

  const csvContent = [
    headerKeys.join(','),
    ...dataRows.map((row) =>
      fieldKeys
        .map((key) => {
          let val = row[key] ?? '';
          if (typeof val === 'string') {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// CSV & PDF/Print Export Utilities with Thai Character (UTF-8 BOM) Support

export function exportToCSV(filename, rows, headers) {
  if (!rows || !rows.length) return;

  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  let csvContent = headerLabels.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  rows.forEach((row) => {
    const line = headerKeys
      .map((key) => {
        let val = row[key];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
    csvContent += line + '\r\n';
  });

  // Add UTF-8 BOM so Excel opens Thai language correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

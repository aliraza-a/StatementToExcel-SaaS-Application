import * as XLSX from 'xlsx';
import { Transaction } from '@/types/statement';

/**
 * Creates an Excel workbook from standardized transactions.
 * Sets auto-column widths, numeric cell types, and a summary row.
 */
export function createExcelWorkbook(transactions: Transaction[], title = 'Bank Statement'): XLSX.WorkBook {
  const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];

  let totalDebit = 0;
  let totalCredit = 0;

  const dataRows = transactions.map(t => {
    const d = t.debit !== null ? Number(t.debit) : null;
    const c = t.credit !== null ? Number(t.credit) : null;
    const b = t.balance !== null ? Number(t.balance) : null;

    if (d !== null && !isNaN(d)) totalDebit += d;
    if (c !== null && !isNaN(c)) totalCredit += c;

    return [
      t.date || '',
      t.description || '',
      d !== null ? d : '',
      c !== null ? c : '',
      b !== null ? b : '',
    ];
  });

  // Summary row at the bottom
  const summaryRow = [
    'TOTAL',
    `Total Transactions: ${transactions.length}`,
    Math.round(totalDebit * 100) / 100,
    Math.round(totalCredit * 100) / 100,
    Math.round((totalCredit - totalDebit) * 100) / 100,
  ];

  const sheetData = [headers, ...dataRows, [], summaryRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 14 }, // Date
    { wch: 45 }, // Description
    { wch: 15 }, // Debit
    { wch: 15 }, // Credit
    { wch: 16 }, // Balance
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');

  return workbook;
}

/**
 * Generates an .xlsx file Buffer ready to be sent or downloaded.
 */
export function generateExcelBuffer(transactions: Transaction[], title?: string): Buffer {
  const workbook = createExcelWorkbook(transactions, title);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

/**
 * Generates CSV string from standardized transactions.
 */
export function generateCsvString(transactions: Transaction[]): string {
  const workbook = createExcelWorkbook(transactions);
  const worksheet = workbook.Sheets['Statement'];
  return XLSX.utils.sheet_to_csv(worksheet);
}

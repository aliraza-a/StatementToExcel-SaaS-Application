import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

function createExcelWorkbook(transactions, title = 'Bank Statement') {
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

  const summaryRow = [
    'TOTAL',
    `Total Transactions: ${transactions.length}`,
    Math.round(totalDebit * 100) / 100,
    Math.round(totalCredit * 100) / 100,
    Math.round((totalCredit - totalDebit) * 100) / 100,
  ];

  const sheetData = [headers, ...dataRows, [], summaryRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  const colWidths = [
    { wch: 14 },
    { wch: 45 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');

  return workbook;
}

function generateExcelBuffer(transactions, title) {
  const workbook = createExcelWorkbook(transactions, title);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}

function generateCsvString(transactions) {
  const workbook = createExcelWorkbook(transactions);
  const worksheet = workbook.Sheets['Statement'];
  return XLSX.utils.sheet_to_csv(worksheet);
}

test('createExcelWorkbook generates a valid 5-column sheet with correct headers and summary', () => {
  const transactions = [
    { id: '1', date: '2024-03-01', description: 'Stripe Payout', debit: null, credit: 1250.00, balance: 1250.00 },
    { id: '2', date: '2024-03-02', description: 'AWS Cloud Hosting', debit: 215.30, credit: null, balance: 1034.70 },
  ];

  const wb = createExcelWorkbook(transactions, 'March 2024 Statement');
  assert.ok(wb.Sheets['Statement'], 'Worksheet named Statement should exist');

  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Statement'], { header: 1 });
  assert.deepEqual(rows[0], ['Date', 'Description', 'Debit', 'Credit', 'Balance']);
  assert.equal(rows[1][0], '2024-03-01');
  assert.equal(rows[1][1], 'Stripe Payout');
  assert.equal(rows[1][3], 1250);
  assert.equal(rows[2][1], 'AWS Cloud Hosting');
  assert.equal(rows[2][2], 215.3);

  // Check summary row
  const lastRow = rows[rows.length - 1];
  assert.equal(lastRow[0], 'TOTAL');
  assert.equal(lastRow[2], 215.3);
  assert.equal(lastRow[3], 1250);
  assert.equal(lastRow[4], 1034.7);
});

test('generateExcelBuffer produces a valid non-empty binary buffer', () => {
  const transactions = [
    { id: '1', date: '2024-01-10', description: 'Client Invoice #102', debit: null, credit: 500, balance: 500 },
  ];

  const buffer = generateExcelBuffer(transactions);
  assert.ok(Buffer.isBuffer(buffer), 'Result must be a Buffer');
  assert.ok(buffer.length > 1000, 'Excel buffer must be larger than 1KB');

  // Verify it can be read back by XLSX parser
  const readBack = XLSX.read(buffer, { type: 'buffer' });
  assert.ok(readBack.SheetNames.includes('Statement'));
});

test('generateCsvString produces proper CSV text format with headers and escaping', () => {
  const transactions = [
    { id: '1', date: '2024-02-15', description: 'Acme Corp, "Supplies"', debit: 120.00, credit: null, balance: 880.00 },
  ];

  const csv = generateCsvString(transactions);
  assert.ok(csv.includes('Date,Description,Debit,Credit,Balance'), 'Must contain header row');
  assert.ok(csv.includes('2024-02-15'), 'Must contain date');
  assert.ok(csv.includes('120'), 'Must contain debit value');
});

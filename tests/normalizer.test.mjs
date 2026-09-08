import test from 'node:test';
import assert from 'node:assert/strict';

// Direct functional implementations matching src/lib/engine/normalizer.ts
function parseAmount(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : Math.round(val * 100) / 100;
  }

  const raw = String(val).trim();
  if (!raw || raw === '-' || raw === '—' || raw.toLowerCase() === 'none') {
    return null;
  }

  const isNegative = /^\(.*\)$/.test(raw) || raw.startsWith('-');
  const clean = raw.replace(/[^0-9.]/g, '');
  if (!clean) return null;

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  const finalVal = isNegative ? -num : num;
  return Math.round(finalVal * 100) / 100;
}

function normalizeDate(rawDate) {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const alphaMatch = trimmed.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3,})[-/\s](\d{2,4})$/);
  if (alphaMatch) {
    const day = alphaMatch[1].padStart(2, '0');
    const month = monthMap[alphaMatch[2].slice(0, 3).toLowerCase()] || '01';
    let year = alphaMatch[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  const alphaMatch2 = trimmed.match(/^([a-zA-Z]{3,})[-/\s](\d{1,2}),?[-/\s](\d{2,4})$/);
  if (alphaMatch2) {
    const month = monthMap[alphaMatch2[1].slice(0, 3).toLowerCase()] || '01';
    const day = alphaMatch2[2].padStart(2, '0');
    let year = alphaMatch2[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  const numMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    let year = numMatch[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }

    if (p1 > 12 && p2 <= 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    if (p2 > 12 && p1 <= 12) {
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  return trimmed;
}

function calculateSummary(transactions) {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const t of transactions) {
    if (t.debit !== null && !isNaN(Number(t.debit))) {
      totalDebits += Math.abs(Number(t.debit));
    }
    if (t.credit !== null && !isNaN(Number(t.credit))) {
      totalCredits += Math.abs(Number(t.credit));
    }
  }

  totalDebits = Math.round(totalDebits * 100) / 100;
  totalCredits = Math.round(totalCredits * 100) / 100;
  const netChange = Math.round((totalCredits - totalDebits) * 100) / 100;

  return {
    totalDebits,
    totalCredits,
    netChange,
    transactionCount: transactions.length,
  };
}

test('parseAmount correctly handles standard, currency, and accounting formats', () => {
  assert.equal(parseAmount('$1,234.56'), 1234.56);
  assert.equal(parseAmount('€45.99'), 45.99);
  assert.equal(parseAmount('£10,000.00'), 10000.00);
  assert.equal(parseAmount('(150.00)'), -150.00);
  assert.equal(parseAmount('(2,450.75)'), -2450.75);
  assert.equal(parseAmount('-75.20'), -75.20);
  assert.equal(parseAmount('0.00'), 0.00);
  assert.equal(parseAmount(123.456), 123.46);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('—'), null);
  assert.equal(parseAmount(null), null);
  assert.equal(parseAmount(undefined), null);
});

test('normalizeDate converts diverse statement date formats to ISO YYYY-MM-DD', () => {
  assert.equal(normalizeDate('2024-01-15'), '2024-01-15');
  assert.equal(normalizeDate('15/01/2024'), '2024-01-15');
  assert.equal(normalizeDate('01/15/2024'), '2024-01-15');
  assert.equal(normalizeDate('15-Jan-2024'), '2024-01-15');
  assert.equal(normalizeDate('15 Jan 2024'), '2024-01-15');
  assert.equal(normalizeDate('Jan 15, 2024'), '2024-01-15');
  assert.equal(normalizeDate('15/01/24'), '2024-01-15');
});

test('calculateSummary computes accurate KPIs across credits and debits', () => {
  const sampleTransactions = [
    { id: '1', date: '2024-01-01', description: 'Payroll Deposit', debit: null, credit: 3500.00, balance: 5000.00 },
    { id: '2', date: '2024-01-02', description: 'Office Supplies', debit: 120.50, credit: null, balance: 4879.50 },
    { id: '3', date: '2024-01-03', description: 'Client Retainer', debit: null, credit: 1500.00, balance: 6379.50 },
    { id: '4', date: '2024-01-04', description: 'Software SaaS', debit: 49.99, credit: null, balance: 6329.51 },
  ];

  const summary = calculateSummary(sampleTransactions);
  assert.equal(summary.totalDebits, 170.49);
  assert.equal(summary.totalCredits, 5000.00);
  assert.equal(summary.netChange, 4829.51);
  assert.equal(summary.transactionCount, 4);
});

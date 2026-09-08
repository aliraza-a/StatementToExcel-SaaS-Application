import { Transaction, ConversionSummary } from '@/types/statement';

/**
 * Strips currency symbols, cleans commas/spaces, and parses numbers.
 * Handles accounting format: (1,234.50) -> 1234.50
 */
export function parseAmount(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : Math.round(val * 100) / 100;
  }

  const raw = String(val).trim();
  if (!raw || raw === '-' || raw === '—' || raw.toLowerCase() === 'none') {
    return null;
  }

  // Check if enclosed in accounting parentheses: (123.45)
  const isNegative = /^\(.*\)$/.test(raw) || raw.startsWith('-');

  // Remove currency signs, letters, commas, parentheses, etc. Keep digits and dot
  const clean = raw.replace(/[^0-9.]/g, '');
  if (!clean) return null;

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  const finalVal = isNegative ? -num : num;
  return Math.round(finalVal * 100) / 100;
}

/**
 * Normalizes common statement date formats into standard YYYY-MM-DD.
 * Supports:
 * - 2024-01-15 (ISO)
 * - 01/15/2024 (US)
 * - 15/01/2024 (UK/EU)
 * - 15 Jan 2024, 15-Jan-2024, Jan 15, 2024
 */
export function normalizeDate(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();

  // If already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // Check format: DD MMM YYYY or DD-MMM-YYYY or DD MMM YY
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

  // Check format: MMM DD, YYYY
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

  // Check numeric formats: DD/MM/YYYY, MM/DD/YYYY, or DD.MM.YYYY
  const numMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    let year = numMatch[3];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }

    // Heuristic: If p1 > 12, it must be DD/MM/YYYY
    if (p1 > 12 && p2 <= 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    // Default to standard MM/DD/YYYY or DD/MM/YYYY based on plausible month
    if (p2 > 12 && p1 <= 12) {
      return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }

    // Default assume YYYY-MM-DD or DD/MM
    return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Calculates financial summaries from standardized transactions.
 */
export function calculateSummary(transactions: Transaction[]): ConversionSummary {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const t of transactions) {
    if (t.debit !== null && !isNaN(t.debit)) {
      totalDebits += Math.abs(t.debit);
    }
    if (t.credit !== null && !isNaN(t.credit)) {
      totalCredits += Math.abs(t.credit);
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

/**
 * Validates and ensures every transaction strictly complies with the 5 columns:
 * Date, Description, Debit, Credit, Balance
 */
export function normalizeTransactions(rawList: Array<Partial<Transaction>>): Transaction[] {
  return rawList
    .map((item, index) => {
      const date = normalizeDate(item.date || '');
      const description = (item.description || '').replace(/\s+/g, ' ').trim();
      
      let debit = parseAmount(item.debit);
      let credit = parseAmount(item.credit);
      const balance = parseAmount(item.balance);

      // If debit is negative, make it positive since Debit column inherently represents money out
      if (debit !== null) debit = Math.abs(debit);
      // If credit is negative, adjust
      if (credit !== null) credit = Math.abs(credit);

      return {
        id: `tx-${index + 1}`,
        date,
        description,
        debit: debit === 0 ? null : debit,
        credit: credit === 0 ? null : credit,
        balance,
      };
    })
    .filter(t => t.date || t.description || t.debit !== null || t.credit !== null || t.balance !== null);
}

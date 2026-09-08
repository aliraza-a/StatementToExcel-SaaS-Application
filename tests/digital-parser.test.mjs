import test from 'node:test';
import assert from 'node:assert/strict';

function parseAmount(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val * 100) / 100;
  const raw = String(val).trim();
  if (!raw || raw === '-' || raw === '—') return null;
  const isNegative = /^\(.*\)$/.test(raw) || raw.startsWith('-');
  const clean = raw.replace(/[^0-9.]/g, '');
  if (!clean) return null;
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return Math.round((isNegative ? -num : num) * 100) / 100;
}

function normalizeDate(rawDate) {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const numMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    let year = numMatch[3].length === 2 ? `20${numMatch[3]}` : numMatch[3];
    if (p1 > 12 && p2 <= 12) {
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }
  return trimmed;
}

const DATE_START_REGEX = /^(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i;
const DEBIT_WORDS_REGEX = /\b(fee|charge|withdrawal|pos|debit|payment|purchase|bill|tax)\b/i;
const CREDIT_WORDS_REGEX = /\b(deposit|credit|refund|payroll|salary)\b/i;

function parseDigitalStatementText(text) {
  const lines = text.split(/\r?\n/);
  const parsedRows = [];
  let currentTx = null;
  let lastKnownBalance = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (/^opening\s+balance/i.test(rawLine)) {
      const openMatches = rawLine.match(/[\d,]+\.\d{2}/g);
      if (openMatches && openMatches.length > 0) {
        lastKnownBalance = parseAmount(openMatches[openMatches.length - 1]);
      }
      continue;
    }

    const dateMatch = rawLine.match(DATE_START_REGEX);
    if (dateMatch) {
      if (currentTx) {
        parsedRows.push(currentTx);
        if (currentTx.balance !== null) lastKnownBalance = currentTx.balance;
        currentTx = null;
      }

      const dateStr = dateMatch[1];
      const restOfLine = rawLine.slice(dateMatch[0].length).trim();
      const amountsFound = [];
      const numberMatches = restOfLine.matchAll(/(?:([+-]?)\s*[\$€£¥₹]?\s*(\(\s*[\d,]+\.?\d*\s*\)|[\d,]+\.\d{2})\s*(CR|DR)?)/gi);
      for (const m of numberMatches) {
        const fullToken = m[0].trim();
        const parsed = parseAmount(fullToken);
        if (parsed !== null) {
          amountsFound.push({
            raw: fullToken,
            num: parsed,
            isNeg: fullToken.startsWith('-') || /^\(.*\)$/.test(fullToken) || /DR$/i.test(fullToken),
          });
        }
      }

      let description = restOfLine;
      for (const amt of amountsFound) {
        description = description.replace(amt.raw, '');
      }
      description = description.replace(/\s+/g, ' ').trim();

      let debit = null;
      let credit = null;
      let balance = null;

      if (amountsFound.length === 1) {
        const amt = amountsFound[0];
        if (amt.isNeg || DEBIT_WORDS_REGEX.test(description)) {
          debit = Math.abs(amt.num);
        } else if (CREDIT_WORDS_REGEX.test(description)) {
          credit = Math.abs(amt.num);
        } else {
          debit = Math.abs(amt.num);
        }
      } else if (amountsFound.length === 2) {
        const first = amountsFound[0];
        const second = amountsFound[1];
        balance = second.num;

        if (lastKnownBalance !== null) {
          const delta = Math.round((second.num - lastKnownBalance) * 100) / 100;
          if (delta < 0) {
            debit = Math.abs(first.num);
          } else if (delta > 0) {
            credit = Math.abs(first.num);
          }
        }

        if (debit === null && credit === null) {
          if (first.isNeg || DEBIT_WORDS_REGEX.test(description)) {
            debit = Math.abs(first.num);
          } else if (CREDIT_WORDS_REGEX.test(description)) {
            credit = Math.abs(first.num);
          } else {
            debit = Math.abs(first.num);
          }
        }
      }

      currentTx = {
        date: normalizeDate(dateStr),
        description,
        debit,
        credit,
        balance,
      };
    } else if (currentTx) {
      if (rawLine.length > 1 && !/^(date|description|balance)/i.test(rawLine)) {
        if (currentTx.debit === null && currentTx.credit === null && currentTx.balance === null) {
          const numberMatches = [...rawLine.matchAll(/(?:([+-]?)\s*[\$€£¥₹]?\s*(\(\s*[\d,]+\.?\d*\s*\)|[\d,]+\.\d{2})\s*(CR|DR)?)/gi)];
          if (numberMatches.length > 0) {
            const amountsFound = numberMatches.map(m => {
              const fullToken = m[0].trim();
              return {
                raw: fullToken,
                num: parseAmount(fullToken) || 0,
                isNeg: fullToken.startsWith('-') || /^\(.*\)$/.test(fullToken) || /DR$/i.test(fullToken),
              };
            });

            let memoDesc = rawLine;
            for (const amt of amountsFound) {
              memoDesc = memoDesc.replace(amt.raw, '');
            }
            memoDesc = memoDesc.replace(/\s+/g, ' ').trim();
            if (memoDesc) currentTx.description = `${currentTx.description} ${memoDesc}`.trim();

            if (amountsFound.length >= 2) {
              const first = amountsFound[0];
              const second = amountsFound[1];
              currentTx.balance = second.num;
              if (lastKnownBalance !== null) {
                const delta = Math.round((second.num - lastKnownBalance) * 100) / 100;
                if (delta < 0) currentTx.debit = Math.abs(first.num);
                else if (delta > 0) currentTx.credit = Math.abs(first.num);
              }
              if (currentTx.debit === null && currentTx.credit === null) {
                if (first.isNeg || DEBIT_WORDS_REGEX.test(currentTx.description)) currentTx.debit = Math.abs(first.num);
                else if (CREDIT_WORDS_REGEX.test(currentTx.description)) currentTx.credit = Math.abs(first.num);
                else currentTx.debit = Math.abs(first.num);
              }
            }
            continue;
          }
        }
        currentTx.description = `${currentTx.description} ${rawLine}`.trim();
      }
    }
  }

  if (currentTx) parsedRows.push(currentTx);
  return parsedRows;
}

test('parseDigitalStatementText extracts lines with running balance heuristic', () => {
  const statementText = `
ACCOUNT SUMMARY
OPENING BALANCE 10,000.00
2024-01-02 CHECKCARD PURCHASE WHOLE FOODS 150.00 9,850.00
2024-01-05 PAYROLL DIRECT DEPOSIT 3,000.00 12,850.00
2024-01-10 WIRE TRANSFER OUT
REF# 4892104-ACME CORP 1,000.00 11,850.00
  `;

  const txs = parseDigitalStatementText(statementText);
  assert.equal(txs.length, 3, 'Should extract 3 transactions');

  // Tx 1: Purchase -> Debit 150, Balance 9850
  assert.equal(txs[0].date, '2024-01-02');
  assert.equal(txs[0].debit, 150.00);
  assert.equal(txs[0].credit, null);
  assert.equal(txs[0].balance, 9850.00);

  // Tx 2: Payroll -> Credit 3000, Balance 12850
  assert.equal(txs[1].date, '2024-01-05');
  assert.equal(txs[1].credit, 3000.00);
  assert.equal(txs[1].debit, null);
  assert.equal(txs[1].balance, 12850.00);

  // Tx 3: Multi-line narrative stitched correctly
  assert.equal(txs[2].date, '2024-01-10');
  assert.ok(txs[2].description.includes('WIRE TRANSFER OUT REF# 4892104-ACME CORP'));
  assert.equal(txs[2].debit, 1000.00);
  assert.equal(txs[2].balance, 11850.00);
});

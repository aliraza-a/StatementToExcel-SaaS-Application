import { Transaction } from '@/types/statement';
import { normalizeDate, parseAmount, normalizeTransactions } from './normalizer';

// Matches common date formats at the start of a line
const DATE_START_REGEX = /^(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})/i;

// Common statement keywords to ignore if isolated
const IGNORE_PATTERNS = [
  /^page\s+\d+/i,
  /^account\s+summary/i,
  /^statement\s+period/i,
  /^balance\s+brought\s+forward/i,
  /^total\s+(?:deposits|withdrawals|credits|debits)/i,
  /^\s*$/
];

// Common debit indicator words in statement narratives
const DEBIT_WORDS_REGEX = /\b(fee|charge|withdrawal|pos|debit|payment|purchase|bill|tax|interest charge|atm)\b/i;
const CREDIT_WORDS_REGEX = /\b(deposit|credit|refund|payroll|salary|interest paid|reversal)\b/i;

/**
 * Parses raw text extracted from a digital-native bank statement PDF
 * into structured 5-column transactions.
 */
export function parseDigitalStatement(text: string): Transaction[] {
  const lines = text.split(/\r?\n/);
  const parsedRows: Array<{
    date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
  }> = [];

  let currentTx: {
    date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
  } | null = null;

  let lastKnownBalance: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check for opening balance line to prime initial balance
    if (/^opening\s+balance/i.test(rawLine)) {
      const openMatches = rawLine.match(/[\d,]+\.\d{2}/g);
      if (openMatches && openMatches.length > 0) {
        lastKnownBalance = parseAmount(openMatches[openMatches.length - 1]);
      }
      continue;
    }

    // Skip generic headers / metadata
    if (IGNORE_PATTERNS.some(p => p.test(rawLine))) {
      continue;
    }

    const dateMatch = rawLine.match(DATE_START_REGEX);

    if (dateMatch) {
      // Save previous transaction if pending
      if (currentTx) {
        parsedRows.push(currentTx);
        if (currentTx.balance !== null) {
          lastKnownBalance = currentTx.balance;
        }
        currentTx = null;
      }

      const dateStr = dateMatch[1];
      const restOfLine = rawLine.slice(dateMatch[0].length).trim();

      // Extract all potential amount tokens
      const amountsFound: Array<{ raw: string; num: number; isNegative: boolean; isCR: boolean; isDR: boolean }> = [];
      
      const numberMatches = restOfLine.matchAll(/(?:([+-]?)\s*[\$€£¥₹]?\s*(\(\s*[\d,]+\.?\d*\s*\)|[\d,]+\.\d{2})\s*(CR|DR)?)/gi);
      for (const m of numberMatches) {
        const fullToken = m[0].trim();
        const isCR = /CR$/i.test(fullToken);
        const isDR = /DR$/i.test(fullToken);
        const isNeg = fullToken.startsWith('-') || /^\(.*\)$/.test(fullToken) || isDR;
        const parsed = parseAmount(fullToken);
        if (parsed !== null) {
          amountsFound.push({
            raw: fullToken,
            num: parsed,
            isNegative: isNeg,
            isCR,
            isDR,
          });
        }
      }

      // Extract description
      let description = restOfLine;
      for (const amt of amountsFound) {
        description = description.replace(amt.raw, '');
      }
      description = description.replace(/\s+/g, ' ').trim();

      let debit: number | null = null;
      let credit: number | null = null;
      let balance: number | null = null;

      if (amountsFound.length === 1) {
        const amt = amountsFound[0];
        if (amt.isNegative || amt.isDR || amt.num < 0 || DEBIT_WORDS_REGEX.test(description)) {
          debit = Math.abs(amt.num);
        } else if (amt.isCR || CREDIT_WORDS_REGEX.test(description)) {
          credit = Math.abs(amt.num);
        } else {
          // If balance comparison available
          if (lastKnownBalance !== null) {
            balance = amt.num;
          } else {
            debit = Math.abs(amt.num);
          }
        }
      } else if (amountsFound.length === 2) {
        // Format: [Amount, Balance] or [Debit, Credit]
        const first = amountsFound[0];
        const second = amountsFound[1];
        balance = second.num;

        // Balance Delta Heuristic: Compare against last known balance
        if (lastKnownBalance !== null) {
          const delta = Math.round((second.num - lastKnownBalance) * 100) / 100;
          if (delta < 0) {
            debit = Math.abs(first.num);
          } else if (delta > 0) {
            credit = Math.abs(first.num);
          }
        }

        // If balance delta was ambiguous, check explicit negative or narrative keywords
        if (debit === null && credit === null) {
          if (first.isNegative || first.isDR || first.num < 0 || DEBIT_WORDS_REGEX.test(description)) {
            debit = Math.abs(first.num);
          } else if (first.isCR || CREDIT_WORDS_REGEX.test(description)) {
            credit = Math.abs(first.num);
          } else {
            // Default assumption for general expenses/payments: debit
            debit = Math.abs(first.num);
          }
        }
      } else if (amountsFound.length >= 3) {
        // Format: [Debit, Credit, Balance]
        const first = amountsFound[0];
        const second = amountsFound[1];
        const third = amountsFound[amountsFound.length - 1];

        if (first.num !== 0) debit = Math.abs(first.num);
        if (second.num !== 0) credit = Math.abs(second.num);
        balance = third.num;
      }

      currentTx = {
        date: normalizeDate(dateStr),
        description,
        debit,
        credit,
        balance,
      };
    } else if (currentTx) {
      // Continuation line (multi-line description or wrapped amounts)
      const isHeaderLine = /^(date|description|details|narrative|withdrawal|deposit|balance)/i.test(rawLine);
      if (!isHeaderLine && rawLine.length > 1) {
        // If currentTx didn't find amounts on the date line, check if they are on this line
        if (currentTx.debit === null && currentTx.credit === null && currentTx.balance === null) {
          const numberMatches = [...rawLine.matchAll(/(?:([+-]?)\s*[\$€£¥₹]?\s*(\(\s*[\d,]+\.?\d*\s*\)|[\d,]+\.\d{2})\s*(CR|DR)?)/gi)];
          if (numberMatches.length > 0) {
            const amountsFound = numberMatches.map(m => {
              const fullToken = m[0].trim();
              const isCR = /CR$/i.test(fullToken);
              const isDR = /DR$/i.test(fullToken);
              const isNeg = fullToken.startsWith('-') || /^\(.*\)$/.test(fullToken) || isDR;
              return {
                raw: fullToken,
                num: parseAmount(fullToken) || 0,
                isNegative: isNeg,
                isCR,
                isDR,
              };
            });

            let memoDesc = rawLine;
            for (const amt of amountsFound) {
              memoDesc = memoDesc.replace(amt.raw, '');
            }
            memoDesc = memoDesc.replace(/\s+/g, ' ').trim();
            if (memoDesc) {
              currentTx.description = `${currentTx.description} ${memoDesc}`.trim();
            }

            if (amountsFound.length === 1) {
              const amt = amountsFound[0];
              if (amt.isNegative || amt.isDR || amt.num < 0 || DEBIT_WORDS_REGEX.test(currentTx.description)) {
                currentTx.debit = Math.abs(amt.num);
              } else if (amt.isCR || CREDIT_WORDS_REGEX.test(currentTx.description)) {
                currentTx.credit = Math.abs(amt.num);
              } else {
                currentTx.debit = Math.abs(amt.num);
              }
            } else if (amountsFound.length === 2) {
              const first = amountsFound[0];
              const second = amountsFound[1];
              currentTx.balance = second.num;

              if (lastKnownBalance !== null) {
                const delta = Math.round((second.num - lastKnownBalance) * 100) / 100;
                if (delta < 0) currentTx.debit = Math.abs(first.num);
                else if (delta > 0) currentTx.credit = Math.abs(first.num);
              }

              if (currentTx.debit === null && currentTx.credit === null) {
                if (first.isNegative || first.isDR || first.num < 0 || DEBIT_WORDS_REGEX.test(currentTx.description)) {
                  currentTx.debit = Math.abs(first.num);
                } else if (first.isCR || CREDIT_WORDS_REGEX.test(currentTx.description)) {
                  currentTx.credit = Math.abs(first.num);
                } else {
                  currentTx.debit = Math.abs(first.num);
                }
              }
            }
            continue;
          }
        }

        currentTx.description = `${currentTx.description} ${rawLine}`.trim();
      }
    }
  }

  // Push the final transaction
  if (currentTx) {
    parsedRows.push(currentTx);
  }

  return normalizeTransactions(parsedRows);
}

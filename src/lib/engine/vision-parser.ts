import { Transaction } from '@/types/statement';
import { normalizeTransactions } from './normalizer';

const VISION_SYSTEM_PROMPT = `
You are an expert financial auditor and automated document data extractor.
Your task is to analyze the provided bank statement, credit card statement, or invoice and extract ALL line-item transactions.

Format rules:
1. Every transaction must have:
   - "date": string in YYYY-MM-DD format (if only month/day given, infer year from statement period or header)
   - "description": string with cleaned merchant name, payee, or transaction description
   - "debit": number or null (money going OUT / withdrawal / charge / fee / expense - always positive number)
   - "credit": number or null (money coming IN / deposit / refund / interest - always positive number)
   - "balance": number or null (the running account balance after this transaction, if provided)
2. Handle multi-line details: merge transaction memos and sub-lines into the description.
3. Clean all numbers: strip currency signs ($ € £ ¥ ₹), commas, and spaces.
4. If a statement has a single "Amount" column, negative amounts or amounts in parentheses like (50.00) or 50.00- are Debits.
5. Return strictly valid JSON conforming to the schema.
`;

// Models to try in order of priority (handles high demand 503 spikes and version transitions)
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
];

/**
 * Extracts transactions from a scanned or image-based PDF using Google Gemini Vision.
 * Automatically cascades across models if one experiences a temporary 503 demand spike.
 */
export async function parseWithGeminiVision(
  pdfBuffer: Buffer,
  apiKey?: string
): Promise<Transaction[]> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    throw new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY in your .env.local file.'
    );
  }

  const base64Data = pdfBuffer.toString('base64');
  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      console.log(`Attempting Gemini OCR extraction with model: ${model}`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const payload = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: `${VISION_SYSTEM_PROMPT}\nExtract all transactions from this document and output JSON with a "transactions" array: {"transactions": [{"date": "YYYY-MM-DD", "description": "...", "debit": null, "credit": null, "balance": null}]}`,
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`Model ${model} returned status ${res.status}: ${errBody.slice(0, 300)}`);
        // If 503 (high demand) or 404 (model moved/unavailable), try next model in candidate list
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          lastError = new Error(`Model ${model} unavailable (${res.status})`);
          continue;
        }
        throw new Error(`Gemini API error (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const rawList = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
      const transactions = normalizeTransactions(rawList);

      console.log(`Successfully extracted ${transactions.length} transactions using model ${model}`);
      return transactions;
    } catch (err) {
      console.warn(`Extraction with ${model} failed, trying next fallback:`, err instanceof Error ? err.message : err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(`All Gemini models were unavailable or encountered errors: ${lastError?.message || 'Unknown error'}`);
}

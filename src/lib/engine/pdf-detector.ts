import { getDocumentProxy, extractText } from 'unpdf';

export interface PDFInspectionResult {
  isPasswordProtected: boolean;
  pageCount: number;
  isScanned: boolean;
  text: string;
  pageTexts: string[];
  error?: string;
  errorCode?: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'CORRUPTED_PDF' | 'UNKNOWN';
}

/**
 * Inspects a PDF buffer to extract text streams, calculate page count,
 * and determine whether the document is digital-native or scanned image.
 * Uses `unpdf` - the serverless-native PDF engine designed for Vercel & Node.js.
 */
export async function inspectPDF(
  buffer: Buffer,
  password?: string
): Promise<PDFInspectionResult> {
  try {
    const data = new Uint8Array(buffer);
    const doc = await getDocumentProxy(data, { password: password || undefined });
    const { totalPages, text } = await extractText(doc, { mergePages: true });

    const combinedText = (text || '').trim();
    const totalChars = combinedText.replace(/\s/g, '').length;
    const charsPerPage = totalPages > 0 ? totalChars / totalPages : totalChars;

    // If there is very little extractable text (< 50 characters per page), treat as scanned PDF
    const isScanned = charsPerPage < 50;

    return {
      isPasswordProtected: false,
      pageCount: totalPages || 1,
      isScanned,
      text: combinedText,
      pageTexts: [combinedText],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isPasswordError =
      (err as any)?.name === 'PasswordException' ||
      message.toLowerCase().includes('password') ||
      message.toLowerCase().includes('encrypted');

    if (isPasswordError) {
      return {
        isPasswordProtected: true,
        pageCount: 1,
        isScanned: false,
        text: '',
        pageTexts: [],
        error: password ? 'The password entered is incorrect.' : 'This PDF is password protected.',
        errorCode: password ? 'INVALID_PASSWORD' : 'PASSWORD_REQUIRED',
      };
    }

    const isInvalidPdf =
      message.toLowerCase().includes('invalid pdf') ||
      message.toLowerCase().includes('corrupted') ||
      buffer.length === 0;

    if (isInvalidPdf) {
      return {
        isPasswordProtected: false,
        pageCount: 1,
        isScanned: false,
        text: '',
        pageTexts: [],
        error: 'The PDF file is corrupted or empty.',
        errorCode: 'CORRUPTED_PDF',
      };
    }

    console.warn('Local PDF extraction falling back to Gemini Vision:', message);
    return {
      isPasswordProtected: false,
      pageCount: 1,
      isScanned: true,
      text: '',
      pageTexts: [],
    };
  }
}

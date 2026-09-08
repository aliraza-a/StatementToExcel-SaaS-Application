import './pdf-polyfill';

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
 */
export async function inspectPDF(
  buffer: Buffer,
  password?: string
): Promise<PDFInspectionResult> {
  let parser: any = null;
  try {
    const { PDFParse, PasswordException } = await import('pdf-parse');

    parser = new PDFParse({
      data: buffer,
      password: password || undefined,
    });

    const info = await parser.getInfo().catch((err: unknown) => {
      if (err instanceof PasswordException || (err instanceof Error && err.name === 'PasswordException')) {
        throw new PasswordException('Password required or invalid');
      }
      return null;
    });

    const textResult = await parser.getText();
    const pageCount = (info && info.total) ? info.total : (textResult.pages?.length || 1);

    const pageTexts = (textResult.pages || []).map((p: { text: string }) => p.text || '');
    const combinedText = pageTexts.join('\n').trim();

    // Calculate text density (characters per page)
    const totalChars = combinedText.replace(/\s/g, '').length;
    const charsPerPage = pageCount > 0 ? totalChars / pageCount : totalChars;

    // If there is very little extractable text (< 50 characters per page), treat as scanned PDF
    const isScanned = charsPerPage < 50;

    return {
      isPasswordProtected: false,
      pageCount,
      isScanned,
      text: combinedText,
      pageTexts,
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

    console.warn('Local PDF parse encountered an issue, falling back to Vision pipeline:', message);
    // If local PDF parsing fails (e.g. serverless canvas missing or complex format), gracefully flag as scanned so Gemini Vision handles it seamlessly!
    return {
      isPasswordProtected: false,
      pageCount: 1,
      isScanned: true,
      text: '',
      pageTexts: [],
    };
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

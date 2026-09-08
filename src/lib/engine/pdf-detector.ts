import { PDFParse, PasswordException } from 'pdf-parse';

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
  let parser: InstanceType<typeof PDFParse> | null = null;
  try {
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
    const isPasswordError =
      err instanceof PasswordException ||
      (err instanceof Error && (
        err.name === 'PasswordException' ||
        err.message.toLowerCase().includes('password') ||
        err.message.toLowerCase().includes('encrypted')
      ));

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

    const message = err instanceof Error ? err.message : String(err);
    const isCorrupted = message.toLowerCase().includes('format') || message.toLowerCase().includes('corrupted') || message.toLowerCase().includes('invalid');

    return {
      isPasswordProtected: false,
      pageCount: 1,
      isScanned: false,
      text: '',
      pageTexts: [],
      error: isCorrupted ? 'The uploaded PDF appears corrupted or unreadable.' : `Failed to parse PDF: ${message}`,
      errorCode: isCorrupted ? 'CORRUPTED_PDF' : 'UNKNOWN',
    };
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

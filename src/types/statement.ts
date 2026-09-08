export interface Transaction {
  id?: string;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
}

export interface ConversionSummary {
  totalDebits: number;
  totalCredits: number;
  netChange: number;
  transactionCount: number;
}

export interface ConversionResult {
  success: boolean;
  fileName: string;
  pageCount: number;
  isScanned: boolean;
  transactions: Transaction[];
  summary: ConversionSummary;
  error?: string;
  errorCode?: 'PASSWORD_REQUIRED' | 'INVALID_PASSWORD' | 'CORRUPTED_PDF' | 'TIMEOUT' | 'INSUFFICIENT_CREDITS' | 'UNKNOWN';
}

export interface PricingPlan {
  id: 'onetime' | 'lifetime' | 'pro';
  name: string;
  price: string;
  interval?: string;
  description: string;
  credits: string;
  popular?: boolean;
  features: string[];
  variantIdEnvKey: string;
}

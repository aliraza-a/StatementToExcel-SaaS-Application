import { Transaction, ConversionSummary } from './statement';

export interface Profile {
  id: string;
  email: string;
  credits_remaining: number;
  is_pro: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversion {
  id: string;
  user_id: string;
  file_name: string;
  page_count: number;
  extracted_data: {
    transactions: Transaction[];
    summary: ConversionSummary;
  };
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string | null;
  order_id: string;
  amount: string;
  status: string;
  created_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          credits_remaining?: number;
          is_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits_remaining?: number;
          is_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversions: {
        Row: Conversion;
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          page_count?: number;
          extracted_data?: {
            transactions: Transaction[];
            summary: ConversionSummary;
          };
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          page_count?: number;
          extracted_data?: {
            transactions: Transaction[];
            summary: ConversionSummary;
          };
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      payments: {
        Row: Payment;
        Insert: {
          id?: string;
          user_id?: string | null;
          order_id: string;
          amount: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          order_id?: string;
          amount?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

import { createBrowserClient } from '@supabase/ssr';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref');

  if (!isConfigured) {
    // Return a safe typed mock object so client components don't crash when Supabase is not yet configured
    return {
      auth: {
        getUser: async (): Promise<{ data: { user: User | null }; error: null }> => ({
          data: { user: null },
          error: null,
        }),
        getSession: async (): Promise<{ data: { session: Session | null }; error: null }> => ({
          data: { session: null },
          error: null,
        }),
        onAuthStateChange: (
          _callback: (event: AuthChangeEvent, session: Session | null) => void
        ) => ({
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }),
        signOut: async () => ({ error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured on this deployment yet.') }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase is not configured on this deployment yet.') }),
        signInWithOtp: async () => ({ error: new Error('Supabase is not configured on this deployment yet.') }),
        signInWithOAuth: async () => ({ error: new Error('Supabase is not configured on this deployment yet.') }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: async () => ({ data: [], error: null }),
          }),
        }),
        insert: async () => ({ data: null, error: null }),
        delete: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

# Supabase Setup Guide for StatementToExcel

Follow these simple steps to configure your Supabase backend for StatementToExcel:

### Step 1: Run the Database Migration
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project (or create a new free one).
3. In the left navigation, click on **SQL Editor**.
4. Click **New Query**, copy the contents of [`supabase/migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql), and paste it in.
5. Click **Run** (green button).
   - This creates:
     - `public.profiles` (User profile & credits tracking)
     - `public.conversions` (Conversion history ledger)
     - `public.payments` (Lemon Squeezy order ledger)
     - RLS security policies restricting data to authenticated owners
     - An automatic trigger that gives every new signup **3 free credits**.

---

### Step 2: Configure Authentication Providers
1. In the Supabase Dashboard, navigate to **Authentication -> Providers**.
2. **Email (Magic Link / OTP)**:
   - Ensure "Email" provider is enabled.
3. **Google OAuth (Optional but Recommended)**:
   - Expand the **Google** provider.
   - Enter your Google Client ID and Google Client Secret (from Google Cloud Console).
   - Add your Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to your Google Cloud Authorized redirect URIs.
4. In **Authentication -> URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (for development) or your production domain.
   - Add `http://localhost:3000/**` to **Redirect URLs**.

---

### Step 3: Copy Your API Keys to `.env.local`
1. Navigate to **Project Settings -> API**.
2. Copy:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** -> `SUPABASE_SERVICE_ROLE_KEY`

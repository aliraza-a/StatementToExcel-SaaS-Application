# StatementToExcel 📊

> **Convert Messy Bank Statements & Invoices into Clean Excel in 3 Seconds.**

StatementToExcel is a full-stack, production-ready SaaS application built with **Next.js 15+ (App Router)**, **Tailwind CSS**, **Supabase (Auth & PostgreSQL RLS)**, and **Lemon Squeezy (Merchant of Record)**.

It provides a dual extraction pipeline to convert tabular bank statements, credit card statements, and invoices into standardized 5-column spreadsheets (`Date`, `Description`, `Debit`, `Credit`, `Balance`).

---

## ⚡ Core Features

- **Dual Extraction Pipeline**:
  - **Digital Native Engine**: Fast text-stream and coordinate/regex boundary detection for digital PDFs.
  - **Scanned / Fallback Engine**: Vision OCR powered by **Google Gemini Vision API** (`gemini-1.5-flash`) for scanned paper statements and complex multi-column images.
- **Strict 5-Column Normalization**:
  - Outputs strictly: `Date`, `Description`, `Debit`, `Credit`, `Balance`.
  - Normalizes multiple date formats to `YYYY-MM-DD`.
  - Stitches wrapped multi-line payee descriptions into a single clean description.
  - Correctly parses accounting negatives: `(150.00)`, `-150.00`, and `CR/DR` amounts.
- **Interactive In-Browser Cell Editor**:
  - Double-click or click any cell to edit dates, descriptions, or amounts before exporting.
  - Live recalculation of Total Debits, Total Credits, Net Change, and Rows Count.
- **Export Formats**:
  - 1-Click download of styled `.xlsx` (Excel) workbooks with native numeric cell types (`=SUM()` ready).
  - 1-Click download of `.csv`.
- **Privacy & Security**:
  - Transient in-memory buffer processing with immediate garbage collection (Zero Data Retention).
  - Handles password-protected PDFs with user-friendly decryption prompt.
- **Freemium & Paywall Flows**:
  - **Unauthenticated Guest**: 1 free single-page conversion stored in localStorage.
  - **Soft Paywall Trigger**: If a guest uploads a multi-page document or has already used their free preview, prompts: *"Sign in to convert up to 3 pages for free."*
  - **Authenticated User**: Receives 3 free credits upon signup via Postgres database trigger.
  - **Pricing Modal (Hard Paywall)**: Prompts when credits reach 0:
    - **One-Time Pass** ($4.99): +20 credits
    - **Lifetime Deal** ($29): Unlimited conversions (999,999 credits) + Pro Badge
    - **Pro Monthly** ($15/mo): 300 credits/mo + Pro Badge
- **User Dashboard (`/dashboard`)**:
  - Minimalist ledger of past converted statements.
  - Live credits indicator and "Upgrade" CTA.
  - 1-Click re-download of `.xlsx` or `.csv`.
- **Lemon Squeezy Integration**:
  - Hosted checkout session generation with custom `user_id` payload.
  - Signed webhook listener (`/api/webhooks/lemonsqueezy`) verifying HMAC SHA-256 signatures.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in the required values:

```env
# Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini Vision API (for Scanned / OCR Fallback)
# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key

# Lemon Squeezy (Store Settings -> API & Webhooks)
LEMONSQUEEZY_API_KEY=your-lemonsqueezy-api-key
LEMONSQUEEZY_STORE_ID=your-lemonsqueezy-store-id
LEMONSQUEEZY_WEBHOOK_SECRET=your-lemonsqueezy-webhook-secret

# Variant IDs from Lemon Squeezy Products:
LEMONSQUEEZY_VARIANT_ONETIME=
LEMONSQUEEZY_VARIANT_LIFETIME=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🗄️ Supabase Database Setup

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy and paste the contents of [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).
4. Click **Run**.
   - This creates `public.profiles`, `public.conversions`, and `public.payments`.
   - Enables Row Level Security (RLS) policies.
   - Installs the trigger that grants 3 free credits to every new signup.
5. In **Authentication -> URL Configuration**, ensure `http://localhost:3000/**` is added to **Redirect URLs**.

---

## 🍋 Lemon Squeezy Setup

1. Create products in your [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com):
   - **One-Time Pass** ($4.99)
   - **Lifetime Deal** ($29)
   - **Pro Monthly** ($15/mo)
2. Copy the Variant ID for each product into `.env.local`.
3. Go to **Settings -> Webhooks** -> **Add Webhook**:
   - URL: `https://your-domain.com/api/webhooks/lemonsqueezy`
   - Secret: Enter a secret string and match it in `LEMONSQUEEZY_WEBHOOK_SECRET`.
   - Events: Check `order_created` and `subscription_created`.

---

## 💻 Running the App

```bash
# Start development server
npm run dev

# Run production build
npm run build
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) to start converting bank statements.

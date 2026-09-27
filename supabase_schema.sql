-- Sun Systems AI - Supabase PostgreSQL Schema
-- Real-Time Cloud Synchronization & Offline Store

-- 1. REAL-TIME UNIFIED SYNC STORE
CREATE TABLE IF NOT EXISTS public.sun_sync_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.sun_sync_store DISABLE ROW LEVEL SECURITY;

-- 2. NORMALIZED INDIVIDUAL TABLES
CREATE TABLE IF NOT EXISTS public.sun_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  mobile TEXT,
  email TEXT,
  pin TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_users DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_stock (
  id TEXT PRIMARY KEY,
  "productName" TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT,
  "serialNumber" TEXT,
  "serviceTag" TEXT,
  cpu TEXT,
  ram TEXT,
  storage TEXT,
  display TEXT,
  gpu TEXT,
  condition TEXT,
  charger TEXT,
  quantity NUMERIC DEFAULT 1,
  "purchasePrice" NUMERIC DEFAULT 0,
  "sellingPrice" NUMERIC DEFAULT 0,
  "minSellingPrice" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'IN_STOCK',
  location TEXT,
  "enteredBy" TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "availableQuantity" NUMERIC,
  "purchaseCost" NUMERIC,
  "targetSellingPrice" NUMERIC,
  supplier TEXT,
  "purchaseDate" TEXT,
  "soldTo" TEXT,
  "soldPrice" NUMERIC,
  "soldDate" TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_stock DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_sales (
  id TEXT PRIMARY KEY,
  "invoiceNumber" TEXT,
  date TEXT NOT NULL,
  time TEXT,
  "customerName" TEXT NOT NULL,
  "customerMobile" TEXT,
  "customerAddress" TEXT,
  "productName" TEXT NOT NULL,
  "serialNumber" TEXT,
  quantity NUMERIC DEFAULT 1,
  "unitPrice" NUMERIC DEFAULT 0,
  "sellingPrice" NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  "finalAmount" NUMERIC NOT NULL,
  "paymentMode" TEXT NOT NULL,
  items JSONB,
  "enteredBy" TEXT,
  "stockId" TEXT,
  status TEXT DEFAULT 'COMPLETED',
  notes TEXT,
  "auditId" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_sales DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_purchases (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  "supplierName" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  "unitCost" NUMERIC NOT NULL DEFAULT 0,
  "totalAmount" NUMERIC NOT NULL DEFAULT 0,
  "paymentMode" TEXT NOT NULL,
  "serialNumbers" TEXT,
  category TEXT,
  brand TEXT,
  model TEXT,
  "enteredBy" TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_purchases DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  "paymentMode" TEXT NOT NULL,
  "enteredBy" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_expenses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  company TEXT,
  email TEXT,
  notes TEXT,
  "outstandingCredit" NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_customers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_credit (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  "partyName" TEXT NOT NULL,
  mobile TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  "enteredBy" TEXT,
  outstanding NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'OPEN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_credit DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date TEXT,
  time TEXT,
  "user" TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  "recordId" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_audit_logs DISABLE ROW LEVEL SECURITY;

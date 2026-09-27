import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://tcieqlcunywzruncqxuw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_idGWW0_pJeZceRXkAAVEHA_Jbp6KdmF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export interface SupabaseSyncState {
  status: 'CONNECTED' | 'SYNCING' | 'ERROR' | 'TABLES_PENDING' | 'OFFLINE';
  lastSyncedAt: string | null;
  errorMessage?: string;
  hasStoreTable: boolean;
}

class SupabaseService {
  private syncListeners: Set<(state: SupabaseSyncState) => void> = new Set();
  public state: SupabaseSyncState = {
    status: 'OFFLINE',
    lastSyncedAt: localStorage.getItem('sun_supabase_last_sync') || null,
    hasStoreTable: false
  };

  constructor() {
    this.checkConnection();
  }

  public subscribe(listener: (state: SupabaseSyncState) => void) {
    this.syncListeners.add(listener);
    listener(this.state);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private updateState(partial: Partial<SupabaseSyncState>) {
    this.state = { ...this.state, ...partial };
    if (this.state.lastSyncedAt) {
      localStorage.setItem('sun_supabase_last_sync', this.state.lastSyncedAt);
    }
    this.syncListeners.forEach(fn => fn(this.state));
  }

  public async checkConnection(): Promise<boolean> {
    try {
      this.updateState({ status: 'SYNCING' });
      // Probe sun_sync_store or sun_sales
      const { data, error } = await supabase
        .from('sun_sync_store')
        .select('key')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('relation "public.sun_sync_store" does not exist')) {
          this.updateState({
            status: 'TABLES_PENDING',
            hasStoreTable: false,
            errorMessage: 'Supabase connected! SQL tables need to be created in Supabase SQL editor.'
          });
          return true;
        }
        this.updateState({
          status: 'ERROR',
          errorMessage: error.message
        });
        return false;
      }

      this.updateState({
        status: 'CONNECTED',
        hasStoreTable: true,
        errorMessage: undefined
      });
      return true;
    } catch (err: any) {
      this.updateState({
        status: 'OFFLINE',
        errorMessage: err.message || 'Cannot reach Supabase network'
      });
      return false;
    }
  }

  /**
   * Syncs a specific collection key (e.g. 'sun_sales', 'sun_stock') to Supabase sun_sync_store
   */
  public async pushCollection(key: string, data: any): Promise<boolean> {
    if (!this.state.hasStoreTable && this.state.status === 'TABLES_PENDING') {
      return false;
    }

    try {
      const { error } = await supabase
        .from('sun_sync_store')
        .upsert(
          {
            key,
            value: data,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          this.updateState({ status: 'TABLES_PENDING', hasStoreTable: false });
        }
        return false;
      }

      const now = new Date().toLocaleTimeString();
      this.updateState({
        status: 'CONNECTED',
        hasStoreTable: true,
        lastSyncedAt: now,
        errorMessage: undefined
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Pulls all stored collections from Supabase sun_sync_store and merges with local DB
   */
  public async pullAllCollections(): Promise<Record<string, any> | null> {
    try {
      this.updateState({ status: 'SYNCING' });
      const { data, error } = await supabase
        .from('sun_sync_store')
        .select('*');

      if (error || !data) {
        if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
          this.updateState({ status: 'TABLES_PENDING', hasStoreTable: false });
        } else if (error) {
          this.updateState({ status: 'ERROR', errorMessage: error.message });
        }
        return null;
      }

      const map: Record<string, any> = {};
      data.forEach((row: any) => {
        if (row.key && row.value) {
          map[row.key] = row.value;
        }
      });

      const now = new Date().toLocaleTimeString();
      this.updateState({
        status: 'CONNECTED',
        hasStoreTable: true,
        lastSyncedAt: now,
        errorMessage: undefined
      });
      return map;
    } catch (err: any) {
      this.updateState({ status: 'OFFLINE', errorMessage: err.message });
      return null;
    }
  }

  /**
   * Pushes all local storage collections to Supabase cloud
   */
  public async pushAll(localData: Record<string, any>): Promise<boolean> {
    try {
      this.updateState({ status: 'SYNCING' });
      const rows = Object.entries(localData).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('sun_sync_store')
        .upsert(rows, { onConflict: 'key' });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          this.updateState({ status: 'TABLES_PENDING', hasStoreTable: false });
        } else {
          this.updateState({ status: 'ERROR', errorMessage: error.message });
        }
        return false;
      }

      const now = new Date().toLocaleTimeString();
      this.updateState({
        status: 'CONNECTED',
        hasStoreTable: true,
        lastSyncedAt: now,
        errorMessage: undefined
      });
      return true;
    } catch (err: any) {
      this.updateState({ status: 'OFFLINE', errorMessage: err.message });
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();

export const SUPABASE_SCHEMA_SQL = `-- 1. REAL-TIME UNIFIED SYNC STORE
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
  "enteredBy" TEXT,
  timestamp TEXT,
  "purchaseDate" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_stock DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "productName" TEXT NOT NULL,
  "serialNumber" TEXT,
  "serviceTag" TEXT,
  "specsSummary" TEXT,
  quantity NUMERIC DEFAULT 1,
  "unitPrice" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  "discountAmount" NUMERIC DEFAULT 0,
  "finalAmount" NUMERIC DEFAULT 0,
  "paymentMode" TEXT DEFAULT 'Cash',
  "enteredBy" TEXT,
  status TEXT DEFAULT 'CONFIRMED',
  "alterReason" TEXT,
  "alteredBy" TEXT,
  "alteredAt" TEXT,
  "invoiceNumber" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_sales DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_purchases (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  "supplierPhone" TEXT,
  "supplierInvoiceNo" TEXT,
  "productName" TEXT NOT NULL,
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
  "unitCost" NUMERIC DEFAULT 0,
  "totalAmount" NUMERIC DEFAULT 0,
  "paymentMode" TEXT DEFAULT 'Bank Transfer',
  "enteredBy" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_purchases DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  "paidTo" TEXT,
  "paymentMode" TEXT DEFAULT 'Cash',
  "enteredBy" TEXT,
  "approvedBy" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_expenses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_credit (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "billNumber" TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  "dueDate" TEXT,
  "enteredBy" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_credit DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_debit (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  "supplierPhone" TEXT,
  "invoiceNumber" TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  "dueDate" TEXT,
  "enteredBy" TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_debit DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sun_audit (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  "user" TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  "recordId" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sun_audit DISABLE ROW LEVEL SECURITY;

INSERT INTO public.sun_users (id, name, role, mobile, email, pin, "isActive")
VALUES ('USR-01', 'Anand', 'OWNER', '9885100949', 'sunsystems.sec@gmail.com', '215799', true)
ON CONFLICT (id) DO UPDATE SET pin = '215799', role = 'OWNER';
`;

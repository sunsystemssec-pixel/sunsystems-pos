import { COMPANY_INFO } from '../data/seedData';
import { db } from './db';

export interface DriveFolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'sheet';
  path: string;
  size?: string;
  updatedAt: string;
  fileCount?: number;
}

export const DRIVE_FOLDERS = [
  { code: '01_DATABASE', name: '01_DATABASE', desc: 'Master Google Sheet database' },
  { code: '02_PURCHASES', name: '02_PURCHASES', desc: 'Supplier invoices & purchase docs' },
  { code: '03_SALES', name: '03_SALES', desc: 'Sales vouchers & customer invoices' },
  { code: '04_STOCK', name: '04_STOCK', desc: 'Stock checklists & intake sheets' },
  { code: '05_EXPENSES', name: '05_EXPENSES', desc: 'Expense receipts & vouchers' },
  { code: '06_CREDIT_DEBIT', name: '06_CREDIT_DEBIT', desc: 'Ledgers & settlement receipts' },
  { code: '07_DOCUMENTS', name: '07_DOCUMENTS', desc: 'Company KYC & registration docs' },
  { code: '08_REPORTS', name: '08_REPORTS', desc: 'Generated PDF/Excel audit reports' },
  { code: '09_BACKUP', name: '09_BACKUP', desc: 'Automated & manual database backups' },
  { code: '10_PRODUCT_PHOTOS', name: '10_PRODUCT_PHOTOS', desc: 'Refurbished laptop photos & tags' },
  { code: '11_SCAN_DOCUMENTS', name: '11_SCAN_DOCUMENTS', desc: 'Mobile OCR scanned images' },
];

export const DATABASE_TABS = [
  'COMPANY', 'USERS', 'SALES', 'SALE_ITEMS', 'STOCK', 'STOCK_MOVEMENT',
  'PURCHASES', 'PURCHASE_ITEMS', 'EXPENSES', 'CREDIT', 'DEBIT', 'PAYMENTS',
  'CUSTOMERS', 'SUPPLIERS', 'DAILY_CLOSING', 'AUDIT_LOG', 'DOCUMENTS',
  'SCANNED_DATA', 'VOICE_COMMANDS', 'SETTINGS'
];

class GoogleDriveService {
  public isConnected: boolean = true;
  public accountEmail: string = COMPANY_INFO.ownerEmail;
  public lastSyncTime: string = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  public getFolderContents(folderCode: string): DriveFolderItem[] {
    const docs = db.getDocuments();
    const folderDocs = docs.filter(d => d.driveFolder === folderCode);

    if (folderCode === '01_DATABASE') {
      return [
        {
          id: 'MASTER-SHEET-01',
          name: 'SUN SYSTEMS — INTERNAL AUDIT DATABASE',
          type: 'sheet',
          path: 'SUN SYSTEMS INTERNAL AUDIT/01_DATABASE',
          size: '428 KB',
          updatedAt: 'Just now'
        }
      ];
    }

    if (folderCode === '09_BACKUP') {
      const backups = this.getBackups();
      return backups.map(b => ({
        id: b.id,
        name: b.name,
        type: 'file',
        path: 'SUN SYSTEMS INTERNAL AUDIT/09_BACKUP',
        size: b.size,
        updatedAt: b.date
      }));
    }

    return folderDocs.map(d => ({
      id: d.driveFileId,
      name: d.fileName,
      type: 'file',
      path: `SUN SYSTEMS INTERNAL AUDIT/${folderCode}`,
      size: '142 KB',
      updatedAt: d.date
    }));
  }

  public getBackups(): { id: string; name: string; date: string; size: string }[] {
    const saved = localStorage.getItem('sun_backups');
    if (saved) return JSON.parse(saved);
    const initial = [
      {
        id: 'BKP-20260920',
        name: 'SUN SYSTEMS BACKUP 2026-09-20.json',
        date: '2026-09-20 21:00',
        size: '1.2 MB'
      }
    ];
    localStorage.setItem('sun_backups', JSON.stringify(initial));
    return initial;
  }

  public createBackup(): { id: string; name: string; date: string; size: string } {
    const backups = this.getBackups();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const snapshot = {
      timestamp: `${dateStr} ${timeStr}`,
      company: COMPANY_INFO,
      stock: db.getStock(),
      sales: db.getSales(),
      purchases: db.getPurchases(),
      expenses: db.getExpenses(),
      credit: db.getCredit(),
      debit: db.getDebit(),
      customers: db.getCustomers(),
      suppliers: db.getSuppliers(),
      audit: db.getAuditLogs()
    };

    const newBackup = {
      id: `BKP-${Date.now()}`,
      name: `SUN SYSTEMS BACKUP ${dateStr}_${now.getHours()}${now.getMinutes()}.json`,
      date: `${dateStr} ${timeStr}`,
      size: `${(JSON.stringify(snapshot).length / 1024).toFixed(1)} KB`
    };

    backups.unshift(newBackup);
    localStorage.setItem('sun_backups', JSON.stringify(backups));
    return newBackup;
  }

  public exportReportCSV(reportType: 'SALES' | 'STOCK' | 'EXPENSES' | 'AUDIT'): string {
    let rows: any[] = [];
    if (reportType === 'SALES') rows = db.getSales();
    else if (reportType === 'STOCK') rows = db.getStock();
    else if (reportType === 'EXPENSES') rows = db.getExpenses();
    else if (reportType === 'AUDIT') rows = db.getAuditLogs();

    if (!rows.length) return 'No data available';
    const headers = Object.keys(rows[0]).join(',');
    const data = rows.map(r => Object.values(r).map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
    return `${headers}\n${data}`;
  }
}

export const driveService = new GoogleDriveService();

import { User, StockItem, Sale, Purchase, Expense, CreditEntry, DebitEntry, Customer, Supplier, AuditLog, DocumentRecord } from '../types';

export const COMPANY_INFO = {
  name: 'Sun Systems',
  tagline: 'INTERNAL AUDIT',
  address: 'Shop No. 159, 1st Floor, CTC C Block, Secunderabad – 500003',
  phone1: '9885100949',
  phone2: '7013608439',
  website: 'www.pcdeals.co.in',
  ownerName: 'Anand',
  ownerEmail: 'sunsystems.sec@gmail.com',
  driveFolder: 'SUN SYSTEMS INTERNAL AUDIT',
  databaseSheet: 'SUN SYSTEMS — INTERNAL AUDIT DATABASE',
};

export const INITIAL_USERS: User[] = [
  { id: 'USR-01', name: 'Anand', role: 'OWNER', email: 'sunsystems.sec@gmail.com', mobile: '9885100949', pin: '215799', isActive: true },
];

export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_STOCK: StockItem[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_PURCHASES: Purchase[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_CREDIT: CreditEntry[] = [];
export const INITIAL_DEBIT: DebitEntry[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_DOCUMENTS: DocumentRecord[] = [];

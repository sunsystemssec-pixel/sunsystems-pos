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
  { id: 'USR-01', name: 'Anand', role: 'OWNER', email: 'sunsystems.sec@gmail.com', mobile: '9885100949', pin: '1234', isActive: true },
  { id: 'USR-02', name: 'Anusha', role: 'MANAGER', email: 'anusha@pcdeals.co.in', mobile: '9885100950', pin: '2345', isActive: true },
  { id: 'USR-03', name: 'Srikanth', role: 'STAFF', mobile: '9000100001', pin: '3456', isActive: true },
  { id: 'USR-04', name: 'Kumar', role: 'STAFF', mobile: '9000100002', pin: '4567', isActive: true },
  { id: 'USR-05', name: 'Krishna', role: 'STAFF', mobile: '9000100003', pin: '5678', isActive: true },
  { id: 'USR-06', name: 'Sanjay', role: 'STAFF', mobile: '9000100004', pin: '6789', isActive: true },
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

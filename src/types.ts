export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  mobile?: string;
  pin: string; // Hashed or stored securely
  isActive: boolean;
  lastLogin?: string;
}

export type StockStatus = 
  | 'PURCHASED'
  | 'TESTING'
  | 'READY'
  | 'REPAIR'
  | 'RESERVED'
  | 'SOLD'
  | 'RETURNED'
  | 'SCRAP'
  | 'MISSING';

export interface StockItem {
  id: string; // SS-STOCK-YYYYMMDD-XXXX
  brand: string;
  model: string;
  serialNumber?: string; // Optional for bulk/accessories
  quantity?: number; // Total quantity in batch
  availableQuantity?: number; // Remaining unsold units
  category?: string; // Laptops, Desktops, RAM, SSD, Keyboards, Accessories
  serviceTag?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  display?: string;
  gpu?: string;
  condition: string; // e.g. A Grade, B Grade, New
  charger: boolean;
  purchaseCost: number;
  repairCost: number;
  transportCost: number;
  otherCost: number;
  totalCost: number;
  targetSellingPrice: number;
  supplier: string;
  purchaseDate: string;
  status: StockStatus;
  enteredBy: string;
  timestamp: string;
  photoUrl?: string;
  driveFileId?: string;
  soldTo?: string;
  soldPrice?: number;
  soldDate?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  stockId: string;
  date: string;
  time: string;
  fromStatus: StockStatus;
  toStatus: StockStatus;
  referenceId: string;
  performedBy: string;
  notes?: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Split';

export interface SplitPaymentDetail {
  mode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit';
  amount: number;
}

export interface SaleItem {
  stockId?: string;
  productName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Sale {
  id: string; // SS-0001
  invoiceNumber?: string; // SS-0001
  date: string;
  time: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string; // Optional customer address
  productName: string;
  serialNumber?: string; // Optional for bulk/accessories
  quantity?: number; // Bulk quantity sold (default 1)
  unitPrice?: number; // Price per single unit
  sellingPrice: number; // Total selling price (sum of items or quantity * unitPrice)
  discount: number;
  finalAmount: number;
  paymentMode: PaymentMode;
  splitDetails?: SplitPaymentDetail[];
  items?: SaleItem[]; // Multi-item sale support
  enteredBy: string;
  stockId?: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING_APPROVAL';
  notes?: string;
  auditId?: string;
  receiptDriveId?: string;
}

export interface Purchase {
  id: string; // SS-PUR-YYYYMMDD-XXXX
  date: string;
  time: string;
  supplierName: string;
  productName: string;
  quantity: number; // Bulk quantity purchased
  unitCost: number; // Cost per unit
  totalAmount: number; // Total purchase cost
  paymentMode: PaymentMode;
  serialNumbers?: string; // Optional comma-separated serial numbers
  category?: string;
  brand?: string;
  model?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  display?: string;
  gpu?: string;
  condition?: string;
  charger?: boolean;
  serviceTag?: string;
  invoiceNumber?: string;
  documentDriveId?: string;
  enteredBy: string;
  notes?: string;
}

export interface Expense {
  id: string; // SS-EXP-YYYYMMDD-XXXX
  date: string;
  time: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  receiptDriveId?: string;
  enteredBy: string;
}

export interface CreditEntry {
  id: string; // SS-CREDIT-YYYYMMDD-XXXX
  date: string;
  time: string;
  partyName: string;
  mobile?: string;
  amount: number;
  description: string;
  enteredBy: string;
  outstanding: number;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
}

export interface DebitEntry {
  id: string; // SS-DEBIT-YYYYMMDD-XXXX
  date: string;
  time: string;
  partyName: string;
  amount: number;
  reference?: string;
  description: string;
  paymentMode: PaymentMode;
  enteredBy: string;
  status: 'PAID' | 'PENDING';
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  company?: string;
  email?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  outstandingCredit: number;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  address?: string;
  notes?: string;
}

export interface DailyClosing {
  id: string;
  date: string;
  time: string;
  closedBy: string;
  systemSales: number;
  salesCount: number;
  cashExpected: number;
  cashActual: number;
  upiTotal: number;
  cardTotal: number;
  bankTotal: number;
  creditTotal: number;
  expensesTotal: number;
  debitTotal: number;
  difference: number;
  differenceReason?: string;
  status: 'CLOSED' | 'REOPENED';
}

export interface DailyDeclaration {
  id: string;
  date: string;
  time: string;
  staffName: string;
  declarationText: string;
  confirmed: boolean;
}

export interface AuditLog {
  id: string; // SS-AUDIT-YYYYMMDD-XXXX
  timestamp: string;
  date: string;
  time: string;
  user: string;
  role: UserRole;
  action: string;
  module: string;
  recordId: string;
  oldValue: string;
  newValue: string;
  reason?: string;
}

export interface DocumentRecord {
  id: string;
  date: string;
  fileName: string;
  docType: 'Purchase Invoice' | 'Expense Receipt' | 'Credit Note' | 'Debit Note' | 'Product Photo' | 'General';
  driveFileId: string;
  driveFolder: string;
  associatedRecordId?: string;
  ocrExtractedData?: Record<string, any>;
  uploadedBy: string;
  url?: string;
}

export interface VoiceCommandRecord {
  id: string;
  date: string;
  time: string;
  user: string;
  transcript: string;
  detectedIntent: string;
  result: 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'FAILED';
  transactionId?: string;
}

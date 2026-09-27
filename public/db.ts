import {
  User, StockItem, Sale, Purchase, Expense, CreditEntry, DebitEntry,
  Customer, Supplier, DailyClosing, DailyDeclaration, AuditLog,
  DocumentRecord, VoiceCommandRecord
} from '../types';
import {
  INITIAL_USERS, INITIAL_STOCK, INITIAL_SALES, INITIAL_PURCHASES,
  INITIAL_EXPENSES, INITIAL_CREDIT, INITIAL_DEBIT, INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS, INITIAL_AUDIT_LOGS, INITIAL_DOCUMENTS
} from '../data/seedData';

type Listener = () => void;

class DatabaseService {
  private listeners: Set<Listener> = new Set();
  public syncStatus: 'SYNCED' | 'SYNCING' | 'OFFLINE' = 'SYNCED';

  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem('sun_clean_v2')) {
      localStorage.clear();
      localStorage.setItem('sun_clean_v2', 'true');
      localStorage.setItem('sun_users', JSON.stringify(INITIAL_USERS));
      localStorage.setItem('sun_stock', JSON.stringify(INITIAL_STOCK));
      localStorage.setItem('sun_sales', JSON.stringify(INITIAL_SALES));
      localStorage.setItem('sun_purchases', JSON.stringify(INITIAL_PURCHASES));
      localStorage.setItem('sun_expenses', JSON.stringify(INITIAL_EXPENSES));
      localStorage.setItem('sun_credit', JSON.stringify(INITIAL_CREDIT));
      localStorage.setItem('sun_debit', JSON.stringify(INITIAL_DEBIT));
      localStorage.setItem('sun_customers', JSON.stringify(INITIAL_CUSTOMERS));
      localStorage.setItem('sun_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
      localStorage.setItem('sun_audit', JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem('sun_documents', JSON.stringify(INITIAL_DOCUMENTS));
      localStorage.setItem('sun_closings', JSON.stringify([]));
      localStorage.setItem('sun_declarations', JSON.stringify([]));
      localStorage.setItem('sun_voice_logs', JSON.stringify([]));
      localStorage.setItem('sun_backups', JSON.stringify([]));
    }
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.triggerSyncEffect();
    this.listeners.forEach(fn => fn());
  }

  private triggerSyncEffect() {
    this.syncStatus = 'SYNCING';
    setTimeout(() => {
      this.syncStatus = 'SYNCED';
      this.listeners.forEach(fn => fn());
    }, 600);
  }

  public resetToSeed() {
    localStorage.clear();
    localStorage.setItem('sun_clean_v2', 'true');
    this.init();
    this.notify();
  }

  public clearAllData() {
    localStorage.clear();
    localStorage.setItem('sun_clean_v2', 'true');
    this.init();
    this.notify();
  }

  // Helper generators
  private getTimestamp(): { date: string; time: string; full: string } {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    const full = `${date} ${time}`;
    return { date, time, full };
  }

  private generateId(prefix: string): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `SS-${prefix}-${y}${m}${d}-${rnd}`;
  }

  // Permission Check
  public checkCanAlter(currentUser: User): { allowed: boolean; message?: string } {
    if (currentUser.role === 'OWNER' && currentUser.name === 'Anand') {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: 'OWNER ONLY: Only Anand can alter existing business records.'
    };
  }

  // AUDIT LOGGING (Append-only, never deleted)
  public logAudit(entry: Omit<AuditLog, 'id' | 'timestamp' | 'date' | 'time'>) {
    const { date, time, full } = this.getTimestamp();
    const newLog: AuditLog = {
      id: this.generateId('AUDIT'),
      timestamp: full,
      date,
      time,
      ...entry
    };
    const logs = this.getAuditLogs();
    logs.unshift(newLog);
    localStorage.setItem('sun_audit', JSON.stringify(logs));
  }

  public getAuditLogs(): AuditLog[] {
    return JSON.parse(localStorage.getItem('sun_audit') || '[]');
  }

  // USERS
  public getUsers(): User[] {
    return JSON.parse(localStorage.getItem('sun_users') || '[]');
  }

  public updateUserPin(userId: string, newPin: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);

    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) throw new Error('User not found');
    const oldVal = `PIN: ****`;
    u.pin = newPin;
    localStorage.setItem('sun_users', JSON.stringify(users));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'USER_PIN_CHANGED',
      module: 'USERS',
      recordId: userId,
      oldValue: oldVal,
      newValue: `PIN Updated for ${u.name}`,
      reason: 'Owner updated user PIN'
    });
    this.notify();
  }

  public toggleUserActive(userId: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);

    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) throw new Error('User not found');
    if (u.name === 'Anand') throw new Error('Cannot deactivate owner Anand');

    const oldStatus = u.isActive ? 'ACTIVE' : 'INACTIVE';
    u.isActive = !u.isActive;
    const newStatus = u.isActive ? 'ACTIVE' : 'INACTIVE';
    localStorage.setItem('sun_users', JSON.stringify(users));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: u.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'USERS',
      recordId: userId,
      oldValue: `Status: ${oldStatus}`,
      newValue: `Status: ${newStatus}`,
      reason: 'Owner toggled user status'
    });
    this.notify();
  }

  // STOCK
  public getStock(): StockItem[] {
    return JSON.parse(localStorage.getItem('sun_stock') || '[]');
  }

  public addStock(item: Omit<StockItem, 'id' | 'timestamp' | 'purchaseDate' | 'totalCost'>, currentUser: User): StockItem {
    const stock = this.getStock();
    const cleanSerial = item.serialNumber.trim().toUpperCase();
    if (cleanSerial && stock.some(s => s.serialNumber.trim().toUpperCase() === cleanSerial)) {
      throw new Error(`SERIAL ALREADY EXISTS: Stock with serial "${item.serialNumber}" already exists.`);
    }

    const { date, full } = this.getTimestamp();
    const totalCost = Number(item.purchaseCost || 0) + Number(item.repairCost || 0) + Number(item.transportCost || 0) + Number(item.otherCost || 0);

    const newItem: StockItem = {
      ...item,
      id: this.generateId('STOCK'),
      timestamp: full,
      purchaseDate: date,
      totalCost,
      enteredBy: currentUser.name,
      status: item.status || 'READY'
    };

    stock.unshift(newItem);
    localStorage.setItem('sun_stock', JSON.stringify(stock));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'STOCK_CREATED',
      module: 'STOCK',
      recordId: newItem.id,
      oldValue: 'None',
      newValue: `${newItem.brand} ${newItem.model} (SN: ${newItem.serialNumber}), Cost: ₹${totalCost}`,
      reason: 'Stock entry'
    });

    this.notify();
    return newItem;
  }

  public alterStock(stockId: string, updates: Partial<StockItem>, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('Reason is mandatory for owner alteration.');

    const stock = this.getStock();
    const idx = stock.findIndex(s => s.id === stockId);
    if (idx === -1) throw new Error('Stock item not found');

    const oldItem = stock[idx];
    const totalCost = Number(updates.purchaseCost ?? oldItem.purchaseCost) +
      Number(updates.repairCost ?? oldItem.repairCost) +
      Number(updates.transportCost ?? oldItem.transportCost) +
      Number(updates.otherCost ?? oldItem.otherCost);

    const updatedItem = { ...oldItem, ...updates, totalCost };
    stock[idx] = updatedItem;
    localStorage.setItem('sun_stock', JSON.stringify(stock));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'RECORD_EDITED_BY_OWNER',
      module: 'STOCK',
      recordId: stockId,
      oldValue: `Model: ${oldItem.model}, Cost: ₹${oldItem.totalCost}, Target: ₹${oldItem.targetSellingPrice}`,
      newValue: `Model: ${updatedItem.model}, Cost: ₹${updatedItem.totalCost}, Target: ₹${updatedItem.targetSellingPrice}`,
      reason
    });

    this.notify();
  }

  // SALES
  public getSales(): Sale[] {
    return JSON.parse(localStorage.getItem('sun_sales') || '[]');
  }

  public addSale(saleData: Omit<Sale, 'id' | 'date' | 'time' | 'enteredBy' | 'finalAmount' | 'status'>, currentUser: User): Sale {
    const stock = this.getStock();
    if (saleData.serialNumber) {
      const cleanSerial = saleData.serialNumber.trim().toUpperCase();
      const matchedStock = stock.find(s => s.serialNumber.trim().toUpperCase() === cleanSerial);
      if (matchedStock && matchedStock.status === 'SOLD') {
        throw new Error(`THIS UNIT IS ALREADY SOLD: Serial "${saleData.serialNumber}" has already been sold.`);
      }
    }

    const { date, time } = this.getTimestamp();
    const finalAmount = Number(saleData.sellingPrice) - Number(saleData.discount || 0);

    const newSale: Sale = {
      ...saleData,
      id: this.generateId('SALE'),
      date,
      time,
      enteredBy: currentUser.name,
      finalAmount,
      status: 'COMPLETED'
    };

    if (saleData.serialNumber) {
      const cleanSerial = saleData.serialNumber.trim().toUpperCase();
      const stockIdx = stock.findIndex(s => s.serialNumber.trim().toUpperCase() === cleanSerial);
      if (stockIdx !== -1) {
        stock[stockIdx].status = 'SOLD';
        stock[stockIdx].soldTo = saleData.customerName;
        stock[stockIdx].soldPrice = finalAmount;
        stock[stockIdx].soldDate = date;
        newSale.stockId = stock[stockIdx].id;
        localStorage.setItem('sun_stock', JSON.stringify(stock));
      }
    }

    if (saleData.paymentMode === 'Credit' && finalAmount > 0) {
      this.addCredit({
        partyName: saleData.customerName,
        mobile: saleData.customerMobile,
        amount: finalAmount,
        description: `Sale ${newSale.id} - ${saleData.productName}`,
        outstanding: finalAmount,
        status: 'OPEN'
      }, currentUser);
    }

    const sales = this.getSales();
    sales.unshift(newSale);
    localStorage.setItem('sun_sales', JSON.stringify(sales));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'SALE_CREATED',
      module: 'SALES',
      recordId: newSale.id,
      oldValue: 'None',
      newValue: `Sold ${newSale.productName} to ${newSale.customerName} for ₹${finalAmount} (${newSale.paymentMode})`,
      reason: 'Counter sale recorded'
    });

    this.notify();
    return newSale;
  }

  public alterSale(saleId: string, updates: Partial<Sale>, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('Reason is mandatory for owner alteration.');

    const sales = this.getSales();
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx === -1) throw new Error('Sale not found');

    const oldSale = sales[idx];
    const sellingPrice = updates.sellingPrice ?? oldSale.sellingPrice;
    const discount = updates.discount ?? oldSale.discount;
    const finalAmount = sellingPrice - discount;

    const updatedSale = { ...oldSale, ...updates, sellingPrice, discount, finalAmount };
    sales[idx] = updatedSale;
    localStorage.setItem('sun_sales', JSON.stringify(sales));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'RECORD_EDITED_BY_OWNER',
      module: 'SALES',
      recordId: saleId,
      oldValue: `Price: ₹${oldSale.sellingPrice}, Disc: ₹${oldSale.discount}, Final: ₹${oldSale.finalAmount}, Customer: ${oldSale.customerName}`,
      newValue: `Price: ₹${updatedSale.sellingPrice}, Disc: ₹${updatedSale.discount}, Final: ₹${updatedSale.finalAmount}, Customer: ${updatedSale.customerName}`,
      reason
    });

    this.notify();
  }

  // PURCHASES
  public getPurchases(): Purchase[] {
    return JSON.parse(localStorage.getItem('sun_purchases') || '[]');
  }

  public addPurchase(purchaseData: Omit<Purchase, 'id' | 'date' | 'time' | 'enteredBy'>, currentUser: User): Purchase {
    const { date, time } = this.getTimestamp();
    const newPurchase: Purchase = {
      ...purchaseData,
      id: this.generateId('PUR'),
      date,
      time,
      enteredBy: currentUser.name
    };

    const purchases = this.getPurchases();
    purchases.unshift(newPurchase);
    localStorage.setItem('sun_purchases', JSON.stringify(purchases));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'PURCHASE_CREATED',
      module: 'PURCHASES',
      recordId: newPurchase.id,
      oldValue: 'None',
      newValue: `Purchased ${newPurchase.quantity}x ${newPurchase.productName} from ${newPurchase.supplierName} for ₹${newPurchase.totalAmount}`,
      reason: 'Purchase entry'
    });

    this.notify();
    return newPurchase;
  }

  public alterPurchase(purchaseId: string, updates: Partial<Purchase>, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('Reason is mandatory for owner alteration.');

    const purchases = this.getPurchases();
    const idx = purchases.findIndex(p => p.id === purchaseId);
    if (idx === -1) throw new Error('Purchase not found');

    const oldP = purchases[idx];
    const updatedP = { ...oldP, ...updates };
    purchases[idx] = updatedP;
    localStorage.setItem('sun_purchases', JSON.stringify(purchases));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'RECORD_EDITED_BY_OWNER',
      module: 'PURCHASES',
      recordId: purchaseId,
      oldValue: `Supplier: ${oldP.supplierName}, Total: ₹${oldP.totalAmount}, Qty: ${oldP.quantity}`,
      newValue: `Supplier: ${updatedP.supplierName}, Total: ₹${updatedP.totalAmount}, Qty: ${updatedP.quantity}`,
      reason
    });

    this.notify();
  }

  // EXPENSES
  public getExpenses(): Expense[] {
    return JSON.parse(localStorage.getItem('sun_expenses') || '[]');
  }

  public addExpense(expData: Omit<Expense, 'id' | 'date' | 'time' | 'enteredBy'>, currentUser: User): Expense {
    const { date, time } = this.getTimestamp();
    const newExp: Expense = {
      ...expData,
      id: this.generateId('EXP'),
      date,
      time,
      enteredBy: currentUser.name
    };

    const exps = this.getExpenses();
    exps.unshift(newExp);
    localStorage.setItem('sun_expenses', JSON.stringify(exps));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'EXPENSE_CREATED',
      module: 'EXPENSES',
      recordId: newExp.id,
      oldValue: 'None',
      newValue: `${newExp.category}: ₹${newExp.amount} (${newExp.description})`,
      reason: 'Expense recorded'
    });

    this.notify();
    return newExp;
  }

  public alterExpense(expenseId: string, updates: Partial<Expense>, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('Reason is mandatory for owner alteration.');

    const exps = this.getExpenses();
    const idx = exps.findIndex(e => e.id === expenseId);
    if (idx === -1) throw new Error('Expense not found');

    const oldE = exps[idx];
    const updatedE = { ...oldE, ...updates };
    exps[idx] = updatedE;
    localStorage.setItem('sun_expenses', JSON.stringify(exps));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'RECORD_EDITED_BY_OWNER',
      module: 'EXPENSES',
      recordId: expenseId,
      oldValue: `Category: ${oldE.category}, Amount: ₹${oldE.amount}`,
      newValue: `Category: ${updatedE.category}, Amount: ₹${updatedE.amount}`,
      reason
    });

    this.notify();
  }

  // CREDIT & DEBIT
  public getCredit(): CreditEntry[] {
    return JSON.parse(localStorage.getItem('sun_credit') || '[]');
  }

  public addCredit(creditData: Omit<CreditEntry, 'id' | 'date' | 'time' | 'enteredBy'>, currentUser: User): CreditEntry {
    const { date, time } = this.getTimestamp();
    const newCredit: CreditEntry = {
      ...creditData,
      id: this.generateId('CREDIT'),
      date,
      time,
      enteredBy: currentUser.name
    };

    const credits = this.getCredit();
    credits.unshift(newCredit);
    localStorage.setItem('sun_credit', JSON.stringify(credits));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'CREDIT_CREATED',
      module: 'CREDIT',
      recordId: newCredit.id,
      oldValue: 'None',
      newValue: `Party: ${newCredit.partyName}, Amount: ₹${newCredit.amount}`,
      reason: 'Credit entry'
    });

    this.notify();
    return newCredit;
  }

  public alterCredit(creditId: string, updates: Partial<CreditEntry>, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('Reason is mandatory for owner alteration.');

    const credits = this.getCredit();
    const idx = credits.findIndex(c => c.id === creditId);
    if (idx === -1) throw new Error('Credit entry not found');

    const oldC = credits[idx];
    const updatedC = { ...oldC, ...updates };
    credits[idx] = updatedC;
    localStorage.setItem('sun_credit', JSON.stringify(credits));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'RECORD_EDITED_BY_OWNER',
      module: 'CREDIT',
      recordId: creditId,
      oldValue: `Party: ${oldC.partyName}, Outstanding: ₹${oldC.outstanding}`,
      newValue: `Party: ${updatedC.partyName}, Outstanding: ₹${updatedC.outstanding}`,
      reason
    });

    this.notify();
  }

  public getDebit(): DebitEntry[] {
    return JSON.parse(localStorage.getItem('sun_debit') || '[]');
  }

  public addDebit(debitData: Omit<DebitEntry, 'id' | 'date' | 'time' | 'enteredBy'>, currentUser: User): DebitEntry {
    const { date, time } = this.getTimestamp();
    const newDebit: DebitEntry = {
      ...debitData,
      id: this.generateId('DEBIT'),
      date,
      time,
      enteredBy: currentUser.name
    };

    const debits = this.getDebit();
    debits.unshift(newDebit);
    localStorage.setItem('sun_debit', JSON.stringify(debits));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'DEBIT_CREATED',
      module: 'DEBIT',
      recordId: newDebit.id,
      oldValue: 'None',
      newValue: `Party: ${newDebit.partyName}, Amount: ₹${newDebit.amount} (${newDebit.paymentMode})`,
      reason: 'Debit entry'
    });

    this.notify();
    return newDebit;
  }

  // CUSTOMERS & SUPPLIERS
  public getCustomers(): Customer[] {
    return JSON.parse(localStorage.getItem('sun_customers') || '[]');
  }

  public addCustomer(c: Omit<Customer, 'id' | 'outstandingCredit'>): Customer {
    const customers = this.getCustomers();
    const newCust: Customer = {
      ...c,
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      outstandingCredit: 0
    };
    customers.push(newCust);
    localStorage.setItem('sun_customers', JSON.stringify(customers));
    this.notify();
    return newCust;
  }

  public getSuppliers(): Supplier[] {
    return JSON.parse(localStorage.getItem('sun_suppliers') || '[]');
  }

  public addSupplier(s: Omit<Supplier, 'id'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSup: Supplier = {
      ...s,
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`
    };
    suppliers.push(newSup);
    localStorage.setItem('sun_suppliers', JSON.stringify(suppliers));
    this.notify();
    return newSup;
  }

  // DAILY CLOSINGS
  public getDailyClosings(): DailyClosing[] {
    return JSON.parse(localStorage.getItem('sun_closings') || '[]');
  }

  public addDailyClosing(data: Omit<DailyClosing, 'id' | 'date' | 'time' | 'difference'>, currentUser: User): DailyClosing {
    const { date, time } = this.getTimestamp();
    const difference = data.cashActual - data.cashExpected;

    const newClosing: DailyClosing = {
      ...data,
      id: this.generateId('CLOSE'),
      date,
      time,
      difference
    };

    const closings = this.getDailyClosings();
    closings.unshift(newClosing);
    localStorage.setItem('sun_closings', JSON.stringify(closings));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'DAY_CLOSED',
      module: 'DAILY_CLOSING',
      recordId: newClosing.id,
      oldValue: 'Status: OPEN',
      newValue: `Sales: ₹${newClosing.systemSales}, Cash Diff: ₹${difference}`,
      reason: newClosing.differenceReason || 'EOD Account Closing'
    });

    this.notify();
    return newClosing;
  }

  // DAILY DECLARATIONS
  public getDailyDeclarations(): DailyDeclaration[] {
    return JSON.parse(localStorage.getItem('sun_declarations') || '[]');
  }

  public submitDeclaration(staffName: string) {
    const { date, time } = this.getTimestamp();
    const declarations = this.getDailyDeclarations();
    const newDecl: DailyDeclaration = {
      id: `DECL-${date}-${staffName}`,
      date,
      time,
      staffName,
      declarationText: 'I confirm all sales and entries made by me today have been recorded.',
      confirmed: true
    };
    declarations.unshift(newDecl);
    localStorage.setItem('sun_declarations', JSON.stringify(declarations));
    this.notify();
    return newDecl;
  }

  // DOCUMENTS & OCR
  public getDocuments(): DocumentRecord[] {
    return JSON.parse(localStorage.getItem('sun_documents') || '[]');
  }

  public addDocument(doc: Omit<DocumentRecord, 'id' | 'date' | 'driveFileId'>, currentUser: User): DocumentRecord {
    const { date } = this.getTimestamp();
    const newDoc: DocumentRecord = {
      ...doc,
      id: `DOC-${Date.now()}`,
      date,
      driveFileId: `DRV-${Date.now()}-${Math.floor(Math.random()*1000)}`
    };

    const docs = this.getDocuments();
    docs.unshift(newDoc);
    localStorage.setItem('sun_documents', JSON.stringify(docs));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'DOCUMENT_SCANNED',
      module: 'DOCUMENTS',
      recordId: newDoc.id,
      oldValue: 'None',
      newValue: `${newDoc.docType}: ${newDoc.fileName} -> Saved in ${newDoc.driveFolder}`,
      reason: 'OCR document capture & Drive upload'
    });

    this.notify();
    return newDoc;
  }

  // VOICE COMMAND LOGS
  public logVoiceCommand(log: Omit<VoiceCommandRecord, 'id' | 'date' | 'time'>) {
    const { date, time } = this.getTimestamp();
    const logs = this.getVoiceLogs();
    logs.unshift({
      id: `VCMD-${Date.now()}`,
      date,
      time,
      ...log
    });
    localStorage.setItem('sun_voice_logs', JSON.stringify(logs.slice(0, 100)));
  }

  public getVoiceLogs(): VoiceCommandRecord[] {
    return JSON.parse(localStorage.getItem('sun_voice_logs') || '[]');
  }
}

export const db = new DatabaseService();

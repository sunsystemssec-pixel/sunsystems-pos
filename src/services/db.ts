import {
  User, StockItem, Sale, SaleItem, Purchase, Expense, CreditEntry, DebitEntry,
  Customer, Supplier, DailyClosing, DailyDeclaration, AuditLog,
  DocumentRecord, VoiceCommandRecord
} from '../types';
import {
  INITIAL_USERS, INITIAL_STOCK, INITIAL_SALES, INITIAL_PURCHASES,
  INITIAL_EXPENSES, INITIAL_CREDIT, INITIAL_DEBIT, INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS, INITIAL_AUDIT_LOGS, INITIAL_DOCUMENTS
} from '../data/seedData';
import { supabaseService } from './supabase';

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

    // Ensure Owner Anand has the exact designated PIN 215799 and clean up pre-seeded accounts
    try {
      if (!localStorage.getItem('sun_owner_accounts_v2')) {
        const users = this.getUsers();
        // Keep Anand and set pin 215799; all other accounts must be explicitly created by Anand
        let cleanUsers = users.filter(u => u.name === 'Anand' || u.role === 'OWNER');
        if (cleanUsers.length === 0) {
          cleanUsers = [{
            id: 'USR-01',
            name: 'Anand',
            role: 'OWNER',
            email: 'sunsystems.sec@gmail.com',
            mobile: '9885100949',
            pin: '215799',
            isActive: true
          }];
        } else {
          cleanUsers[0].pin = '215799';
          cleanUsers[0].role = 'OWNER';
        }
        localStorage.setItem('sun_users', JSON.stringify(cleanUsers));
        localStorage.setItem('sun_owner_accounts_v2', 'true');
      } else {
        const users = this.getUsers();
        const anand = users.find(u => u.name === 'Anand' || u.role === 'OWNER');
        if (anand && anand.pin !== '215799') {
          anand.pin = '215799';
          localStorage.setItem('sun_users', JSON.stringify(users));
        }
      }
    } catch (e) {
      // Non-fatal
    }

    // Auto-sync from Supabase Cloud on launch
    setTimeout(() => {
      this.pullFromSupabase();
    }, 800);
  }

  // Generates sequential Bill / Invoice serial number strictly for bills (e.g. SS-0001, SS-0002)
  public getNextBillNumber(): string {
    const sales = this.getSales();
    let maxNum = 0;
    sales.forEach(s => {
      const match = (s.invoiceNumber || '').match(/^SS-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    const storedCounter = parseInt(localStorage.getItem('sun_bill_serial_counter') || '0', 10);
    const nextNum = Math.max(maxNum, storedCounter, 0) + 1;
    localStorage.setItem('sun_bill_serial_counter', String(nextNum));

    return `SS-${String(nextNum).padStart(4, '0')}`;
  }

  public verifyPin(userId: string, pin: string): boolean {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return false;
    return user.pin === pin.trim();
  }

  public getUserByPin(pin: string): User | null {
    const cleanPin = pin.trim();
    if (!cleanPin) return null;
    const users = this.getUsers().filter(u => u.isActive !== false);
    return users.find(u => u.pin === cleanPin) || null;
  }

  public authenticateUser(identifier: string, pin: string): User | null {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();
    if (!cleanId || !cleanPin) return null;

    const users = this.getUsers().filter(u => u.isActive !== false);
    return users.find(u => 
      (u.id.toLowerCase() === cleanId ||
       u.name.toLowerCase() === cleanId ||
       (u.mobile && u.mobile.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) ||
       (u.email && u.email.toLowerCase() === cleanId)) &&
      u.pin === cleanPin
    ) || null;
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private syncTimeout: any = null;

  public syncToSupabaseDebounced() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.pushAllToSupabase();
    }, 1200);
  }

  public async pushAllToSupabase() {
    const payload = {
      sun_users: this.getUsers(),
      sun_stock: this.getStock(),
      sun_sales: this.getSales(),
      sun_purchases: this.getPurchases(),
      sun_expenses: this.getExpenses(),
      sun_credit: this.getCredit(),
      sun_debit: this.getDebit(),
      sun_customers: this.getCustomers(),
      sun_suppliers: this.getSuppliers(),
      sun_audit: this.getAuditLogs(),
      sun_closings: this.getDailyClosings(),
      sun_documents: this.getDocuments(),
    };
    await supabaseService.pushAll(payload);
  }

  public async pullFromSupabase(): Promise<boolean> {
    const cloudData = await supabaseService.pullAllCollections();
    if (!cloudData) return false;

    let hasUpdates = false;
    Object.entries(cloudData).forEach(([key, val]) => {
      if (val && Array.isArray(val) && val.length > 0) {
        localStorage.setItem(key, JSON.stringify(val));
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      this.listeners.forEach(fn => fn());
    }
    return true;
  }

  private notify() {
    this.triggerSyncEffect();
    this.listeners.forEach(fn => fn());
    this.syncToSupabaseDebounced();
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

  public createUser(
    data: { name: string; role: 'MANAGER' | 'STAFF'; mobile?: string; email?: string; pin: string },
    currentUser: User
  ): User {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);

    const name = data.name.trim();
    if (!name) throw new Error('Staff name is required');

    const pin = data.pin.trim();
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 digits');
    }

    const users = this.getUsers();
    const exists = users.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      throw new Error(`An account with name "${name}" already exists.`);
    }

    const nextIndex = users.length + 1;
    const newUser: User = {
      id: `USR-${String(nextIndex).padStart(2, '0')}`,
      name,
      role: data.role,
      mobile: data.mobile?.trim(),
      email: data.email?.trim(),
      pin,
      isActive: true
    };

    users.push(newUser);
    localStorage.setItem('sun_users', JSON.stringify(users));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'USER_CREATED',
      module: 'USERS',
      recordId: newUser.id,
      oldValue: 'None',
      newValue: `Created ${newUser.role} account for ${newUser.name} with assigned PIN`,
      reason: `Owner Anand created account for ${newUser.name}`
    });

    this.notify();
    return newUser;
  }

  public deleteUser(userId: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);

    const users = this.getUsers();
    const u = users.find(x => x.id === userId);
    if (!u) throw new Error('User not found');
    if (u.name.toLowerCase() === 'anand' || u.role === 'OWNER') {
      throw new Error('Cannot delete Owner Anand');
    }

    const updated = users.filter(x => x.id !== userId);
    localStorage.setItem('sun_users', JSON.stringify(updated));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'USER_DELETED',
      module: 'USERS',
      recordId: userId,
      oldValue: `${u.name} (${u.role})`,
      newValue: 'DELETED',
      reason: `Owner Anand removed user account for ${u.name}`
    });

    this.notify();
  }

  // STOCK
  public getStock(): StockItem[] {
    return JSON.parse(localStorage.getItem('sun_stock') || '[]');
  }

  public addStock(item: Omit<StockItem, 'id' | 'timestamp' | 'purchaseDate' | 'totalCost'>, currentUser: User): StockItem {
    const stock = this.getStock();
    const rawSerial = item.serialNumber ? item.serialNumber.trim() : '';
    const cleanSerial = rawSerial.toUpperCase();

    const { date, full } = this.getTimestamp();
    const qty = Math.max(1, Number(item.quantity || 1));
    const availQty = Math.max(0, Number(item.availableQuantity ?? qty));
    const totalCost = Number(item.purchaseCost || 0) + Number(item.repairCost || 0) + Number(item.transportCost || 0) + Number(item.otherCost || 0);

    const norm = (str?: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanBrand = norm(item.brand);
    const cleanModel = norm(item.model);
    const cleanCategory = norm(item.category);
    const cleanCpu = norm(item.cpu);
    const cleanRam = norm(item.ram);
    const cleanStorage = norm(item.storage);
    const cleanCondition = norm(item.condition);

    // Check if an item with the same details already exists in inventory
    const existingIndex = stock.findIndex(s => {
      // Ignore scrapped or returned items
      if (s.status === 'SCRAP' || s.status === 'RETURNED' || s.status === 'MISSING') return false;

      const sameBrand = norm(s.brand) === cleanBrand;
      const sameModel = norm(s.model) === cleanModel;
      if (!sameBrand || !sameModel) return false;

      // Category match (if both specified)
      if (cleanCategory && s.category && norm(s.category) !== cleanCategory) return false;

      // Specs check for laptops/desktops/hardware
      if (cleanCpu && s.cpu && norm(s.cpu) !== cleanCpu) return false;
      if (cleanRam && s.ram && norm(s.ram) !== cleanRam) return false;
      if (cleanStorage && s.storage && norm(s.storage) !== cleanStorage) return false;
      if (cleanCondition && s.condition && norm(s.condition) !== cleanCondition) return false;

      return true;
    });

    if (existingIndex !== -1) {
      // ITEM WITH SAME DETAILS ALREADY EXISTS -> Add quantity only! Do NOT create new stock row.
      const existing = stock[existingIndex];
      const prevQty = Number(existing.quantity || 1);
      const prevAvail = Number(existing.availableQuantity ?? prevQty);
      const newQty = prevQty + qty;
      const newAvail = prevAvail + qty;

      existing.quantity = newQty;
      existing.availableQuantity = newAvail;

      // If item was marked SOLD, restock brings it back to READY
      if (existing.status === 'SOLD') {
        existing.status = 'READY';
      }

      // Merge serial numbers if new ones were provided
      if (rawSerial && rawSerial !== 'N/A' && rawSerial !== 'NONE') {
        const incomingSerials = rawSerial.split(',').map(s => s.trim()).filter(s => s && s !== 'N/A');
        const existingSerials = (existing.serialNumber || '').split(',').map(s => s.trim()).filter(s => s && s !== 'N/A');
        const mergedSerials = Array.from(new Set([...existingSerials, ...incomingSerials]));
        existing.serialNumber = mergedSerials.join(', ');
      }

      // Update latest purchase price & selling price if provided
      if (Number(item.purchaseCost) > 0) {
        existing.purchaseCost = Number(item.purchaseCost);
        existing.totalCost = Number(item.purchaseCost) + Number(existing.repairCost || 0) + Number(existing.transportCost || 0) + Number(existing.otherCost || 0);
      }
      if (Number(item.targetSellingPrice) > 0) {
        existing.targetSellingPrice = Number(item.targetSellingPrice);
      }
      if (item.supplier) {
        existing.supplier = item.supplier;
      }

      localStorage.setItem('sun_stock', JSON.stringify(stock));

      this.logAudit({
        user: currentUser.name,
        role: currentUser.role,
        action: 'STOCK_RESTOCKED',
        module: 'STOCK',
        recordId: existing.id,
        oldValue: `Qty: ${prevQty} (Available: ${prevAvail})`,
        newValue: `${existing.brand} ${existing.model} +${qty} units added. New Total: ${newQty} (Available: ${newAvail}), Unit Cost: ₹${existing.purchaseCost}`,
        reason: 'Restock: Matching item details found, quantity incremented'
      });

      this.syncToSupabaseDebounced();
      this.notify();
      return existing;
    }

    // Otherwise, create new stock item
    // Only check uniqueness of serial across other items if a real serial is supplied
    if (cleanSerial && cleanSerial !== 'N/A' && cleanSerial !== 'NONE' && cleanSerial !== 'OPTIONAL') {
      if (stock.some(s => s.serialNumber && s.serialNumber.trim().toUpperCase() === cleanSerial)) {
        throw new Error(`SERIAL ALREADY EXISTS: Stock with serial "${rawSerial}" already exists.`);
      }
    }

    const newItem: StockItem = {
      ...item,
      id: this.generateId('STOCK'),
      serialNumber: cleanSerial && cleanSerial !== 'N/A' ? rawSerial : '',
      quantity: qty,
      availableQuantity: availQty,
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
      newValue: `${newItem.brand} ${newItem.model} (Qty: ${qty}, SN: ${newItem.serialNumber || 'N/A'}), Cost: ₹${totalCost}`,
      reason: 'New stock entry'
    });

    this.syncToSupabaseDebounced();
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

  public getVisibleSales(currentUser: User): Sale[] {
    const sales = this.getSales();
    if (currentUser.role === 'OWNER') {
      return sales;
    }
    const today = this.getTimestamp().date;
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return sales.filter(s => {
      const isToday = s.date === today || s.date === localToday;
      const isMine = s.enteredBy && s.enteredBy.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
      return isToday && isMine;
    });
  }

  public addSale(saleData: Omit<Sale, 'id' | 'date' | 'time' | 'enteredBy' | 'finalAmount' | 'status'>, currentUser: User): Sale {
    const stock = this.getStock();
    const { date, time } = this.getTimestamp();

    const hasItemsList = saleData.items && Array.isArray(saleData.items) && saleData.items.length > 0;
    
    let totalQty = 0;
    let totalSellingPrice = 0;
    let finalItems: SaleItem[] | undefined = undefined;
    let primaryStockId = saleData.stockId;
    let primaryProductName = saleData.productName;
    let primarySerial = saleData.serialNumber ? saleData.serialNumber.trim() : '';

    if (hasItemsList && saleData.items) {
      finalItems = [...saleData.items];
      totalQty = finalItems.reduce((acc, itm) => acc + (Number(itm.quantity) || 1), 0);
      totalSellingPrice = finalItems.reduce((acc, itm) => acc + (Number(itm.amount) || (Number(itm.unitPrice) * Number(itm.quantity))), 0);
      
      if (finalItems.length === 1) {
        primaryProductName = finalItems[0].productName;
        primarySerial = finalItems[0].serialNumber || '';
        primaryStockId = finalItems[0].stockId;
      } else {
        primaryProductName = finalItems.map(i => `${i.productName} (x${i.quantity})`).join(', ');
        primarySerial = finalItems.map(i => i.serialNumber).filter(Boolean).join(', ');
        primaryStockId = finalItems[0].stockId;
      }
    } else {
      totalQty = Math.max(1, Number(saleData.quantity || 1));
      const uPrice = Number(saleData.unitPrice || (Number(saleData.sellingPrice) / totalQty) || 0);
      totalSellingPrice = Number(saleData.sellingPrice || (uPrice * totalQty));
    }

    const discount = Number(saleData.discount || 0);
    const finalAmount = Math.max(0, totalSellingPrice - discount);
    const unitPrice = totalQty > 0 ? Math.round(totalSellingPrice / totalQty) : 0;

    const newSale: Sale = {
      ...saleData,
      id: this.generateId('SALE'),
      invoiceNumber: this.getNextBillNumber(),
      date,
      time,
      productName: primaryProductName,
      serialNumber: primarySerial,
      quantity: totalQty,
      unitPrice,
      sellingPrice: totalSellingPrice,
      discount,
      finalAmount,
      items: finalItems,
      customerAddress: saleData.customerAddress ? saleData.customerAddress.trim() : undefined,
      enteredBy: currentUser.name,
      status: 'COMPLETED',
      stockId: primaryStockId
    };

    // Deduct stock for items
    let stockModified = false;
    if (finalItems && finalItems.length > 0) {
      for (const item of finalItems) {
        const itemQty = Math.max(1, Number(item.quantity || 1));
        const itemSN = item.serialNumber ? item.serialNumber.trim().toUpperCase() : '';
        
        let stockIdx = -1;
        if (item.stockId) {
          stockIdx = stock.findIndex(s => s.id === item.stockId);
        }
        if (stockIdx === -1 && itemSN && itemSN !== 'N/A') {
          stockIdx = stock.findIndex(s => s.serialNumber && s.serialNumber.trim().toUpperCase() === itemSN);
        }
        if (stockIdx === -1 && item.productName) {
          const pLower = item.productName.toLowerCase();
          stockIdx = stock.findIndex(s =>
            s.status === 'READY' &&
            (Number(s.availableQuantity ?? s.quantity ?? 1) > 0) &&
            (s.model.toLowerCase().includes(pLower) || pLower.includes(s.model.toLowerCase()) || pLower.includes(s.brand.toLowerCase()))
          );
        }

        if (stockIdx !== -1) {
          const stItem = stock[stockIdx];
          const currentAvail = Number(stItem.availableQuantity ?? stItem.quantity ?? 1);
          const remaining = Math.max(0, currentAvail - itemQty);
          stItem.availableQuantity = remaining;
          stItem.soldTo = saleData.customerName;
          stItem.soldDate = date;
          if (remaining <= 0) {
            stItem.status = 'SOLD';
          }
          item.stockId = stItem.id;
          stockModified = true;
        }
      }
    } else {
      // Single item deduction
      const rawSerial = saleData.serialNumber ? saleData.serialNumber.trim() : '';
      const cleanSerial = rawSerial.toUpperCase();
      if (cleanSerial && cleanSerial !== 'N/A' && cleanSerial !== 'NONE' && cleanSerial !== 'OPTIONAL') {
        const stockIdx = stock.findIndex(s => s.serialNumber && s.serialNumber.trim().toUpperCase() === cleanSerial);
        if (stockIdx !== -1) {
          const item = stock[stockIdx];
          const currentAvail = Number(item.availableQuantity ?? item.quantity ?? 1);
          const remaining = Math.max(0, currentAvail - totalQty);
          item.availableQuantity = remaining;
          item.soldTo = saleData.customerName;
          item.soldPrice = finalAmount;
          item.soldDate = date;
          if (remaining <= 0) {
            item.status = 'SOLD';
          }
          newSale.stockId = item.id;
          stockModified = true;
        }
      } else if (saleData.productName) {
        const prodLower = saleData.productName.toLowerCase();
        const stockIdx = stock.findIndex(s =>
          s.status === 'READY' &&
          (Number(s.availableQuantity ?? s.quantity ?? 1) > 0) &&
          (s.model.toLowerCase().includes(prodLower) || prodLower.includes(s.model.toLowerCase()) || prodLower.includes(s.brand.toLowerCase()))
        );
        if (stockIdx !== -1) {
          const item = stock[stockIdx];
          const currentAvail = Number(item.availableQuantity ?? item.quantity ?? 1);
          const remaining = Math.max(0, currentAvail - totalQty);
          item.availableQuantity = remaining;
          if (remaining <= 0) {
            item.status = 'SOLD';
          }
          newSale.stockId = item.id;
          stockModified = true;
        }
      }
    }

    if (stockModified) {
      localStorage.setItem('sun_stock', JSON.stringify(stock));
    }

    if (saleData.paymentMode === 'Credit' && finalAmount > 0) {
      this.addCredit({
        partyName: saleData.customerName,
        mobile: saleData.customerMobile,
        amount: finalAmount,
        description: `Sale ${newSale.id} - ${primaryProductName} (Qty: ${totalQty})`,
        outstanding: finalAmount,
        status: 'OPEN'
      }, currentUser);
    }

    const sales = this.getSales();
    sales.unshift(newSale);
    localStorage.setItem('sun_sales', JSON.stringify(sales));

    // Save or update customer record with address if provided
    if (saleData.customerName && saleData.customerName !== 'Walk-in Customer') {
      const customers = this.getCustomers();
      const existingCust = customers.find(c =>
        (saleData.customerMobile && c.mobile && c.mobile === saleData.customerMobile) ||
        c.name.toLowerCase() === saleData.customerName.toLowerCase()
      );
      if (existingCust) {
        if (saleData.customerAddress && !existingCust.address) {
          existingCust.address = saleData.customerAddress.trim();
          localStorage.setItem('sun_customers', JSON.stringify(customers));
        }
      } else {
        customers.push({
          id: this.generateId('CUSTOMER'),
          name: saleData.customerName,
          mobile: saleData.customerMobile || '',
          address: saleData.customerAddress ? saleData.customerAddress.trim() : '',
          outstandingCredit: 0
        });
        localStorage.setItem('sun_customers', JSON.stringify(customers));
      }
    }

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'SALE_CREATED',
      module: 'SALES',
      recordId: newSale.id,
      oldValue: 'None',
      newValue: `Sold ${totalQty}x ${newSale.productName} to ${newSale.customerName} for ₹${finalAmount} (${newSale.paymentMode})`,
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
    const qty = updates.quantity ?? oldSale.quantity ?? 1;
    const unitPrice = updates.unitPrice ?? oldSale.unitPrice ?? (oldSale.sellingPrice / qty);
    const sellingPrice = updates.sellingPrice ?? (unitPrice * qty);
    const discount = updates.discount ?? oldSale.discount;
    const finalAmount = sellingPrice - discount;

    const updatedSale = { 
      ...oldSale, 
      ...updates, 
      quantity: qty, 
      unitPrice, 
      sellingPrice, 
      discount, 
      finalAmount,
      customerAddress: updates.customerAddress !== undefined ? updates.customerAddress : oldSale.customerAddress
    };
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

  public deleteSale(saleId: string, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('A valid reason (min 3 chars) is strictly mandatory for owner bill deletion.');

    const sales = this.getSales();
    const idx = sales.findIndex(s => s.id === saleId);
    if (idx === -1) throw new Error('Sale record not found');

    const deletedSale = sales[idx];
    const soldQty = Number(deletedSale.quantity) || 1;

    // Restore stock inventory quantity if sale was linked to an item or multi-items
    const stock = this.getStock();
    let stockRestored = false;

    if (deletedSale.items && Array.isArray(deletedSale.items) && deletedSale.items.length > 0) {
      for (const item of deletedSale.items) {
        const itemQty = Math.max(1, Number(item.quantity || 1));
        let stockIdx = -1;
        if (item.stockId) {
          stockIdx = stock.findIndex(s => s.id === item.stockId);
        }
        if (stockIdx === -1 && item.serialNumber) {
          const cleanSN = item.serialNumber.trim().toUpperCase();
          stockIdx = stock.findIndex(s => s.serialNumber && s.serialNumber.trim().toUpperCase() === cleanSN);
        }
        if (stockIdx !== -1) {
          const stItem = stock[stockIdx];
          stItem.availableQuantity = (Number(stItem.availableQuantity) || 0) + itemQty;
          stItem.status = 'READY';
          stockRestored = true;
        }
      }
    } else {
      const soldQty = Number(deletedSale.quantity || 1);
      if (deletedSale.stockId) {
        const stockIdx = stock.findIndex(s => s.id === deletedSale.stockId);
        if (stockIdx !== -1) {
          const item = stock[stockIdx];
          item.availableQuantity = (item.availableQuantity || 0) + soldQty;
          item.status = 'READY';
          stockRestored = true;
        }
      } else if (deletedSale.serialNumber) {
        const cleanSN = deletedSale.serialNumber.trim().toUpperCase();
        const stockIdx = stock.findIndex(s => s.serialNumber && s.serialNumber.trim().toUpperCase().includes(cleanSN));
        if (stockIdx !== -1) {
          const item = stock[stockIdx];
          item.availableQuantity = (item.availableQuantity || 0) + soldQty;
          item.status = 'READY';
          stockRestored = true;
        }
      }
    }

    if (stockRestored) {
      localStorage.setItem('sun_stock', JSON.stringify(stock));
    }

    // Remove from sales list
    sales.splice(idx, 1);
    localStorage.setItem('sun_sales', JSON.stringify(sales));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'SALE_DELETED_BY_OWNER',
      module: 'SALES',
      recordId: saleId,
      oldValue: `Bill ${deletedSale.invoiceNumber || deletedSale.id}: ${deletedSale.productName}, Cust: ${deletedSale.customerName}, Amt: ₹${deletedSale.finalAmount} (${soldQty} units)`,
      newValue: 'DELETED (Inventory Restored)',
      reason
    });

    this.syncToSupabaseDebounced();
    this.notify();
    return deletedSale;
  }

  // PURCHASES
  public getPurchases(): Purchase[] {
    return JSON.parse(localStorage.getItem('sun_purchases') || '[]');
  }

  public addPurchase(purchaseData: Omit<Purchase, 'id' | 'date' | 'time' | 'enteredBy'>, currentUser: User): Purchase {
    const { date, time } = this.getTimestamp();
    const qty = Math.max(1, Number(purchaseData.quantity || 1));
    const unitCost = Number(purchaseData.unitCost || 0);
    const totalAmount = Number(purchaseData.totalAmount || (qty * unitCost));

    const newPurchase: Purchase = {
      ...purchaseData,
      id: this.generateId('PUR'),
      quantity: qty,
      unitCost,
      totalAmount,
      date,
      time,
      enteredBy: currentUser.name
    };

    const purchases = this.getPurchases();
    purchases.unshift(newPurchase);
    localStorage.setItem('sun_purchases', JSON.stringify(purchases));

    // Ensure party/dealer is recorded in suppliers without creating duplicates
    if (purchaseData.supplierName && purchaseData.supplierName.trim()) {
      this.ensureSupplier(purchaseData.supplierName.trim());
    }

    // Automatically stock this bulk purchase into inventory
    try {
      const targetSellingPrice = Math.round(unitCost > 0 ? unitCost * 1.25 : 0);
      this.addStock({
        brand: purchaseData.brand || (purchaseData.productName.split(' ')[0]) || 'Hardware',
        model: purchaseData.model || purchaseData.productName,
        serialNumber: purchaseData.serialNumbers || '',
        category: purchaseData.category || 'Hardware',
        cpu: purchaseData.cpu || '',
        ram: purchaseData.ram || '',
        storage: purchaseData.storage || '',
        display: purchaseData.display || '',
        gpu: purchaseData.gpu || '',
        condition: purchaseData.condition || 'New',
        charger: purchaseData.charger ?? (purchaseData.category === 'Laptops'),
        serviceTag: purchaseData.serviceTag || '',
        quantity: qty,
        availableQuantity: qty,
        purchaseCost: unitCost,
        repairCost: 0,
        transportCost: 0,
        otherCost: 0,
        targetSellingPrice,
        supplier: purchaseData.supplierName,
        status: 'READY',
        enteredBy: currentUser.name,
        notes: purchaseData.notes || `Bulk purchase ${newPurchase.id}`
      }, currentUser);
    } catch (e) {
      // If stock already exists or non-fatal error, keep purchase
      console.warn('Auto stock addition note:', e);
    }

    // If purchase is on Credit, record as Debit payable to supplier
    if (purchaseData.paymentMode === 'Credit' && totalAmount > 0) {
      this.addDebit({
        partyName: purchaseData.supplierName,
        amount: totalAmount,
        description: `Purchase ${newPurchase.id} - ${purchaseData.productName} (Qty: ${qty})`,
        paymentMode: 'Credit',
        status: 'PENDING'
      }, currentUser);
    }

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'PURCHASE_CREATED',
      module: 'PURCHASES',
      recordId: newPurchase.id,
      oldValue: 'None',
      newValue: `Purchased ${qty}x ${newPurchase.productName} from ${newPurchase.supplierName} for ₹${totalAmount}`,
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

  public deleteExpense(expenseId: string, reason: string, currentUser: User) {
    const check = this.checkCanAlter(currentUser);
    if (!check.allowed) throw new Error(check.message);
    if (!reason || reason.trim().length < 3) throw new Error('A valid reason is strictly mandatory for owner expense deletion.');

    const exps = this.getExpenses();
    const idx = exps.findIndex(e => e.id === expenseId);
    if (idx === -1) throw new Error('Expense record not found');

    const deletedExp = exps[idx];
    exps.splice(idx, 1);
    localStorage.setItem('sun_expenses', JSON.stringify(exps));

    this.logAudit({
      user: currentUser.name,
      role: currentUser.role,
      action: 'EXPENSE_DELETED_BY_OWNER',
      module: 'EXPENSES',
      recordId: expenseId,
      oldValue: `${deletedExp.category}: ₹${deletedExp.amount} (${deletedExp.description})`,
      newValue: 'DELETED',
      reason
    });

    this.syncToSupabaseDebounced();
    this.notify();
    return deletedExp;
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
    const cleanName = (s.name || '').trim();
    const cleanCompany = (s.company || cleanName).trim();

    // Check if supplier already exists by name or company (case-insensitive)
    const existing = suppliers.find(
      sup => sup.name.trim().toLowerCase() === cleanName.toLowerCase() ||
             (sup.company && sup.company.trim().toLowerCase() === cleanCompany.toLowerCase())
    );
    if (existing) {
      return existing; // Don't create duplicate!
    }

    const newSup: Supplier = {
      ...s,
      name: cleanName,
      company: cleanCompany,
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`
    };
    suppliers.push(newSup);
    localStorage.setItem('sun_suppliers', JSON.stringify(suppliers));
    this.syncToSupabaseDebounced();
    this.notify();
    return newSup;
  }

  public ensureSupplier(partyName: string, company?: string): Supplier {
    const clean = partyName.trim();
    if (!clean) return { id: 'SUP-000', name: 'Vendor', company: 'Vendor' };
    const suppliers = this.getSuppliers();
    const existing = suppliers.find(
      s => s.name.trim().toLowerCase() === clean.toLowerCase() ||
           (s.company && s.company.trim().toLowerCase() === clean.toLowerCase())
    );
    if (existing) return existing;

    return this.addSupplier({
      name: clean,
      company: company || clean,
      address: 'CTC Secunderabad'
    });
  }

  public getAllParties(): string[] {
    const partySet = new Set<string>();

    // 1. Registered suppliers
    this.getSuppliers().forEach(s => {
      if (s.name && s.name.trim()) partySet.add(s.name.trim());
      if (s.company && s.company.trim()) partySet.add(s.company.trim());
    });

    // 2. Suppliers from purchases
    this.getPurchases().forEach(p => {
      if (p.supplierName && p.supplierName.trim()) partySet.add(p.supplierName.trim());
    });

    // 3. Suppliers from stock items
    this.getStock().forEach(s => {
      if (s.supplier && s.supplier.trim()) partySet.add(s.supplier.trim());
    });

    // 4. Parties from debit
    this.getDebit().forEach(d => {
      if (d.partyName && d.partyName.trim()) partySet.add(d.partyName.trim());
    });

    return Array.from(partySet).filter(Boolean).sort((a, b) => a.localeCompare(b));
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

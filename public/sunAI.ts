import { db } from './db';
import { User, Sale, StockItem, Purchase, Expense, CreditEntry, DebitEntry, PaymentMode } from '../types';

export interface ParsedTransaction {
  intent: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE' | 'CREDIT' | 'DEBIT' | 'DAILY_CLOSING' | 'QUERY' | 'UNKNOWN';
  queryType?: 'SALES' | 'EXPENSES' | 'STOCK' | 'CREDIT' | 'AUDIT' | 'CASH' | 'STAFF_ACTIVITY' | 'SEARCH_SERIAL';
  queryParam?: string;
  data: Record<string, any>;
  missingFields: string[];
  summary: string;
  originalText: string;
}

class SunAIService {
  private recognition: any = null;
  public isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-IN';
      }
    }
  }

  public startListening(
    onResult: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void,
    langCode: string = 'en-IN'
  ) {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser. Please use text input or standard mobile Chrome/Safari.');
      return;
    }
    this.recognition.lang = langCode;
    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.isListening = false;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      onError(e);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public speak(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  }

  public parseCommand(input: string, currentUser: User): ParsedTransaction {
    const text = input.trim();
    const lower = text.toLowerCase();

    // 1. QUERY INTENTS
    if (lower.includes('show') || lower.includes('find') || lower.includes('how much') || lower.includes('what is') || lower.includes('dikhao') || lower.includes('chupinchu')) {
      return this.parseQuery(text, lower);
    }

    // 2. DAILY CLOSING
    if (lower.includes('close') && (lower.includes('account') || lower.includes('day') || lower.includes('today'))) {
      return {
        intent: 'DAILY_CLOSING',
        data: {},
        missingFields: [],
        summary: 'Initiate Daily Closing & Cash Reconciliation',
        originalText: text
      };
    }

    // 3. EXPENSE INTENT
    if (lower.includes('expense') || lower.includes('courier') || lower.includes('packaging') || lower.includes('rent') || lower.includes('tea') || lower.includes('travel') || (lower.includes('paid') && !lower.includes('bought') && !lower.includes('purchase'))) {
      return this.parseExpense(text, lower, currentUser);
    }

    // 4. CREDIT INTENT
    if (lower.includes('on credit') || lower.includes('credit lo') || lower.includes('credit against') || lower.includes('credit par') || (lower.includes('credit') && !lower.includes('card'))) {
      return this.parseCredit(text, lower, currentUser);
    }

    // 5. DEBIT INTENT
    if (lower.includes('debit') || (lower.includes('paid') && lower.includes('against previous purchase'))) {
      return this.parseDebit(text, lower, currentUser);
    }

    // 6. PURCHASE INTENT
    if (lower.includes('purchased') || lower.includes('bought') || lower.includes('purchase') || lower.includes('khareeda') || lower.includes('konnanu')) {
      return this.parsePurchase(text, lower, currentUser);
    }

    // 7. STOCK INTENT
    if (lower.includes('add to stock') || lower.includes('stock in') || lower.includes('stock add') || (lower.includes('add') && (lower.includes('stock') || lower.includes('serial') || lower.includes('grade')))) {
      return this.parseStock(text, lower, currentUser);
    }

    // 8. SALE INTENT
    if (lower.includes('sold') || lower.includes('sale') || lower.includes('sell') || lower.includes('becha') || lower.includes('ammanu')) {
      return this.parseSale(text, lower, currentUser);
    }

    // Fallback: If hardware product mentioned
    if (lower.includes('dell') || lower.includes('hp') || lower.includes('lenovo') || lower.includes('thinkpad')) {
      return this.parseSale(text, lower, currentUser);
    }

    return {
      intent: 'UNKNOWN',
      data: {},
      missingFields: [],
      summary: 'Could not clearly understand the command. You can speak naturally or use the quick actions.',
      originalText: text
    };
  }

  private parseQuery(text: string, lower: string): ParsedTransaction {
    if (lower.includes("today's sales") || lower.includes('sales today') || (lower.includes('how much') && lower.includes('sell'))) {
      return { intent: 'QUERY', queryType: 'SALES', data: {}, missingFields: [], summary: "Retrieve today's sales records", originalText: text };
    }
    if (lower.includes('expense')) {
      return { intent: 'QUERY', queryType: 'EXPENSES', data: {}, missingFields: [], summary: 'Retrieve expenses records', originalText: text };
    }
    if (lower.includes('cash')) {
      return { intent: 'QUERY', queryType: 'CASH', data: {}, missingFields: [], summary: 'Calculate total cash collected today', originalText: text };
    }
    if (lower.includes('credit')) {
      return { intent: 'QUERY', queryType: 'CREDIT', data: {}, missingFields: [], summary: 'Show outstanding customer credit', originalText: text };
    }
    if (lower.includes('audit') || lower.includes('alert')) {
      return { intent: 'QUERY', queryType: 'AUDIT', data: {}, missingFields: [], summary: 'Show open audit items & alerts', originalText: text };
    }
    if (lower.includes('serial')) {
      const match = text.match(/serial\s+([A-Za-z0-9\-]+)/i);
      const serial = match ? match[1] : '';
      return { intent: 'QUERY', queryType: 'SEARCH_SERIAL', queryParam: serial, data: { serial }, missingFields: [], summary: `Find stock with serial ${serial}`, originalText: text };
    }
    if (lower.includes('stock') || lower.includes('laptops') || lower.includes('60 days')) {
      return { intent: 'QUERY', queryType: 'STOCK', data: {}, missingFields: [], summary: 'Filter and view stock inventory', originalText: text };
    }
    return { intent: 'QUERY', queryType: 'SALES', data: {}, missingFields: [], summary: 'Searching records...', originalText: text };
  }

  private parseSale(text: string, lower: string, currentUser: User): ParsedTransaction {
    const missing: string[] = [];

    let amount = 0;
    const amountMatch = text.match(/(?:for|rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{4,6})(?:\s*(?:rs|rupees|upi|cash|card))?/i);
    if (amountMatch) {
      amount = Number(amountMatch[1].replace(/,/g, ''));
    }

    let customer = '';
    const custMatch = text.match(/(?:to|customer|party)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (custMatch) {
      customer = custMatch[1].trim();
    } else {
      const customers = db.getCustomers();
      const found = customers.find(c => lower.includes(c.name.toLowerCase()));
      if (found) customer = found.name;
    }

    let product = 'Dell Latitude 5420';
    if (lower.includes('dell 5420') || lower.includes('latitude 5420')) product = 'Dell Latitude 5420';
    else if (lower.includes('dell 5400') || lower.includes('latitude 5400')) product = 'Dell Latitude 5400';
    else if (lower.includes('dell 5430') || lower.includes('latitude 5430')) product = 'Dell Latitude 5430';
    else if (lower.includes('hp 840 g7') || lower.includes('840 g7')) product = 'HP EliteBook 840 G7';
    else if (lower.includes('hp 840 g8') || lower.includes('840 g8')) product = 'HP EliteBook 840 G8';
    else if (lower.includes('t490') || lower.includes('lenovo t490')) product = 'Lenovo ThinkPad T490';
    else if (lower.includes('t14') || lower.includes('lenovo t14')) product = 'Lenovo ThinkPad T14';
    else if (lower.includes('precision 5550') || lower.includes('dell precision')) product = 'Dell Precision 5550';

    let serial = '';
    const serMatch = text.match(/(?:serial|tag|sn|s\/n)\s+([A-Za-z0-9\-]+)/i);
    if (serMatch) {
      serial = serMatch[1].trim().toUpperCase();
    } else {
      const stock = db.getStock().filter(s => s.status === 'READY' && s.model.toLowerCase().includes(product.toLowerCase().replace('dell ', '').replace('hp ', '')));
      if (stock.length > 0) {
        serial = stock[0].serialNumber;
      }
    }

    let paymentMode: PaymentMode = 'UPI';
    if (lower.includes('cash')) paymentMode = 'Cash';
    else if (lower.includes('upi') || lower.includes('phonepe') || lower.includes('gpay') || lower.includes('paytm')) paymentMode = 'UPI';
    else if (lower.includes('card')) paymentMode = 'Card';
    else if (lower.includes('bank') || lower.includes('neft') || lower.includes('rtgs')) paymentMode = 'Bank Transfer';
    else if (lower.includes('credit')) paymentMode = 'Credit';

    if (!amount) missing.push('sellingPrice');
    if (!customer) missing.push('customerName');

    return {
      intent: 'SALE',
      data: {
        productName: product,
        customerName: customer || 'Walk-in Customer',
        sellingPrice: amount || 26500,
        discount: 0,
        paymentMode,
        serialNumber: serial,
        enteredBy: currentUser.name
      },
      missingFields: missing,
      summary: `Sold ${product} to ${customer || 'Customer'} for ₹${amount || 26500} via ${paymentMode}`,
      originalText: text
    };
  }

  private parseStock(text: string, lower: string, currentUser: User): ParsedTransaction {
    let brand = 'Dell';
    if (lower.includes('hp')) brand = 'HP';
    else if (lower.includes('lenovo')) brand = 'Lenovo';

    let model = 'Latitude 5420';
    if (lower.includes('840 g7')) model = 'EliteBook 840 G7';
    else if (lower.includes('840 g8')) model = 'EliteBook 840 G8';
    else if (lower.includes('t490')) model = 'ThinkPad T490';
    else if (lower.includes('t14')) model = 'ThinkPad T14';
    else if (lower.includes('5550')) model = 'Precision 5550';
    else if (lower.includes('5430')) model = 'Latitude 5430';

    let serial = '';
    const serMatch = text.match(/(?:serial|tag|sn)\s+([A-Za-z0-9\-]+)/i);
    if (serMatch) serial = serMatch[1].trim().toUpperCase();
    else serial = `SN-${Math.floor(100000 + Math.random() * 900000)}`;

    let cost = 22000;
    const costMatch = text.match(/(?:cost|for|rs\.?)\s*([0-9]{4,6})/i);
    if (costMatch) cost = Number(costMatch[1]);

    let condition = 'A Grade';
    if (lower.includes('a+')) condition = 'A+ Grade';
    else if (lower.includes('b grade')) condition = 'B Grade';

    return {
      intent: 'STOCK',
      data: {
        brand,
        model,
        serialNumber: serial,
        condition,
        charger: true,
        purchaseCost: cost,
        repairCost: 0,
        transportCost: 300,
        otherCost: 200,
        targetSellingPrice: cost + 4500,
        supplier: 'ABC Computers',
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Add ${brand} ${model} (Serial: ${serial}) with Cost ₹${cost} to Stock`,
      originalText: text
    };
  }

  private parsePurchase(text: string, lower: string, currentUser: User): ParsedTransaction {
    let qty = 1;
    const qtyMatch = text.match(/(?:purchased|bought)\s+([0-9]+|one|two|three|four|five|ten)/i);
    if (qtyMatch) {
      const q = qtyMatch[1].toLowerCase();
      if (q === 'one') qty = 1;
      else if (q === 'two') qty = 2;
      else if (q === 'three') qty = 3;
      else if (q === 'four') qty = 4;
      else if (q === 'five') qty = 5;
      else if (q === 'ten') qty = 10;
      else qty = Number(q) || 1;
    }

    let supplier = 'ABC Computers';
    const supMatch = text.match(/(?:from)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|[0-9]{4,}))/i);
    if (supMatch) supplier = supMatch[1].trim();

    let total = 0;
    const totalMatch = text.match(/(?:for|rs\.?|total)\s*([0-9]{4,7})/i);
    if (totalMatch) total = Number(totalMatch[1]);
    else total = qty * 22000;

    const unitCost = Math.round(total / qty);

    return {
      intent: 'PURCHASE',
      data: {
        supplierName: supplier,
        productName: 'Dell Latitude 5420',
        quantity: qty,
        unitCost,
        totalAmount: total,
        paymentMode: 'Bank Transfer',
        invoiceNumber: `INV-${Math.floor(1000 + Math.random()*9000)}`,
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Purchased ${qty} units from ${supplier} for ₹${total} (Unit: ₹${unitCost})`,
      originalText: text
    };
  }

  private parseExpense(text: string, lower: string, currentUser: User): ParsedTransaction {
    let amount = 0;
    const amtMatch = text.match(/(?:rs\.?|inr|₹)?\s*([0-9]{2,6})(?:\s*(?:rs|rupees|cash|for|courier|transport))/i);
    if (amtMatch) amount = Number(amtMatch[1]);
    else amount = 2500;

    let category = 'Miscellaneous';
    if (lower.includes('courier')) category = 'Courier';
    else if (lower.includes('packaging')) category = 'Packaging';
    else if (lower.includes('transport') || lower.includes('auto')) category = 'Transport';
    else if (lower.includes('repair')) category = 'Repair';
    else if (lower.includes('rent')) category = 'Rent';
    else if (lower.includes('staff') || lower.includes('tea')) category = 'Staff';

    let paymentMode: 'Cash' | 'UPI' = lower.includes('upi') ? 'UPI' : 'Cash';

    return {
      intent: 'EXPENSE',
      data: {
        category,
        description: text,
        amount,
        paymentMode,
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Paid ₹${amount} for ${category} by ${paymentMode}`,
      originalText: text
    };
  }

  private parseCredit(text: string, lower: string, currentUser: User): ParsedTransaction {
    let amount = 5000;
    const amtMatch = text.match(/([0-9]{3,6})/);
    if (amtMatch) amount = Number(amtMatch[1]);

    let party = 'Ramesh';
    const partyMatch = text.match(/([A-Z][a-z]+)/);
    if (partyMatch) party = partyMatch[1];

    return {
      intent: 'CREDIT',
      data: {
        partyName: party,
        amount,
        description: text,
        outstanding: amount,
        status: 'OPEN',
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Recorded ₹${amount} Credit for ${party}`,
      originalText: text
    };
  }

  private parseDebit(text: string, lower: string, currentUser: User): ParsedTransaction {
    let amount = 10000;
    const amtMatch = text.match(/([0-9]{3,7})/);
    if (amtMatch) amount = Number(amtMatch[1]);

    let party = 'ABC Computers';
    if (lower.includes('abc')) party = 'ABC Computers';
    else if (lower.includes('it planet')) party = 'IT Planet CTC';

    return {
      intent: 'DEBIT',
      data: {
        partyName: party,
        amount,
        description: text,
        paymentMode: 'Bank Transfer',
        status: 'PAID',
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Recorded ₹${amount} Debit Payment to ${party}`,
      originalText: text
    };
  }
}

export const sunAI = new SunAIService();

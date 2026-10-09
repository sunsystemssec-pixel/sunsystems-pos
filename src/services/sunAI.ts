import { db } from './db';
import { User, Sale, StockItem, Purchase, Expense, CreditEntry, DebitEntry, PaymentMode } from '../types';
import { voiceTraining, VoiceLanguage } from './voiceTraining';

export interface ParsedTransaction {
  intent: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE' | 'CREDIT' | 'DEBIT' | 'DAILY_CLOSING' | 'QUERY' | 'ACTION_MODAL' | 'UNKNOWN';
  actionType?: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE' | 'DAILY_CLOSING';
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
        this.recognition.lang = voiceTraining.getSelectedLanguage();
      }
    }
  }

  public startListening(
    onResult: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void,
    langCode?: VoiceLanguage | string
  ) {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser. Please use text input or standard mobile Chrome/Safari.');
      return;
    }
    const targetLang = (langCode as VoiceLanguage) || voiceTraining.getSelectedLanguage();
    this.recognition.lang = targetLang;
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

  public speak(text: string, langCode?: VoiceLanguage | string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = langCode || voiceTraining.getSelectedLanguage();
      window.speechSynthesis.speak(utterance);
    }
  }

  public parseCommand(input: string, currentUser: User, langCode?: VoiceLanguage): ParsedTransaction {
    const text = input.trim();
    const lower = text.toLowerCase();
    const activeLang = langCode || voiceTraining.getSelectedLanguage();

    // 0. TRAINED VOICE KEYWORD MATCHING (English, Hindi, Telugu)
    const trainedMatch = voiceTraining.matchAction(text, activeLang);
    if (trainedMatch) {
      if (trainedMatch.action === 'OPEN_SALE') {
        return {
          intent: 'ACTION_MODAL',
          actionType: 'SALE',
          data: {},
          missingFields: [],
          summary: 'Opening New Sales Billing voucher',
          originalText: text
        };
      }
      if (trainedMatch.action === 'OPEN_PURCHASE') {
        return {
          intent: 'ACTION_MODAL',
          actionType: 'PURCHASE',
          data: {},
          missingFields: [],
          summary: 'Opening Purchase Intake voucher',
          originalText: text
        };
      }
      if (trainedMatch.action === 'OPEN_EXPENSE') {
        return {
          intent: 'ACTION_MODAL',
          actionType: 'EXPENSE',
          data: {},
          missingFields: [],
          summary: 'Opening Expense Entry voucher',
          originalText: text
        };
      }
      if (trainedMatch.action === 'VIEW_STOCK') {
        return {
          intent: 'QUERY',
          queryType: 'STOCK',
          data: {},
          missingFields: [],
          summary: 'Viewing Stock Inventory',
          originalText: text
        };
      }
      if (trainedMatch.action === 'VIEW_SALES') {
        return {
          intent: 'QUERY',
          queryType: 'SALES',
          data: {},
          missingFields: [],
          summary: 'Viewing Sales Records',
          originalText: text
        };
      }
      if (trainedMatch.action === 'VIEW_CREDIT') {
        return {
          intent: 'QUERY',
          queryType: 'CREDIT',
          data: {},
          missingFields: [],
          summary: 'Viewing Customer Credit Ledger',
          originalText: text
        };
      }
      if (trainedMatch.action === 'DAILY_CLOSING') {
        return {
          intent: 'DAILY_CLOSING',
          data: {},
          missingFields: [],
          summary: 'Initiate Daily Closing & Cash Reconciliation',
          originalText: text
        };
      }
    }

    // 1. QUERY INTENTS (English, Hindi, Telugu)
    if (
      lower.includes('show') || lower.includes('find') || lower.includes('how much') || lower.includes('what is') ||
      lower.includes('dikhao') || lower.includes('दिखाओ') || lower.includes('ढूंढो') || lower.includes('चेक करो') ||
      lower.includes('chupinchu') || lower.includes('చూపించు') || lower.includes('vethuku') || lower.includes('వెతుకు') || lower.includes('చెక్ చేయ్')
    ) {
      return this.parseQuery(text, lower);
    }

    // 2. DAILY CLOSING
    if (
      (lower.includes('close') && (lower.includes('account') || lower.includes('day') || lower.includes('today'))) ||
      lower.includes('हिसाब बंद') || lower.includes('दिन बंद') || lower.includes('రోజు ముగింపు') || lower.includes('closing')
    ) {
      return {
        intent: 'DAILY_CLOSING',
        data: {},
        missingFields: [],
        summary: 'Initiate Daily Closing & Cash Reconciliation',
        originalText: text
      };
    }

    // 3. EXPENSE INTENT (English, Hindi, Telugu)
    if (
      lower.includes('expense') || lower.includes('courier') || lower.includes('packaging') || lower.includes('rent') || lower.includes('tea') || lower.includes('travel') ||
      lower.includes('खर्चा') || lower.includes('खर्च') || lower.includes('किराया') || lower.includes('चाय') || lower.includes('kharcha') ||
      lower.includes('ఖర్చు') || lower.includes('ఖర్చులు') || lower.includes('టీ') || lower.includes('కిరాయి') || lower.includes('kharchu') ||
      (lower.includes('paid') && !lower.includes('bought') && !lower.includes('purchase'))
    ) {
      return this.parseExpense(text, lower, currentUser);
    }

    // 4. CREDIT INTENT (English, Hindi, Telugu)
    if (
      lower.includes('on credit') || lower.includes('credit lo') || lower.includes('credit against') || lower.includes('credit par') ||
      lower.includes('उधार') || lower.includes('खाता') || lower.includes('बाकी') || lower.includes('udhar') ||
      lower.includes('అప్పు') || lower.includes('బాకీ') || lower.includes('క్రెడిట్') ||
      (lower.includes('credit') && !lower.includes('card'))
    ) {
      return this.parseCredit(text, lower, currentUser);
    }

    // 5. DEBIT INTENT
    if (lower.includes('debit') || (lower.includes('paid') && lower.includes('against previous purchase'))) {
      return this.parseDebit(text, lower, currentUser);
    }

    // 6. PURCHASE INTENT (English, Hindi, Telugu)
    if (
      lower.includes('purchased') || lower.includes('bought') || lower.includes('purchase') ||
      lower.includes('khareeda') || lower.includes('खरीदा') || lower.includes('खरीद') || lower.includes('माल आया') || lower.includes('पर्चेस') ||
      lower.includes('konnanu') || lower.includes('కొన్నాను') || lower.includes('కొనుగోలు') || lower.includes('పర్చేస్') || lower.includes('సరుకు')
    ) {
      return this.parsePurchase(text, lower, currentUser);
    }

    // 7. STOCK INTENT (English, Hindi, Telugu)
    if (
      lower.includes('add to stock') || lower.includes('stock in') || lower.includes('stock add') ||
      lower.includes('स्टॉक') || lower.includes('స్టాక్') ||
      (lower.includes('add') && (lower.includes('stock') || lower.includes('serial') || lower.includes('grade')))
    ) {
      return this.parseStock(text, lower, currentUser);
    }

    // 8. SALE INTENT (English, Hindi, Telugu)
    if (
      lower.includes('sold') || lower.includes('sale') || lower.includes('sell') || lower.includes('bill') ||
      lower.includes('becha') || lower.includes('बेचा') || lower.includes('बिक्री') || lower.includes('सेल') || lower.includes('बिल') ||
      lower.includes('ammanu') || lower.includes('అమ్మాను') || lower.includes('అమ్ము') || lower.includes('అమ్మకం') || lower.includes('సేల్') || lower.includes('బిల్లు')
    ) {
      return this.parseSale(text, lower, currentUser);
    }

    // Fallback: If hardware product mentioned
    if (
      lower.includes('dell') || lower.includes('hp') || lower.includes('lenovo') || lower.includes('thinkpad') ||
      lower.includes('डेल') || lower.includes('లెనోవా') || lower.includes('హెచ్‌పి')
    ) {
      return this.parseSale(text, lower, currentUser);
    }

    return {
      intent: 'UNKNOWN',
      data: {},
      missingFields: [],
      summary: 'Could not clearly understand the command. You can speak in English, Hindi, or Telugu, or train this phrase in Voice Training.',
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

    // Parse Quantity (e.g. "sold 5 keyboards", "10 mouse", "3 dell 5420", "qty 4")
    let qty = 1;
    const qtyMatch = text.match(/(?:sold|sell|sale|becha|ammanu)\s+([0-9]+|one|two|three|four|five|ten|twenty|fifty)\b/i) ||
                     text.match(/\b([0-9]+)\s*(?:nos|pcs|units|pieces|qty|quantity)\b/i);
    if (qtyMatch) {
      const q = qtyMatch[1].toLowerCase();
      if (q === 'one') qty = 1;
      else if (q === 'two') qty = 2;
      else if (q === 'three') qty = 3;
      else if (q === 'four') qty = 4;
      else if (q === 'five') qty = 5;
      else if (q === 'ten') qty = 10;
      else if (q === 'twenty') qty = 20;
      else if (q === 'fifty') qty = 50;
      else qty = Number(q) || 1;
    }

    let amount = 0;
    const amountMatch = text.match(/(?:for|rs\.?|inr|₹)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})/i) ||
                        text.match(/([0-9]{3,7})\s*(?:rs|rupees|inr|₹|cash|upi|card)/i);
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

    // Detect product name
    let product = 'Dell Latitude 5420';
    if (lower.includes('keyboard')) product = 'Dell USB Keyboard';
    else if (lower.includes('mouse')) product = 'Optical USB Mouse';
    else if (lower.includes('ssd') || lower.includes('nvme')) product = '256GB NVMe SSD';
    else if (lower.includes('ram')) product = '8GB DDR4 RAM';
    else if (lower.includes('adapter') || lower.includes('charger')) product = '65W Laptop Adapter';
    else if (lower.includes('monitor')) product = '24-inch IPS Monitor';
    else if (lower.includes('dell 5420') || lower.includes('latitude 5420')) product = 'Dell Latitude 5420';
    else if (lower.includes('dell 5400') || lower.includes('latitude 5400')) product = 'Dell Latitude 5400';
    else if (lower.includes('dell 5430') || lower.includes('latitude 5430')) product = 'Dell Latitude 5430';
    else if (lower.includes('hp 840 g7') || lower.includes('840 g7')) product = 'HP EliteBook 840 G7';
    else if (lower.includes('hp 840 g8') || lower.includes('840 g8')) product = 'HP EliteBook 840 G8';
    else if (lower.includes('t490') || lower.includes('lenovo t490')) product = 'Lenovo ThinkPad T490';
    else if (lower.includes('t14') || lower.includes('lenovo t14')) product = 'Lenovo ThinkPad T14';
    else if (lower.includes('precision 5550') || lower.includes('dell precision')) product = 'Dell Precision 5550';
    else {
      // Extract from custom text if specified
      const prodMatch = text.match(/(?:sold|sell)\s+(?:[0-9]+\s+)?([A-Za-z0-9\s\.\-]+?)(?:\s+(?:for|to|rs|₹))/i);
      if (prodMatch && prodMatch[1].trim().length > 2) {
        product = prodMatch[1].trim();
      }
    }

    // Serial number is completely OPTIONAL
    let serial = '';
    const serMatch = text.match(/(?:serial|tag|sn|s\/n)\s+([A-Za-z0-9\-]+)/i);
    if (serMatch) {
      serial = serMatch[1].trim().toUpperCase();
    }

    let paymentMode: PaymentMode = 'UPI';
    if (lower.includes('cash')) paymentMode = 'Cash';
    else if (lower.includes('upi') || lower.includes('phonepe') || lower.includes('gpay') || lower.includes('paytm')) paymentMode = 'UPI';
    else if (lower.includes('card')) paymentMode = 'Card';
    else if (lower.includes('bank') || lower.includes('neft') || lower.includes('rtgs')) paymentMode = 'Bank Transfer';
    else if (lower.includes('credit')) paymentMode = 'Credit';

    const finalTotal = amount || (qty * 25000);
    const unitPrice = Math.round(finalTotal / qty);

    if (!amount) missing.push('sellingPrice');

    return {
      intent: 'SALE',
      data: {
        productName: product,
        customerName: customer || 'Walk-in Customer',
        quantity: qty,
        unitPrice,
        sellingPrice: finalTotal,
        discount: 0,
        paymentMode,
        serialNumber: serial,
        enteredBy: currentUser.name
      },
      missingFields: missing,
      summary: `Sold ${qty}x ${product} to ${customer || 'Customer'} for ₹${finalTotal} via ${paymentMode}${serial ? ` (SN: ${serial})` : ''}`,
      originalText: text
    };
  }

  private parseStock(text: string, lower: string, currentUser: User): ParsedTransaction {
    let qty = 1;
    const qtyMatch = text.match(/(?:add|stock)\s+([0-9]+|one|two|three|four|five|ten|twenty|fifty)\b/i) ||
                     text.match(/\b([0-9]+)\s*(?:nos|pcs|units|pieces|qty)\b/i);
    if (qtyMatch) {
      const q = qtyMatch[1].toLowerCase();
      if (q === 'one') qty = 1;
      else if (q === 'two') qty = 2;
      else if (q === 'three') qty = 3;
      else if (q === 'four') qty = 4;
      else if (q === 'five') qty = 5;
      else if (q === 'ten') qty = 10;
      else if (q === 'twenty') qty = 20;
      else if (q === 'fifty') qty = 50;
      else qty = Number(q) || 1;
    }

    let brand = 'Dell';
    if (lower.includes('hp')) brand = 'HP';
    else if (lower.includes('lenovo')) brand = 'Lenovo';
    else if (lower.includes('logitech')) brand = 'Logitech';
    else if (lower.includes('kingston')) brand = 'Kingston';

    let model = 'Latitude 5420';
    if (lower.includes('keyboard')) model = 'USB Keyboard';
    else if (lower.includes('mouse')) model = 'USB Mouse';
    else if (lower.includes('ssd')) model = '256GB SSD';
    else if (lower.includes('ram')) model = '8GB DDR4 RAM';
    else if (lower.includes('840 g7')) model = 'EliteBook 840 G7';
    else if (lower.includes('840 g8')) model = 'EliteBook 840 G8';
    else if (lower.includes('t490')) model = 'ThinkPad T490';
    else if (lower.includes('t14')) model = 'ThinkPad T14';
    else if (lower.includes('5550')) model = 'Precision 5550';
    else if (lower.includes('5430')) model = 'Latitude 5430';

    // Serial is OPTIONAL
    let serial = '';
    const serMatch = text.match(/(?:serial|tag|sn)\s+([A-Za-z0-9\-]+)/i);
    if (serMatch) serial = serMatch[1].trim().toUpperCase();

    let cost = 22000;
    const costMatch = text.match(/(?:cost|for|rs\.?|₹)\s*([0-9]{3,7})/i);
    if (costMatch) cost = Number(costMatch[1]);

    let condition = 'A Grade';
    if (lower.includes('new')) condition = 'New';
    else if (lower.includes('a+')) condition = 'A+ Grade';
    else if (lower.includes('b grade')) condition = 'B Grade';

    return {
      intent: 'STOCK',
      data: {
        brand,
        model,
        quantity: qty,
        serialNumber: serial,
        condition,
        charger: true,
        purchaseCost: cost,
        repairCost: 0,
        transportCost: 0,
        otherCost: 0,
        targetSellingPrice: Math.round(cost * 1.25),
        supplier: 'ABC Computers',
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Add ${qty}x ${brand} ${model}${serial ? ` (SN: ${serial})` : ''} at ₹${cost} to Stock`,
      originalText: text
    };
  }

  private parsePurchase(text: string, lower: string, currentUser: User): ParsedTransaction {
    let qty = 1;
    const qtyMatch = text.match(/(?:purchased|bought|purchase|khareeda|konnanu)\s+([0-9]+|one|two|three|four|five|ten|twenty|fifty|hundred)\b/i) ||
                     text.match(/\b([0-9]+)\s*(?:nos|pcs|units|pieces|qty)\b/i);
    if (qtyMatch) {
      const q = qtyMatch[1].toLowerCase();
      if (q === 'one') qty = 1;
      else if (q === 'two') qty = 2;
      else if (q === 'three') qty = 3;
      else if (q === 'four') qty = 4;
      else if (q === 'five') qty = 5;
      else if (q === 'ten') qty = 10;
      else if (q === 'twenty') qty = 20;
      else if (q === 'fifty') qty = 50;
      else if (q === 'hundred') qty = 100;
      else qty = Number(q) || 1;
    }

    let supplier = 'ABC Computers';
    const supMatch = text.match(/(?:from)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|[0-9]{3,}))/i);
    if (supMatch) supplier = supMatch[1].trim();

    let product = 'Dell Latitude 5420';
    if (lower.includes('keyboard')) product = 'USB Keyboard';
    else if (lower.includes('mouse')) product = 'Optical USB Mouse';
    else if (lower.includes('ssd') || lower.includes('nvme')) product = '256GB SSD';
    else if (lower.includes('ram')) product = '8GB DDR4 RAM';
    else if (lower.includes('adapter') || lower.includes('charger')) product = '65W Laptop Adapter';
    else if (lower.includes('dell 5420') || lower.includes('latitude 5420')) product = 'Dell Latitude 5420';
    else if (lower.includes('hp 840 g7') || lower.includes('840 g7')) product = 'HP EliteBook 840 G7';

    // Serial is OPTIONAL
    let serials = '';
    const serMatch = text.match(/(?:serial|tag|sn|s\/n)\s+([A-Za-z0-9\-,\s]+)/i);
    if (serMatch) serials = serMatch[1].trim().toUpperCase();

    let total = 0;
    const totalMatch = text.match(/(?:for|rs\.?|total|₹)\s*([0-9]{3,7})/i);
    if (totalMatch) total = Number(totalMatch[1]);
    else total = qty * 22000;

    const unitCost = Math.round(total / qty);

    let paymentMode: PaymentMode = 'Bank Transfer';
    if (lower.includes('cash')) paymentMode = 'Cash';
    else if (lower.includes('upi')) paymentMode = 'UPI';
    else if (lower.includes('credit')) paymentMode = 'Credit';

    return {
      intent: 'PURCHASE',
      data: {
        supplierName: supplier,
        productName: product,
        quantity: qty,
        unitCost,
        totalAmount: total,
        paymentMode,
        serialNumbers: serials,
        invoiceNumber: `INV-${Math.floor(1000 + Math.random()*9000)}`,
        enteredBy: currentUser.name
      },
      missingFields: [],
      summary: `Purchased ${qty}x ${product} from ${supplier} for ₹${total} (Unit: ₹${unitCost})`,
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

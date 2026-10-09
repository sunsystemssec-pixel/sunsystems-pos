export type VoiceLanguage = 'en-IN' | 'hi-IN' | 'te-IN';

export interface TrainedVoiceKeyword {
  id: string;
  phrase: string;
  language: VoiceLanguage | 'all';
  action: 'OPEN_SALE' | 'OPEN_PURCHASE' | 'OPEN_EXPENSE' | 'VIEW_STOCK' | 'VIEW_SALES' | 'VIEW_CREDIT' | 'DAILY_CLOSING' | 'SEARCH_STOCK';
  targetValue?: string;
  notes?: string;
  isCustom?: boolean;
}

export interface VoiceLanguageOption {
  code: VoiceLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', flag: '🇮🇳 EN' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳 HI' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳 TE' }
];

// Default built-in keyword dictionaries for high-accuracy multilingual triggering
export const DEFAULT_TRAINED_KEYWORDS: TrainedVoiceKeyword[] = [
  // --- SALE / BILLING ACTIONS ---
  // English
  { id: 'def-sale-en-1', phrase: 'new sale', language: 'en-IN', action: 'OPEN_SALE', notes: 'Opens Sales Billing voucher' },
  { id: 'def-sale-en-2', phrase: 'create bill', language: 'en-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-en-3', phrase: 'add sale', language: 'en-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-en-4', phrase: 'make invoice', language: 'en-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-en-5', phrase: 'sale bill', language: 'en-IN', action: 'OPEN_SALE' },
  // Hindi
  { id: 'def-sale-hi-1', phrase: 'नया बिल', language: 'hi-IN', action: 'OPEN_SALE', notes: 'बिक्री बिल बनाता है' },
  { id: 'def-sale-hi-2', phrase: 'बिल बनाओ', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-3', phrase: 'सेल करो', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-4', phrase: 'बिक्री दर्ज करो', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-5', phrase: 'नया सेल', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-6', phrase: 'naya bill', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-7', phrase: 'bill banao', language: 'hi-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-hi-8', phrase: 'sale karo', language: 'hi-IN', action: 'OPEN_SALE' },
  // Telugu
  { id: 'def-sale-te-1', phrase: 'కొత్త బిల్లు', language: 'te-IN', action: 'OPEN_SALE', notes: 'సేల్స్ బిల్ ఓపెన్ చేస్తుంది' },
  { id: 'def-sale-te-2', phrase: 'బిల్లు చేయ్', language: 'te-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-te-3', phrase: 'అమ్మకం రికార్డ్ చేయ్', language: 'te-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-te-4', phrase: 'సేల్ బిల్లు', language: 'te-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-te-5', phrase: 'kottha billu', language: 'te-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-te-6', phrase: 'bill chey', language: 'te-IN', action: 'OPEN_SALE' },
  { id: 'def-sale-te-7', phrase: 'sale chey', language: 'te-IN', action: 'OPEN_SALE' },

  // --- PURCHASE / STOCK ACTIONS ---
  // English
  { id: 'def-pur-en-1', phrase: 'new purchase', language: 'en-IN', action: 'OPEN_PURCHASE', notes: 'Opens Purchase Inward entry' },
  { id: 'def-pur-en-2', phrase: 'add purchase', language: 'en-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-en-3', phrase: 'stock entry', language: 'en-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-en-4', phrase: 'add stock', language: 'en-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-en-5', phrase: 'purchase intake', language: 'en-IN', action: 'OPEN_PURCHASE' },
  // Hindi
  { id: 'def-pur-hi-1', phrase: 'नया खरीद', language: 'hi-IN', action: 'OPEN_PURCHASE', notes: 'परचेस एंट्री खोलता है' },
  { id: 'def-pur-hi-2', phrase: 'खरीद दर्ज करो', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-3', phrase: 'स्टॉक जोड़ो', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-4', phrase: 'माल आया', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-5', phrase: 'पर्चेस एंट्री', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-6', phrase: 'kharid darj karo', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-7', phrase: 'purchase record karo', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-hi-8', phrase: 'maal aaya', language: 'hi-IN', action: 'OPEN_PURCHASE' },
  // Telugu
  { id: 'def-pur-te-1', phrase: 'కొత్త పర్చేస్', language: 'te-IN', action: 'OPEN_PURCHASE', notes: 'కొనుగోలు ఎంట్రీ ఓపెన్ చేస్తుంది' },
  { id: 'def-pur-te-2', phrase: 'కొనుగోలు ఎంట్రీ', language: 'te-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-te-3', phrase: 'స్టాక్ వచ్చింది', language: 'te-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-te-4', phrase: 'కొత్త స్టాక్ చేర్చు', language: 'te-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-te-5', phrase: 'saruku vachindi', language: 'te-IN', action: 'OPEN_PURCHASE' },
  { id: 'def-pur-te-6', phrase: 'purchase add chey', language: 'te-IN', action: 'OPEN_PURCHASE' },

  // --- EXPENSE ACTIONS ---
  // English
  { id: 'def-exp-en-1', phrase: 'add expense', language: 'en-IN', action: 'OPEN_EXPENSE', notes: 'Opens Expense voucher' },
  { id: 'def-exp-en-2', phrase: 'record expense', language: 'en-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-en-3', phrase: 'new expense', language: 'en-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-en-4', phrase: 'petty cash', language: 'en-IN', action: 'OPEN_EXPENSE' },
  // Hindi
  { id: 'def-exp-hi-1', phrase: 'नया खर्चा', language: 'hi-IN', action: 'OPEN_EXPENSE', notes: 'खर्चा वाउचर खोलता है' },
  { id: 'def-exp-hi-2', phrase: 'खर्चा लिखो', language: 'hi-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-hi-3', phrase: 'खर्च दर्ज करो', language: 'hi-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-hi-4', phrase: 'kharcha likho', language: 'hi-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-hi-5', phrase: 'kharcha add karo', language: 'hi-IN', action: 'OPEN_EXPENSE' },
  // Telugu
  { id: 'def-exp-te-1', phrase: 'కొత్త ఖర్చు', language: 'te-IN', action: 'OPEN_EXPENSE', notes: 'ఖర్చుల వోచర్ ఓపెన్ చేస్తుంది' },
  { id: 'def-exp-te-2', phrase: 'ఖర్చు రికార్డ్ చేయ్', language: 'te-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-te-3', phrase: 'ఖర్చుల ఎంట్రీ', language: 'te-IN', action: 'OPEN_EXPENSE' },
  { id: 'def-exp-te-4', phrase: 'kharchu add chey', language: 'te-IN', action: 'OPEN_EXPENSE' },

  // --- SEARCH & VIEW ACTIONS ---
  // View Stock
  { id: 'def-view-stk-en', phrase: 'show stock', language: 'en-IN', action: 'VIEW_STOCK' },
  { id: 'def-view-stk-hi', phrase: 'स्टॉक दिखाओ', language: 'hi-IN', action: 'VIEW_STOCK' },
  { id: 'def-view-stk-te', phrase: 'స్టాక్ చూపించు', language: 'te-IN', action: 'VIEW_STOCK' },
  // View Sales
  { id: 'def-view-sal-en', phrase: 'show sales', language: 'en-IN', action: 'VIEW_SALES' },
  { id: 'def-view-sal-hi', phrase: 'बिक्री दिखाओ', language: 'hi-IN', action: 'VIEW_SALES' },
  { id: 'def-view-sal-te', phrase: 'సేల్స్ చూపించు', language: 'te-IN', action: 'VIEW_SALES' },
  // View Credit
  { id: 'def-view-crd-en', phrase: 'show credit', language: 'en-IN', action: 'VIEW_CREDIT' },
  { id: 'def-view-crd-hi', phrase: 'खाता दिखाओ', language: 'hi-IN', action: 'VIEW_CREDIT' },
  { id: 'def-view-crd-te', phrase: 'బాకీ చూపించు', language: 'te-IN', action: 'VIEW_CREDIT' },
  // Daily Closing
  { id: 'def-close-en', phrase: 'daily closing', language: 'en-IN', action: 'DAILY_CLOSING' },
  { id: 'def-close-hi', phrase: 'हिसाब बंद', language: 'hi-IN', action: 'DAILY_CLOSING' },
  { id: 'def-close-te', phrase: 'రోజు ముగింపు', language: 'te-IN', action: 'DAILY_CLOSING' }
];

class VoiceTrainingService {
  private customKeywords: TrainedVoiceKeyword[] = [];
  private selectedLanguage: VoiceLanguage = 'en-IN';

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;
    try {
      const savedLang = localStorage.getItem('sun_voice_selected_lang') as VoiceLanguage;
      if (savedLang && ['en-IN', 'hi-IN', 'te-IN'].includes(savedLang)) {
        this.selectedLanguage = savedLang;
      }
      const savedCustom = localStorage.getItem('sun_voice_custom_keywords');
      if (savedCustom) {
        this.customKeywords = JSON.parse(savedCustom);
      }
    } catch (e) {
      console.warn('Error loading voice training state:', e);
    }
  }

  private saveCustomKeywords() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('sun_voice_custom_keywords', JSON.stringify(this.customKeywords));
    } catch (e) {
      console.warn('Error saving custom voice keywords:', e);
    }
  }

  public getSelectedLanguage(): VoiceLanguage {
    return this.selectedLanguage;
  }

  public setSelectedLanguage(lang: VoiceLanguage) {
    this.selectedLanguage = lang;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sun_voice_selected_lang', lang);
      } catch (e) {}
    }
  }

  public getAllKeywords(): TrainedVoiceKeyword[] {
    return [...this.customKeywords, ...DEFAULT_TRAINED_KEYWORDS];
  }

  public getCustomKeywords(): TrainedVoiceKeyword[] {
    return this.customKeywords;
  }

  public addCustomKeyword(phrase: string, action: TrainedVoiceKeyword['action'], language: VoiceLanguage | 'all' = 'all', targetValue?: string, notes?: string): TrainedVoiceKeyword {
    const trimmedPhrase = phrase.trim().toLowerCase();
    if (!trimmedPhrase) throw new Error('Keyword phrase cannot be empty');

    const newKw: TrainedVoiceKeyword = {
      id: `custom-voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phrase: trimmedPhrase,
      language,
      action,
      targetValue: targetValue?.trim(),
      notes: notes?.trim() || `Custom voice training trigger for ${action}`,
      isCustom: true
    };

    this.customKeywords.unshift(newKw);
    this.saveCustomKeywords();
    return newKw;
  }

  public removeCustomKeyword(id: string) {
    this.customKeywords = this.customKeywords.filter(k => k.id !== id);
    this.saveCustomKeywords();
  }

  public resetToDefaults() {
    this.customKeywords = [];
    this.saveCustomKeywords();
  }

  /**
   * Matches speech transcript against trained keywords in English, Hindi, and Telugu.
   * Returns matched action and keyword if confidence match found.
   */
  public matchAction(transcript: string, currentLang?: VoiceLanguage): { action: TrainedVoiceKeyword['action']; matchedKeyword: TrainedVoiceKeyword; targetValue?: string } | null {
    if (!transcript) return null;
    const clean = transcript.trim().toLowerCase();
    const lang = currentLang || this.selectedLanguage;
    const all = this.getAllKeywords();

    // 1. Exact match priority
    for (const kw of all) {
      if (kw.language !== 'all' && kw.language !== lang) continue;
      if (clean === kw.phrase.toLowerCase()) {
        return { action: kw.action, matchedKeyword: kw, targetValue: kw.targetValue };
      }
    }

    // 2. Phrase contains match
    for (const kw of all) {
      if (kw.language !== 'all' && kw.language !== lang) continue;
      if (clean.includes(kw.phrase.toLowerCase())) {
        return { action: kw.action, matchedKeyword: kw, targetValue: kw.targetValue };
      }
    }

    // 3. Multi-language fuzzy / cross-language keyword matching
    for (const kw of all) {
      if (clean.includes(kw.phrase.toLowerCase())) {
        return { action: kw.action, matchedKeyword: kw, targetValue: kw.targetValue };
      }
    }

    return null;
  }

  /**
   * Converts vernacular numbers (Hindi / Telugu words) to numbers
   */
  public parseVernacularNumbers(text: string): number | null {
    const lower = text.toLowerCase();
    // Hindi numbers
    if (lower.includes('एक') || lower.includes('ek')) return 1;
    if (lower.includes('दो') || lower.includes('do')) return 2;
    if (lower.includes('तीन') || lower.includes('teen')) return 3;
    if (lower.includes('चार') || lower.includes('char')) return 4;
    if (lower.includes('पाँच') || lower.includes('पांच') || lower.includes('paanch')) return 5;
    if (lower.includes('दस') || lower.includes('dus')) return 10;
    if (lower.includes('बीस') || lower.includes('bees')) return 20;
    if (lower.includes('पचास') || lower.includes('pachaas')) return 50;
    if (lower.includes('सौ') || lower.includes('sau')) return 100;

    // Telugu numbers
    if (lower.includes('ఒకటి') || lower.includes('okati') || lower.includes('okadu')) return 1;
    if (lower.includes('రెండు') || lower.includes('rendu')) return 2;
    if (lower.includes('మూడు') || lower.includes('moodu')) return 3;
    if (lower.includes('నాలుగు') || lower.includes('naalugu')) return 4;
    if (lower.includes('ఐదు') || lower.includes('aidu')) return 5;
    if (lower.includes('పది') || lower.includes('padi')) return 10;
    if (lower.includes('ఇరవై') || lower.includes('iravai')) return 20;
    if (lower.includes('యాభై') || lower.includes('yabhai')) return 50;
    if (lower.includes('వంద') || lower.includes('vanda')) return 100;

    return null;
  }
}

export const voiceTraining = new VoiceTrainingService();

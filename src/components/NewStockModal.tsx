import React, { useState, useMemo } from 'react';
import { User, PaymentMode, StockItem } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { voiceTraining } from '../services/voiceTraining';
import { X, Plus, Minus, Check, PackagePlus, Cpu, HardDrive, Monitor, CheckCircle2, Building2, Store, Trash2, Mic, MicOff, Sparkles } from 'lucide-react';

interface NewStockModalProps {
  currentUser: User;
  initialMode?: 'STOCK' | 'PURCHASE';
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Laptops',
  'Desktops',
  'RAM / Memory',
  'SSD / Storage',
  'Peripherals (Keyboards/Mice)',
  'Chargers & Adapters',
  'Cables & Accessories',
  'Other'
];

const CPU_PRESETS = [
  'i5 11th Gen',
  'i5 10th Gen',
  'i5 8th Gen',
  'i7 11th Gen',
  'i7 10th Gen',
  'i7 8th Gen',
  'Ryzen 5',
  'Ryzen 7'
];

const RAM_PRESETS = ['8GB DDR4', '16GB DDR4', '32GB DDR4', '16GB DDR5', '4GB'];
const STORAGE_PRESETS = ['256GB NVMe', '512GB NVMe', '1TB NVMe', '128GB SSD', '500GB HDD'];
const DISPLAY_PRESETS = ['14.0" FHD', '15.6" FHD', '13.3" FHD', '14.0" Touch', 'Desktop'];

export const NewStockModal: React.FC<NewStockModalProps> = ({
  currentUser,
  initialMode = 'STOCK',
  onClose,
  onSuccess
}) => {
  const stockList = useMemo(() => db.getStock().filter(s => s.status !== 'SCRAP' && s.status !== 'RETURNED'), []);
  const allParties = useMemo(() => db.getAllParties(), []);

  const [entryType, setEntryType] = useState<'STOCK' | 'PURCHASE'>(initialMode);
  const [category, setCategory] = useState('Laptops');
  const [brand, setBrand] = useState('Dell');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [targetSellingPrice, setTargetSellingPrice] = useState<number | ''>('');
  const [serialNumber, setSerialNumber] = useState('');
  const [serviceTag, setServiceTag] = useState('');

  // Hardware Configuration Specs
  const [cpu, setCpu] = useState('i5 11th Gen');
  const [ram, setRam] = useState('16GB DDR4');
  const [storage, setStorage] = useState('512GB NVMe');
  const [display, setDisplay] = useState('14.0" FHD');
  const [gpu, setGpu] = useState('Intel Iris Xe');
  const [charger, setCharger] = useState(true);
  const [condition, setCondition] = useState('A Grade');

  // Multi-item purchase batch state
  interface BatchPurchaseItem {
    id: string;
    category: string;
    brand: string;
    model: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    targetSellingPrice?: number;
    serialNumber?: string;
    serviceTag?: string;
    cpu?: string;
    ram?: string;
    storage?: string;
    display?: string;
    gpu?: string;
    charger?: boolean;
    condition: string;
  }
  const [purchaseBatchItems, setPurchaseBatchItems] = useState<BatchPurchaseItem[]>([]);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');

  // Supplier / Party
  const [supplier, setSupplier] = useState(() => (allParties.length > 0 ? allParties[0] : 'ABC Computers'));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleVoicePurchase = () => {
    if (isListening) {
      sunAI.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setErrorMessage(null);

    sunAI.startListening(
      (transcript) => {
        setIsListening(false);
        const text = transcript.trim();
        const lower = text.toLowerCase();

        // 1. Brand
        if (lower.includes('hp') || lower.includes('एचपी') || lower.includes('హెచ్‌పి')) setBrand('HP');
        else if (lower.includes('lenovo') || lower.includes('लेनोवो') || lower.includes('లెనోవా')) setBrand('Lenovo');
        else if (lower.includes('dell') || lower.includes('डेल') || lower.includes('డెల్')) setBrand('Dell');
        else if (lower.includes('apple') || lower.includes('macbook')) setBrand('Apple');

        // 2. Model & Category
        if (lower.includes('desktop') || lower.includes('डेस्कटॉप') || lower.includes('డెస్క్‌టాప్')) {
          setCategory('Desktops');
        } else if (lower.includes('ram') || lower.includes('memory')) {
          setCategory('RAM / Memory');
        } else if (lower.includes('ssd') || lower.includes('nvme')) {
          setCategory('SSD / Storage');
        } else if (lower.includes('keyboard') || lower.includes('mouse')) {
          setCategory('Peripherals (Keyboards/Mice)');
        }

        // Specific models
        if (lower.includes('5420')) setModel('Latitude 5420');
        else if (lower.includes('5400')) setModel('Latitude 5400');
        else if (lower.includes('5430')) setModel('Latitude 5430');
        else if (lower.includes('840 g7') || lower.includes('840g7')) setModel('EliteBook 840 G7');
        else if (lower.includes('840 g8') || lower.includes('840g8')) setModel('EliteBook 840 G8');
        else if (lower.includes('t490')) setModel('ThinkPad T490');
        else if (lower.includes('t14')) setModel('ThinkPad T14');
        else if (!model) {
          const words = text.split(/\s+/);
          if (words.length >= 2) setModel(words.slice(1, 4).join(' '));
        }

        // 3. Quantity
        let q = 1;
        const qMatch = text.match(/(?:quantity|qty|units|pieces|nos)\s*([0-9]+)/i) ||
                      text.match(/([0-9]+)\s*(?:units|pieces|nos|qty|quantity|laptops|desktops)/i);
        if (qMatch) {
          q = Number(qMatch[1]) || 1;
        } else {
          const vNum = voiceTraining.parseVernacularNumbers(text);
          if (vNum && vNum < 50) q = vNum;
        }
        if (q > 0) setQuantity(q);

        // 4. Cost / Price
        let cost = 0;
        const costMatch = text.match(/(?:cost|rate|for|price|rs\.?|inr|₹)\s*([0-9]{3,7})/i) ||
                          text.match(/([0-9]{4,7})/);
        if (costMatch) {
          cost = Number(costMatch[1]);
        }
        if (cost > 0) {
          setUnitCost(cost);
          setTargetSellingPrice(Math.round(cost * 1.25));
        }

        // 5. Supplier
        const supMatch = text.match(/(?:from|supplier|party)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|cost|price|[0-9]{3,}))/i);
        if (supMatch && supMatch[1].trim()) {
          setSupplier(supMatch[1].trim());
        }

        sunAI.speak(`Understood entry for ${q} units`);
      },
      (err) => {
        setIsListening(false);
        console.warn('Purchase voice error:', err);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const numUnitCost = Number(unitCost) || 0;
  const totalCost = quantity * numUnitCost;

  const handleUnitCostChange = (val: number | '') => {
    setUnitCost(val);
    if (val !== '' && Number(val) > 0) {
      setTargetSellingPrice(Math.round(Number(val) * 1.25));
    }
  };

  const isLaptop = category === 'Laptops';
  const isDesktop = category === 'Desktops';
  const isLaptopOrDesktop = isLaptop || isDesktop;

  // Handle category switching with correct defaults
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat === 'Laptops') {
      setDisplay('14.0" FHD');
      setCharger(true);
      if (!cpu) setCpu('i5 11th Gen');
      if (!ram) setRam('16GB DDR4');
      if (!storage) setStorage('512GB NVMe');
    } else if (newCat === 'Desktops') {
      // Desktops: No screen size, no adapter/charger by default
      setDisplay('');
      setCharger(false);
      if (!cpu) setCpu('i5 10th Gen');
      if (!ram) setRam('16GB DDR4');
      if (!storage) setStorage('512GB NVMe');
    } else {
      // Accessories, RAM, Storage, etc: No screen size, no charger, no CPU/RAM
      setDisplay('');
      setCharger(false);
      setCpu('');
      setRam('');
      setStorage('');
      setGpu('');
    }
  };

  // Items matching selected category to quickly pick from
  const existingCategoryItems = useMemo(() => {
    return stockList.filter(s => {
      const matchCat = !category || s.category?.toLowerCase() === category.toLowerCase();
      return matchCat;
    });
  }, [stockList, category]);

  // Check if current input matches an existing stock item
  const matchedStockItem = useMemo(() => {
    if (!model.trim()) return null;
    const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const b = norm(brand);
    const m = norm(model);
    const c = norm(category);
    const cpuN = norm(cpu);
    const ramN = norm(ram);
    const storN = norm(storage);
    const condN = norm(condition);

    return stockList.find(s => {
      if (norm(s.brand) !== b || norm(s.model) !== m) return false;
      if (c && s.category && norm(s.category) !== c) return false;
      if (isLaptopOrDesktop) {
        if (cpuN && s.cpu && norm(s.cpu) !== cpuN) return false;
        if (ramN && s.ram && norm(s.ram) !== ramN) return false;
        if (storN && s.storage && norm(s.storage) !== storN) return false;
        if (condN && s.condition && norm(s.condition) !== condN) return false;
      }
      return true;
    }) || null;
  }, [stockList, brand, model, category, cpu, ram, storage, condition, isLaptopOrDesktop]);

  // Check if current supplier exists
  const isExistingParty = useMemo(() => {
    const s = supplier.trim().toLowerCase();
    return allParties.some(p => p.toLowerCase() === s);
  }, [allParties, supplier]);

  const handleSelectExistingItem = (item: StockItem) => {
    if (item.category) handleCategoryChange(item.category);
    setBrand(item.brand);
    setModel(item.model);
    if (item.cpu) setCpu(item.cpu);
    if (item.ram) setRam(item.ram);
    if (item.storage) setStorage(item.storage);
    if (item.display) setDisplay(item.display);
    if (item.gpu) setGpu(item.gpu);
    if (item.condition) setCondition(item.condition);
    if (item.charger !== undefined) setCharger(item.charger);
    if (item.purchaseCost) setUnitCost(item.purchaseCost);
    if (item.targetSellingPrice) setTargetSellingPrice(item.targetSellingPrice);
  };

  const handleAddAnotherItem = () => {
    setErrorMessage(null);
    const fullProductName = model.trim() || `${brand} ${category}`;
    if (!fullProductName.trim()) {
      setErrorMessage('Please specify the product model or description before adding another item.');
      return;
    }
    if (numUnitCost <= 0) {
      setErrorMessage('Please enter the purchase unit cost.');
      return;
    }

    const newItem: BatchPurchaseItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category,
      brand: brand.trim(),
      model: fullProductName.trim(),
      quantity,
      unitCost: numUnitCost,
      totalCost,
      targetSellingPrice: Number(targetSellingPrice) || Math.round(numUnitCost * 1.25),
      serialNumber: serialNumber.trim(),
      serviceTag: serviceTag.trim(),
      cpu: isLaptopOrDesktop ? cpu.trim() : '',
      ram: isLaptopOrDesktop ? ram.trim() : '',
      storage: isLaptopOrDesktop ? storage.trim() : '',
      display: isLaptop ? display.trim() : '',
      gpu: isLaptopOrDesktop ? gpu.trim() : '',
      charger: isLaptop ? charger : false,
      condition
    };

    setPurchaseBatchItems(prev => [...prev, newItem]);

    // Reset current item inputs for next item
    setModel('');
    setQuantity(1);
    setUnitCost('');
    setTargetSellingPrice('');
    setSerialNumber('');
    setServiceTag('');
    sunAI.speak(`Added ${newItem.brand} ${newItem.model}. You can now enter another item.`);
  };

  const handleRemoveFromBatch = (id: string) => {
    setPurchaseBatchItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSupplier = supplier.trim() || 'Vendor';

    // If in purchase mode with batch items, submit the entire batch
    if (entryType === 'PURCHASE' && purchaseBatchItems.length > 0) {
      // If current item form also has valid inputs, include it in the batch
      let finalItems = [...purchaseBatchItems];
      const fullProductName = model.trim();
      if (fullProductName && numUnitCost > 0) {
        finalItems.push({
          id: `batch-${Date.now()}`,
          category,
          brand: brand.trim(),
          model: fullProductName,
          quantity,
          unitCost: numUnitCost,
          totalCost,
          targetSellingPrice: Number(targetSellingPrice) || Math.round(numUnitCost * 1.25),
          serialNumber: serialNumber.trim(),
          serviceTag: serviceTag.trim(),
          cpu: isLaptopOrDesktop ? cpu.trim() : '',
          ram: isLaptopOrDesktop ? ram.trim() : '',
          storage: isLaptopOrDesktop ? storage.trim() : '',
          display: isLaptop ? display.trim() : '',
          gpu: isLaptopOrDesktop ? gpu.trim() : '',
          charger: isLaptop ? charger : false,
          condition
        });
      }

      const totalBatchUnits = finalItems.reduce((s, i) => s + i.quantity, 0);
      const totalBatchCost = finalItems.reduce((s, i) => s + i.totalCost, 0);

      try {
        db.addPurchase({
          supplierName: cleanSupplier,
          supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
          productName: `${finalItems.length} Items Batch (${cleanSupplier})`,
          brand: finalItems[0]?.brand || 'Multiple',
          model: `${finalItems.length} Products`,
          category: 'Multiple',
          quantity: totalBatchUnits,
          unitCost: totalBatchUnits > 0 ? Math.round(totalBatchCost / totalBatchUnits) : 0,
          totalAmount: totalBatchCost,
          paymentMode,
          invoiceNumber: supplierInvoiceNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
          notes: notes.trim(),
          items: finalItems.map(b => ({
            brand: b.brand,
            model: b.model,
            category: b.category,
            quantity: b.quantity,
            unitCost: b.unitCost,
            totalAmount: b.totalCost,
            serialNumber: b.serialNumber,
            serviceTag: b.serviceTag,
            cpu: b.cpu,
            ram: b.ram,
            storage: b.storage,
            display: b.display,
            gpu: b.gpu,
            charger: b.charger,
            condition: b.condition,
            targetSellingPrice: b.targetSellingPrice
          }))
        }, currentUser);

        sunAI.speak(`Recorded purchase invoice of ${finalItems.length} items totaling ₹${totalBatchCost} from ${cleanSupplier}. All items added to stock.`);
        onSuccess();
        return;
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to save batch purchase.');
        return;
      }
    }

    // Single item handling
    const fullProductName = model.trim() || `${brand} ${category}`;

    if (!fullProductName.trim()) {
      setErrorMessage('Please specify the product model or description.');
      return;
    }

    if (numUnitCost <= 0) {
      setErrorMessage('Please enter the purchase unit cost.');
      return;
    }

    try {
      if (entryType === 'PURCHASE') {
        db.addPurchase({
          supplierName: cleanSupplier,
          supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
          productName: `${brand} ${fullProductName}`.trim(),
          brand: brand.trim(),
          model: fullProductName.trim(),
          category,
          quantity,
          unitCost: numUnitCost,
          totalAmount: totalCost,
          paymentMode,
          serialNumbers: serialNumber.trim(),
          serviceTag: serviceTag.trim(),
          cpu: isLaptopOrDesktop ? cpu.trim() : '',
          ram: isLaptopOrDesktop ? ram.trim() : '',
          storage: isLaptopOrDesktop ? storage.trim() : '',
          display: isLaptop ? display.trim() : '',
          gpu: isLaptopOrDesktop ? gpu.trim() : '',
          charger: isLaptop ? charger : false,
          condition,
          invoiceNumber: supplierInvoiceNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
          notes: notes.trim()
        }, currentUser);

        if (matchedStockItem) {
          const newTot = (matchedStockItem.availableQuantity || 0) + quantity;
          sunAI.speak(`Added ${quantity} units to existing stock for ${fullProductName}. New stock is ${newTot} units.`);
        } else {
          sunAI.speak(`Purchase of ${quantity} ${fullProductName} recorded from ${cleanSupplier}.`);
        }
      } else {
        const added = db.addStock({
          brand: brand.trim(),
          model: fullProductName.trim(),
          category,
          quantity,
          availableQuantity: quantity,
          serialNumber: serialNumber.trim(),
          serviceTag: serviceTag.trim(),
          cpu: isLaptopOrDesktop ? cpu.trim() : '',
          ram: isLaptopOrDesktop ? ram.trim() : '',
          storage: isLaptopOrDesktop ? storage.trim() : '',
          display: isLaptop ? display.trim() : '',
          gpu: isLaptopOrDesktop ? gpu.trim() : '',
          charger: isLaptop ? charger : false,
          condition,
          purchaseCost: numUnitCost,
          repairCost: 0,
          transportCost: 0,
          otherCost: 0,
          targetSellingPrice: Number(targetSellingPrice) || Math.round(numUnitCost * 1.25),
          supplier: cleanSupplier,
          status: 'READY',
          enteredBy: currentUser.name,
          notes: notes.trim()
        }, currentUser);

        if (matchedStockItem) {
          sunAI.speak(`Added ${quantity} units to existing stock for ${fullProductName}. Total is ${added.availableQuantity} units.`);
        } else {
          sunAI.speak(`Added ${quantity} units of ${fullProductName} to inventory.`);
        }
      }

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save inventory entry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                {entryType === 'PURCHASE' ? 'RECORD VENDOR PURCHASE' : 'ADD STOCK INVENTORY'}
              </h3>
              <p className="text-[11px] text-slate-400">Complete Hardware Specifications & Intake</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Mode: Stock In vs Vendor Purchase */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setEntryType('STOCK')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
              entryType === 'STOCK'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stock In (Ready)
          </button>
          <button
            type="button"
            onClick={() => setEntryType('PURCHASE')}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
              entryType === 'PURCHASE'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vendor Purchase (Auto-Stock)
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Voice Dictate Entry Assistant */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Voice Dictate Entry</span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                {isListening ? 'Listening... Speak brand, model, qty & cost' : 'Speak in EN, हिन्दी, or తెలుగు (e.g. "5 Dell 5420 cost 22000")'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleVoicePurchase}
              className={`font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isListening ? 'Stop' : 'Speak'}</span>
            </button>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quick Picker for Existing Stock Items in this Category */}
          {existingCategoryItems.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                  <PackagePlus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Existing {category} in Stock:</span>
                </span>
                <span className="text-[10px] text-slate-500">Tap to auto-fill & restock</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {existingCategoryItems.slice(0, 8).map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleSelectExistingItem(item)}
                    className={`shrink-0 text-left px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                      matchedStockItem?.id === item.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-[11px] leading-tight truncate max-w-[130px]">
                      {item.brand} {item.model}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <span>Stock: <strong className="text-emerald-400">{item.availableQuantity ?? item.quantity ?? 1}</strong></span>
                      {item.purchaseCost ? <span>• ₹{item.purchaseCost}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brand & Model */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dell, HP"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Model / Item Description *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Latitude 5420, EliteBook 840 G7"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Restock Notification Banner if Match Found */}
          {matchedStockItem && (
            <div className="bg-emerald-950/70 border border-emerald-600/70 rounded-2xl p-3 flex items-start space-x-2.5 text-xs text-emerald-200 animate-fadeIn shadow-lg shadow-emerald-950/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-emerald-300 uppercase tracking-wide">
                    Matching Item Found in Stock!
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 uppercase">
                    Quantity Will Be Added
                  </span>
                </div>
                <p className="text-[11px] text-slate-200">
                  <strong>{matchedStockItem.brand} {matchedStockItem.model}</strong> already exists in inventory. This entry will increase its stock without creating a duplicate record.
                </p>
                <div className="flex items-center space-x-3 text-[11px] font-medium pt-0.5">
                  <span className="text-slate-300">
                    Current: <strong className="text-white font-bold">{matchedStockItem.availableQuantity || 0} units</strong>
                  </span>
                  <span className="text-slate-400">+</span>
                  <span className="text-emerald-300">
                    Adding: <strong className="font-bold">+{quantity} units</strong>
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="text-emerald-400">
                    New Total: <strong className="font-black text-sm">{(matchedStockItem.availableQuantity || 0) + quantity} units</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* HARDWARE CONFIGURATION SECTION (CRITICAL FOR LAPTOPS/DESKTOPS) */}
          {isLaptopOrDesktop && (
            <div className="bg-slate-950/80 border border-sky-900/40 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center space-x-1.5 text-sky-400 font-bold text-xs">
                <Cpu className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">Hardware Configuration</span>
              </div>

              {/* Processor / CPU */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Processor / CPU
                </label>
                <input
                  type="text"
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  placeholder="e.g. i5 11th Gen, i7 8th Gen"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {CPU_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setCpu(p)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                        cpu === p
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* RAM & Storage */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    RAM Memory
                  </label>
                  <input
                    type="text"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="16GB DDR4"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {RAM_PRESETS.slice(0, 3).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRam(r)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          ram === r
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {r.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Storage / SSD
                  </label>
                  <input
                    type="text"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    placeholder="512GB NVMe"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {STORAGE_PRESETS.slice(0, 3).map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setStorage(s)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          storage === s
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {s.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display & GPU */}
              {isLaptop ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Screen Display
                    </label>
                    <input
                      type="text"
                      value={display}
                      onChange={(e) => setDisplay(e.target.value)}
                      placeholder='14.0" FHD'
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Graphics / GPU
                    </label>
                    <input
                      type="text"
                      value={gpu}
                      onChange={(e) => setGpu(e.target.value)}
                      placeholder="Intel Iris / Dedicated"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Graphics / GPU (Optional)
                  </label>
                  <input
                    type="text"
                    value={gpu}
                    onChange={(e) => setGpu(e.target.value)}
                    placeholder="e.g. Integrated / Nvidia GTX 1650"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Charger & Service Tag */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                {isLaptop ? (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={charger}
                      onChange={(e) => setCharger(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                    />
                    <span className="text-xs text-slate-300 font-medium">Original Charger Included</span>
                  </label>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Desktop System Unit (No Adapter Required)</span>
                )}
                <div className="w-36">
                  <input
                    type="text"
                    value={serviceTag}
                    onChange={(e) => setServiceTag(e.target.value)}
                    placeholder="Service Tag / S/N"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-100 focus:outline-none uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quantity Controls */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-200">
                  {entryType === 'PURCHASE' ? 'Purchase Quantity' : 'Stock Intake Quantity'}
                </label>
                <span className="text-[11px] text-slate-400">Number of units received</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-black text-base text-sky-400">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Quantity Presets */}
            <div className="flex gap-1.5 pt-1">
              {[1, 2, 5, 10, 20, 50].map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 text-xs py-1 rounded-lg font-bold transition-colors ${
                    quantity === q
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Cost & Target Selling Price */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unit Cost (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={unitCost}
                onChange={(e) => handleUnitCostChange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="₹ Per unit"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={targetSellingPrice}
                onChange={(e) => setTargetSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="₹ Per unit"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Total Cost Summary Banner */}
          <div className="bg-gradient-to-r from-sky-950/60 to-slate-950 border border-sky-800/60 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-xs text-sky-300 font-semibold">
              Total Purchase Cost ({quantity} × ₹{numUnitCost.toLocaleString('en-IN')})
            </span>
            <span className="text-base font-black text-sky-400">
              ₹{totalCost.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Serial Number (OPTIONAL) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Serial Number(s)
              </label>
              <span className="text-[10px] text-amber-400/80 font-medium">
                (Optional — leave blank for accessories/bulk)
              </span>
            </div>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. 8CG0290XYZ or comma-separated"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 uppercase"
            />
          </div>

          {/* Supplier / Party / Dealer Selection */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Party / Dealer *
                </label>
                {isExistingParty ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Existing</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">
                    + New Party
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                list="parties-datalist"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Select or enter party name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <datalist id="parties-datalist">
                {allParties.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {/* Quick Party Selector Pills */}
              {allParties.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto pr-0.5">
                  {allParties.slice(0, 6).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setSupplier(p)}
                      className={`text-[9px] px-2 py-0.5 rounded-lg border transition-all truncate max-w-[120px] ${
                        supplier === p
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="New">Brand New</option>
                <option value="A+ Grade">A+ Grade (Like New)</option>
                <option value="A Grade">A Grade</option>
                <option value="B Grade">B Grade</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          {/* Supplier Invoice / Bill Number for Purchases */}
          {entryType === 'PURCHASE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Supplier Bill / Invoice No (Optional)
              </label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. TAX-8921 or Dealer Bill No"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
          )}

          {/* Payment Mode for Purchases */}
          {entryType === 'PURCHASE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment to Supplier
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(['Bank Transfer', 'UPI', 'Cash', 'Credit'] as PaymentMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-1 rounded-xl text-center font-bold transition-colors ${
                      paymentMode === mode
                        ? mode === 'Credit'
                          ? 'bg-rose-500 text-white'
                          : 'bg-sky-500 text-slate-950'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'Bank Transfer' ? 'Bank' : mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Item Purchase Controls */}
          {entryType === 'PURCHASE' && (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleAddAnotherItem}
                className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-[0.99]"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ ADD ANOTHER ITEM</span>
              </button>

              {purchaseBatchItems.length > 0 && (
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-slate-800 pb-1.5">
                    <span>Items in this Purchase Bill ({purchaseBatchItems.length})</span>
                    <span>Total: ₹{purchaseBatchItems.reduce((s, i) => s + i.totalCost, 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {purchaseBatchItems.map((itm, idx) => (
                      <div key={itm.id} className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-xs">
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-slate-200">
                            {idx + 1}. {itm.brand} {itm.model}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                            <span>Qty: <strong className="text-white">{itm.quantity}</strong></span>
                            <span>• Cost: ₹{itm.unitCost.toLocaleString('en-IN')}</span>
                            <span className="text-amber-400 font-semibold">• Total: ₹{itm.totalCost.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromBatch(itm.id)}
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-950/50"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-3 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-transform"
            >
              <Check className="w-5 h-5" />
              <span>
                {matchedStockItem
                  ? `RESTOCK • ADD +${quantity} UNITS TO EXISTING STOCK`
                  : entryType === 'PURCHASE'
                  ? purchaseBatchItems.length > 0
                    ? `SAVE PURCHASE BILL (${purchaseBatchItems.length + (model.trim() && numUnitCost > 0 ? 1 : 0)} Items • ₹${(
                        purchaseBatchItems.reduce((s, i) => s + i.totalCost, 0) +
                        (model.trim() && numUnitCost > 0 ? totalCost : 0)
                      ).toLocaleString('en-IN')})`
                    : `SAVE PURCHASE BILL (${quantity} Unit${quantity > 1 ? 's' : ''} • ₹${totalCost.toLocaleString('en-IN')})`
                  : `ADD ${quantity} UNITS TO INVENTORY`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

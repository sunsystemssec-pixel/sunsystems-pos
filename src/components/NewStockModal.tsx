import React, { useState, useMemo } from 'react';
import { User, PaymentMode, StockItem } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { X, Plus, Minus, Check, PackagePlus, Cpu, HardDrive, Monitor, CheckCircle2, Building2, Store } from 'lucide-react';

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

  // Supplier / Party
  const [supplier, setSupplier] = useState(() => (allParties.length > 0 ? allParties[0] : 'ABC Computers'));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numUnitCost = Number(unitCost) || 0;
  const totalCost = quantity * numUnitCost;

  const handleUnitCostChange = (val: number | '') => {
    setUnitCost(val);
    if (val !== '' && Number(val) > 0) {
      // Auto-suggest target selling price (20-30% markup)
      setTargetSellingPrice(Math.round(Number(val) * 1.25));
    }
  };

  const isLaptopOrDesktop = category === 'Laptops' || category === 'Desktops';

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
    if (item.category) setCategory(item.category);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullProductName = model.trim() || `${brand} ${category}`;

    if (!fullProductName.trim()) {
      setErrorMessage('Please specify the product model or description.');
      return;
    }

    if (numUnitCost <= 0) {
      setErrorMessage('Please enter the purchase unit cost.');
      return;
    }

    const cleanSupplier = supplier.trim() || 'Vendor';

    try {
      if (entryType === 'PURCHASE') {
        db.addPurchase({
          supplierName: cleanSupplier,
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
          display: isLaptopOrDesktop ? display.trim() : '',
          gpu: isLaptopOrDesktop ? gpu.trim() : '',
          charger: isLaptopOrDesktop ? charger : false,
          condition,
          invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
          notes: notes.trim()
        }, currentUser);

        if (matchedStockItem) {
          const newTot = (matchedStockItem.availableQuantity || 0) + quantity;
          sunAI.speak(`Added ${quantity} units to existing stock for ${fullProductName}. New stock is ${newTot} units.`);
        } else {
          sunAI.speak(`Bulk purchase of ${quantity} ${fullProductName} recorded from ${cleanSupplier}.`);
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
          display: isLaptopOrDesktop ? display.trim() : '',
          gpu: isLaptopOrDesktop ? gpu.trim() : '',
          charger: isLaptopOrDesktop ? charger : false,
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
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

              {/* Charger & Service Tag */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={charger}
                    onChange={(e) => setCharger(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-300 font-medium">Original Charger Included</span>
                </label>
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
                  ? `RECORD PURCHASE • ${quantity} UNITS`
                  : `ADD ${quantity} UNITS TO INVENTORY`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

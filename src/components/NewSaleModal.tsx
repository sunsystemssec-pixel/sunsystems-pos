import React, { useState, useMemo } from 'react';
import { User, PaymentMode, StockItem, Sale, SaleItem } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { StructuredBillModal } from './StructuredBillModal';
import { X, Search, Mic, MicOff, ShoppingBag, Plus, Minus, Check, AlertCircle, Trash2, ArrowLeft, PlusCircle } from 'lucide-react';

interface NewSaleModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  currentUser,
  onClose,
  onSuccess
}) => {
  // Only stock items that are READY and have available stock > 0
  const availableStock = useMemo(() => {
    return db.getStock().filter(s =>
      s.status === 'READY' && (s.availableQuantity === undefined || s.availableQuantity > 0)
    );
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);

  // Multi-item bill cart
  const [billItems, setBillItems] = useState<SaleItem[]>([]);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const [discount, setDiscount] = useState<number | ''>(0);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter available stock based on typed or dictated search query
  const filteredStock = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableStock;

    const terms = q.split(/\s+/);
    return availableStock.filter(item => {
      const searchable = [
        item.brand,
        item.model,
        item.serialNumber,
        item.serviceTag,
        item.category,
        item.cpu,
        item.ram,
        item.storage,
        item.condition
      ].filter(Boolean).join(' ').toLowerCase();

      return terms.every(term => searchable.includes(term));
    });
  }, [availableStock, searchQuery]);

  // Voice Dictation for Search
  const toggleListening = () => {
    if (isListening) {
      sunAI.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    sunAI.startListening(
      (transcript) => {
        setSearchQuery(transcript);
        setIsListening(false);
        sunAI.speak(`Searching stock for ${transcript}`);
      },
      (err) => {
        console.warn('Voice search error:', err);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleAddItem = (item: StockItem) => {
    const existingIdx = billItems.findIndex(bi => bi.stockId === item.id);
    const maxAvail = Number(item.availableQuantity ?? item.quantity ?? 1);

    if (existingIdx !== -1) {
      const currentQty = billItems[existingIdx].quantity;
      if (currentQty < maxAvail) {
        const updated = [...billItems];
        updated[existingIdx].quantity += 1;
        updated[existingIdx].amount = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
        setBillItems(updated);
      } else {
        setErrorMessage(`Cannot add more. Only ${maxAvail} unit(s) available for ${item.model}.`);
        return;
      }
    } else {
      const defaultPrice = Number(item.targetSellingPrice || Math.round(Number(item.purchaseCost || 0) * 1.25) || 0);
      const newItem: SaleItem = {
        stockId: item.id,
        productName: `${item.brand} ${item.model}`.trim(),
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber || '',
        quantity: 1,
        unitPrice: defaultPrice,
        amount: defaultPrice
      };
      setBillItems([...billItems, newItem]);
    }

    setErrorMessage(null);
    setIsAddingMore(false);
    setSearchQuery('');
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const item = billItems[index];
    const stockRef = availableStock.find(s => s.id === item.stockId);
    const maxAvail = stockRef ? Number(stockRef.availableQuantity ?? stockRef.quantity ?? 1) : 999;
    const clampedQty = Math.max(1, Math.min(maxAvail, newQty));

    const updated = [...billItems];
    updated[index].quantity = clampedQty;
    updated[index].amount = clampedQty * updated[index].unitPrice;
    setBillItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...billItems];
    updated[index].unitPrice = Math.max(0, newPrice);
    updated[index].amount = updated[index].quantity * Math.max(0, newPrice);
    setBillItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = billItems.filter((_, i) => i !== index);
    setBillItems(updated);
  };

  const subtotal = billItems.reduce((sum, itm) => sum + (itm.amount || 0), 0);
  const totalUnits = billItems.reduce((sum, itm) => sum + (itm.quantity || 1), 0);
  const numDiscount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - numDiscount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (billItems.length === 0) {
      setErrorMessage('Please add at least one item to the bill.');
      return;
    }

    // Verify all item prices
    for (const itm of billItems) {
      if (itm.unitPrice <= 0) {
        setErrorMessage(`Please enter a valid unit selling price for "${itm.productName}".`);
        return;
      }
    }

    try {
      const createdSale = db.addSale({
        productName: billItems.map(i => `${i.productName} (x${i.quantity})`).join(', '),
        quantity: totalUnits,
        unitPrice: totalUnits > 0 ? Math.round(subtotal / totalUnits) : 0,
        sellingPrice: subtotal,
        discount: numDiscount,
        serialNumber: billItems.map(i => i.serialNumber).filter(Boolean).join(', '),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerMobile: customerMobile.trim(),
        customerAddress: customerAddress.trim(),
        paymentMode,
        items: billItems,
        stockId: billItems[0]?.stockId,
        notes: notes.trim()
      }, currentUser);

      sunAI.speak(`Sale with ${billItems.length} items recorded. Opening structured tax invoice.`);

      // Open StructuredBillModal directly for authentic viewing, printing & WhatsApp delivery
      setCompletedSale(createdSale);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record sale.');
    }
  };

  if (completedSale) {
    return (
      <StructuredBillModal
        sale={completedSale}
        onClose={() => {
          setCompletedSale(null);
          onSuccess();
        }}
        onNewSale={() => {
          setCompletedSale(null);
          setBillItems([]);
          setDiscount(0);
          setCustomerAddress('');
          setCustomerName('Walk-in Customer');
          setCustomerMobile('');
          setSearchQuery('');
          setIsAddingMore(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                NEW SALE VOUCHER
              </h3>
              <p className="text-[11px] text-slate-400">
                {billItems.length > 0 ? `${billItems.length} Items Selected • Total Units: ${totalUnits}` : 'Select Items From Available Stock'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECTION 1: SEARCH & ADD STOCK ITEMS (Shown when bill is empty OR when user taps '+ Add Another Item') */}
        {(billItems.length === 0 || isAddingMore) && (
          <div className="mt-4 space-y-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>{billItems.length === 0 ? 'Step 1: Select Stock Items' : 'Add Another Item To Bill'}</span>
              </span>
              {billItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingMore(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Bill</span>
                </button>
              )}
            </div>

            {/* Internal Search Bar with Speech Dictation Button */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-500 absolute left-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search model, serial, specs, brand..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-12 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2 p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                }`}
                title="Dictate stock search"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {isListening && (
              <div className="text-center py-1 text-xs text-amber-400 font-bold animate-pulse">
                🎙 Listening... Speak item name, serial or model
              </div>
            )}

            {/* Stock List */}
            <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-0.5">
              {availableStock.length === 0 ? (
                <div className="text-center py-6 bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                  <p className="text-xs text-slate-400 font-semibold">No items currently in stock.</p>
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-6 bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                  <p className="text-xs text-slate-400">No in-stock item matches "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1 rounded-lg"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredStock.map((item) => {
                  const avail = Number(item.availableQuantity ?? item.quantity ?? 1);
                  const specs = [item.cpu, item.ram, item.storage, item.display].filter(Boolean).join(' • ');
                  const inCartItem = billItems.find(bi => bi.stockId === item.id);
                  const inCartQty = inCartItem?.quantity || 0;
                  const price = item.targetSellingPrice || Math.round(Number(item.purchaseCost || 0) * 1.25);

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 flex items-center justify-between transition-colors shadow-sm"
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-100">
                            {item.brand} {item.model}
                          </span>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {item.condition}
                          </span>
                        </div>

                        {specs && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {specs}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-2">
                          {item.serialNumber ? (
                            <span className="text-amber-400 font-mono font-bold">
                              SN: {item.serialNumber}
                            </span>
                          ) : (
                            <span className="italic text-slate-500">Bulk Stock</span>
                          )}
                          <span className="text-sky-400 font-semibold">• Stock: {avail}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end space-y-1.5">
                        <div className="text-xs font-black text-emerald-400">
                          ₹{price.toLocaleString('en-IN')}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          disabled={inCartQty >= avail}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm transition-all ${
                            inCartQty >= avail
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : inCartQty > 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{inCartQty > 0 ? `Added (${inCartQty}) +` : 'ADD'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SECTION 2: BILL ITEMS & FORM (Shown when at least 1 item is added and not currently browsing to add more) */}
        {billItems.length > 0 && !isAddingMore && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Added Items Header & List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Items in Bill ({billItems.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingMore(true)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Another Item</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-0.5">
                {billItems.map((item, idx) => {
                  const stockRef = availableStock.find(s => s.id === item.stockId);
                  const maxAvail = stockRef ? Number(stockRef.availableQuantity ?? stockRef.quantity ?? 1) : 999;

                  return (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2.5 relative shadow-sm"
                    >
                      <div className="flex items-start justify-between pr-8">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono">
                              #{idx + 1}
                            </span>
                            <h4 className="font-extrabold text-xs text-slate-100">
                              {item.productName}
                            </h4>
                          </div>
                          {item.serialNumber && (
                            <div className="text-[10px] text-amber-400 font-mono mt-0.5 ml-7 font-bold">
                              S/N: {item.serialNumber}
                            </div>
                          )}
                        </div>

                        {/* Remove Item Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & Unit Price Row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                        {/* Quantity Stepper */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={maxAvail}
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                            className="w-10 text-center bg-slate-900 border border-slate-700 rounded-lg py-0.5 text-xs font-bold text-amber-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={item.quantity >= maxAvail}
                            onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.quantity >= maxAvail
                                ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono">
                            / {maxAvail} in stock
                          </span>
                        </div>

                        {/* Unit Selling Price Input */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Rate: ₹</span>
                          <input
                            type="number"
                            required
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-100 text-right focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-400">
                            ₹{(item.amount || (item.quantity * item.unitPrice)).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Customer Information
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Customer Address (Optional) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Customer Address</span>
                  <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, City, Area (Optional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Bill Financials: Subtotal, Discount, Grand Total */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Subtotal ({totalUnits} units)</span>
                <span className="font-bold text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Overall Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-rose-300 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  Grand Total Payable
                </span>
                <span className="text-lg font-black text-emerald-400">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-5 gap-1.5 text-xs">
                {(['UPI', 'Cash', 'Card', 'Bank Transfer', 'Credit'] as PaymentMode[]).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-1 rounded-xl text-center font-bold transition-colors ${
                      paymentMode === mode
                        ? mode === 'Credit'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'Bank Transfer' ? 'Bank' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-transform"
              >
                <Check className="w-5 h-5" />
                <span>CONFIRM & RECORD BILL • ₹{grandTotal.toLocaleString('en-IN')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

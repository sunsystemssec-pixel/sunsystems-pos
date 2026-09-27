import React, { useState } from 'react';
import { User, Expense } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { X, Receipt, Check, Camera, DollarSign, Tag, FileText } from 'lucide-react';

interface NewExpenseModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
  onOpenScanModal?: () => void;
}

const EXPENSE_CATEGORIES = [
  'Courier & Logistics',
  'Packaging Material',
  'Tea, Snacks & Food',
  'Shop Rent & CTC Maintenance',
  'Cleaning & Janitorial',
  'Hardware Tools & Soldering',
  'Staff Petrol & Travel',
  'Electricity & Internet',
  'Office Stationery',
  'Other Expense'
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
  onOpenScanModal
}) => {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const numAmount = Number(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage('Please enter an expense amount greater than ₹0.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please describe the purpose or item for this expense.');
      return;
    }

    try {
      db.addExpense({
        category,
        amount: numAmount,
        description: description.trim(),
        paymentMode
      }, currentUser);

      sunAI.speak(`Recorded expense of ₹${numAmount} for ${description.trim()}.`);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save expense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                RECORD DAILY EXPENSE
              </h3>
              <p className="text-[11px] text-slate-400">CTC Counter Operational Outflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scan receipt alternative trigger */}
        {onOpenScanModal && (
          <div className="mt-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">Have a printed receipt or bill?</span>
              <span className="text-[11px] text-slate-400">Scan using camera to auto-fill details</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScanModal();
              }}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Bill</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Expense Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount Paid (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 250"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-base font-black text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Quick Amount Pills */}
            <div className="flex gap-1.5 mt-2">
              {[50, 100, 200, 500, 1000, 2500].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`flex-1 text-[11px] py-1 rounded-lg border font-bold transition-all ${
                    amount === amt
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Purpose */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description & Remarks *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. DTDC Courier charges to Kurnool or Tea for customer"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Paid Via *
            </label>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {(['Cash', 'UPI', 'Bank Transfer', 'Card'] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-1 rounded-xl text-center font-bold transition-colors ${
                    paymentMode === mode
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'Bank Transfer' ? 'Bank' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30 active:scale-[0.99] transition-all"
            >
              <Check className="w-5 h-5" />
              <span>RECORD EXPENSE (₹{numAmount.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

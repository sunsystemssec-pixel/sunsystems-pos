import React, { useState } from 'react';
import { ParsedTransaction } from '../services/sunAI';
import { User } from '../types';
import { db } from '../services/db';
import { Check, X, Edit2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConfirmationModalProps {
  transaction: ParsedTransaction;
  currentUser: User;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  transaction,
  currentUser,
  onConfirm,
  onCancel
}) => {
  const [data, setData] = useState<Record<string, any>>({ ...transaction.data });
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = () => {
    setErrorMessage(null);
    try {
      if (transaction.intent === 'SALE') {
        const qty = Math.max(1, Number(data.quantity || 1));
        const sellingPrice = Number(data.sellingPrice || 0);
        if (sellingPrice <= 0) {
          throw new Error('Selling price is required.');
        }
        db.addSale({
          customerName: data.customerName || 'Walk-in Customer',
          customerMobile: data.customerMobile || '',
          productName: data.productName || 'Hardware Item',
          quantity: qty,
          unitPrice: Number(data.unitPrice || Math.round(sellingPrice / qty)),
          serialNumber: data.serialNumber || '',
          sellingPrice,
          discount: Number(data.discount || 0),
          paymentMode: data.paymentMode || 'UPI',
          notes: data.notes || ''
        }, currentUser);
      } else if (transaction.intent === 'STOCK') {
        const qty = Math.max(1, Number(data.quantity || 1));
        const cost = Number(data.purchaseCost || 0);
        db.addStock({
          brand: data.brand || 'Hardware',
          model: data.model || 'Item',
          quantity: qty,
          availableQuantity: qty,
          serialNumber: data.serialNumber || '',
          condition: data.condition || 'A Grade',
          charger: data.charger !== false,
          purchaseCost: cost,
          repairCost: Number(data.repairCost || 0),
          transportCost: Number(data.transportCost || 0),
          otherCost: Number(data.otherCost || 0),
          targetSellingPrice: Number(data.targetSellingPrice || Math.round(cost * 1.25)),
          supplier: data.supplier || 'ABC Computers',
          status: 'READY',
          enteredBy: currentUser.name
        }, currentUser);
      } else if (transaction.intent === 'PURCHASE') {
        const qty = Math.max(1, Number(data.quantity || 1));
        const unitCost = Number(data.unitCost || 0);
        const totalAmount = Number(data.totalAmount || (qty * unitCost));
        db.addPurchase({
          supplierName: data.supplierName || 'Vendor',
          productName: data.productName || 'Hardware Item',
          quantity: qty,
          unitCost,
          totalAmount,
          serialNumbers: data.serialNumbers || data.serialNumber || '',
          paymentMode: data.paymentMode || 'Bank Transfer',
          invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`
        }, currentUser);
      } else if (transaction.intent === 'EXPENSE') {
        db.addExpense({
          category: data.category || 'Miscellaneous',
          description: data.description || 'Expense entry',
          amount: Number(data.amount || 0),
          paymentMode: data.paymentMode || 'Cash'
        }, currentUser);
      } else if (transaction.intent === 'CREDIT') {
        db.addCredit({
          partyName: data.partyName || 'Customer',
          amount: Number(data.amount || 0),
          description: data.description || 'Credit purchase',
          outstanding: Number(data.amount || 0),
          status: 'OPEN'
        }, currentUser);
      } else if (transaction.intent === 'DEBIT') {
        db.addDebit({
          partyName: data.partyName || 'Supplier',
          amount: Number(data.amount || 0),
          description: data.description || 'Payment against invoice',
          paymentMode: data.paymentMode || 'Bank Transfer',
          status: 'PAID'
        }, currentUser);
      }

      onConfirm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error writing to Google Sheets database');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase">
                CONFIRM {transaction.intent}
              </h3>
              <p className="text-[11px] text-slate-400">Review details before saving to Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 bg-rose-950/80 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-3 bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">You Said:</span>
          <p className="text-xs italic text-amber-300 font-medium mt-0.5">"{transaction.originalText}"</p>
        </div>

        <div className="mt-4 space-y-2.5">
          {Object.entries(data).map(([key, value]) => {
            if (key === 'enteredBy') return null;
            return (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-xs">
                <span className="text-slate-400 capitalize font-medium">
                  {key.replace(/([A-Z])/g, ' $1')}:
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => setData({ ...data, [key]: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-right text-slate-100 w-44"
                  />
                ) : (
                  <span className="font-semibold text-slate-200 text-right">
                    {typeof value === 'number' && (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('amount'))
                      ? `₹${value.toLocaleString('en-IN')}`
                      : String(value)}
                  </span>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between py-1.5 text-xs text-slate-400">
            <span>Entered By:</span>
            <span className="font-semibold text-amber-400">{currentUser.name} ({currentUser.role})</span>
          </div>
        </div>

        <div className="mt-6 flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center justify-center space-x-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done' : 'Edit'}</span>
          </button>

          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center space-x-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>CONFIRM & SAVE</span>
          </button>

          <button
            onClick={onCancel}
            className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { ShieldAlert, Check, X } from 'lucide-react';

interface OwnerAlterationModalProps {
  module: 'SALES' | 'STOCK' | 'PURCHASES' | 'EXPENSES' | 'CREDIT';
  record: any;
  currentUser: User;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const OwnerAlterationModal: React.FC<OwnerAlterationModalProps> = ({
  module,
  record,
  currentUser,
  onClose,
  onSaveSuccess
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({ ...record });
  const [reason, setReason] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!reason.trim()) {
      setError('A valid reason for alteration is strictly mandatory.');
      return;
    }

    if (ownerPin.trim() !== '215799') {
      setError('AUTHORIZATION FAILED: Please enter the valid 6-digit Owner PIN (215799).');
      return;
    }

    try {
      if (module === 'SALES') {
        db.alterSale(record.id, formData, reason.trim(), currentUser);
      } else if (module === 'STOCK') {
        db.alterStock(record.id, formData, reason.trim(), currentUser);
      } else if (module === 'PURCHASES') {
        db.alterPurchase(record.id, formData, reason.trim(), currentUser);
      } else if (module === 'EXPENSES') {
        db.alterExpense(record.id, formData, reason.trim(), currentUser);
      } else if (module === 'CREDIT') {
        db.alterCredit(record.id, formData, reason.trim(), currentUser);
      }
      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || 'Error altering record');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-amber-400 uppercase">
                OWNER ALTERATION: {module}
              </h3>
              <p className="text-[11px] text-slate-400">Record ID: {record.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {module === 'SALES' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400">Selling Price (₹)</label>
                <input
                  type="number"
                  value={formData.sellingPrice || ''}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Discount (₹)</label>
                <input
                  type="number"
                  value={formData.discount || 0}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName || ''}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
            </>
          )}

          {module === 'STOCK' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400">Model Name</label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Purchase Cost (₹)</label>
                <input
                  type="number"
                  value={formData.purchaseCost || 0}
                  onChange={(e) => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Target Selling Price (₹)</label>
                <input
                  type="number"
                  value={formData.targetSellingPrice || 0}
                  onChange={(e) => setFormData({ ...formData, targetSellingPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
            </>
          )}

          {module === 'EXPENSES' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400">Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>
            </>
          )}

          <div className="pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-amber-400 block mb-1">
              Reason for Alteration (Mandatory for Audit Trail) *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer discount correction agreed with Anand"
              className="w-full bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500"
            />
          </div>

          <div className="pt-2">
            <label className="text-xs font-bold text-amber-400 block mb-1">
              Owner Anand Security PIN Authorization *
            </label>
            <input
              type="password"
              maxLength={6}
              value={ownerPin}
              onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit Owner PIN (215799)"
              className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="mt-5 flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
          >
            <Check className="w-4 h-4" />
            <span>SAVE ALTERATION & LOG AUDIT</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

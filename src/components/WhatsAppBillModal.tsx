import React, { useState } from 'react';
import { Sale, StockItem } from '../types';
import { generateWhatsAppSaleMessage, openWhatsAppInvoice, getCleanWhatsAppNumber } from '../services/whatsapp';
import { X, CheckCircle2, MessageCircle, Copy, Check, Send, Phone, ShieldCheck } from 'lucide-react';

interface WhatsAppBillModalProps {
  sale: Sale;
  stockItem?: StockItem;
  onClose: () => void;
  onNewSale?: () => void;
}

export const WhatsAppBillModal: React.FC<WhatsAppBillModalProps> = ({
  sale,
  stockItem,
  onClose,
  onNewSale
}) => {
  const [targetPhone, setTargetPhone] = useState(sale.customerMobile || '');
  const [copied, setCopied] = useState(false);
  const invoiceMessage = generateWhatsAppSaleMessage(sale, stockItem);

  const handleSendWhatsApp = () => {
    openWhatsAppInvoice(sale, stockItem, targetPhone);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(invoiceMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanPhone = getCleanWhatsAppNumber(targetPhone);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                SALE BILLED SUCCESSFULLY!
              </h3>
              <p className="text-[11px] text-slate-400">
                Bill Serial No: <span className="font-mono text-amber-400 font-bold">{sale.invoiceNumber || 'SS-0001'}</span>
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

        {/* Invoice Summary Card */}
        <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                {sale.productName} {sale.quantity && sale.quantity > 1 ? `(Qty: ${sale.quantity})` : ''}
              </span>
              <span className="text-[11px] text-slate-400">
                Customer: <strong className="text-slate-300">{sale.customerName}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-400 block">
                ₹{sale.finalAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium">
                {sale.paymentMode}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 flex items-center space-x-1.5 text-[11px] text-amber-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>30 Days Testing Warranty • 6 Months Service</span>
          </div>
        </div>

        {/* Customer WhatsApp Phone Input */}
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customer WhatsApp Number</span>
            </span>
            {cleanPhone && (
              <span className="text-[10px] text-emerald-400 font-mono">+{cleanPhone}</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="e.g. 9885100949 or 10-digit mobile"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Main Send WhatsApp Button */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-all"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>SEND WHATSAPP BILL NOW</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Invoice Message Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Full WhatsApp Invoice Text</span>
              </>
            )}
          </button>
        </div>

        {/* WhatsApp Message Live Preview Box */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
            WhatsApp Message Preview:
          </span>
          <div className="bg-[#0b141a] border border-emerald-900/40 rounded-xl p-3 text-[11px] text-slate-200 font-mono whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto selection:bg-emerald-800">
            {invoiceMessage}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5"
          >
            Close
          </button>
          {onNewSale && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl shadow"
            >
              + Create Another Sale
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

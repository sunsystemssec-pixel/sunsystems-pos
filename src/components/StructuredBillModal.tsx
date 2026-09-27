import React, { useState } from 'react';
import { Sale, StockItem } from '../types';
import { COMPANY_INFO } from '../data/seedData';
import { formatToDDMMYY, generateWhatsAppSaleMessage, openWhatsAppInvoice, getCleanWhatsAppNumber, numberToWordsIndian } from '../services/whatsapp';
import { X, Printer, MessageCircle, Copy, Check, Plus, Smartphone, FileText } from 'lucide-react';

interface StructuredBillModalProps {
  sale: Sale;
  stockItem?: StockItem;
  onClose: () => void;
  onNewSale?: () => void;
}

export const StructuredBillModal: React.FC<StructuredBillModalProps> = ({
  sale,
  stockItem,
  onClose,
  onNewSale
}) => {
  const [targetPhone, setTargetPhone] = useState(sale.customerMobile || '');
  const [copied, setCopied] = useState(false);

  const cleanPhone = getCleanWhatsAppNumber(targetPhone);
  const qty = Number(sale.quantity || 1);
  const unitRate = Number(sale.unitPrice || (sale.sellingPrice / qty));
  const invoiceNumber = sale.invoiceNumber || sale.id || 'SS-0001';

  // Format date to DD/MM/YYYY matching the PDF example
  const formatInvoiceDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${fullYear}`;
    }
    return dateStr;
  };

  const invoiceDate = formatInvoiceDate(sale.date);

  // Build clean product description matching the example (e.g. "HP EliteBook 745 G6 (8GB/256GB SSD)")
  let productDesc = sale.productName;
  if (stockItem) {
    const specs: string[] = [];
    if (stockItem.ram && !productDesc.includes(stockItem.ram)) specs.push(stockItem.ram);
    if (stockItem.storage && !productDesc.includes(stockItem.storage)) specs.push(stockItem.storage);
    if (specs.length > 0 && !productDesc.includes('(')) {
      productDesc = `${productDesc} (${specs.join('/')})`;
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    openWhatsAppInvoice(sale, stockItem, targetPhone);
  };

  const handleCopyText = () => {
    const msg = generateWhatsAppSaleMessage(sale, stockItem);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-4 sm:p-6 shadow-2xl my-auto space-y-4 max-h-[96vh] overflow-y-auto">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-sm text-slate-100 tracking-wider uppercase font-mono">
              TAX INVOICE — {invoiceNumber}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors shadow-sm"
              title="Print Bill / Save PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STRUCTURED PRINTABLE BILL PAPER (Exact PDF layout with monospace styling) */}
        {/* ========================================================================= */}
        <div
          id="printable-bill"
          className="bg-white text-black p-6 sm:p-10 shadow-2xl font-mono text-[12px] sm:text-[13px] leading-normal selection:bg-slate-200"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Sun Systems
            </h1>
            <p className="text-xs text-gray-800 font-medium">
              Refurbished Business Laptops
            </p>
            <p className="text-xs text-gray-700">
              {COMPANY_INFO.address}
            </p>
            <p className="text-xs text-gray-700">
              Phone: +91 70136 08439 / +91 98851 00949
            </p>
            <p className="text-xs text-gray-700">
              Email: sunsystems.sec@gmail.com · Web:{' '}
              <a
                href={`https://${COMPANY_INFO.website}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-black font-semibold"
              >
                {COMPANY_INFO.website}
              </a>
            </p>
          </div>

          {/* Top Divider */}
          <div className="border-t border-dashed border-gray-400 my-4" />

          {/* Invoice Meta Row: INVOICE / Serial & Date */}
          <div className="flex justify-between items-start text-xs sm:text-sm">
            <div>
              <span className="font-bold text-base sm:text-lg tracking-wider text-black">
                INVOICE
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <div className="font-bold text-sm sm:text-base text-black tracking-wide">
                {invoiceNumber}
              </div>
              <div className="text-xs text-gray-700">
                {invoiceDate}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mt-4 mb-4 space-y-1">
            <div className="text-[11px] font-bold text-gray-600 tracking-wider uppercase">
              BILL TO
            </div>
            <div className="font-bold text-sm sm:text-base text-black">
              {sale.customerName || 'Customer'}
            </div>
            {sale.customerMobile && (
              <div className="text-xs text-gray-800">
                {sale.customerMobile}
              </div>
            )}
            {sale.customerAddress && (
              <div className="text-xs text-gray-700 leading-tight">
                {sale.customerAddress}
              </div>
            )}
          </div>

          {/* Table Header with Dashed Borders */}
          <div className="border-t border-dashed border-gray-400 mt-4" />
          <div className="py-2 flex items-center justify-between text-[11px] sm:text-xs font-bold text-black tracking-wider uppercase">
            <div className="w-8">#</div>
            <div className="flex-1 pr-2">DESCRIPTION</div>
            <div className="w-12 text-center">QTY</div>
            <div className="w-24 text-right">RATE</div>
            <div className="w-28 text-right">AMOUNT</div>
          </div>
          <div className="border-t border-dashed border-gray-400" />

          {/* Table Body */}
          {sale.items && sale.items.length > 0 ? (
            <div className="divide-y divide-dashed divide-gray-200">
              {sale.items.map((itm, idx) => {
                const itmQty = Number(itm.quantity || 1);
                const itmRate = Number(itm.unitPrice || 0);
                const itmAmount = Number(itm.amount || (itmRate * itmQty));
                return (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs sm:text-sm text-black">
                    <div className="w-8 pt-0.5">{idx + 1}</div>
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-black">
                        {itm.productName}
                      </div>
                      {itm.serialNumber && (
                        <div className="text-[10px] sm:text-[11px] text-gray-600 font-mono mt-0.5">
                          S/N: {itm.serialNumber}
                        </div>
                      )}
                    </div>
                    <div className="w-12 text-center pt-0.5">
                      {itmQty}
                    </div>
                    <div className="w-24 text-right pt-0.5">
                      ₹{itmRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="w-28 text-right pt-0.5 font-bold">
                      ₹{itmAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-3 flex items-start justify-between text-xs sm:text-sm text-black">
              <div className="w-8 pt-0.5">1</div>
              <div className="flex-1 pr-2">
                <div className="font-semibold text-black">
                  {productDesc}
                </div>
                {sale.serialNumber && (
                  <div className="text-[10px] sm:text-[11px] text-gray-600 font-mono mt-0.5">
                    S/N: {sale.serialNumber}
                  </div>
                )}
              </div>
              <div className="w-12 text-center pt-0.5">
                {qty}
              </div>
              <div className="w-24 text-right pt-0.5">
                ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="w-28 text-right pt-0.5 font-bold">
                ₹{sale.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-gray-400 mb-4" />

          {/* Calculation & Payment Summary Block */}
          <div className="flex justify-between items-start pt-1 text-xs sm:text-sm">
            {/* Left: Paid By & Amount in Words */}
            <div className="space-y-4 max-w-[60%] pr-4">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  PAID BY
                </div>
                <div className="font-bold text-black uppercase mt-0.5">
                  {sale.paymentMode || 'CASH'}
                </div>
              </div>

              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  AMOUNT IN WORDS
                </div>
                <div className="font-medium text-black mt-0.5 text-xs sm:text-sm leading-relaxed">
                  {numberToWordsIndian(sale.finalAmount)}
                </div>
              </div>
            </div>

            {/* Right: Subtotal, Discount & Total */}
            <div className="w-44 sm:w-56 space-y-1.5 text-right">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-bold text-gray-700">SUBTOTAL</span>
                <span className="text-black font-semibold">
                  ₹{sale.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {sale.discount > 0 && (
                <div className="flex justify-between items-center text-xs text-red-600">
                  <span className="font-bold">DISCOUNT</span>
                  <span>
                    -₹{sale.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-gray-400 my-1" />

              <div className="flex justify-between items-center text-sm sm:text-base font-bold text-black pt-1">
                <span>TOTAL</span>
                <span className="text-base sm:text-lg">
                  ₹{sale.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Divider */}
          <div className="border-t border-dashed border-gray-400 my-6" />

          {/* Warranty & Signature Section */}
          <div className="flex justify-between items-end pt-1">
            {/* Left: Warranty Terms */}
            <div className="max-w-[62%] pr-4 space-y-2">
              <div>
                <div className="text-[11px] font-bold text-black uppercase tracking-wider mb-1">
                  WARRANTY
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-700 leading-relaxed">
                  1-month testing warranty and 6-month service warranty on every laptop. Physical damage and software issues after purchase are not covered.
                </p>
              </div>
            </div>

            {/* Right: Signatory */}
            <div className="text-right space-y-8">
              <div className="font-bold text-xs sm:text-sm text-black">
                For Sun Systems
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider pt-4">
                AUTHORISED SIGNATORY
              </div>
            </div>
          </div>

          {/* Footer Page Number */}
          <div className="text-right pt-6 text-[10px] text-gray-500">
            Page 1 of 1
          </div>
        </div>

        {/* ========================================================================= */}
        {/* WHATSAPP & ACTIONS BAR (Hidden on print) */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 font-mono">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Customer WhatsApp Delivery:</span>
            </span>
            {cleanPhone && (
              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                +{cleanPhone}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="Enter customer 10-digit mobile number"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-98 shrink-0 font-mono"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Send WhatsApp</span>
            </button>
          </div>

          <div className="flex gap-2 pt-1 font-mono">
            <button
              onClick={handleCopyText}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Bill Text!' : 'Copy Bill Text'}</span>
            </button>

            {onNewSale && (
              <button
                onClick={onNewSale}
                className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center space-x-1 shadow-md shadow-amber-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Sale</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

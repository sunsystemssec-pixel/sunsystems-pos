import React, { useState, useMemo } from 'react';
import { Sale, StockItem } from '../types';
import { db } from '../services/db';
import { COMPANY_INFO } from '../data/seedData';
import { formatToDDMMYY, generateWhatsAppSaleMessage, openWhatsAppInvoice, getCleanWhatsAppNumber, numberToWordsIndian } from '../services/whatsapp';
import { X, Printer, MessageCircle, Copy, Check, Plus, Smartphone, FileText, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SunSystemsNative, isNativeApp } from '../services/nativeBridge';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const allStock = useMemo(() => db.getStock(), []);

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

  const printViaIsolatedIframe = () => {
    const billEl = document.getElementById('printable-bill');
    if (!billEl) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sun Systems Invoice ${invoiceNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            #printable-bill {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10px 15px !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: none !important;
              box-shadow: none !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              padding: 3px 6px !important;
            }
            .border-t { border-top: 1px solid #000000 !important; }
            .border-b { border-bottom: 1px solid #000000 !important; }
            .border-dashed { border-style: dashed !important; }
            .border-gray-400 { border-color: #666666 !important; }
            .border-gray-300 { border-color: #999999 !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .font-bold { font-weight: bold !important; }
            .text-xs { font-size: 11px !important; }
            .text-sm { font-size: 12px !important; }
            .text-base { font-size: 14px !important; }
            .text-lg { font-size: 16px !important; }
            .text-xl { font-size: 18px !important; }
            .text-2xl { font-size: 22px !important; }
            .text-black { color: #000000 !important; }
            .text-gray-700, .text-gray-800, .text-gray-600 { color: #222222 !important; }
            .flex { display: flex !important; }
            .justify-between { justify-content: space-between !important; }
            .items-start { align-items: flex-start !important; }
            .items-center { align-items: center !important; }
            .space-y-1 > * + * { margin-top: 3px !important; }
            .space-y-0\\.5 > * + * { margin-top: 2px !important; }
            .space-y-2 > * + * { margin-top: 6px !important; }
            .my-4 { margin-top: 12px !important; margin-bottom: 12px !important; }
            .mt-4 { margin-top: 12px !important; }
            .mb-4 { margin-bottom: 12px !important; }
            .pb-3 { padding-bottom: 8px !important; }
            .pt-2 { padding-top: 6px !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
            .tracking-tight { letter-spacing: -0.025em !important; }
            .tracking-wider { letter-spacing: 0.05em !important; }
            .uppercase { text-transform: uppercase !important; }
          </style>
        </head>
        <body>
          <div id="printable-bill">
            ${billEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 1500);
    }, 300);
  };

  const handlePrint = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateBillPdfBlob();
      if (res && isNativeApp()) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string);
              } else {
                reject(new Error('Failed to read PDF blob'));
              }
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(res.blob);
          const base64Data = await base64Promise;

          const printRes = await SunSystemsNative.print({
            base64Data,
            fileName: res.fileName,
            jobName: `SunSystems_Invoice_${invoiceNumber}`
          });

          if (printRes && printRes.success) {
            setIsGeneratingPdf(false);
            return;
          }
        } catch (nativeErr) {
          console.warn('Native PDF print failed, using isolated iframe fallback:', nativeErr);
        }
      }
      printViaIsolatedIframe();
    } catch (err) {
      console.error('Print error:', err);
      printViaIsolatedIframe();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateBillPdfBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    const billEl = document.getElementById('printable-bill');
    if (!billEl) return null;

    // Capture in standard A4 width (794px at 96 DPI)
    const canvas = await html2canvas(billEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      onclone: (clonedDoc) => {
        const clonedBill = clonedDoc.getElementById('printable-bill');
        if (clonedBill) {
          clonedBill.style.width = '794px';
          clonedBill.style.maxWidth = '794px';
          clonedBill.style.margin = '0 auto';
          clonedBill.style.padding = '24px 32px';
          clonedBill.style.boxSizing = 'border-box';
          clonedBill.style.boxShadow = 'none';
          clonedBill.style.border = 'none';
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    // Initialize standard A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Standard 10mm margins for clean A4 printing layout
    const margin = 10;
    const printWidth = pageWidth - (margin * 2); // 190mm
    const printHeight = (canvas.height * printWidth) / canvas.width;

    if (printHeight > (pageHeight - margin * 2)) {
      // Fit strictly within single A4 page boundary
      const fitHeight = pageHeight - (margin * 2);
      const fitWidth = (canvas.width * fitHeight) / canvas.height;
      const xOffset = (pageWidth - fitWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, fitWidth, fitHeight);
    } else {
      // Centered with 10mm margins
      const xOffset = (pageWidth - printWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, printWidth, printHeight);
    }

    const fileName = `SunSystems_Invoice_${invoiceNumber}.pdf`;
    const blob = pdf.output('blob');
    return { blob, fileName };
  };

  const handleSendWhatsAppPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateBillPdfBlob();
      if (!res) {
        openWhatsAppInvoice(sale, stockItem, targetPhone);
        return;
      }

      const { blob, fileName } = res;

      // 1. Android Native App: Share PDF directly via native FileProvider intent to WhatsApp
      if (isNativeApp()) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string);
              } else {
                reject(new Error('Failed to read PDF blob'));
              }
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64Data = await base64Promise;

          const clean = getCleanWhatsAppNumber(targetPhone);
          const caption = `Sun Systems CTC - Tax Invoice ${invoiceNumber} (₹${sale.finalAmount.toLocaleString('en-IN')})`;

          const shareRes = await SunSystemsNative.sharePdf({
            base64Data,
            fileName,
            caption,
            phone: clean
          });

          if (shareRes && shareRes.success) {
            setIsGeneratingPdf(false);
            return;
          }
        } catch (nativeErr) {
          console.warn('Native share failed, trying Web Share fallback:', nativeErr);
        }
      }

      // 2. Mobile Browser Web Share API (HTTPS Chrome / Safari)
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Tax Invoice ${invoiceNumber}`,
            text: `Tax Invoice ${invoiceNumber} from Sun Systems CTC`
          });
          setIsGeneratingPdf(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsGeneratingPdf(false);
            return;
          }
        }
      }

      // 3. Fallback for Desktop browser or HTTP:
      // Download PDF directly
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const clean = getCleanWhatsAppNumber(targetPhone);
      const promptMsg = `Greetings from Sun Systems CTC!\nTax Invoice ${invoiceNumber} for ₹${sale.finalAmount.toLocaleString('en-IN')} has been generated and the PDF invoice is downloaded to your device.\n\n*Note: Please tap 📎 Paperclip in WhatsApp to attach the downloaded PDF invoice.*`;
      const shareUrl = clean
        ? `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(promptMsg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(promptMsg)}`;
      window.open(shareUrl, '_blank');
    } catch (err: any) {
      console.error('WhatsApp PDF error:', err);
      openWhatsAppInvoice(sale, stockItem, targetPhone);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateBillPdfBlob();
      if (!res) return;
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyText = () => {
    const msg = generateWhatsAppSaleMessage(sale, stockItem);
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:z-auto print:bg-transparent print:p-0 print:m-0 print:overflow-visible print:block">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-4 sm:p-6 shadow-2xl my-auto space-y-4 max-h-[96vh] overflow-y-auto print:bg-transparent print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:max-h-none print:w-full print:rounded-none print:overflow-visible">
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
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors shadow-sm"
              title="Download Invoice PDF"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> : <Download className="w-4 h-4 text-emerald-400" />}
              <span>PDF</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
              title="Print Single Bill Copy"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <Printer className="w-4 h-4 text-amber-400" />}
              <span>Print (1 Copy)</span>
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
          className="bg-white text-black p-6 sm:p-10 shadow-none border-0 print:shadow-none print:p-0 print:m-0 print:border-none font-mono text-[12px] sm:text-[13px] leading-normal selection:bg-slate-200"
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
                const matchedStock = itm.stockId ? allStock.find(s => s.id === itm.stockId) : null;
                const cat = (itm.category || matchedStock?.category || '').toLowerCase();
                const isLaptop = cat.includes('laptop');
                const isDesktop = cat.includes('desktop');

                let itemSpecs = '';
                if (itm.description !== undefined && itm.description !== null) {
                  itemSpecs = itm.description.trim();
                } else if (itm.specsSummary !== undefined && itm.specsSummary !== null) {
                  itemSpecs = itm.specsSummary.trim();
                } else if (matchedStock) {
                  if (isLaptop) {
                    itemSpecs = [matchedStock.cpu, matchedStock.ram, matchedStock.storage, matchedStock.display].filter(Boolean).join(' • ');
                  } else if (isDesktop) {
                    itemSpecs = [matchedStock.cpu, matchedStock.ram, matchedStock.storage].filter(Boolean).join(' • ');
                  } else {
                    itemSpecs = (matchedStock.description || '').trim();
                  }
                }

                return (
                  <div key={idx} className="py-2.5 flex items-start justify-between text-xs sm:text-sm text-black">
                    <div className="w-8 pt-0.5">{idx + 1}</div>
                    <div className="flex-1 pr-2">
                      <div className="font-semibold text-black">
                        {itm.productName}
                      </div>
                      {itemSpecs ? (
                        <div className="text-[10px] sm:text-[11px] text-gray-700 mt-0.5 leading-snug">
                          {itemSpecs}
                        </div>
                      ) : null}
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
                  {sale.productName || productDesc}
                </div>
                {(() => {
                  const cat = (stockItem?.category || '').toLowerCase();
                  const isLaptop = cat.includes('laptop');
                  const isDesktop = cat.includes('desktop');
                  let singleSpecs = '';
                  if (stockItem) {
                    if (isLaptop) {
                      singleSpecs = [stockItem.cpu, stockItem.ram, stockItem.storage, stockItem.display].filter(Boolean).join(' • ');
                    } else if (isDesktop) {
                      singleSpecs = [stockItem.cpu, stockItem.ram, stockItem.storage].filter(Boolean).join(' • ');
                    } else if (stockItem.description) {
                      singleSpecs = stockItem.description.trim();
                    }
                  }
                  if (!singleSpecs && sale.notes) {
                    singleSpecs = sale.notes.trim();
                  }
                  return singleSpecs ? (
                    <div className="text-[10px] sm:text-[11px] text-gray-700 mt-0.5 leading-snug">
                      {singleSpecs}
                    </div>
                  ) : null;
                })()}
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
              onClick={handleSendWhatsAppPdf}
              disabled={isGeneratingPdf}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-98 shrink-0 font-mono"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Send WhatsApp (PDF)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2 pt-1 font-mono">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download PDF</span>
            </button>

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

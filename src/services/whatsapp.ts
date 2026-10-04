import { Sale, StockItem } from '../types';
import { COMPANY_INFO } from '../data/seedData';

export const formatToDDMMYY = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const shortYear = year.length === 4 ? year.slice(2) : year;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${shortYear}`;
  }
  return dateStr;
};

export const formatToDDMMYYYY = (dateStr?: string): string => {
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

export const numberToWordsIndian = (amount: number): string => {
  if (amount === 0) return 'Rupees Zero Only';
  if (!amount || isNaN(amount)) return '';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred';
    }
    if (rest > 0) {
      res += (res ? ' ' : '') + convertTwoDigits(rest);
    }
    return res;
  };

  const num = Math.floor(Math.abs(amount));
  let result = '';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundredAndBelow = num % 1000;

  if (crore > 0) {
    result += convertThreeDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertThreeDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertThreeDigits(thousand) + ' Thousand ';
  }
  if (hundredAndBelow > 0) {
    result += convertThreeDigits(hundredAndBelow) + ' ';
  }

  result = result.trim();
  return result ? `Rupees ${result} Only` : 'Rupees Zero Only';
};

export const generateWhatsAppSaleMessage = (sale: Sale, stockItem?: StockItem): string => {
  const divider = '------------------------------------------';
  const formattedDate = formatToDDMMYYYY(sale.date);
  const billSerial = sale.invoiceNumber || 'SS-0001';
  const subtotalStr = `₹${sale.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalStr = `₹${sale.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const wordsAmount = numberToWordsIndian(sale.finalAmount);

  let itemsSection = '';
  if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
    itemsSection = sale.items.map((itm, idx) => {
      const itmQty = Number(itm.quantity || 1);
      const itmRate = Number(itm.unitPrice || 0);
      const itmTotal = Number(itm.amount || (itmRate * itmQty));
      const itmRateStr = `₹${itmRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const itmTotalStr = `₹${itmTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      let line = `${idx + 1}. *${itm.productName}*`;
      const itemSpecs = (itm.specsSummary || itm.description || '').trim();
      if (itemSpecs) {
        line += `\n   ${itemSpecs}`;
      }
      line += `\n   Qty: ${itmQty} | Rate: ${itmRateStr} | Total: ${itmTotalStr}`;
      if (itm.serialNumber) {
        line += `\n   S/N: ${itm.serialNumber}`;
      }
      return line;
    }).join(`\n${divider}\n`);
  } else {
    const qty = Number(sale.quantity || 1);
    const unitRate = Number(sale.unitPrice || (sale.sellingPrice / qty));
    let productDesc = sale.productName;
    const cat = (stockItem?.category || '').toLowerCase();
    const isLaptop = cat.includes('laptop');
    const isDesktop = cat.includes('desktop');
    let itemSpecs = '';
    if (stockItem) {
      if (isLaptop) {
        itemSpecs = [stockItem.cpu, stockItem.ram, stockItem.storage, stockItem.display].filter(Boolean).join(' • ');
      } else if (isDesktop) {
        itemSpecs = [stockItem.cpu, stockItem.ram, stockItem.storage].filter(Boolean).join(' • ');
      } else if (stockItem.description) {
        itemSpecs = stockItem.description.trim();
      }
    }
    const rateStr = `₹${unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    let line = `1. *${productDesc}*`;
    if (itemSpecs) {
      line += `\n   ${itemSpecs}`;
    }
    line += `\n   Qty: ${qty} | Rate: ${rateStr} | Total: ${subtotalStr}`;
    if (sale.serialNumber) {
      line += `\n   S/N: ${sale.serialNumber}`;
    }
    itemsSection = line;
  }

  return `*${COMPANY_INFO.name.toUpperCase()}*
Refurbished Business Laptops
📍 ${COMPANY_INFO.address}
📞 Mobile: +91 70136 08439 / +91 98851 00949
✉️ Email: sunsystems.sec@gmail.com
🌐 Website: ${COMPANY_INFO.website}
${divider}
*TAX INVOICE:* ${billSerial}
*DATE:* ${formattedDate}

*BILL TO:*
${sale.customerName}
${sale.customerMobile ? `Phone: ${sale.customerMobile}\n` : ''}${sale.customerAddress ? `Address: ${sale.customerAddress}\n` : ''}${divider}
*#  DESCRIPTION                 QTY  RATE         AMOUNT*
${divider}
${itemsSection}
${divider}
*PAID BY:* ${sale.paymentMode || 'CASH'}
*AMOUNT IN WORDS:*
${wordsAmount}

*SUBTOTAL:* ${subtotalStr}
${sale.discount > 0 ? `*DISCOUNT:* -₹${sale.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}*TOTAL AMOUNT:* ${totalStr}
${divider}
*WARRANTY & TERMS:*
1-month testing warranty and 6-month service warranty on every laptop. Physical damage and software issues after purchase are not covered.

_For Sun Systems_
_AUTHORISED SIGNATORY_`;
};

export const getCleanWhatsAppNumber = (mobile: string): string => {
  let clean = (mobile || '').replace(/\D/g, '');
  if (!clean) return '';
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return clean;
};

export const getWhatsAppShareUrl = (mobile: string, message: string): string => {
  const cleanPhone = getCleanWhatsAppNumber(mobile);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
};

export const openWhatsAppInvoice = (sale: Sale, stockItem?: StockItem, targetMobile?: string): boolean => {
  try {
    const phoneToUse = targetMobile || sale.customerMobile || '';
    const message = generateWhatsAppSaleMessage(sale, stockItem);
    const url = getWhatsAppShareUrl(phoneToUse, message);
    window.open(url, '_blank');
    return true;
  } catch (err) {
    console.error('Failed to open WhatsApp:', err);
    return false;
  }
};

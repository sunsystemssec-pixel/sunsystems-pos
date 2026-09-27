import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { driveService } from '../services/googleDrive';
import {
  DollarSign, ShoppingBag, Receipt, CreditCard, Users, Building2,
  FileText, Download, Shield, Cloud, RotateCcw, ChevronRight,
  Calculator
} from 'lucide-react';

interface MoreScreenProps {
  currentUser: User;
  onOpenDriveModal: () => void;
  onOpenScanModal: () => void;
  onOpenUserSwitch: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  currentUser,
  onOpenDriveModal,
  onOpenScanModal,
  onOpenUserSwitch
}) => {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const sales = db.getSales().filter(s => s.date === today);
  const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
  const cashExpected = sales.filter(s => s.paymentMode === 'Cash').reduce((sum, s) => sum + s.finalAmount, 0);
  const upiTotal = sales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.finalAmount, 0);
  const cardTotal = sales.filter(s => s.paymentMode === 'Card').reduce((sum, s) => sum + s.finalAmount, 0);
  const bankTotal = sales.filter(s => s.paymentMode === 'Bank Transfer').reduce((sum, s) => sum + s.finalAmount, 0);
  const creditTotal = sales.filter(s => s.paymentMode === 'Credit').reduce((sum, s) => sum + s.finalAmount, 0);
  const expensesTotal = db.getExpenses().filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);

  const [actualCashInput, setActualCashInput] = useState<number>(cashExpected);
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [closingMessage, setClosingMessage] = useState<string | null>(null);

  const handleCloseDay = () => {
    db.addDailyClosing({
      closedBy: currentUser.name,
      systemSales: totalSales,
      salesCount: sales.length,
      cashExpected,
      cashActual: Number(actualCashInput),
      upiTotal,
      cardTotal,
      bankTotal,
      creditTotal,
      expensesTotal,
      debitTotal: 0,
      differenceReason: varianceReason,
      status: 'CLOSED'
    }, currentUser);

    setClosingMessage(`Day successfully closed by ${currentUser.name}! Cash difference: ₹${actualCashInput - cashExpected}`);
    setTimeout(() => setClosingMessage(null), 4000);
  };

  const menuItems = [
    { id: 'CLOSING', title: 'Daily Closing & Cash Count', desc: 'Reconcile cash & lock end-of-day', icon: <Calculator className="w-5 h-5 text-amber-400" /> },
    { id: 'PURCHASES', title: 'Purchases & Invoices', desc: 'Supplier batch intakes & receipts', icon: <ShoppingBag className="w-5 h-5 text-indigo-400" /> },
    { id: 'EXPENSES', title: 'Daily Expenses', desc: 'Courier, packaging, rent & tea expenses', icon: <Receipt className="w-5 h-5 text-rose-400" /> },
    { id: 'CREDIT', title: 'Credit Ledger (Receivables)', desc: 'Customer outstanding & balances', icon: <CreditCard className="w-5 h-5 text-amber-300" /> },
    { id: 'DEBIT', title: 'Debit Ledger (Payables)', desc: 'Supplier payments & advances', icon: <DollarSign className="w-5 h-5 text-sky-400" /> },
    { id: 'CUSTOMERS', title: 'Customer Database', desc: 'Phone numbers, credit status, records', icon: <Users className="w-5 h-5 text-emerald-400" /> },
    { id: 'SUPPLIERS', title: 'Supplier Profiles', desc: 'CTC Secunderabad & Nehru Place vendors', icon: <Building2 className="w-5 h-5 text-purple-400" /> },
    { id: 'DOCUMENTS', title: 'Google Drive Documents', desc: 'Scanned invoices, receipts & photos', icon: <FileText className="w-5 h-5 text-blue-400" /> },
    { id: 'STAFF', title: 'Staff & PIN Management', desc: 'Owner-only controls & user activity', icon: <Shield className="w-5 h-5 text-amber-400" /> },
    { id: 'EXPORT', title: 'Reports & CSV Export', desc: 'Export sheets to Excel/CSV for audit', icon: <Download className="w-5 h-5 text-emerald-300" /> }
  ];

  return (
    <div className="p-4 space-y-4 pb-28">
      {activeSubView === null ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-100">MORE MODULES</h2>
              <p className="text-xs text-slate-400">Sun Systems Operations & Google Drive</p>
            </div>
            <button
              onClick={onOpenDriveModal}
              className="flex items-center space-x-1.5 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-bold"
            >
              <Cloud className="w-4 h-4" />
              <span>Drive Center</span>
            </button>
          </div>

          <div className="space-y-2">
            {menuItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveSubView(item.id)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-100">{item.title}</h4>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-center">
            <button
              onClick={() => {
                if (window.confirm('Reset Sun Systems database to initial seed data?')) {
                  db.resetToSeed();
                  alert('Database reset to initial demo state.');
                }
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-300 py-2 px-4 rounded-xl border border-slate-800 hover:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Database to Pristine Demo State</span>
            </button>
          </div>
        </>
      ) : (
        <div>
          <button
            onClick={() => setActiveSubView(null)}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold mb-3 flex items-center space-x-1"
          >
            <span>← Back to Menu</span>
          </button>

          {/* 1. DAILY CLOSING SUBVIEW */}
          {activeSubView === 'CLOSING' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">DAILY CLOSING & CASH COUNT</h3>
                  <p className="text-[11px] text-slate-400">Date: {today} • Closed By: {currentUser.name}</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                  EOD RECONCILIATION
                </span>
              </div>

              {closingMessage && (
                <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs">
                  {closingMessage}
                </div>
              )}

              <div className="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total System Sales:</span>
                  <span className="font-bold text-slate-100">₹{totalSales.toLocaleString('en-IN')} ({sales.length} bills)</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Expected Cash Collection:</span>
                  <span className="font-bold">₹{cashExpected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sky-400">
                  <span>UPI Collections:</span>
                  <span className="font-bold">₹{upiTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-indigo-400">
                  <span>Card / Bank Transfer:</span>
                  <span className="font-bold">₹{(cardTotal + bankTotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Credit / Due:</span>
                  <span className="font-bold">₹{creditTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-400 pt-1 border-t border-slate-900">
                  <span>Today's Expenses:</span>
                  <span className="font-bold">-₹{expensesTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Actual Physical Cash Counted in Drawer (₹):
                </label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-amber-500 rounded-xl p-2.5 text-sm font-bold text-amber-300"
                />

                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  actualCashInput === cashExpected
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800 text-rose-300'
                }`}>
                  <span>Variance / Difference:</span>
                  <span className="font-black text-sm">
                    {actualCashInput - cashExpected >= 0 ? '+' : ''}
                    ₹{(actualCashInput - cashExpected).toLocaleString('en-IN')}
                  </span>
                </div>

                {actualCashInput !== cashExpected && (
                  <div>
                    <label className="text-[11px] font-bold text-amber-400 block mb-1">
                      Reason for Cash Discrepancy (Mandatory) *:
                    </label>
                    <input
                      type="text"
                      value={varianceReason}
                      onChange={(e) => setVarianceReason(e.target.value)}
                      placeholder="e.g. ₹500 advance given for office cleaning"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-slate-100"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleCloseDay}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20"
              >
                SUBMIT DAILY CLOSING & LOCK DAY
              </button>
            </div>
          )}

          {/* 2. PURCHASES SUBVIEW */}
          {activeSubView === 'PURCHASES' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-100">PURCHASES & SUPPLIER INVOICES</h3>
                <button
                  onClick={onOpenScanModal}
                  className="text-xs bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl"
                >
                  📷 Scan Invoice
                </button>
              </div>

              {db.getPurchases().map(p => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>{p.productName}</span>
                    <span className="text-indigo-400">₹{p.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Supplier: <span className="text-slate-200">{p.supplierName}</span> • Qty: {p.quantity} (Unit: ₹{p.unitCost})
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                    <span>Inv: {p.invoiceNumber || 'N/A'} • Entered by: {p.enteredBy}</span>
                    <span>{p.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. EXPENSES SUBVIEW */}
          {activeSubView === 'EXPENSES' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-100">EXPENSES</h3>
                <button
                  onClick={onOpenScanModal}
                  className="text-xs bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl"
                >
                  📷 Scan Receipt
                </button>
              </div>

              {db.getExpenses().map(e => (
                <div key={e.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block">{e.category}</span>
                    <span className="text-[11px] text-slate-400">{e.description}</span>
                    <span className="text-[10px] text-slate-500 block">By: {e.enteredBy} • {e.paymentMode}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-rose-400 block">₹{e.amount.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500">{e.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. CREDIT SUBVIEW */}
          {activeSubView === 'CREDIT' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-100">CUSTOMER CREDIT LEDGER</h3>
              {db.getCredit().map(c => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block">{c.partyName}</span>
                    <span className="text-[11px] text-slate-400">{c.description}</span>
                    <span className="text-[10px] text-slate-500 block">Status: {c.status} • By {c.enteredBy}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-300 block">₹{c.outstanding.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-rose-400 font-bold">DUE</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. DEBIT SUBVIEW */}
          {activeSubView === 'DEBIT' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-100">DEBIT PAYMENTS LEDGER</h3>
              {db.getDebit().map(d => (
                <div key={d.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-200 block">{d.partyName}</span>
                    <span className="text-[11px] text-slate-400">{d.description}</span>
                    <span className="text-[10px] text-slate-500 block">Ref: {d.reference || 'N/A'} • {d.paymentMode}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-sky-400 block">₹{d.amount.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-500">{d.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. CUSTOMERS SUBVIEW */}
          {activeSubView === 'CUSTOMERS' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-100">CUSTOMERS</h3>
              {db.getCustomers().map(cust => (
                <div key={cust.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-100">
                    <span>{cust.name}</span>
                    <span className="text-amber-400">Phone: {cust.mobile}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {cust.company} • {cust.address}
                  </div>
                  {cust.outstandingCredit > 0 && (
                    <div className="text-rose-400 font-bold text-[11px]">
                      Credit Outstanding: ₹{cust.outstandingCredit.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 7. SUPPLIERS SUBVIEW */}
          {activeSubView === 'SUPPLIERS' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-100">HARDWARE SUPPLIERS (CTC SECUNDERABAD)</h3>
              {db.getSuppliers().map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-slate-100 block">{s.name} ({s.company})</span>
                  <span className="text-slate-400 text-[11px] block">{s.address}</span>
                  <span className="text-slate-500 text-[10px] block">Contact: {s.mobile}</span>
                </div>
              ))}
            </div>
          )}

          {/* 8. DOCUMENTS SUBVIEW */}
          {activeSubView === 'DOCUMENTS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-100">GOOGLE DRIVE DOCUMENTS & SCANS</h3>
                <button
                  onClick={onOpenScanModal}
                  className="text-xs bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-xl"
                >
                  📷 Scan New
                </button>
              </div>

              {db.getDocuments().map(doc => (
                <div key={doc.id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span className="truncate max-w-[200px]">{doc.fileName}</span>
                    <span className="text-amber-400">{doc.docType}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Drive Folder: <span className="font-mono text-emerald-400">{doc.driveFolder}</span> • Uploaded by: {doc.uploadedBy}
                  </div>
                  <div className="text-slate-500 text-[10px] font-mono">
                    Drive File ID: {doc.driveFileId}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 9. STAFF MANAGEMENT SUBVIEW */}
          {activeSubView === 'STAFF' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">STAFF & PIN MANAGEMENT</h3>
                  <p className="text-[11px] text-slate-400">Controlled by Owner Anand</p>
                </div>
                <button
                  onClick={onOpenUserSwitch}
                  className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700"
                >
                  Switch Login
                </button>
              </div>

              {db.getUsers().map(u => (
                <div key={u.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-100">{u.name}</span>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-1.5 rounded">
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {u.mobile || u.email || 'Staff user'} • Status: {u.isActive ? 'Active' : 'Deactivated'}
                    </p>
                  </div>

                  <div className="text-right">
                    {currentUser.role === 'OWNER' && u.name !== 'Anand' && (
                      <button
                        onClick={() => {
                          const newPin = prompt(`Enter new 4-digit PIN for ${u.name}:`, u.pin);
                          if (newPin) db.updateUserPin(u.id, newPin, currentUser);
                        }}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline block"
                      >
                        Reset PIN
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 10. EXPORT SUBVIEW */}
          {activeSubView === 'EXPORT' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <h3 className="font-bold text-sm text-slate-100">AUDIT REPORTS & SPREADSHEET EXPORTS</h3>
              <p className="text-slate-400 text-[11px]">
                Export raw structured tables directly from Google Sheets to CSV or backup to Drive folder <span className="font-mono text-amber-400">08_REPORTS</span>.
              </p>

              {(['SALES', 'STOCK', 'EXPENSES', 'AUDIT'] as const).map(report => (
                <div key={report} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-200">{report} Master Table</span>
                  <button
                    onClick={() => {
                      const csv = driveService.exportReportCSV(report);
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `SUN_SYSTEMS_${report}_${today}.csv`;
                      a.click();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

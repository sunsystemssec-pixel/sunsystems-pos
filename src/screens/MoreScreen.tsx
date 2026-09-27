import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { driveService } from '../services/googleDrive';
import {
  DollarSign, ShoppingBag, Receipt, CreditCard, Users, Building2,
  FileText, Download, Shield, Cloud, RotateCcw, ChevronRight,
  Calculator, UserPlus, Plus, Trash2, Eye, EyeOff, KeyRound, CheckCircle2, X,
  Database, RefreshCw, Server, Lock
} from 'lucide-react';
import { supabaseService, SUPABASE_URL, SUPABASE_ANON_KEY, SupabaseSyncState } from '../services/supabase';
import { NewExpenseModal } from '../components/NewExpenseModal';

interface MoreScreenProps {
  currentUser: User;
  onOpenDriveModal: () => void;
  onOpenScanModal: () => void;
  onOpenUserSwitch: () => void;
  onLogout?: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  currentUser,
  onOpenDriveModal,
  onOpenScanModal,
  onOpenUserSwitch,
  onLogout
}) => {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Supabase Cloud State
  const [sbState, setSbState] = useState<SupabaseSyncState>(supabaseService.state);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    return supabaseService.subscribe(setSbState);
  }, []);

  // User Management State (Owner Anand)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);
    try {
      const created = db.createUser({
        name: newUserName,
        role: newUserRole,
        mobile: newUserMobile,
        email: newUserEmail,
        pin: newUserPin
      }, currentUser);

      setCreateUserSuccess(`Account created for ${created.name} (${created.role})! Assigned PIN is ${created.pin}. Share this PIN with ${created.name}.`);
      setNewUserName('');
      setNewUserRole('STAFF');
      setNewUserMobile('');
      setNewUserEmail('');
      setNewUserPin('');
      setShowCreateUserModal(false);
    } catch (err: any) {
      setCreateUserError(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete account for "${userName}"? This cannot be undone.`)) {
      try {
        db.deleteUser(userId, currentUser);
      } catch (err: any) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const handleTogglePinReveal = (userId: string) => {
    setRevealedPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleManualPush = async () => {
    setSyncFeedback('Pushing all local records to Supabase...');
    await db.pushAllToSupabase();
    setSyncFeedback('Push completed successfully!');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleManualPull = async () => {
    setSyncFeedback('Pulling latest records from Supabase...');
    const ok = await db.pullFromSupabase();
    if (ok) {
      setSyncFeedback('Cloud records synced into local memory!');
    } else {
      setSyncFeedback('No new cloud records found or tables pending setup.');
    }
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleTestConnection = async () => {
    setSyncFeedback('Testing Supabase connection...');
    const ok = await supabaseService.checkConnection();
    if (ok) {
      setSyncFeedback('Connection to Supabase successful!');
    } else {
      setSyncFeedback(`Connection issue: ${supabaseService.state.errorMessage}`);
    }
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const isOwner = currentUser.role === 'OWNER';

  const menuItems = [
    ...(isOwner ? [{ id: 'CLOSING', title: 'Daily Closing & Cash Count', desc: 'Reconcile cash & lock end-of-day', icon: <Calculator className="w-5 h-5 text-amber-400" /> }] : []),
    ...(isOwner ? [{ id: 'PURCHASES', title: 'Purchases & Invoices', desc: 'Supplier batch intakes & receipts', icon: <ShoppingBag className="w-5 h-5 text-indigo-400" /> }] : []),
    { id: 'EXPENSES', title: 'Daily Expenses', desc: 'Courier, packaging, rent & tea expenses', icon: <Receipt className="w-5 h-5 text-rose-400" /> },
    ...(isOwner ? [{ id: 'CREDIT', title: 'Credit Ledger (Receivables)', desc: 'Customer outstanding & balances', icon: <CreditCard className="w-5 h-5 text-amber-300" /> }] : []),
    ...(isOwner ? [{ id: 'DEBIT', title: 'Debit Ledger (Payables)', desc: 'Supplier payments & advances', icon: <DollarSign className="w-5 h-5 text-sky-400" /> }] : []),
    { id: 'CUSTOMERS', title: 'Customer Database', desc: 'Phone numbers, credit status, records', icon: <Users className="w-5 h-5 text-emerald-400" /> },
    { id: 'SUPPLIERS', title: 'Supplier Profiles', desc: 'CTC Secunderabad & Nehru Place vendors', icon: <Building2 className="w-5 h-5 text-purple-400" /> },
    { id: 'DOCUMENTS', title: 'Google Drive Documents', desc: 'Scanned invoices, receipts & photos', icon: <FileText className="w-5 h-5 text-blue-400" /> },
    ...(isOwner ? [{ id: 'STAFF', title: 'Staff & PIN Management', desc: 'Owner-only controls & user activity', icon: <Shield className="w-5 h-5 text-amber-400" /> }] : []),
    { id: 'SUPABASE', title: 'Supabase Cloud Database', desc: 'Real-time PostgreSQL sync & cloud backup', icon: <Database className="w-5 h-5 text-emerald-400" /> },
    ...(isOwner ? [{ id: 'EXPORT', title: 'Reports & CSV Export', desc: 'Export sheets to Excel/CSV for audit', icon: <Download className="w-5 h-5 text-emerald-300" /> }] : [])
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

          <div className="pt-4 border-t border-slate-800 flex flex-col items-center space-y-2.5">
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Lock Counter & Require PIN Login</span>
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm('Reset Sun Systems database to initial seed data?')) {
                  db.resetToSeed();
                  alert('Database reset to initial demo state.');
                }
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-300 py-1.5 px-4 rounded-xl border border-slate-800/80 hover:border-slate-700"
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
                <div>
                  <h3 className="font-bold text-sm text-slate-100">SHOP EXPENSES</h3>
                  <p className="text-[11px] text-slate-400">Recorded operational outflow</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={onOpenScanModal}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2.5 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1"
                  >
                    <span>📷 Scan</span>
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-md shadow-rose-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ EXPENSE</span>
                  </button>
                </div>
              </div>

              {db.getExpenses().length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
                  No expenses recorded yet. Use <strong>+ EXPENSE</strong> to enter one.
                </div>
              ) : (
                db.getExpenses().map(e => (
                  <div key={e.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-200 block text-xs">{e.category}</span>
                      <span className="text-[11px] text-slate-400">{e.description}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">By: {e.enteredBy} • {e.paymentMode}</span>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <span className="text-sm font-black text-rose-400 block">₹{e.amount.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500">{e.date}</span>
                      </div>
                      {currentUser.role === 'OWNER' && (
                        <button
                          onClick={() => {
                            const reason = window.prompt(`Owner Anand: Enter reason for deleting expense of ₹${e.amount} (${e.description}):`);
                            if (reason && reason.trim()) {
                              try {
                                db.deleteExpense(e.id, reason.trim(), currentUser);
                              } catch (err: any) {
                                alert(err.message || 'Failed to delete expense');
                              }
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                          title="Delete Expense (Owner Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
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

          {/* 9. STAFF MANAGEMENT SUBVIEW (Owner Anand Only) */}
          {activeSubView === 'STAFF' && (
            currentUser.role !== 'OWNER' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <Shield className="w-8 h-8 text-rose-400 mx-auto" />
                <h4 className="font-bold text-sm text-slate-100 uppercase">ACCESS RESTRICTED</h4>
                <p className="text-xs text-slate-400">
                  Staff logins and security PINs are strictly confidential and managed exclusively by Owner Anand.
                </p>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                    <span>STAFF & ACCOUNT MANAGEMENT</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Owner Anand: You have exclusive rights to create accounts and assign PINs.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {currentUser.role === 'OWNER' && (
                    <button
                      onClick={() => {
                        setShowCreateUserModal(true);
                        setCreateUserError(null);
                      }}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-md shadow-amber-500/20"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Create Account</span>
                    </button>
                  )}
                  <button
                    onClick={onOpenUserSwitch}
                    className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700"
                  >
                    Switch User
                  </button>
                </div>
              </div>

              {createUserSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{createUserSuccess}</div>
                  <button onClick={() => setCreateUserSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Create User Form / Modal */}
              {showCreateUserModal && (
                <div className="bg-slate-950 border border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-xs text-amber-400 tracking-wide uppercase">
                        Create New Staff / Manager Account
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowCreateUserModal(false)}
                      className="text-slate-400 hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {createUserError && (
                    <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2 rounded-xl text-xs">
                      {createUserError}
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Person / Staff Name *:
                        </label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="e.g. Anusha, Srikanth, Ravi"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Role *:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewUserRole('STAFF')}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                              newUserRole === 'STAFF'
                                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            STAFF (Entry Only)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewUserRole('MANAGER')}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                              newUserRole === 'MANAGER'
                                ? 'bg-sky-600/30 border-sky-500 text-sky-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            MANAGER
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Mobile Number:
                        </label>
                        <input
                          type="tel"
                          value={newUserMobile}
                          onChange={(e) => setNewUserMobile(e.target.value)}
                          placeholder="e.g. 9885000000"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Assign Security PIN (4-6 digits) *:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={newUserPin}
                            onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 3456"
                            className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-xs text-amber-300 font-mono tracking-widest focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setNewUserPin(String(Math.floor(1000 + Math.random() * 9000)))}
                            className="absolute right-2 top-2 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono hover:text-amber-300"
                          >
                            Auto
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Give this PIN directly to the staff member so they can log in.
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateUserModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newUserName || newUserPin.length < 4}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20"
                      >
                        CREATE ACCOUNT & ISSUE PIN
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* User List */}
              <div className="space-y-2.5">
                {db.getUsers().map(u => {
                  const isOwner = u.name === 'Anand' || u.role === 'OWNER';
                  const isRevealed = revealedPins[u.id];

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isOwner
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : u.isActive
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isOwner
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : u.role === 'MANAGER'
                                ? 'bg-sky-500 text-slate-950'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm text-slate-100">{u.name}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isOwner
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : u.role === 'MANAGER'
                                    ? 'bg-sky-500/20 text-sky-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {u.role}
                              </span>
                              {!u.isActive && (
                                <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {u.mobile ? `Mobile: ${u.mobile}` : u.email || 'No phone'} • ID: {u.id}
                            </p>
                          </div>
                        </div>

                        {/* Owner Anand Action Controls */}
                        {currentUser.role === 'OWNER' && (
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1 self-end sm:self-center">
                            {/* PIN Display / Reveal */}
                            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                              <KeyRound className="w-3 h-3 text-amber-400" />
                              <span className="text-[11px] font-mono text-amber-300">
                                {isRevealed ? u.pin : '••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePinReveal(u.id)}
                                className="text-slate-400 hover:text-slate-200 ml-1 p-0.5"
                                title={isRevealed ? 'Hide PIN' : 'View PIN to tell staff'}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>

                            {!isOwner && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newPin = prompt(`Enter new 4-6 digit PIN for ${u.name}:`, u.pin);
                                    if (newPin && newPin.trim().length >= 4) {
                                      db.updateUserPin(u.id, newPin.trim(), currentUser);
                                      alert(`PIN for ${u.name} updated to ${newPin.trim()}`);
                                    }
                                  }}
                                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-1 rounded-lg border border-slate-700 font-semibold"
                                >
                                  Reset PIN
                                </button>

                                <button
                                  type="button"
                                  onClick={() => db.toggleUserActive(u.id, currentUser)}
                                  className={`text-[11px] px-2 py-1 rounded-lg border font-semibold ${
                                    u.isActive
                                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-400 hover:bg-amber-900/40'
                                      : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40'
                                  }`}
                                >
                                  {u.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="text-[11px] bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/60 text-rose-400 p-1.5 rounded-lg"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
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

          {/* 11. SUPABASE CLOUD SUBVIEW */}
          {activeSubView === 'SUPABASE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>SUPABASE CLOUD POSTGRESQL</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Live multi-device real-time sync & cloud storage</p>
                </div>
                <button
                  onClick={handleTestConnection}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 font-semibold flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Ping</span>
                </button>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                sbState.status === 'CONNECTED'
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : sbState.status === 'TABLES_PENDING'
                  ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                  : sbState.status === 'SYNCING'
                  ? 'bg-sky-950/40 border-sky-700 text-sky-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      sbState.status === 'CONNECTED'
                        ? 'bg-emerald-400 animate-pulse'
                        : sbState.status === 'TABLES_PENDING'
                        ? 'bg-amber-400 animate-ping'
                        : sbState.status === 'SYNCING'
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-rose-400'
                    }`} />
                    <span className="font-black text-sm uppercase tracking-wide">
                      {sbState.status === 'CONNECTED' || sbState.status === 'TABLES_PENDING'
                        ? 'CONNECTED & ACTIVE'
                        : sbState.status === 'SYNCING'
                        ? 'SYNCING CLOUD DATA...'
                        : 'OFFLINE / DISCONNECTED'}
                    </span>
                  </div>
                  {sbState.lastSyncedAt && (
                    <span className="text-[10px] opacity-80 font-mono">
                      Last sync: {sbState.lastSyncedAt}
                    </span>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed opacity-90">
                  {sbState.status === 'CONNECTED' || sbState.status === 'TABLES_PENDING'
                    ? 'All transactions, stock intakes, sales, and user accounts are automatically synchronized to your Supabase PostgreSQL cloud in real-time across all devices.'
                    : sbState.errorMessage || 'Checking connection status...'}
                </p>
              </div>

              {syncFeedback && (
                <div className="p-3 bg-sky-950/80 border border-sky-700 text-sky-200 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleManualPush}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Push All to Supabase</span>
                </button>
                <button
                  onClick={handleManualPull}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl text-xs border border-slate-700 flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Pull from Supabase</span>
                </button>
              </div>

              {/* Credentials Details Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-slate-200 font-bold">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span>Connected Project Configuration</span>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 block text-[10px]">SUPABASE PROJECT URL</span>
                      <span className="text-emerald-400 select-all">{SUPABASE_URL}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-slate-500 block text-[10px]">PUBLISHABLE CLIENT KEY</span>
                      <span className="text-amber-300 truncate max-w-[260px] block select-all">{SUPABASE_ANON_KEY}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showExpenseModal && (
        <NewExpenseModal
          currentUser={currentUser}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => setShowExpenseModal(false)}
          onOpenScanModal={onOpenScanModal}
        />
      )}
    </div>
  );
};

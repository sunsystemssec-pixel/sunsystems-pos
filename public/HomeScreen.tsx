import React, { useState } from 'react';
import { User, Sale } from '../types';
import { db } from '../services/db';
import { CommandBar } from '../components/CommandBar';
import {
  TrendingUp, Package, ShoppingBag, Receipt, CreditCard,
  CheckCircle2, ArrowUpRight, ShieldAlert
} from 'lucide-react';

interface HomeScreenProps {
  currentUser: User;
  onCommandSubmit: (text: string) => void;
  onOpenScan: () => void;
  onQuickAction: (action: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE') => void;
  onSelectSale: (sale: Sale) => void;
  onNavigateTab: (tab: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  onCommandSubmit,
  onOpenScan,
  onQuickAction,
  onSelectSale,
  onNavigateTab
}) => {
  const sales = db.getSales();
  const stock = db.getStock();
  const purchases = db.getPurchases();
  const expenses = db.getExpenses();
  const credit = db.getCredit();
  const declarations = db.getDailyDeclarations();

  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date === today);
  const todaySalesTotal = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);

  const cashSales = todaySales.filter(s => s.paymentMode === 'Cash').reduce((sum, s) => sum + s.finalAmount, 0);
  const upiSales = todaySales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.finalAmount, 0);

  const todayStockCount = stock.filter(s => s.timestamp.startsWith(today)).length;
  const availableStockCount = stock.filter(s => s.status === 'READY').length;

  const todayPurchasesTotal = purchases.filter(p => p.date === today).reduce((sum, p) => sum + p.totalAmount, 0);
  const todayExpensesTotal = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  const totalCreditOutstanding = credit.reduce((sum, c) => sum + c.outstanding, 0);

  const myTodaySales = todaySales.filter(s => s.enteredBy === currentUser.name);
  const mySalesTotal = myTodaySales.reduce((sum, s) => sum + s.finalAmount, 0);
  const myDeclaration = declarations.find(d => d.staffName === currentUser.name && d.date === today);

  const [hasDeclared, setHasDeclared] = useState(!!myDeclaration);

  const handleDeclare = () => {
    db.submitDeclaration(currentUser.name);
    setHasDeclared(true);
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-1.5">
            <span>Good Day,</span>
            <span className="text-amber-400">{currentUser.name}!</span>
          </h2>
          <p className="text-xs text-slate-400">
            {currentUser.role === 'OWNER'
              ? 'Sun Systems Owner Dashboard — Full Alteration & Audit Control'
              : currentUser.role === 'MANAGER'
              ? 'Sun Systems Manager Portal — Operations & Closing'
              : 'Sun Systems Staff Portal — Counter & Inventory Entry'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400 block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="text-[10px] bg-slate-800 text-amber-300 font-semibold px-2 py-0.5 rounded">
            Shop 159 CTC
          </span>
        </div>
      </div>

      {/* Hero Natural Language Voice & Text Command Bar */}
      <CommandBar
        onCommandSubmit={onCommandSubmit}
        onOpenScan={onOpenScan}
        onQuickAction={onQuickAction}
      />

      {/* Staff Daily Declaration Prompt */}
      {currentUser.role !== 'OWNER' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              Staff Daily Declaration
            </span>
            <span className="text-[11px] text-slate-400">
              {hasDeclared
                ? "Today's entries confirmed & declared."
                : `You recorded ${myTodaySales.length} sales (₹${mySalesTotal.toLocaleString('en-IN')}) today.`}
            </span>
          </div>
          {!hasDeclared ? (
            <button
              onClick={handleDeclare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow"
            >
              CONFIRM
            </button>
          ) : (
            <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Signed</span>
            </span>
          )}
        </div>
      )}

      {/* KPI Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
            {currentUser.role === 'STAFF' ? "MY TODAY'S PERFORMANCE" : "TODAY'S BUSINESS OVERVIEW"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Real-time Sheets Data</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Sales Card */}
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {currentUser.role === 'STAFF' ? 'My Sales' : 'Total Sales'}
              </span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-100">
              ₹{(currentUser.role === 'STAFF' ? mySalesTotal : todaySalesTotal).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{currentUser.role === 'STAFF' ? myTodaySales.length : todaySales.length} Bills</span>
              <span className="text-emerald-400 font-semibold">Cash ₹{cashSales.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Stock Available Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-sky-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Stock Available</span>
              <Package className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-100">
              {availableStockCount} <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {todayStockCount} added today
            </div>
          </div>

          {/* Purchases Today */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-indigo-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Purchases</span>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-100">
              ₹{todayPurchasesTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {purchases.filter(p => p.date === today).length} batches intake
            </div>
          </div>

          {/* Expenses Today */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Expenses</span>
              <Receipt className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-100">
              ₹{todayExpensesTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Courier, Packaging, Tea
            </div>
          </div>

          {/* Credit Outstanding */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-amber-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Credit Due</span>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-100">
              ₹{totalCreditOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {credit.filter(c => c.outstanding > 0).length} parties pending
            </div>
          </div>

          {/* UPI Collections */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">UPI Collection</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-lg font-black text-slate-100">
              ₹{upiSales.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              PhonePe / GPay verified
            </div>
          </div>
        </div>
      </div>

      {/* Audit Alerts Banner */}
      <div
        onClick={() => onNavigateTab('AUDIT')}
        className="cursor-pointer bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between hover:border-amber-400 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-100">INTERNAL AUDIT ALERTS</span>
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                2 ISSUES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1 Owner Alteration logged • 1 Unit sold verification
            </p>
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-amber-400" />
      </div>

      {/* Recent Business Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
            RECENT ACTIVITY
          </span>
          <button
            onClick={() => onNavigateTab('SALES')}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
          >
            View All Sales →
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
          {sales.slice(0, 5).map((sale) => (
            <div
              key={sale.id}
              onClick={() => onSelectSale(sale)}
              className="p-3 hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-100">{sale.productName}</span>
                  {sale.auditId && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">
                      ALTERED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sold to <span className="text-slate-300 font-medium">{sale.customerName}</span> by{' '}
                  <span className="text-amber-400 font-medium">{sale.enteredBy}</span> • {sale.paymentMode}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 block">
                  ₹{sale.finalAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{sale.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

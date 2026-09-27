import React, { useState } from 'react';
import { User, Sale } from '../types';
import { db } from '../services/db';
import { Search, Plus, Edit2, ShoppingCart } from 'lucide-react';

interface SalesScreenProps {
  currentUser: User;
  onNewSaleClick: () => void;
  onEditSale: (sale: Sale) => void;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({
  currentUser,
  onNewSaleClick,
  onEditSale
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaff, setFilterStaff] = useState('ALL');
  const sales = db.getSales();

  const filteredSales = sales.filter(s => {
    const matchesSearch =
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStaff = filterStaff === 'ALL' || s.enteredBy === filterStaff;
    return matchesSearch && matchesStaff;
  });

  const totalFilteredAmount = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header & Quick Stat */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <span>SALES VOUCHERS</span>
          </h2>
          <p className="text-xs text-slate-400">
            {filteredSales.length} Transactions • Total: ₹{totalFilteredAmount.toLocaleString('en-IN')}
          </p>
        </div>

        <button
          onClick={onNewSaleClick}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW SALE</span>
        </button>
      </div>

      {/* Search & Staff Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, serial, or model..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filterStaff}
          onChange={(e) => setFilterStaff(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none"
        >
          <option value="ALL">All Staff</option>
          <option value="Anand">Anand</option>
          <option value="Anusha">Anusha</option>
          <option value="Srikanth">Srikanth</option>
          <option value="Kumar">Kumar</option>
          <option value="Krishna">Krishna</option>
          <option value="Sanjay">Sanjay</option>
        </select>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No sales matching your query.
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-100">
                      {sale.productName}
                    </span>
                    {sale.auditId && (
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                        ALTERED BY OWNER
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Serial: <span className="text-amber-400 font-mono font-bold">{sale.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Customer: <span className="font-semibold">{sale.customerName}</span>{' '}
                    {sale.customerMobile && `(${sale.customerMobile})`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-emerald-400">
                    ₹{sale.finalAmount.toLocaleString('en-IN')}
                  </div>
                  {sale.discount > 0 && (
                    <span className="text-[10px] text-rose-400 block line-through">
                      ₹{sale.sellingPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium mt-1 inline-block">
                    {sale.paymentMode}
                  </span>
                </div>
              </div>

              {/* Footer info & Edit Trigger */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="text-slate-400 text-[11px]">
                  <span>Entered by </span>
                  <span className="text-amber-400 font-semibold">{sale.enteredBy}</span>
                  <span> • {sale.date} {sale.time}</span>
                </div>

                <button
                  onClick={() => onEditSale(sale)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-amber-400 font-medium text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Alter Sale (Owner Only)"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Alter</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

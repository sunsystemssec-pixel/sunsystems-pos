import React, { useState } from 'react';
import { User, StockItem } from '../types';
import { db } from '../services/db';
import { Search, Plus, Camera, Laptop, Edit2 } from 'lucide-react';

interface StockScreenProps {
  currentUser: User;
  onNewStockClick: () => void;
  onOpenScan: () => void;
  onEditStock: (item: StockItem) => void;
}

export const StockScreen: React.FC<StockScreenProps> = ({
  currentUser,
  onNewStockClick,
  onOpenScan,
  onEditStock
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const stock = db.getStock();

  const filteredStock = stock.filter(item => {
    const matchesSearch =
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serviceTag && item.serviceTag.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'READY') matchesStatus = item.status === 'READY';
    else if (statusFilter === 'SOLD') matchesStatus = item.status === 'SOLD';
    else if (statusFilter === 'OLD') {
      const purchaseTime = new Date(item.purchaseDate).getTime();
      const now = new Date().getTime();
      const days = (now - purchaseTime) / (1000 * 3600 * 24);
      matchesStatus = days > 60;
    }

    return matchesSearch && matchesStatus;
  });

  const availableCount = stock.filter(s => s.status === 'READY').length;
  const soldCount = stock.filter(s => s.status === 'SOLD').length;

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2">
            <Laptop className="w-5 h-5 text-sky-400" />
            <span>STOCK INVENTORY</span>
          </h2>
          <p className="text-xs text-slate-400">
            {availableCount} Available • {soldCount} Sold • Total: {stock.length} units
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenScan}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold p-2 rounded-xl text-xs flex items-center justify-center"
            title="Scan Serial / Barcode"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={onNewStockClick}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ STOCK</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search serial number (e.g. ABC123), model..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All Units' },
            { id: 'READY', label: `Available (${availableCount})` },
            { id: 'SOLD', label: `Sold (${soldCount})` },
            { id: 'OLD', label: 'Aging > 60 Days' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === f.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="space-y-3">
        {filteredStock.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No stock items found.
          </div>
        ) : (
          filteredStock.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-2xl p-4 shadow-sm transition-colors ${
                item.status === 'SOLD' ? 'border-slate-800/60 opacity-80' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-100">
                      {item.brand} {item.model}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      {item.condition}
                    </span>
                  </div>

                  <div className="text-xs text-amber-400 font-mono font-bold mt-1">
                    SN: {item.serialNumber}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    {item.cpu} • {item.ram} • {item.storage} • {item.display}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.status === 'READY'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : item.status === 'SOLD'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>

                  <div className="mt-1 text-xs font-bold text-slate-200">
                    Target: ₹{item.targetSellingPrice.toLocaleString('en-IN')}
                  </div>

                  {currentUser.role === 'OWNER' && (
                    <span className="text-[10px] text-slate-500 block">
                      Cost: ₹{item.totalCost.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="text-slate-500 text-[11px]">
                  Supplier: <span className="text-slate-400">{item.supplier}</span> • By: {item.enteredBy}
                </div>

                <button
                  onClick={() => onEditStock(item)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-amber-400 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Alter Stock (Owner Only)"
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

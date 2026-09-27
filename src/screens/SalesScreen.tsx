import React, { useState } from 'react';
import { User, Sale } from '../types';
import { db } from '../services/db';
import { Search, Plus, Edit2, ShoppingCart, MessageCircle, FileText, Trash2, X, AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { StructuredBillModal } from '../components/StructuredBillModal';
import { formatToDDMMYY } from '../services/whatsapp';

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
  const isOwner = currentUser.role === 'OWNER';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaff, setFilterStaff] = useState('ALL');
  const [viewingBill, setViewingBill] = useState<Sale | null>(null);

  // Deletion Modal State (Owner Anand)
  const [deleteConfirmSale, setDeleteConfirmSale] = useState<Sale | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Strictly retrieve sales visible to this user
  // (Owner sees all; Staff strictly sees only today's entries entered by them)
  const visibleSales = db.getVisibleSales(currentUser);

  const filteredSales = visibleSales.filter(s => {
    const matchesSearch =
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.serialNumber && s.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStaff = isOwner ? (filterStaff === 'ALL' || s.enteredBy === filterStaff) : true;
    return matchesSearch && matchesStaff;
  });

  const totalFilteredAmount = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);

  const handleDeleteClick = (sale: Sale) => {
    const check = db.checkCanAlter(currentUser);
    if (!check.allowed) {
      onEditSale(sale); // Triggers StaffEditBlockModal
      return;
    }
    setDeleteConfirmSale(sale);
    setDeleteReason('');
    setDeletePin('');
    setDeleteError(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmSale) return;

    if (deletePin.trim() !== '215799') {
      setDeleteError('AUTHORIZATION FAILED: Please enter Owner Anand PIN (215799).');
      return;
    }

    if (!deleteReason.trim() || deleteReason.trim().length < 3) {
      setDeleteError('A valid reason (minimum 3 characters) is strictly mandatory.');
      return;
    }

    try {
      db.deleteSale(deleteConfirmSale.id, deleteReason.trim(), currentUser);
      setDeleteConfirmSale(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete sale.');
    }
  };

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
            {isOwner
              ? `${filteredSales.length} Transactions • Total: ₹${totalFilteredAmount.toLocaleString('en-IN')}`
              : `${filteredSales.length} Vouchers Recorded Today`}
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

      {/* Staff View Restriction Indicator for Non-Owners */}
      {!isOwner && (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Showing today's entries only for <strong>{currentUser.name}</strong></span>
          </div>
          <span className="text-[10px] bg-sky-900/60 text-sky-200 px-2 py-0.5 rounded font-mono">
            STAFF VIEW
          </span>
        </div>
      )}

      {/* Search & Staff Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice no (SS-0001), model, serial..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Staff dropdown only visible to Owner Anand */}
        {isOwner && (
          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none"
          >
            <option value="ALL">All Staff</option>
            <option value="Anand">Anand</option>
            <option value="Karthik">Karthik</option>
            <option value="Suresh">Suresh</option>
          </select>
        )}
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            {isOwner ? 'No sales matching your query.' : 'No sales entered by you today.'}
          </div>
        ) : (
          filteredSales.map((sale) => {
            const hasMultipleItems = sale.items && sale.items.length > 1;

            return (
              <div
                key={sale.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      {sale.invoiceNumber && (
                        <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg shadow-sm">
                          {sale.invoiceNumber}
                        </span>
                      )}
                      <span className="font-extrabold text-sm text-slate-100">
                        {sale.productName}
                      </span>
                      {hasMultipleItems ? (
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40">
                          {sale.items!.length} Items ({sale.quantity} Units)
                        </span>
                      ) : (sale.quantity && sale.quantity > 1) ? (
                        <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/40">
                          {sale.quantity} Units
                        </span>
                      ) : null}
                      {sale.auditId && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                          ALTERED BY OWNER
                        </span>
                      )}
                    </div>

                    {/* Breakdown for Multi-Item Bills */}
                    {hasMultipleItems && sale.items && (
                      <div className="mt-2 space-y-1 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Included Line Items:
                        </span>
                        {sale.items.map((itm, i) => (
                          <div key={i} className="text-[11px] text-slate-300 flex items-center justify-between">
                            <span className="truncate pr-2">
                              {i + 1}. {itm.productName} <span className="text-amber-400 font-mono font-bold">(x{itm.quantity})</span>
                              {itm.serialNumber && <span className="text-slate-500 font-mono text-[10px] ml-1.5">SN: {itm.serialNumber}</span>}
                            </span>
                            <span className="font-semibold text-emerald-400 shrink-0">
                              ₹{(itm.amount || (itm.quantity * itm.unitPrice)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!hasMultipleItems && (
                      <div className="text-xs text-slate-400 mt-1">
                        {sale.serialNumber ? (
                          <>Serial: <span className="text-amber-400 font-mono font-bold">{sale.serialNumber}</span></>
                        ) : (
                          <span className="text-slate-500 italic">No Serial (Bulk / Accessory)</span>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-300 mt-1">
                      Customer: <span className="font-semibold">{sale.customerName}</span>{' '}
                      {sale.customerMobile && `(${sale.customerMobile})`}
                      {sale.customerAddress && (
                        <span className="text-slate-400 block text-[11px] truncate">
                          📍 {sale.customerAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-emerald-400">
                      ₹{sale.finalAmount.toLocaleString('en-IN')}
                    </div>
                    {(!hasMultipleItems && sale.quantity && sale.quantity > 1 && sale.unitPrice) && (
                      <span className="text-[10px] text-slate-400 block">
                        @ ₹{sale.unitPrice.toLocaleString('en-IN')}/unit
                      </span>
                    )}
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

                {/* Footer info & Action Buttons */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="text-slate-400 text-[11px]">
                    <span>Entered by </span>
                    <span className="text-amber-400 font-semibold">{sale.enteredBy}</span>
                    <span> • {formatToDDMMYY(sale.date)} {sale.time}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    {/* View Structured Bill */}
                    <button
                      onClick={() => setViewingBill(sale)}
                      className="flex items-center space-x-1 text-sky-300 hover:text-sky-200 font-semibold text-xs px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 hover:bg-sky-900/50 transition-colors"
                      title="View & Print Structured Bill"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Bill</span>
                    </button>

                    {/* WhatsApp Structured Bill */}
                    <button
                      onClick={() => setViewingBill(sale)}
                      className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-semibold text-xs px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/50 transition-colors"
                      title="Send Structured Bill via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Bill</span>
                    </button>

                    {/* Alter / Edit Bill */}
                    <button
                      onClick={() => onEditSale(sale)}
                      className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 font-medium text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                      title={isOwner ? 'Edit Bill (Owner Only)' : 'Alteration Locked'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Bill (Owner Only) */}
                    <button
                      onClick={() => handleDeleteClick(sale)}
                      className="flex items-center space-x-1 text-rose-400 hover:text-rose-300 font-medium text-xs px-2 py-1 rounded-lg bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/50 transition-colors"
                      title={isOwner ? 'Delete Bill & Restore Stock' : 'Delete Locked'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Structured Bill Modal */}
      {viewingBill && (
        <StructuredBillModal
          sale={viewingBill}
          onClose={() => setViewingBill(null)}
        />
      )}

      {/* Delete Confirmation Modal for Owner Anand */}
      {deleteConfirmSale && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                DELETE SALE VOUCHER?
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete bill{' '}
              <strong className="text-amber-400">{deleteConfirmSale.invoiceNumber || deleteConfirmSale.id}</strong> (
              {deleteConfirmSale.productName})? Stock inventory quantity ({deleteConfirmSale.quantity || 1} units) will be automatically restored to READY status.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Deletion <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Customer cancelled order / Wrong invoice entry"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Owner Security PIN <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  placeholder="Enter Owner PIN (215799)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono tracking-widest text-center"
                />
              </div>

              {deleteError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2 rounded-xl text-xs flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSale(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-rose-600/30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

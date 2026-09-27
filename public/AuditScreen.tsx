import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { ShieldAlert, AlertTriangle, Search, Sparkles } from 'lucide-react';

interface AuditScreenProps {
  currentUser: User;
  onVoiceAuditQuery: (query: string) => void;
}

export const AuditScreen: React.FC<AuditScreenProps> = ({ onVoiceAuditQuery }) => {
  const [filterModule, setFilterModule] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const auditLogs = db.getAuditLogs();

  const filteredLogs = auditLogs.filter(log => {
    const matchesModule = filterModule === 'ALL' || log.module === filterModule;
    const matchesSearch =
      log.recordId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.newValue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  const ownerAlterations = auditLogs.filter(l => l.action.includes('RECORD_EDITED_BY_OWNER'));

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>SUN SYSTEMS INTERNAL AUDIT</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable Audit Trail • {auditLogs.length} Events Logged
          </p>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold px-2 py-1 rounded">
          DELETION LOCKED
        </span>
      </div>

      {/* Factual Audit Alerts Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Factual Audit Summary</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Real-time Check</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Owner Alterations</span>
            <span className="text-base font-black text-amber-400">
              {ownerAlterations.length} logged
            </span>
            <span className="text-[10px] text-slate-500 block">With mandatory reasons</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Staff Alterations Blocked</span>
            <span className="text-base font-black text-emerald-400">
              100% Enforced
            </span>
            <span className="text-[10px] text-slate-500 block">Only Anand has write-alter</span>
          </div>
        </div>

        {/* Voice Audit Query Pills */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Quick Voice Audit Queries:</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              "Show today's audit issues",
              "Show all discounts today",
              "Show Kumar's entries",
              "Show stock older than 60 days"
            ].map(q => (
              <button
                key={q}
                onClick={() => onVoiceAuditQuery(q)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 transition-colors"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Module Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search record ID, user, or reason..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'SALES', 'STOCK', 'PURCHASES', 'EXPENSES', 'USERS', 'DAILY_CLOSING'].map(m => (
            <button
              key={m}
              onClick={() => setFilterModule(m)}
              className={`text-xs px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                filterModule === m
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Immutable Audit Log Records */}
      <div className="space-y-2.5">
        {filteredLogs.map(log => {
          const isOwnerEdit = log.action.includes('RECORD_EDITED_BY_OWNER');
          return (
            <div
              key={log.id}
              className={`border rounded-2xl p-3.5 text-xs transition-colors ${
                isOwnerEdit
                  ? 'bg-amber-950/20 border-amber-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-amber-400 text-[11px]">
                      {log.recordId}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        isOwnerEdit
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.action}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    By <span className="text-slate-200 font-semibold">{log.user}</span> ({log.role}) • Module: {log.module}
                  </p>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {log.date} {log.time}
                </span>
              </div>

              {/* Value comparison if edited */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 bg-slate-950/60 p-2 rounded-lg">
                {isOwnerEdit && (
                  <div className="text-[11px] text-rose-400">
                    <span className="font-semibold text-slate-500">Old: </span>
                    {log.oldValue}
                  </div>
                )}
                <div className="text-[11px] text-emerald-400">
                  <span className="font-semibold text-slate-500">{isOwnerEdit ? 'New: ' : 'Data: '}</span>
                  {log.newValue}
                </div>
                {log.reason && (
                  <div className="text-[11px] text-amber-300 italic pt-1 border-t border-slate-800/40">
                    <span className="font-bold text-amber-500 not-italic">Reason: </span>
                    "{log.reason}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

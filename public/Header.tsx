import React from 'react';
import { User } from '../types';
import { COMPANY_INFO } from '../data/seedData';
import { db } from '../services/db';
import { CheckCircle, RefreshCw, AlertCircle, UserCircle } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onOpenUserSwitch: () => void;
  onOpenDriveModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenUserSwitch, onOpenDriveModal }) => {
  const syncStatus = db.syncStatus;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-wider text-amber-400">
              SUN SYSTEMS
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              INTERNAL AUDIT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate max-w-[210px]">
            {COMPANY_INFO.address.split(',')[0]} (Shop 159 CTC)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenDriveModal}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
              syncStatus === 'SYNCED'
                ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                : syncStatus === 'SYNCING'
                ? 'bg-amber-950/70 border border-amber-700 text-amber-300 animate-pulse'
                : 'bg-rose-950/70 border border-rose-700 text-rose-300'
            }`}
            title="Google Drive Sync Status"
          >
            {syncStatus === 'SYNCED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
            {syncStatus === 'SYNCING' && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            {syncStatus === 'OFFLINE' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
            <span className="text-[11px]">{syncStatus}</span>
          </button>

          <button
            onClick={onOpenUserSwitch}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200 leading-tight flex items-center justify-end space-x-1">
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[10px] font-semibold text-amber-400 leading-none">
                {currentUser.role}
              </div>
            </div>
            <UserCircle className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
};

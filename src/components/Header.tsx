import React from 'react';
import { User } from '../types';
import { COMPANY_INFO } from '../data/seedData';
import { db } from '../services/db';
import { supabaseService, SupabaseSyncState } from '../services/supabase';
import { CheckCircle, RefreshCw, AlertCircle, UserCircle, Cloud, Lock, Mic } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onOpenUserSwitch: () => void;
  onOpenDriveModal: () => void;
  onOpenVoiceTraining?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenUserSwitch, onOpenDriveModal, onOpenVoiceTraining, onLogout }) => {
  const syncStatus = db.syncStatus;
  const [sbState, setSbState] = React.useState<SupabaseSyncState>(supabaseService.state);

  React.useEffect(() => {
    return supabaseService.subscribe(setSbState);
  }, []);

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

          {onOpenVoiceTraining && (
            <button
              onClick={onOpenVoiceTraining}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
              title="AI Voice Training & Language (EN / HI / TE)"
            >
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}

          <div
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              sbState.status === 'CONNECTED'
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                : sbState.status === 'TABLES_PENDING'
                ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                : sbState.status === 'SYNCING'
                ? 'bg-sky-950/70 border-sky-700 text-sky-300 animate-pulse'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={sbState.errorMessage || `Supabase Cloud: ${sbState.status}`}
          >
            <Cloud className="w-3.5 h-3.5 text-current" />
            <span className="text-[11px]">
              {sbState.status === 'CONNECTED' || sbState.status === 'TABLES_PENDING'
                ? 'Cloud Synced'
                : sbState.status === 'SYNCING'
                ? 'Syncing Cloud...'
                : 'Cloud Standby'}
            </span>
          </div>

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

          {onLogout && (
            <button
              onClick={onLogout}
              title="Lock Counter (Requires PIN to enter)"
              className="p-1.5 bg-slate-800 hover:bg-rose-950/70 hover:text-rose-400 hover:border-rose-700/60 border border-slate-700 rounded-lg text-slate-400 transition-colors flex items-center justify-center"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { ShieldBan } from 'lucide-react';
import { User } from '../types';

interface StaffEditBlockModalProps {
  currentUser: User;
  onClose: () => void;
}

export const StaffEditBlockModal: React.FC<StaffEditBlockModalProps> = ({ currentUser, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-800/80 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center mb-4">
          <ShieldBan className="w-9 h-9" />
        </div>

        <span className="inline-block bg-rose-500/20 text-rose-300 font-black text-xs px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
          OWNER ONLY
        </span>

        <h3 className="text-lg font-bold text-slate-100">
          Alteration Prohibited
        </h3>

        <p className="text-sm text-slate-300 mt-2 font-medium">
          "Only Anand can alter existing business records."
        </p>

        <p className="text-xs text-slate-500 mt-2">
          You are currently logged in as <span className="font-semibold text-slate-300">{currentUser.name} ({currentUser.role})</span>.
          Staff and Managers have data entry privileges, but existing records are locked for audit integrity.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};

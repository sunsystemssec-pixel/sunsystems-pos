import React from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { UserCircle, X } from 'lucide-react';

interface UserSwitcherModalProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  currentUser,
  onSelectUser,
  onClose
}) => {
  const users = db.getUsers();

  const handleQuickSwitch = (u: User) => {
    onSelectUser(u);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <UserCircle className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100">
                SWITCH ACTIVE USER / LOGIN
              </h3>
              <p className="text-[11px] text-slate-400">Sun Systems Internal Staff & Owner Login</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Selection List */}
        <div className="mt-4 space-y-2">
          {users.map((u) => {
            const isCurrent = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      u.role === 'OWNER'
                        ? 'bg-amber-500 text-slate-950'
                        : u.role === 'MANAGER'
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-100">{u.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          u.role === 'OWNER'
                            ? 'bg-amber-500/20 text-amber-300'
                            : u.role === 'MANAGER'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {u.role === 'OWNER' ? 'sunsystems.sec@gmail.com (Full Alteration Rights)' : 'Entry Only — Alterations Locked'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickSwitch(u)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isCurrent ? 'Active' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
          Default PIN for Owner: <span className="text-amber-400 font-mono">1234</span> | Manager: <span className="text-sky-400 font-mono">2345</span> | Staff: <span className="text-emerald-400 font-mono">3456 - 6789</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { UserCircle, X, Lock, KeyRound, Check, ArrowLeft, ShieldAlert, UserPlus } from 'lucide-react';

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
  const [selectedTarget, setSelectedTarget] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const handleSelectUser = (u: User) => {
    // If selecting current user, just close
    if (u.id === currentUser.id) {
      onClose();
      return;
    }

    // Require PIN for Owner Anand (215799) and all users
    setSelectedTarget(u);
    setPinInput('');
    setErrorMsg(null);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedTarget) return;

    // Strict PIN check
    const isCorrect = db.verifyPin(selectedTarget.id, pinInput.trim());

    if (isCorrect) {
      onSelectUser(selectedTarget);
      sunAI.speak(`Logged in as ${selectedTarget.name}.`);
      onClose();
    } else {
      if (selectedTarget.role === 'OWNER') {
        setErrorMsg('INCORRECT OWNER PIN! Owner Anand PIN is 215799.');
      } else {
        setErrorMsg('Incorrect PIN. Please enter the valid authorization PIN.');
      }
      setPinInput('');
    }
  };

  const handleKeyClick = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput(prev => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleInlineCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    try {
      const created = db.createUser({
        name: newStaffName,
        role: newStaffRole,
        mobile: newStaffMobile,
        pin: newStaffPin
      }, currentUser);

      sunAI.speak(`Account created for ${created.name}. Assigned PIN is ${created.pin}.`);
      setNewStaffName('');
      setNewStaffRole('STAFF');
      setNewStaffMobile('');
      setNewStaffPin('');
      setShowCreateInline(false);
      setCreateMsg(`Account for "${created.name}" created! PIN: ${created.pin}`);
    } catch (err: any) {
      setCreateMsg(err.message || 'Failed to create account');
    }
  };

  const handleDirectPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanPin = pinInput.trim();
    if (!cleanPin) return;
    const matched = db.getUserByPin(cleanPin);
    if (matched) {
      onSelectUser(matched);
      sunAI.speak(`Switched account to ${matched.name}.`);
      onClose();
    } else {
      setErrorMsg('INVALID PIN: No account matched this PIN.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100">
                {selectedTarget ? 'AUTHENTICATION REQUIRED' : 'SWITCH USER / LOGIN'}
              </h3>
              <p className="text-[11px] text-slate-400">Sun Systems Multi-User Counter Access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEW 1A: Non-Owner Direct PIN Switch (No staff list visible) */}
        {!selectedTarget && currentUser.role !== 'OWNER' ? (
          <div className="mt-4 space-y-4">
            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-100">SWITCH COUNTER USER</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter target confidential PIN to switch active counter account
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDirectPinSubmit} className="space-y-4">
              <div className="flex justify-center items-center">
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-48 text-center bg-slate-950 border border-amber-500/60 rounded-2xl py-3 text-2xl font-mono tracking-widest text-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => {
                      if (k === 'C') setPinInput('');
                      else if (k === '⌫') handleBackspace();
                      else handleKeyClick(k);
                    }}
                    className={`py-3 rounded-2xl text-base font-black transition-all active:scale-95 ${
                      k === 'C' || k === '⌫'
                        ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={pinInput.length < 4}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl text-xs"
              >
                SWITCH ACCOUNT
              </button>
            </form>
          </div>
        ) : !selectedTarget ? (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs text-slate-400 mb-2">
              Select profile to authenticate. Owner profile is locked with confidential PIN.
            </p>

            {users.map((u) => {
              const isCurrent = u.id === currentUser.id;
              const isOwner = u.role === 'OWNER';

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-sm'
                      : isOwner
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                        isOwner
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : u.role === 'MANAGER'
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-xs text-slate-100">{u.name}</span>
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
                        {isOwner && (
                          <span className="text-[10px] text-amber-400 flex items-center space-x-0.5">
                            <Lock className="w-3 h-3" />
                            <span>PIN Protected</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isOwner ? 'Owner Anand (Full Alteration & Admin Rights)' : 'Staff Entry Rights (Alterations Locked)'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors inline-block ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isCurrent ? 'Active' : isOwner ? 'Login (PIN)' : 'Switch'}
                    </span>
                  </div>
                </div>
              );
            })}

            {createMsg && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-300 text-center font-medium mt-2">
                {createMsg}
              </div>
            )}

            {currentUser.role === 'OWNER' && !showCreateInline && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateInline(true);
                  setCreateMsg(null);
                }}
                className="w-full py-2.5 bg-slate-950 border border-dashed border-amber-500/50 hover:border-amber-400 text-amber-400 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create New Staff Account</span>
              </button>
            )}

            {currentUser.role === 'OWNER' && showCreateInline && (
              <div className="bg-slate-950 border border-amber-500/50 rounded-2xl p-3.5 space-y-3 mt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-extrabold text-xs text-amber-400 uppercase tracking-wide flex items-center space-x-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Quick Account Creation (Owner)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateInline(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleInlineCreate} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Name *</label>
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Srikanth"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Role *</label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-bold"
                      >
                        <option value="STAFF">STAFF (Entry)</option>
                        <option value="MANAGER">MANAGER</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Mobile</label>
                      <input
                        type="tel"
                        value={newStaffMobile}
                        onChange={(e) => setNewStaffMobile(e.target.value)}
                        placeholder="98850..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-0.5">Assign PIN (min 4 digits) *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={newStaffPin}
                        onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 3456"
                        className="w-full bg-slate-900 border border-amber-500/60 rounded-lg p-2 text-xs text-amber-300 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!newStaffName || newStaffPin.length < 4}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20"
                  >
                    CREATE ACCOUNT & ISSUE PIN
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: PIN Authentication Screen */
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Users</span>
              </button>
              <span className="text-[10px] font-mono text-slate-500">Security Verification</span>
            </div>

            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-base text-slate-100">
                Login as {selectedTarget.name} ({selectedTarget.role})
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedTarget.role === 'OWNER'
                  ? 'Enter 6-digit Owner PIN to unlock full administration'
                  : `Enter authorization PIN for ${selectedTarget.name}`}
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* PIN Display Dots / Input */}
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="flex justify-center items-center space-x-2 my-2">
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter PIN"
                  className="w-48 text-center bg-slate-950 border border-slate-700 rounded-xl py-2.5 text-xl font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Number Keypad for Easy Mobile Tapping */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => {
                      if (k === 'C') setPinInput('');
                      else if (k === '⌫') handleBackspace();
                      else handleKeyClick(k);
                    }}
                    className={`py-3 rounded-xl text-base font-bold transition-all active:scale-95 ${
                      k === 'C' || k === '⌫'
                        ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pinInput.length === 0}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-5 h-5" />
                  <span>AUTHORIZE & LOGIN</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

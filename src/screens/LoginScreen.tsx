import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { sunAI } from '../services/sunAI';
import { COMPANY_INFO } from '../data/seedData';
import { Lock, User as UserIcon, Check, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

// Custom authentic Fingerprint SVG icon
const FingerprintIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    <path d="M5.83 17.65a8 8 0 0 1-.83-5.65 8 8 0 0 1 14.8-3.3" />
    <path d="M6.3 20.3a12 12 0 0 1-.3-4.3" />
  </svg>
);

const IrisIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path d="M12 8v1.5" />
    <path d="M12 14.5V16" />
    <path d="M8 12h1.5" />
    <path d="M14.5 12H16" />
  </svg>
);

// Helper converters for biometric credential buffers
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  // Retain User Name / User ID across logins on this device
  const [userIdInput, setUserIdInput] = useState(() => {
    try {
      return localStorage.getItem('sun_last_user_id') || '';
    } catch {
      return '';
    }
  });

  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [activeField, setActiveField] = useState<'ID' | 'PIN'>('PIN');

  const isRetained = Boolean(userIdInput && userIdInput === localStorage.getItem('sun_last_user_id'));

  const completeLogin = (user: User) => {
    // Retain user identifier on this device
    try {
      localStorage.setItem('sun_last_user_id', user.name);
    } catch (e) {
      console.warn('Failed to save last user id:', e);
    }

    // Trigger haptic vibration on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 50, 40]);
    }

    if (user.role === 'OWNER') {
      sunAI.speak(`Welcome Owner Anand. Full administrative access unlocked.`);
    } else {
      sunAI.speak(`Welcome to Sun Systems, ${user.name}.`);
    }

    onLogin(user);
  };

  // =========================================================================
  // HARDWARE BIOMETRIC SCANNER (Fingerprint / Iris / Windows Hello)
  // Configured strictly for local device platform authenticator (NO passkey cloud sync)
  // =========================================================================
  const handleHardwareBiometricScan = async () => {
    setErrorMsg(null);
    const cleanId = userIdInput.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your User ID or Name first, then scan fingerprint.');
      setActiveField('ID');
      return;
    }

    const users = db.getUsers().filter(u => u.isActive !== false);
    const matchedUser = users.find(u =>
      u.id.toLowerCase() === cleanId.toLowerCase() ||
      u.name.toLowerCase() === cleanId.toLowerCase() ||
      (u.mobile && u.mobile.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) ||
      (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
    );

    if (!matchedUser) {
      setErrorMsg(`No active user found with ID "${cleanId}". Please check.`);
      return;
    }

    // Check if secure context is available (required by browsers for hardware biometrics)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setErrorMsg('Mobile hardware sensor requires HTTPS or localhost. Please enter your PIN to login.');
      setActiveField('PIN');
      return;
    }

    if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
      setErrorMsg('Hardware biometric sensor is not supported on this browser. Please enter PIN.');
      setActiveField('PIN');
      return;
    }

    setBiometricScanning(true);

    try {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        setErrorMsg('No hardware biometric sensor (fingerprint/iris) detected on this device. Please enter PIN.');
        setBiometricScanning(false);
        setActiveField('PIN');
        return;
      }

      const savedCredBase64 = localStorage.getItem('sun_bio_cred_' + matchedUser.id);
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      if (savedCredBase64) {
        // Direct Assertion: Prompts phone's native Fingerprint / Iris sensor prompt directly
        try {
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              rpId: window.location.hostname,
              timeout: 60000,
              userVerification: 'required', // Forces Fingerprint / Iris verification
              allowCredentials: [{
                type: 'public-key',
                id: base64ToBuffer(savedCredBase64),
                transports: ['internal'] // ONLY on-device hardware scanner, no passkey sync
              }]
            }
          });

          if (assertion) {
            setBiometricScanning(false);
            completeLogin(matchedUser);
            return;
          }
        } catch (getErr: any) {
          console.warn('Assertion failed, re-enrolling platform biometric sensor:', getErr);
        }
      }

      // Initial Fingerprint Sensor Pairing:
      // Uses authenticatorAttachment: 'platform' + residentKey: 'discouraged'
      // This strictly triggers the phone's physical sensor and prevents Google Passkey dialogs
      const userIdBytes = new TextEncoder().encode(matchedUser.id);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Sun Systems Counter',
            id: window.location.hostname
          },
          user: {
            id: userIdBytes,
            name: matchedUser.name,
            displayName: matchedUser.name
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' }
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Physical on-device sensor ONLY (fingerprint/iris)
            userVerification: 'required',        // Require actual biometric touch/scan
            residentKey: 'discouraged'           // Do NOT create a cloud-synced passkey
          },
          timeout: 60000,
          attestation: 'none'
        }
      }) as PublicKeyCredential | null;

      if (credential && credential.rawId) {
        const credBase64 = bufferToBase64(credential.rawId);
        localStorage.setItem('sun_bio_cred_' + matchedUser.id, credBase64);
        setBiometricScanning(false);
        completeLogin(matchedUser);
        return;
      }
    } catch (err: any) {
      console.warn('Biometric sensor error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Biometric scan cancelled or not recognized. Please retry or enter your PIN.');
      } else {
        setErrorMsg('Biometric verification failed. Please enter your PIN to login.');
      }
    } finally {
      setBiometricScanning(false);
    }
  };

  // =========================================================================
  // DIRECT PIN LOGIN
  // =========================================================================
  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = userIdInput.trim();
    const cleanPin = pinInput.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your User ID.');
      setActiveField('ID');
      return;
    }

    if (!cleanPin) {
      setErrorMsg('Please enter your Security PIN or scan Fingerprint.');
      setActiveField('PIN');
      return;
    }

    setAuthenticating(true);

    const matchedUser = db.authenticateUser(cleanId, cleanPin);

    if (matchedUser) {
      completeLogin(matchedUser);
    } else {
      setErrorMsg('INVALID CREDENTIALS: Incorrect User ID or PIN. Please try again.');
      setAuthenticating(false);
    }
  };

  const handleKeypadDigit = (digit: string) => {
    setErrorMsg(null);
    if (activeField === 'PIN') {
      if (pinInput.length < 6) {
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length === 6 && userIdInput.trim()) {
          const matched = db.authenticateUser(userIdInput.trim(), next);
          if (matched) {
            completeLogin(matched);
          }
        }
      }
    } else {
      setUserIdInput(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    if (activeField === 'PIN') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      setUserIdInput(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMsg(null);
    if (activeField === 'PIN') {
      setPinInput('');
    } else {
      setUserIdInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none flex justify-center items-center">
        <div className="w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl -top-32" />
        <div className="w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -bottom-32" />
      </div>

      <div className="w-full max-w-sm z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 font-black text-2xl border border-amber-300/40">
            SS
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider text-amber-400 font-mono">
                {COMPANY_INFO.name.toUpperCase()}
              </h1>
              <span className="text-[10px] font-bold tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded uppercase">
                COUNTER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Shop No. 159, 1st Floor, CTC C Block, Secunderabad
            </p>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center space-x-1.5 bg-slate-950 border border-slate-800 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>COUNTER ACCESS</span>
            </div>
            <p className="text-xs text-slate-400 pt-0.5">
              Authenticate via Device Fingerprint / Iris or Security PIN
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-xs text-center font-medium flex items-center justify-center space-x-1.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User ID / User Name Field (Retained) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                User ID / Name
              </label>
              {isRetained && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Saved on device</span>
                </span>
              )}
            </div>

            <div
              className={`relative flex items-center bg-slate-950 border rounded-2xl transition-all ${
                activeField === 'ID'
                  ? 'border-amber-400 shadow-md shadow-amber-500/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="pl-3.5 text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={userIdInput}
                onFocus={() => setActiveField('ID')}
                onChange={(e) => {
                  setUserIdInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Enter User ID (e.g. USR-01 or Name)"
                className="w-full bg-transparent px-3 py-3 text-xs font-mono font-bold text-slate-100 placeholder-slate-600 focus:outline-none"
              />
              {userIdInput && (
                <button
                  type="button"
                  onClick={() => {
                    setUserIdInput('');
                    try {
                      localStorage.removeItem('sun_last_user_id');
                    } catch (e) {}
                  }}
                  title="Clear User ID"
                  className="pr-3 text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* METHOD 1: REAL HARDWARE BIOMETRIC SCANNER (NO Passkey Popups) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleHardwareBiometricScan}
              disabled={biometricScanning}
              className={`w-full py-3.5 px-4 rounded-2xl border flex items-center justify-center space-x-3 transition-all shadow-lg active:scale-98 ${
                biometricScanning
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/40 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-sky-950/90 border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-emerald-100 shadow-emerald-950/40'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <FingerprintIcon className={`w-6 h-6 ${biometricScanning ? 'text-white animate-spin' : 'text-emerald-400'}`} />
                <IrisIcon className="w-4 h-4 text-sky-400 absolute -bottom-1 -right-2" />
              </div>
              <div className="text-left pl-1">
                <div className="font-bold text-xs uppercase tracking-wider font-mono">
                  {biometricScanning ? 'SCANNING BIOMETRICS...' : 'SCAN FINGERPRINT / IRIS'}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-normal">
                  Hardware sensor verification (no passkey)
                </div>
              </div>
            </button>
          </div>

          {/* OR DIVIDER */}
          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
              or enter pin
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* METHOD 2: DIRECT PIN FORM */}
          <form onSubmit={handlePinLogin} className="space-y-3">
            <div className="space-y-1">
              <div
                className={`relative flex items-center bg-slate-950 border rounded-2xl transition-all ${
                  activeField === 'PIN'
                    ? 'border-amber-400 shadow-md shadow-amber-500/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={pinInput}
                  onFocus={() => setActiveField('PIN')}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    setErrorMsg(null);
                  }}
                  placeholder="Enter 4-6 digit PIN"
                  className="w-full bg-transparent px-3 py-3 text-sm font-mono tracking-widest font-black text-amber-300 placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="pr-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mobile Touch Keypad */}
            <div className="pt-0.5">
              <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => {
                      if (k === 'C') handleClear();
                      else if (k === '⌫') handleBackspace();
                      else handleKeypadDigit(k);
                    }}
                    className={`h-11 rounded-2xl text-base font-black font-mono transition-all active:scale-95 flex items-center justify-center ${
                      k === 'C' || k === '⌫'
                        ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80 text-xs'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 hover:bg-slate-800'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* PIN Login Button */}
            <div className="pt-0.5">
              <button
                type="submit"
                disabled={!userIdInput.trim() || pinInput.length < 4 || authenticating}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all font-mono"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{authenticating ? 'VERIFYING...' : 'LOGIN WITH PIN'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center space-y-1">
          <div className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <span>Hardware Biometric or PIN Authentication • Sun Systems</span>
          </div>
          <p className="text-[10px] text-slate-600">
            Assigned roles apply automatically upon authentication
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, LogIn, Sparkles } from 'lucide-react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

interface PinLoginProps {
  storedPin: string;
  onSuccess: () => void;
  currentUser: User | null;
}

export const PinLogin: React.FC<PinLoginProps> = ({ storedPin, onSuccess, currentUser }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 8) {
      const next = pin + digit;
      setPin(next);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === storedPin || pin === '1234') {
      if (remember) {
        localStorage.setItem('sigarethub_unlocked_device', 'true');
      }
      onSuccess();
    } else {
      setError('PIN salah. Silakan coba lagi (PIN bawaan: 1234)');
      setPin('');
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      // Even if popup fails (e.g. iframe constraints), user can still use PIN
      setError('Gagal masuk Google. Anda tetap bisa masuk menggunakan PIN.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">CigaretteHub</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pencatatan Bisnis Distribusi Rokok
          </p>
        </div>

        {/* PIN Dots */}
        <div className="my-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  pin.length > i
                    ? 'bg-amber-400 scale-110 shadow-sm shadow-amber-400/50'
                    : 'bg-slate-700 border border-slate-600'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-rose-400 text-center mt-2 animate-shake">
              {error}
            </p>
          )}

          {!error && (
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Masukkan 4 digit PIN Anda (PIN bawaan: <span className="text-amber-400 font-mono font-semibold">1234</span>)
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-12 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:bg-amber-500 active:text-slate-900 border border-slate-600/60 font-semibold text-lg transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-850 hover:bg-slate-700/60 text-xs text-slate-400 font-medium transition-all"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:bg-amber-500 active:text-slate-900 border border-slate-600/60 font-semibold text-lg transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-850 hover:bg-slate-700/60 text-xs text-slate-400 font-medium transition-all"
          >
            ⌫
          </button>
        </div>

        {/* Enter Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={pin.length < 4}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 mb-4"
        >
          <KeyRound className="w-4 h-4" /> Buka Dashboard
        </button>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-slate-600 text-amber-500 focus:ring-amber-400 bg-slate-700"
            />
            <span>Ingat di perangkat ini</span>
          </label>

          {currentUser ? (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" /> Cloud Aktif
            </span>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-[11px] underline"
            >
              <LogIn className="w-3 h-3" /> Masuk Akun Cloud
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

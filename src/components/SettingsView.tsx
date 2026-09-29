import React, { useState } from 'react';
import {
  Settings,
  KeyRound,
  ShieldCheck,
  Building,
  User,
  Cloud,
  Check,
  AlertCircle,
  Database,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  currentUser: FirebaseUser | null;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentUser,
  onSaveSettings,
}) => {
  const [businessName, setBusinessName] = useState(settings.businessName || 'CigaretteHub');
  const [ownerName, setOwnerName] = useState(settings.ownerName || 'Zahrin Fanani');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    let pinToSave = settings.pin;
    if (newPin) {
      if (newPin.length < 4) {
        setStatusMessage({ type: 'error', text: 'PIN minimal 4 digit angka.' });
        return;
      }
      if (newPin !== confirmPin) {
        setStatusMessage({ type: 'error', text: 'Konfirmasi PIN tidak cocok.' });
        return;
      }
      pinToSave = newPin;
    }

    setIsSaving(true);
    try {
      await onSaveSettings({
        ...settings,
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        pin: pinToSave,
      });
      setNewPin('');
      setConfirmPin('');
      setStatusMessage({ type: 'success', text: 'Pengaturan dan PIN berhasil disimpan!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Gagal menyimpan: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setStatusMessage({ type: 'success', text: 'Berhasil menghubungkan akun Google untuk sinkronisasi cloud!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Gagal menghubungkan Google: ' + err.message });
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      setStatusMessage({ type: 'success', text: 'Berhasil keluar dari akun Google.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Gagal keluar: ' + err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-300" />
          Pengaturan Aplikasi & Keamanan
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Kelola PIN akses personal, profil usaha, dan sinkronisasi database antar perangkat (HP & Laptop)
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Cloud Sync Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentUser ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Sinkronisasi Cloud Firebase (Multi-Perangkat)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser
                  ? `Terhubung dengan akun: ${currentUser.email}. Data otomatis tersimpan di cloud Firestore.`
                  : 'Hubungkan akun Google agar data dapat diakses serempak dari HP dan Laptop.'}
              </p>
            </div>
          </div>

          <div>
            {currentUser ? (
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Putus Akun
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Hubungkan Google
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-slate-400" /> Responsif di HP
          </span>
          <span className="flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-slate-400" /> Nyaman di Laptop
          </span>
          <span className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-slate-400" /> Database Cloud Firestore
          </span>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
          Profil Usaha Personal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-500" /> Nama Usaha
            </label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Nama Pemilik
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
            />
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 pt-2">
          Keamanan PIN Akses (Personal)
        </h3>

        <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900">
          PIN saat ini: <strong className="font-mono text-amber-950 font-bold">{settings.pin || '1234'}</strong>.
          Kosongkan kolom di bawah jika tidak ingin mengubah PIN.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" /> PIN Baru (4-8 Digit)
            </label>
            <input
              type="password"
              maxLength={8}
              placeholder="Masukkan PIN baru..."
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" /> Konfirmasi PIN Baru
            </label>
            <input
              type="password"
              maxLength={8}
              placeholder="Ulangi PIN baru..."
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 font-mono text-xs"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
};

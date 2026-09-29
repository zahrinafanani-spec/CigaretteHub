import React from 'react';
import { Cloud, CloudOff, Lock, RefreshCw, Menu, Calendar } from 'lucide-react';
import { User } from 'firebase/auth';
import { formatDateDDMMYYYY } from '../utils/formatters';

interface HeaderProps {
  businessName: string;
  currentUser: User | null;
  onLock: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  viewTitle?: string;
  dateRangeLabel?: string;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLock,
  onRefresh,
  isRefreshing = false,
  viewTitle = 'Dashboard Analisis',
  dateRangeLabel = '30 Hari Terakhir',
  onOpenMobileMenu,
}) => {
  const todayStr = formatDateDDMMYYYY(new Date());

  return (
    <header className="bg-[#0D1322] border-b border-slate-800/80 text-white sticky top-0 z-20 h-14 shrink-0 shadow-sm">
      <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle + View Title / Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              aria-label="Buka Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Desktop/Tablet Breadcrumb Title */}
          <div className="flex items-center gap-2 truncate">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight truncate">
              {viewTitle}
            </h2>
            <span className="hidden sm:inline-block text-slate-600">/</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>{dateRangeLabel}</span>
            </span>
          </div>
        </div>

        {/* Right side controls: Date, Cloud Status, Refresh, Lock */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Today Date Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-400 bg-slate-800/40 border border-slate-800">
            <span className="text-slate-500">Hari ini:</span>
            <span className="text-slate-200 font-medium">{todayStr}</span>
          </div>

          {/* Cloud Sync Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              currentUser
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-400'
            }`}
            title={currentUser ? `Cloud Firestore Aktif (${currentUser.email || 'Akun'})` : 'Penyimpanan Offline & Cloud Ready'}
          >
            {currentUser ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[130px]">
                  {currentUser.email?.split('@')[0] || 'Cloud Aktif'}
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Lokal (Siap Sync)</span>
              </>
            )}
          </div>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Muat Ulang / Sinkronisasi Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Lock App Button */}
          <button
            type="button"
            onClick={onLock}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-amber-400 transition-all shadow-xs"
            title="Kunci Aplikasi Sekarang"
          >
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Kunci</span>
          </button>
        </div>
      </div>
    </header>
  );
};

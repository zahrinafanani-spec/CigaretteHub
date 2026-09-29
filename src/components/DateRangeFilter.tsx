import React from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import { TimeRangeFilter } from '../types';

interface DateRangeFilterProps {
  currentFilter: TimeRangeFilter;
  onFilterChange: (filter: TimeRangeFilter) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomDateChange: (start: string, end: string) => void;
  onExportExcel: () => void;
  isExporting?: boolean;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterProps> = ({
  currentFilter,
  onFilterChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onExportExcel,
  isExporting = false,
}) => {
  const filterOptions: { id: TimeRangeFilter; label: string }[] = [
    { id: '7d', label: '7 Hari' },
    { id: '30d', label: '30 Hari' },
    { id: '3m', label: '3 Bulan' },
    { id: '6m', label: '6 Bulan' },
    { id: '1y', label: '1 Tahun' },
    { id: 'all', label: 'Semua' },
    { id: 'custom', label: 'Pilih Tanggal' },
  ];

  return (
    <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-3 sm:p-3.5 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Preset Filter Segmented Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Periode:</span>
        </div>
        <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-lg border border-slate-800">
          {filterOptions.map(opt => {
            const isActive = currentFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Pickers & Excel Export */}
      <div className="flex flex-wrap items-center gap-2">
        {currentFilter === 'custom' && (
          <div className="flex items-center gap-2 bg-[#0B0F19] border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="date"
              value={customStartDate}
              onChange={e => onCustomDateChange(e.target.value, customEndDate)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-xs font-mono"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => onCustomDateChange(customStartDate, e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-xs font-mono"
            />
          </div>
        )}

        {/* Excel Export Button */}
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all ml-auto md:ml-0 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Menyiapkan...' : 'Unduh Laporan Excel'}</span>
        </button>
      </div>
    </div>
  );
};

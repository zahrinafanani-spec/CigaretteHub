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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider mr-1 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Periode:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-lg border border-slate-800">
          {filterOptions.map(opt => {
            const isActive = currentFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange(opt.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Pickers & Excel Export */}
      <div className="flex flex-wrap items-center gap-2.5">
        {currentFilter === 'custom' && (
          <div className="flex items-center gap-2 bg-[#0B0F19] border border-slate-800 rounded-lg px-3 py-1.5 text-sm">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="date"
              value={customStartDate}
              onChange={e => onCustomDateChange(e.target.value, customEndDate)}
              className="bg-transparent border-none text-slate-100 focus:outline-none text-sm font-mono"
            />
            <span className="text-slate-500">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => onCustomDateChange(customStartDate, e.target.value)}
              className="bg-transparent border-none text-slate-100 focus:outline-none text-sm font-mono"
            />
          </div>
        )}

        {/* Excel Export Button */}
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition-all ml-auto md:ml-0 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Menyiapkan...' : 'Unduh Laporan Excel'}</span>
        </button>
      </div>
    </div>
  );
};

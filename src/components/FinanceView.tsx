import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Sale, Purchase, Expense, Region } from '../types';
import { formatRupiah, formatDateDDMMYYYY, getTodayDateString } from '../utils/formatters';

interface FinanceViewProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  allSales: Sale[];
  regions: Region[];
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onQuickPaySale: (saleId: string, additionalAmount: number) => Promise<void>;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  sales,
  purchases,
  expenses,
  allSales,
  regions,
  onSaveExpense,
  onDeleteExpense,
  onQuickPaySale,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'receivables' | 'expenses'>('overview');

  // Modal Expense State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formCategory, setFormCategory] = useState<Expense['category']>('Ongkir');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formRegionId, setFormRegionId] = useState('');
  const [formError, setFormError] = useState('');

  // Quick Pay Modal for Piutang
  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');

  // Calculations for active range
  const totalSalesOmzet = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCashIn = sales.reduce((acc, s) => acc + s.paidAmount, 0); // Uang masuk dari penjualan
  const totalPurchasesCost = purchases.reduce((acc, p) => acc + p.totalCost, 0); // Beli pabrik
  const totalExpensesCost = expenses.reduce((acc, e) => acc + e.amount, 0); // Biaya operasional/ongkir
  const totalCashOut = totalPurchasesCost + totalExpensesCost; // Total uang keluar

  // Saldo Kas Riil
  const cashBalance = totalCashIn - totalCashOut;

  // Laba Kotor (Omzet - HPP penjualan)
  const totalHPP = sales.reduce((acc, s) => acc + (s.slots * (s.costPerSlot || 0)), 0);
  const grossProfit = totalSalesOmzet - totalHPP;
  const netProfit = grossProfit - totalExpensesCost;

  // All active unpaid sales (Piutang)
  const activeReceivables = allSales.filter(s => s.remainingAmount > 0);
  const totalActiveReceivables = activeReceivables.reduce((acc, s) => acc + s.remainingAmount, 0);

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setFormDate(getTodayDateString());
    setFormCategory('Ongkir');
    setFormAmount('');
    setFormDescription('');
    setFormRegionId('');
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (e: Expense) => {
    setEditingExpense(e);
    setFormDate(e.date);
    setFormCategory(e.category);
    setFormAmount(e.amount);
    setFormDescription(e.description);
    setFormRegionId(e.regionId || '');
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formCategory || !formAmount || Number(formAmount) <= 0) {
      setFormError('Mohon isi tanggal, kategori, dan nominal pengeluaran yang valid');
      return;
    }

    const reg = regions.find(r => r.id === formRegionId);

    try {
      await onSaveExpense({
        id: editingExpense?.id,
        date: formDate,
        category: formCategory,
        amount: Number(formAmount),
        description: formDescription.trim(),
        regionId: reg?.id,
        regionName: reg?.name,
      });
      setIsExpenseModalOpen(false);
    } catch (err: any) {
      setFormError('Gagal menyimpan pengeluaran: ' + err.message);
    }
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySale || !payAmount || Number(payAmount) <= 0) return;

    try {
      await onQuickPaySale(paySale.id, Number(payAmount));
      setPaySale(null);
      setPayAmount('');
    } catch (err) {
      console.error('Quick pay error', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            Laporan Keuangan & Piutang
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pantau arus kas masuk/keluar, laba kotor, laba bersih operasional, dan tagihan piutang pembeli
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddExpenseModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Catat Biaya / Ongkir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ringkasan Finansial & Kas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receivables')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'receivables'
              ? 'border-rose-600 text-rose-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Daftar Piutang</span>
          {activeReceivables.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px]">
              {activeReceivables.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pengeluaran Lain & Ongkir ({expenses.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Cash Flow Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" /> Total Kas Masuk (Inflow)
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-2">
                {formatRupiah(totalCashIn)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Dari pembayaran penjualan rokok
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600" /> Total Kas Keluar (Outflow)
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {formatRupiah(totalCashOut)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Beli stok pabrik + ongkir / biaya lain
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" /> Saldo Arus Kas Riil
              </span>
              <div className={`text-2xl font-bold mt-2 ${cashBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                {formatRupiah(cashBalance)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Kas Masuk dikurangi Kas Keluar
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Estimasi Laba Bersih
              </span>
              <div className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatRupiah(netProfit)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Laba Kotor - Biaya Operasional
              </span>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-3xl mx-auto">
            <h3 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-3">
              Rincian Perhitungan Laba & Keuangan (Periode Terpilih)
            </h3>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700 font-medium">A. Total Omzet Penjualan (Tagihan)</span>
                <span className="font-bold font-mono text-slate-900">{formatRupiah(totalSalesOmzet)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600 pl-4">
                <span>B. Harga Pokok Penjualan (HPP)</span>
                <span className="font-mono">- {formatRupiah(totalHPP)}</span>
              </div>

              <div className="flex justify-between py-2.5 px-3 bg-amber-50 rounded-xl border border-amber-200 font-bold text-amber-950">
                <span>= C. Laba Kotor (A - B)</span>
                <span className="font-mono">{formatRupiah(grossProfit)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600 pl-4">
                <span>D. Biaya Pengeluaran Lain (Ongkir, Bensin, Operasional)</span>
                <span className="font-mono">- {formatRupiah(totalExpensesCost)}</span>
              </div>

              <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-xl border border-emerald-200 font-bold text-emerald-950 text-sm sm:text-base">
                <span>= E. LABA BERSIH ESTIMASI (C - D)</span>
                <span className={`font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatRupiah(netProfit)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 text-slate-500 text-[11px] leading-relaxed">
                Catatan: Laba bersih dihitung dari keuntungan penjualan setelah dikurangi HPP dan biaya operasional. Kas riil dapat berbeda tergantung pada pelunasan piutang pembeli.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVABLES (PIUTANG) */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-rose-900 text-sm">
                Total Piutang Aktif: {formatRupiah(totalActiveReceivables)}
              </span>
              <p className="text-rose-700 mt-0.5">
                Ada {activeReceivables.length} transaksi pembeli yang belum lunas dan perlu ditagih
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal Jual</th>
                    <th className="py-3 px-4">Nama Pembeli</th>
                    <th className="py-3 px-4">Kontak & Alamat</th>
                    <th className="py-3 px-4">Varian Rokok</th>
                    <th className="py-3 px-4 text-right">Total Tagihan</th>
                    <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-center">Aksi Pelunasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Alhamdulillah, semua tagihan penjualan lunas! Tidak ada piutang aktif.
                      </td>
                    </tr>
                  ) : (
                    activeReceivables.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDateDDMMYYYY(s.date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          <div>{s.customerPhone || '-'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{s.customerAddress || s.regionName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{s.productName}</span>
                          <span className="text-slate-400 text-[10px] ml-1">({s.slots} slop)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatRupiah(s.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          {formatRupiah(s.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          {formatRupiah(s.remainingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setPaySale(s);
                              setPayAmount(s.remainingAmount);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Lunaskan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES (PENGELUARAN LAIN / ONGKIR) */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total Pengeluaran Periode Ini: <strong className="text-slate-900">{formatRupiah(totalExpensesCost)}</strong>
            </span>
            <button
              type="button"
              onClick={openAddExpenseModal}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
            >
              + Tambah Pengeluaran
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4">Daerah Terkait</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada catatan pengeluaran biaya lain / ongkir.
                      </td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDateDDMMYYYY(e.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {e.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {e.regionName || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {formatRupiah(e.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditExpenseModal(e)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(e.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingExpense ? 'Edit Pengeluaran / Biaya' : 'Catat Biaya Lain / Ongkir'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori Biaya *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 bg-white"
                >
                  <option value="Ongkir">Ongkos Kirim (Ongkir)</option>
                  <option value="Bensin / Transport">Bensin / Transportasi</option>
                  <option value="Operasional">Operasional Harian</option>
                  <option value="Gudang">Sewa Gudang / Tempat</option>
                  <option value="Lainnya">Biaya Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  placeholder="Contoh: 25000"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 font-mono"
                />
                {formAmount !== '' && (
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                    {formatRupiah(Number(formAmount))}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Pengeluaran *</label>
                <input
                  type="text"
                  placeholder="Contoh: Ongkir J&T paket ke Lamongan..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Daerah Terkait (Opsional)</label>
                <select
                  value={formRegionId}
                  onChange={e => setFormRegionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 bg-white"
                >
                  <option value="">Tidak spesifik</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Pay Modal for Piutang */}
      {paySale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Pelunasan Piutang
              </h3>
              <button
                type="button"
                onClick={() => setPaySale(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pembeli:</span>
                  <span className="font-bold text-slate-900">{paySale.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Varian:</span>
                  <span>{paySale.productName} ({paySale.slots} slop)</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                  <span>Sisa Piutang:</span>
                  <span className="font-mono">{formatRupiah(paySale.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran (Rp) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={paySale.remainingAmount}
                  step="500"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaySale(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Simpan Pelunasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

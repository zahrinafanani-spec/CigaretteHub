import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  PackagePlus,
  Calendar,
  Building,
  MapPin,
  Tag,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { Purchase, Product, Region } from '../types';
import { formatRupiah, formatNumber, formatDateDDMMYYYY, getTodayDateString } from '../utils/formatters';

interface PurchasesViewProps {
  purchases: Purchase[];
  products: Product[];
  regions: Region[];
  onSavePurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'> & { id?: string }) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  products,
  regions,
  onSavePurchase,
  onDeletePurchase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formProductId, setFormProductId] = useState('');
  const [formSlots, setFormSlots] = useState<number | ''>('');
  const [formBuyPrice, setFormBuyPrice] = useState<number | ''>('');
  const [formTargetRegionId, setFormTargetRegionId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Delete Confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingPurchase(null);
    setFormDate(getTodayDateString());
    const defaultProd = products[0];
    const defaultReg = regions[0];
    setFormProductId(defaultProd ? defaultProd.id : '');
    setFormBuyPrice(defaultProd?.defaultBuyPrice || 75000);
    setFormTargetRegionId(defaultReg ? defaultReg.id : '');
    setFormSlots(10);
    setFormNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Purchase) => {
    setEditingPurchase(p);
    setFormDate(p.date);
    setFormProductId(p.productId);
    setFormSlots(p.slots);
    setFormBuyPrice(p.buyPricePerSlot);
    setFormTargetRegionId(p.targetRegionId);
    setFormNotes(p.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleProductChange = (prodId: string) => {
    setFormProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod && !editingPurchase) {
      if (prod.defaultBuyPrice) {
        setFormBuyPrice(prod.defaultBuyPrice);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formProductId || !formSlots || !formBuyPrice || !formTargetRegionId) {
      setFormError('Semua kolom bertanda * wajib diisi');
      return;
    }

    const prod = products.find(p => p.id === formProductId);
    const reg = regions.find(r => r.id === formTargetRegionId);

    if (!prod || !reg) {
      setFormError('Produk atau daerah tidak valid');
      return;
    }

    setIsSaving(true);
    try {
      await onSavePurchase({
        id: editingPurchase?.id,
        date: formDate,
        productId: prod.id,
        productName: prod.name,
        slots: Number(formSlots),
        buyPricePerSlot: Number(formBuyPrice),
        targetRegionId: reg.id,
        targetRegionName: reg.name,
        notes: formNotes.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError('Gagal menyimpan pembelian: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeletePurchase(id);
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // Filtered List
  const filteredPurchases = purchases.filter(p => {
    const matchSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetRegionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRegion = !selectedRegionFilter || p.targetRegionId === selectedRegionFilter;
    const matchProduct = !selectedProductFilter || p.productId === selectedProductFilter;
    return matchSearch && matchRegion && matchProduct;
  });

  const totalSlotsBought = filteredPurchases.reduce((acc, p) => acc + p.slots, 0);
  const totalCostBought = filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0);

  return (
    <div className="space-y-6">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-indigo-400" />
            Pembelian Stok dari Pabrik
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catat pengadaan rokok langsung dari pabrik untuk menambah stok di daerah tujuan
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Beli Stok Pabrik</span>
        </button>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs">
        <div>
          <span className="text-indigo-800/80 font-medium">Total Slop Dibeli:</span>
          <div className="text-lg font-bold text-indigo-950 mt-0.5">{formatNumber(totalSlotsBought)} Slop</div>
        </div>
        <div>
          <span className="text-indigo-800/80 font-medium">Total Nilai Pembelian:</span>
          <div className="text-lg font-bold text-indigo-950 mt-0.5">{formatRupiah(totalCostBought)}</div>
        </div>
        <div>
          <span className="text-indigo-800/80 font-medium">Rata-rata Harga / Slop:</span>
          <div className="text-lg font-bold text-indigo-950 mt-0.5">
            {totalSlotsBought > 0 ? formatRupiah(Math.round(totalCostBought / totalSlotsBought)) : 'Rp 0'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari varian, daerah, catatan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedProductFilter}
            onChange={e => setSelectedProductFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Varian</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRegionFilter}
            onChange={e => setSelectedRegionFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Semua Daerah</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Varian Rokok</th>
                <th className="py-3 px-4 text-center">Jumlah</th>
                <th className="py-3 px-4 text-right">Harga Beli / Slop</th>
                <th className="py-3 px-4 text-right">Total Biaya</th>
                <th className="py-3 px-4">Daerah Tujuan</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada rekaman pembelian stok pabrik.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatDateDDMMYYYY(p.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.productName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-700">
                      {formatNumber(p.slots)} <span className="font-normal text-[10px] text-slate-400">slop</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatRupiah(p.buyPricePerSlot)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(p.totalCost)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        {p.targetRegionName}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                      {p.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Pembelian"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Pembelian"
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

      {/* Modal Add / Edit Purchase */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-indigo-600" />
                {editingPurchase ? 'Edit Pembelian Stok Pabrik' : 'Input Pembelian Stok Pabrik'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pembelian *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* Varian Rokok */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Varian Rokok *
                  </label>
                  <select
                    value={formProductId}
                    onChange={e => handleProductChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
                  >
                    <option value="" className="text-slate-500">Pilih Varian...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="text-slate-900">
                        {p.name} (Jual: {formatRupiah(p.pricePerSlot)}/slop)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jumlah Slop */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Slop *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Contoh: 10"
                    value={formSlots}
                    onChange={e => setFormSlots(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
                  />
                  <span className="text-[10px] text-slate-500">1 slop isi 10 bungkus/press</span>
                </div>

                {/* Harga Beli per Slop */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli / Slop (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Contoh: 75000"
                    value={formBuyPrice}
                    onChange={e => setFormBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono bg-white text-slate-900 font-medium placeholder:text-slate-400"
                  />
                  {formBuyPrice !== '' && (
                    <span className="text-[10px] text-slate-600 font-mono">
                      {formatRupiah(Number(formBuyPrice))}
                    </span>
                  )}
                </div>
              </div>

              {/* Total Kalkulasi Otomatis */}
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-900">Total Biaya Pembelian:</span>
                <span className="text-sm font-bold text-indigo-950 font-mono">
                  {formatRupiah(Number(formSlots || 0) * Number(formBuyPrice || 0))}
                </span>
              </div>

              {/* Daerah Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Daerah Tujuan Stok *
                </label>
                <select
                  value={formTargetRegionId}
                  onChange={e => setFormTargetRegionId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
                >
                  <option value="" className="text-slate-500">Pilih Daerah...</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id} className="text-slate-900">
                      {r.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500">
                  Stok otomatis bertambah di daerah ini
                </span>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengiriman batch 1 dari pabrik Kudus..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingPurchase ? 'Simpan Perubahan' : 'Tambah Pembelian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Hapus Transaksi Pembelian?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Transaksi ini akan dihapus permanen. Stok di daerah tujuan akan <strong>otomatis berkurang</strong> menyesuaikan pembatalan pembelian ini.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Tag,
  MapPin,
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Package,
  Phone,
  Home,
} from 'lucide-react';
import { Product, Region, Customer } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';

interface MasterDataViewProps {
  products: Product[];
  regions: Region[];
  customers: Customer[];
  onSaveProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSaveRegion: (name: string, id?: string) => Promise<void>;
  onDeleteRegion: (id: string) => Promise<void>;
  onSaveCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  products,
  regions,
  customers,
  onSaveProduct,
  onDeleteProduct,
  onSaveRegion,
  onDeleteRegion,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'regions' | 'customers'>('products');

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState<number | ''>('');
  const [prodBuyPrice, setProdBuyPrice] = useState<number | ''>('');
  const [prodItems, setProdItems] = useState<number | ''>(10);
  const [prodMinStock, setProdMinStock] = useState<number | ''>(10);
  const [prodError, setProdError] = useState('');

  // Region Modal State
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [regionName, setRegionName] = useState('');
  const [regionError, setRegionError] = useState('');

  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custRegionId, setCustRegionId] = useState('');
  const [custError, setCustError] = useState('');

  // Delete Confirm
  const [deleteModal, setDeleteModal] = useState<{ type: 'product' | 'region' | 'customer'; id: string; name: string } | null>(null);

  // --- Handlers for Product ---
  const openAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdPrice(90000);
    setProdBuyPrice(75000);
    setProdItems(10);
    setProdMinStock(10);
    setProdError('');
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdPrice(p.pricePerSlot);
    setProdBuyPrice(p.defaultBuyPrice || 75000);
    setProdItems(p.itemsPerSlot || 10);
    setProdMinStock(p.minStockThreshold || 10);
    setProdError('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || Number(prodPrice) <= 0) {
      setProdError('Nama varian dan harga per slop wajib diisi');
      return;
    }

    try {
      await onSaveProduct({
        id: editingProduct?.id,
        name: prodName.trim(),
        pricePerSlot: Number(prodPrice),
        defaultBuyPrice: Number(prodBuyPrice) || 75000,
        itemsPerSlot: Number(prodItems) || 10,
        minStockThreshold: Number(prodMinStock) || 10,
      });
      setIsProductModalOpen(false);
    } catch (err: any) {
      setProdError(err.message);
    }
  };

  // --- Handlers for Region ---
  const openAddRegion = () => {
    setEditingRegion(null);
    setRegionName('');
    setRegionError('');
    setIsRegionModalOpen(true);
  };

  const openEditRegion = (r: Region) => {
    setEditingRegion(r);
    setRegionName(r.name);
    setRegionError('');
    setIsRegionModalOpen(true);
  };

  const handleSaveRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regionName.trim()) {
      setRegionError('Nama daerah wajib diisi');
      return;
    }

    try {
      await onSaveRegion(regionName.trim(), editingRegion?.id);
      setIsRegionModalOpen(false);
    } catch (err: any) {
      setRegionError(err.message);
    }
  };

  // --- Handlers for Customer ---
  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustRegionId(regions[0]?.id || '');
    setCustError('');
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustName(c.name);
    setCustPhone(c.phone || '');
    setCustAddress(c.address || '');
    setCustRegionId(c.regionId || '');
    setCustError('');
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      setCustError('Nama pelanggan wajib diisi');
      return;
    }

    const reg = regions.find(r => r.id === custRegionId);
    try {
      await onSaveCustomer({
        id: editingCustomer?.id,
        name: custName.trim(),
        phone: custPhone.trim(),
        address: custAddress.trim(),
        regionId: reg?.id || '',
        regionName: reg?.name || '',
      });
      setIsCustomerModalOpen(false);
    } catch (err: any) {
      setCustError(err.message);
    }
  };

  const executeDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'product') {
      await onDeleteProduct(deleteModal.id);
    } else if (deleteModal.type === 'region') {
      await onDeleteRegion(deleteModal.id);
    } else if (deleteModal.type === 'customer') {
      await onDeleteCustomer(deleteModal.id);
    }
    setDeleteModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-amber-500" />
            Pengelolaan Data Master
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Atur varian produk rokok & harga slop, wilayah distribusi, serta kontak data pelanggan
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Varian Produk ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('regions')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'regions'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Daerah Distribusi ({regions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'customers'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Daftar Pelanggan ({customers.length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Perubahan harga jual master <strong>tidak akan mengubah</strong> harga transaksi lampau yang sudah dicatat.
            </p>
            <button
              type="button"
              onClick={openAddProduct}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> + Tambah Varian Baru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                    <span className="text-[11px] text-slate-400">Isi {p.itemsPerSlot || 10} bungkus / slop</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ type: 'product', id: p.id, name: p.name })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Harga Jual / Slop:</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{formatRupiah(p.pricePerSlot)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Estimasi Beli / Slop:</span>
                    <span className="font-mono">{formatRupiah(p.defaultBuyPrice || 75000)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Peringatan Stok Min:</span>
                    <span className="font-semibold text-amber-700">{p.minStockThreshold || 10} slop</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: REGIONS */}
      {activeTab === 'regions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Daerah tujuan distribusi rokok (misal: Lamongan, Tuban, Gresik, Surabaya, dll).
            </p>
            <button
              type="button"
              onClick={openAddRegion}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> + Tambah Daerah Baru
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {regions.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditRegion(r)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ type: 'region', id: r.id, name: r.name })}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Daftar pembeli pelanggan setia. Pembeli akan otomatis ditambahkan saat Anda menginput penjualan baru.
            </p>
            <button
              type="button"
              onClick={openAddCustomer}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> + Tambah Pelanggan
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Nama Pelanggan</th>
                    <th className="py-3 px-4">Nomor HP (WhatsApp)</th>
                    <th className="py-3 px-4">Alamat Lengkap</th>
                    <th className="py-3 px-4">Daerah</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Belum ada data pelanggan tersimpan.
                      </td>
                    </tr>
                  ) : (
                    customers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {c.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {c.address || '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            {c.regionName || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCustomer(c)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModal({ type: 'customer', id: c.id, name: c.name })}
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

      {/* Modal Add / Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Edit Varian Rokok' : 'Tambah Varian Rokok Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {prodError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prodError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Varian Rokok *</label>
                <input
                  type="text"
                  placeholder="Contoh: Javio, Javier, Matcha, Apel..."
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual / Slop (Rp) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="Contoh: 90000"
                    value={prodPrice}
                    onChange={e => setProdPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 font-mono text-xs"
                  />
                  {prodPrice !== '' && (
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {formatRupiah(Number(prodPrice))}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Beli / Slop (Rp)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="Contoh: 75000"
                    value={prodBuyPrice}
                    onChange={e => setProdBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Isi Bungkus / Slop</label>
                  <input
                    type="number"
                    min="1"
                    value={prodItems}
                    onChange={e => setProdItems(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Standar: 10</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Peringatan Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={prodMinStock}
                    onChange={e => setProdMinStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Peringatan jika sisa ≤ batas ini</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  Simpan Varian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Region */}
      {isRegionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingRegion ? 'Edit Daerah' : 'Tambah Daerah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRegionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {regionError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs">
                {regionError}
              </div>
            )}

            <form onSubmit={handleSaveRegion} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Daerah *</label>
                <input
                  type="text"
                  placeholder="Contoh: Sidoarjo, Mojokerto..."
                  value={regionName}
                  onChange={e => setRegionName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegionModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  Simpan Daerah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Customer */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {custError && (
              <div className="mt-3 p-2 rounded bg-rose-50 text-rose-700 text-xs">
                {custError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  placeholder="Nama pembeli..."
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor HP (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  placeholder="Alamat / Warung / Lokasi..."
                  value={custAddress}
                  onChange={e => setCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Daerah Domisili</label>
                <select
                  value={custRegionId}
                  onChange={e => setCustRegionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-amber-500 bg-white text-xs"
                >
                  <option value="">Pilih Daerah...</option>
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
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Hapus {deleteModal.name}?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Apakah Anda yakin ingin menghapus data master ini?
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
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

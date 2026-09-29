import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { Sale, Product, Region, Customer, PaymentStatus } from '../types';
import { formatRupiah, formatNumber, formatDateDDMMYYYY, getTodayDateString } from '../utils/formatters';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  regions: Region[];
  customers: Customer[];
  onSaveSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount' | 'remainingAmount'> & { id?: string }) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onQuickPay: (saleId: string, additionalPay: number) => Promise<void>;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  products,
  regions,
  customers,
  onSaveSale,
  onDeleteSale,
  onQuickPay,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formRegionId, setFormRegionId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formSlots, setFormSlots] = useState<number | ''>('');
  const [formPricePerSlot, setFormPricePerSlot] = useState<number | ''>('');
  const [formCostPerSlot, setFormCostPerSlot] = useState<number | ''>('');
  const [formPaymentStatus, setFormPaymentStatus] = useState<PaymentStatus>('lunas');
  const [formPaidAmount, setFormPaidAmount] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Quick Pay Modal
  const [quickPaySale, setQuickPaySale] = useState<Sale | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<number | ''>('');

  // Delete Confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingSale(null);
    setFormDate(getTodayDateString());
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerAddress('');
    
    const defaultReg = regions[0];
    const defaultProd = products[0];

    setFormRegionId(defaultReg ? defaultReg.id : '');
    setFormProductId(defaultProd ? defaultProd.id : '');
    setFormSlots(1);
    setFormPricePerSlot(defaultProd ? defaultProd.pricePerSlot : 90000);
    setFormCostPerSlot(defaultProd?.defaultBuyPrice || 75000);
    setFormPaymentStatus('lunas');
    setFormPaidAmount(defaultProd ? defaultProd.pricePerSlot : 90000);
    setFormNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Sale) => {
    setEditingSale(s);
    setFormDate(s.date);
    setFormCustomerName(s.customerName);
    setFormCustomerPhone(s.customerPhone || '');
    setFormCustomerAddress(s.customerAddress || '');
    setFormRegionId(s.regionId);
    setFormProductId(s.productId);
    setFormSlots(s.slots);
    setFormPricePerSlot(s.pricePerSlot);
    setFormCostPerSlot(s.costPerSlot || 0);
    setFormPaymentStatus(s.paymentStatus);
    setFormPaidAmount(s.paidAmount);
    setFormNotes(s.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleProductChange = (prodId: string) => {
    setFormProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setFormPricePerSlot(prod.pricePerSlot);
      if (prod.defaultBuyPrice) {
        setFormCostPerSlot(prod.defaultBuyPrice);
      }
      const slotsNum = Number(formSlots) || 1;
      const total = slotsNum * prod.pricePerSlot;
      if (formPaymentStatus === 'lunas') {
        setFormPaidAmount(total);
      }
    }
  };

  const handleSlotsChange = (slotsVal: number | '') => {
    setFormSlots(slotsVal);
    const numSlots = Number(slotsVal) || 0;
    const price = Number(formPricePerSlot) || 0;
    const total = numSlots * price;
    if (formPaymentStatus === 'lunas') {
      setFormPaidAmount(total);
    }
  };

  const handlePriceChange = (priceVal: number | '') => {
    setFormPricePerSlot(priceVal);
    const price = Number(priceVal) || 0;
    const numSlots = Number(formSlots) || 0;
    const total = numSlots * price;
    if (formPaymentStatus === 'lunas') {
      setFormPaidAmount(total);
    }
  };

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setFormPaymentStatus(status);
    const total = (Number(formSlots) || 0) * (Number(formPricePerSlot) || 0);
    if (status === 'lunas') {
      setFormPaidAmount(total);
    } else if (status === 'belum') {
      setFormPaidAmount(0);
    } else if (status === 'sebagian') {
      if (formPaidAmount === total || formPaidAmount === 0 || formPaidAmount === '') {
        setFormPaidAmount(Math.round(total / 2));
      }
    }
  };

  // Auto-fill customer if chosen from registered list
  const handleSelectCustomer = (custName: string) => {
    setFormCustomerName(custName);
    const found = customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
    if (found) {
      if (found.phone) setFormCustomerPhone(found.phone);
      if (found.address) setFormCustomerAddress(found.address);
      if (found.regionId) setFormRegionId(found.regionId);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formCustomerName.trim() || !formRegionId || !formProductId || !formSlots || formPricePerSlot === '') {
      setFormError('Mohon isi semua kolom bertanda *');
      return;
    }

    const prod = products.find(p => p.id === formProductId);
    const reg = regions.find(r => r.id === formRegionId);
    if (!prod || !reg) {
      setFormError('Produk atau daerah tidak valid');
      return;
    }

    const numSlots = Number(formSlots);
    const price = Number(formPricePerSlot);
    const totalAmount = numSlots * price;
    let paid = Number(formPaidAmount) || 0;
    if (paid > totalAmount) paid = totalAmount;

    let finalStatus = formPaymentStatus;
    if (paid >= totalAmount) finalStatus = 'lunas';
    else if (paid <= 0) finalStatus = 'belum';
    else finalStatus = 'sebagian';

    setIsSaving(true);
    try {
      await onSaveSale({
        id: editingSale?.id,
        date: formDate,
        customerName: formCustomerName.trim(),
        customerPhone: formCustomerPhone.trim(),
        customerAddress: formCustomerAddress.trim(),
        regionId: reg.id,
        regionName: reg.name,
        productId: prod.id,
        productName: prod.name,
        slots: numSlots,
        pricePerSlot: price,
        costPerSlot: Number(formCostPerSlot) || prod.defaultBuyPrice || 75000,
        paidAmount: paid,
        paymentStatus: finalStatus,
        notes: formNotes.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError('Gagal menyimpan penjualan: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaySale || !quickPayAmount || Number(quickPayAmount) <= 0) return;

    try {
      await onQuickPay(quickPaySale.id, Number(quickPayAmount));
      setQuickPaySale(null);
      setQuickPayAmount('');
    } catch (err) {
      console.error('Quick pay error', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteSale(id);
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // Filter list
  const filteredSales = sales.filter(s => {
    const matchSearch =
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.regionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(searchTerm)) ||
      (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = !selectedStatusFilter || s.paymentStatus === selectedStatusFilter;
    const matchRegion = !selectedRegionFilter || s.regionId === selectedRegionFilter;

    return matchSearch && matchStatus && matchRegion;
  });

  const totalOmzet = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSlotsSold = filteredSales.reduce((acc, s) => acc + s.slots, 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalRemaining = filteredSales.reduce((acc, s) => acc + s.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            Catatan Penjualan Rokok
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input penjualan pelanggan, pilih pelanggan lama, lacak status pembayaran, dan kurangi stok otomatis
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Input Penjualan Baru</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-amber-50/60 border border-amber-200/60 rounded-xl p-4 text-xs">
        <div>
          <span className="text-amber-900/80 font-medium">Total Terjual:</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{formatNumber(totalSlotsSold)} Slop</div>
        </div>
        <div>
          <span className="text-amber-900/80 font-medium">Total Omzet Penjualan:</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{formatRupiah(totalOmzet)}</div>
        </div>
        <div>
          <span className="text-emerald-900/80 font-medium">Kas Diterima:</span>
          <div className="text-lg font-bold text-emerald-700 mt-0.5">{formatRupiah(totalPaid)}</div>
        </div>
        <div>
          <span className="text-rose-900/80 font-medium">Sisa Piutang:</span>
          <div className="text-lg font-bold text-rose-600 mt-0.5">{formatRupiah(totalRemaining)}</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pembeli, HP, varian, daerah..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">Semua Status Bayar</option>
            <option value="lunas">Lunas</option>
            <option value="sebagian">Sebagian (Cicil)</option>
            <option value="belum">Belum Bayar</option>
          </select>

          <select
            value={selectedRegionFilter}
            onChange={e => setSelectedRegionFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-amber-500"
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

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Pembeli</th>
                <th className="py-3 px-4">Varian & Daerah</th>
                <th className="py-3 px-4 text-center">Jumlah</th>
                <th className="py-3 px-4 text-right">Harga / Slop</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-center">Status Bayar</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada transaksi penjualan pada kriteria ini.
                  </td>
                </tr>
              ) : (
                filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatDateDDMMYYYY(s.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.customerName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {s.customerPhone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" /> {s.customerPhone}
                          </span>
                        )}
                        {s.customerAddress && (
                          <span className="truncate max-w-[120px]" title={s.customerAddress}>
                            • {s.customerAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{s.productName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-amber-600" /> {s.regionName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-700">
                      {formatNumber(s.slots)} <span className="font-normal text-[10px] text-slate-400">slop</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatRupiah(s.pricePerSlot)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(s.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {s.paymentStatus === 'lunas' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lunas
                        </span>
                      )}
                      {s.paymentStatus === 'sebagian' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" /> Sebagian
                        </span>
                      )}
                      {s.paymentStatus === 'belum' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Belum
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                      {s.remainingAmount > 0 ? (
                        <div className="text-rose-600 font-bold">
                          {formatRupiah(s.remainingAmount)}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPaySale(s);
                              setQuickPayAmount(s.remainingAmount);
                            }}
                            className="block text-[10px] text-amber-600 hover:text-amber-700 font-sans font-semibold underline mt-0.5 ml-auto"
                          >
                            + Bayar Piutang
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Edit Penjualan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(s.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Penjualan"
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

      {/* Modal Add / Edit Sale */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                {editingSale ? 'Edit Transaksi Penjualan' : 'Input Transaksi Penjualan Baru'}
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
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Penjualan *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Data Pembeli with Quick Select */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-600" /> Data Pembeli
                  </span>
                  {customers.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <select
                        onChange={e => handleSelectCustomer(e.target.value)}
                        defaultValue=""
                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]"
                      >
                        <option value="" disabled>Pilih Pembeli Lama...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.regionName ? `(${c.regionName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Pembeli *
                    </label>
                    <input
                      type="text"
                      placeholder="Nama lengkap pembeli..."
                      value={formCustomerName}
                      onChange={e => setFormCustomerName(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nomor HP (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      value={formCustomerPhone}
                      onChange={e => setFormCustomerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Alamat Lengkap
                    </label>
                    <input
                      type="text"
                      placeholder="Jalan / Desa / Kios..."
                      value={formCustomerAddress}
                      onChange={e => setFormCustomerAddress(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Daerah Penjualan *
                    </label>
                    <select
                      value={formRegionId}
                      onChange={e => setFormRegionId(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-amber-500"
                    >
                      <option value="">Pilih Daerah...</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Produk & Jumlah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Varian Rokok *
                  </label>
                  <select
                    value={formProductId}
                    onChange={e => handleProductChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-amber-500 bg-white"
                  >
                    <option value="">Pilih Varian...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatRupiah(p.pricePerSlot)}/slop)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Slop *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Contoh: 2"
                    value={formSlots}
                    onChange={e => handleSlotsChange(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">1 slop isi 10 bungkus</span>
                </div>
              </div>

              {/* Harga Jual & HPP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual / Slop (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formPricePerSlot}
                    onChange={e => handlePriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-amber-500 font-mono"
                  />
                  {formPricePerSlot !== '' && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatRupiah(Number(formPricePerSlot))}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HPP Pokok / Slop (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formCostPerSlot}
                    onChange={e => setFormCostPerSlot(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Untuk kalkulasi laba kotor akurat</span>
                </div>
              </div>

              {/* Kalkulasi Otomatis */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-900 font-medium">Total Tagihan Penjualan:</span>
                  <div className="text-base font-bold text-amber-950 font-mono mt-0.5">
                    {formatRupiah((Number(formSlots) || 0) * (Number(formPricePerSlot) || 0))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Estimasi Laba Kotor:</span>
                  <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                    {formatRupiah(((Number(formPricePerSlot) || 0) - (Number(formCostPerSlot) || 0)) * (Number(formSlots) || 0))}
                  </div>
                </div>
              </div>

              {/* Status Pembayaran */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  Status Pembayaran *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange('lunas')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      formPaymentStatus === 'lunas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange('sebagian')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      formPaymentStatus === 'sebagian'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ⏳ Sebagian
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentStatusChange('belum')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      formPaymentStatus === 'belum'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ✕ Belum Bayar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jumlah yang Sudah Dibayar (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={(Number(formSlots) || 0) * (Number(formPricePerSlot) || 0)}
                    value={formPaidAmount}
                    onChange={e => setFormPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-amber-500 font-mono"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>
                      Sisa Piutang:{' '}
                      <strong className="text-rose-600 font-mono">
                        {formatRupiah(Math.max(0, ((Number(formSlots) || 0) * (Number(formPricePerSlot) || 0)) - (Number(formPaidAmount) || 0)))}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Janji pelunasan akhir minggu ini..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-amber-500"
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
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingSale ? 'Simpan Perubahan' : 'Catat Penjualan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Pay Modal */}
      {quickPaySale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Catat Pelunasan / Cicilan
              </h3>
              <button
                type="button"
                onClick={() => setQuickPaySale(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="mt-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pembeli:</span>
                  <span className="font-bold text-slate-900">{quickPaySale.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Varian:</span>
                  <span className="text-slate-800">{quickPaySale.productName} ({quickPaySale.slots} slop)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-mono text-slate-800">{formatRupiah(quickPaySale.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                  <span>Sisa Piutang:</span>
                  <span className="font-mono">{formatRupiah(quickPaySale.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran Diterima (Rp) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={quickPaySale.remainingAmount}
                  step="500"
                  value={quickPayAmount}
                  onChange={e => setQuickPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:border-emerald-500 font-mono"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setQuickPayAmount(quickPaySale.remainingAmount)}
                    className="px-2 py-1 text-[11px] rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200"
                  >
                    Lunaskan Penuh ({formatRupiah(quickPaySale.remainingAmount)})
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPaySale(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Hapus Transaksi Penjualan?</h3>
            <p className="text-xs text-slate-500 mt-2">
              Transaksi ini akan dihapus permanen. Stok di daerah terkait akan <strong>otomatis bertambah kembali</strong> menyesuaikan pembatalan penjualan ini.
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

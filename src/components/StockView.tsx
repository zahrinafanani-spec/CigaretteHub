import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Layers,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  PackagePlus,
  Search,
} from 'lucide-react';
import { Product, Region, Purchase, Sale } from '../types';
import { formatNumber, formatRupiah } from '../utils/formatters';

interface StockViewProps {
  products: Product[];
  regions: Region[];
  allPurchases: Purchase[];
  allSales: Sale[];
  onNavigateToPurchases: () => void;
  onNavigateToSales: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  regions,
  allPurchases,
  allSales,
  onNavigateToPurchases,
  onNavigateToSales,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');

  // Strictly filter & deduplicate variants: Javio, Javier, Kopi, Apel & Matcha (no duplicates)
  const allowedVariantNames = ['Javio', 'Javier', 'Kopi', 'Apel', 'Matcha'];
  const uniqueProducts = useMemo(() => {
    const list: Product[] = [];
    const seen = new Set<string>();
    for (const name of allowedVariantNames) {
      const match = products.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
      if (match && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(match);
      }
    }
    return list;
  }, [products]);

  // Strictly filter & deduplicate regions in alphabetical order: Gresik, Lamongan, Surabaya, Tuban
  const allowedRegionNames = ['Gresik', 'Lamongan', 'Surabaya', 'Tuban'];
  const uniqueRegions = useMemo(() => {
    const list: Region[] = [];
    const seen = new Set<string>();
    for (const name of allowedRegionNames) {
      const match = regions.find(r => r.name.trim().toLowerCase() === name.toLowerCase());
      if (match && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(match);
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [regions]);

  // Calculate stock dynamically for each variant & region
  const stockMatrix = uniqueProducts.map(prod => {
    let totalBoughtProd = 0;
    let totalSoldProd = 0;

    const regionBreakdown = uniqueRegions.map(reg => {
      const bought = allPurchases
        .filter(p => p.productId === prod.id && p.targetRegionId === reg.id)
        .reduce((sum, p) => sum + p.slots, 0);

      const sold = allSales
        .filter(s => s.productId === prod.id && s.regionId === reg.id)
        .reduce((sum, s) => sum + s.slots, 0);

      const current = bought - sold;
      totalBoughtProd += bought;
      totalSoldProd += sold;

      return {
        regionId: reg.id,
        regionName: reg.name,
        bought,
        sold,
        currentStock: current,
      };
    });

    const totalStock = totalBoughtProd - totalSoldProd;
    const threshold = prod.minStockThreshold || 10;
    const isLow = totalStock <= threshold;

    return {
      product: prod,
      regionBreakdown,
      totalBought: totalBoughtProd,
      totalSold: totalSoldProd,
      totalStock,
      isLow,
      threshold,
      estimatedAssetValue: totalStock * prod.pricePerSlot,
    };
  });

  // Global counts
  const totalStockAcrossAll = stockMatrix.reduce((acc, item) => acc + item.totalStock, 0);
  const totalEstimatedAssetValue = stockMatrix.reduce((acc, item) => acc + item.estimatedAssetValue, 0);
  const lowStockCount = stockMatrix.filter(item => item.isLow).length;

  // Filtered Matrix
  const filteredMatrix = stockMatrix.filter(item =>
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Manajemen & Monitoring Stok Real-Time
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Stok dihitung otomatis dari riwayat transaksi pembelian pabrik dikurangi penjualan pelanggan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToPurchases}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
          >
            <PackagePlus className="w-4 h-4" /> Beli Stok Baru
          </button>
          <button
            type="button"
            onClick={onNavigateToSales}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors"
          >
            <ShoppingBag className="w-4 h-4" /> Jual Stok
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Stok Keseluruhan</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {formatNumber(totalStockAcrossAll)} <span className="text-xs font-normal text-slate-500">slop</span>
            </div>
            <span className="text-[11px] text-slate-400">({formatNumber(totalStockAcrossAll * 10)} bungkus)</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Estimasi Nilai Aset Stok</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {formatRupiah(totalEstimatedAssetValue)}
            </div>
            <span className="text-[11px] text-slate-400">Berdasarkan harga master jual saat ini</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="font-bold text-lg">Rp</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Status Peringatan Stok</span>
            <div className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockCount > 0 ? `${lowStockCount} Menipis` : 'Aman'}
            </div>
            <span className="text-[11px] text-slate-400">
              {lowStockCount > 0 ? 'Perlu segera re-stok dari pabrik' : 'Semua varian mencukupi'}
            </span>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
            {lowStockCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari varian rokok..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Sortir Daerah Fokus:</span>
          <select
            value={selectedRegionFilter}
            onChange={e => setSelectedRegionFilter(e.target.value)}
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">Semua Daerah ({uniqueRegions.length})</option>
            {uniqueRegions.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Matriks Stok per Varian & Daerah (Slop)
          </h3>
          <span className="text-[11px] text-slate-500">
            1 Slop = 10 Bungkus
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Varian Rokok</th>
                <th className="py-3 px-4 text-right">Harga Jual / Slop</th>
                {uniqueRegions
                  .filter(r => !selectedRegionFilter || r.id === selectedRegionFilter)
                  .map(r => (
                    <th key={r.id} className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        {r.name}
                      </div>
                    </th>
                  ))}
                <th className="py-3 px-4 text-center font-bold text-slate-900 bg-amber-50/50">
                  Total Stok
                </th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={4 + uniqueRegions.length} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data varian rokok.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(row => (
                  <tr key={row.product.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{row.product.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatRupiah(row.product.pricePerSlot)}
                    </td>
                    {uniqueRegions
                      .filter(r => !selectedRegionFilter || r.id === selectedRegionFilter)
                      .map(r => {
                        const regData = row.regionBreakdown.find(rb => rb.regionId === r.id);
                        const stock = regData ? regData.currentStock : 0;
                        return (
                          <td key={r.id} className="py-3.5 px-4 text-center font-mono">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-semibold ${
                                stock <= 2
                                  ? 'bg-rose-50 text-rose-700'
                                  : stock <= 5
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'text-slate-700'
                              }`}
                            >
                              {formatNumber(stock)}
                            </span>
                          </td>
                        );
                      })}
                    <td className="py-3.5 px-4 text-center bg-amber-50/30">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatNumber(row.totalStock)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">slop</span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {row.isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Menipis (≤{row.threshold})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Aman
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

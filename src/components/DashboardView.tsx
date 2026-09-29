import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  MapPin,
  CheckCircle2,
  DollarSign,
  PieChart,
  BarChart3,
  Calendar,
  ChevronRight,
  PackagePlus,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Info,
} from 'lucide-react';
import { Product, Region, Purchase, Sale, Expense, TimeRangeFilter } from '../types';
import { formatRupiah, formatNumber, formatDateDDMMYYYY } from '../utils/formatters';

interface DashboardViewProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  regions: Region[];
  allPurchases: Purchase[];
  allSales: Sale[];
  onNavigateToStock: () => void;
  onNavigateToSales: () => void;
  onNavigateToPurchases: () => void;
  dateFilter?: TimeRangeFilter;
  onDateFilterChange?: (filter: TimeRangeFilter) => void;
  dateRangeLabel?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  purchases,
  expenses,
  products,
  regions,
  allPurchases,
  allSales,
  onNavigateToStock,
  onNavigateToSales,
  onNavigateToPurchases,
  dateFilter = '30d',
  onDateFilterChange,
  dateRangeLabel = '30 Hari Terakhir',
}) => {
  // Chart visual control state
  const [chartMetric, setChartMetric] = useState<'omzet' | 'slots' | 'profit'>('omzet');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [activeRecentTab, setActiveRecentTab] = useState<'sales' | 'purchases'>('sales');
  const [hoveredRegionIndex, setHoveredRegionIndex] = useState<number | null>(null);

  // 1. Calculations for the filtered range
  const totalSalesSlots = useMemo(() => sales.reduce((sum, s) => sum + s.slots, 0), [sales]);
  const totalSalesOmzet = useMemo(() => sales.reduce((sum, s) => sum + s.totalAmount, 0), [sales]);
  const totalPaid = useMemo(() => sales.reduce((sum, s) => sum + s.paidAmount, 0), [sales]);

  // Cost of Goods Sold (HPP) in filtered range
  const totalSalesCost = useMemo(
    () => sales.reduce((sum, s) => sum + s.slots * (s.costPerSlot || 0), 0),
    [sales]
  );
  const grossProfit = totalSalesOmzet - totalSalesCost;

  // Expenses in filtered range
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSalesOmzet > 0 ? ((netProfit / totalSalesOmzet) * 100).toFixed(1) : '0';

  // Purchases in filtered range
  const totalPurchasesSlots = useMemo(() => purchases.reduce((sum, p) => sum + p.slots, 0), [purchases]);
  const totalPurchasesCost = useMemo(() => purchases.reduce((sum, p) => sum + p.totalCost, 0), [purchases]);
  const avgPurchaseCostPerSlot = totalPurchasesSlots > 0 ? Math.round(totalPurchasesCost / totalPurchasesSlots) : 0;

  // Piutang: sum of remaining amount from all unpaid sales (lifetime)
  const totalReceivables = useMemo(() => allSales.reduce((sum, s) => sum + s.remainingAmount, 0), [allSales]);
  const unpaidSalesCount = useMemo(() => allSales.filter(s => s.remainingAmount > 0).length, [allSales]);
  const paidRatio = totalSalesOmzet > 0 ? Math.min(100, Math.round((totalPaid / totalSalesOmzet) * 100)) : 100;

  // 2. Allowed variants & Global Stock calculation (Lifetime Purchases - Lifetime Sales)
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
    // If some products from products prop aren't in the default 5, include remaining
    products.forEach(p => {
      if (!seen.has(p.name.trim().toLowerCase())) {
        seen.add(p.name.trim().toLowerCase());
        list.push(p);
      }
    });
    return list;
  }, [products]);

  // Stock status per product
  const stockByProduct = useMemo(() => {
    return uniqueProducts.map(prod => {
      const bought = allPurchases.filter(p => p.productId === prod.id).reduce((sum, p) => sum + p.slots, 0);
      const sold = allSales.filter(s => s.productId === prod.id).reduce((sum, s) => sum + s.slots, 0);
      const currentStock = Math.max(0, bought - sold);
      const threshold = prod.minStockThreshold || 10;
      const isLow = currentStock <= threshold;
      const isCritical = currentStock <= Math.floor(threshold / 2);
      return {
        product: prod,
        currentStock,
        threshold,
        isLow,
        isCritical,
        valuation: currentStock * (prod.pricePerSlot || 0),
      };
    });
  }, [uniqueProducts, allPurchases, allSales]);

  const totalStockSlots = useMemo(() => {
    return stockByProduct.reduce((sum, item) => sum + item.currentStock, 0);
  }, [stockByProduct]);

  const totalStockValuation = useMemo(() => {
    return stockByProduct.reduce((sum, item) => sum + item.valuation, 0);
  }, [stockByProduct]);

  const lowStockItems = useMemo(() => {
    return stockByProduct.filter(item => item.isLow);
  }, [stockByProduct]);

  // 3. Variant Breakdown in filtered range
  const variantSales = useMemo(() => {
    return uniqueProducts.map(prod => {
      const prodSales = sales.filter(s => s.productId === prod.id);
      const slots = prodSales.reduce((sum, s) => sum + s.slots, 0);
      const omzet = prodSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const cost = prodSales.reduce((sum, s) => sum + s.slots * (s.costPerSlot || 0), 0);
      const profit = omzet - cost;
      const stockInfo = stockByProduct.find(sbp => sbp.product.id === prod.id);
      return {
        id: prod.id,
        name: prod.name,
        slots,
        omzet,
        profit,
        price: prod.pricePerSlot,
        currentStock: stockInfo ? stockInfo.currentStock : 0,
        isLow: stockInfo ? stockInfo.isLow : false,
      };
    }).sort((a, b) => b.slots - a.slots);
  }, [uniqueProducts, sales, stockByProduct]);

  // 4. Region Breakdown in filtered range: Alphabetical (Gresik, Lamongan, Surabaya, Tuban)
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
    // sort alphabetically
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [regions]);

  const regionColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  const regionSales = useMemo(() => {
    return uniqueRegions.map((reg, idx) => {
      const regSales = sales.filter(s => s.regionId === reg.id);
      const slots = regSales.reduce((sum, s) => sum + s.slots, 0);
      const omzet = regSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const share = totalSalesOmzet > 0 ? (omzet / totalSalesOmzet) * 100 : 0;
      return {
        id: reg.id,
        name: reg.name,
        slots,
        omzet,
        share: Math.round(share),
        exactShare: share,
        color: regionColors[idx % regionColors.length],
      };
    });
  }, [uniqueRegions, sales, totalSalesOmzet]);

  // 5. Daily Trend Aggregation for Line Chart
  const trendData = useMemo(() => {
    const map: Record<string, { date: string; slots: number; omzet: number; profit: number; count: number }> = {};

    sales.forEach(s => {
      if (!map[s.date]) {
        map[s.date] = { date: s.date, slots: 0, omzet: 0, profit: 0, count: 0 };
      }
      map[s.date].slots += s.slots;
      map[s.date].omzet += s.totalAmount;
      map[s.date].profit += s.totalAmount - (s.slots * (s.costPerSlot || 0));
      map[s.date].count += 1;
    });

    const sorted = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    return sorted;
  }, [sales]);

  // SVG Line Chart Coordinate calculation
  const chartHeight = 220;
  const chartWidth = 740;
  const paddingLeft = 60;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 35;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    if (trendData.length === 0) return 100;
    const values = trendData.map(d => {
      if (chartMetric === 'omzet') return d.omzet;
      if (chartMetric === 'slots') return d.slots;
      return Math.max(0, d.profit);
    });
    const peak = Math.max(...values, 10);
    // Round up nicely
    return Math.ceil(peak * 1.15);
  }, [trendData, chartMetric]);

  const points = useMemo(() => {
    if (trendData.length === 0) return [];
    if (trendData.length === 1) {
      const d = trendData[0];
      const val = chartMetric === 'omzet' ? d.omzet : chartMetric === 'slots' ? d.slots : d.profit;
      const y = paddingTop + innerHeight - (val / maxVal) * innerHeight;
      return [{ x: paddingLeft + innerWidth / 2, y, data: d }];
    }
    return trendData.map((d, i) => {
      const val = chartMetric === 'omzet' ? d.omzet : chartMetric === 'slots' ? d.slots : d.profit;
      const x = paddingLeft + (i / (trendData.length - 1)) * innerWidth;
      const y = paddingTop + innerHeight - (Math.max(0, val) / maxVal) * innerHeight;
      return { x, y, data: d };
    });
  }, [trendData, chartMetric, maxVal, innerWidth, innerHeight, paddingLeft, paddingTop]);

  // SVG Path generation (Smooth bezier curve)
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baselineY = paddingTop + innerHeight;
    if (points.length === 1) {
      return `M ${points[0].x - 20} ${baselineY} L ${points[0].x} ${points[0].y} L ${points[0].x + 20} ${baselineY} Z`;
    }
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [linePath, points, paddingTop, innerHeight]);

  // Y-axis grid ticks (4 ticks)
  const yTicks = useMemo(() => {
    return [0, 0.33, 0.66, 1].map(pct => {
      const value = Math.round(maxVal * pct);
      const y = paddingTop + innerHeight - pct * innerHeight;
      let label = `${value}`;
      if (chartMetric === 'omzet' || chartMetric === 'profit') {
        if (value >= 1_000_000) {
          label = `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
        } else if (value >= 1_000) {
          label = `${Math.round(value / 1_000)}k`;
        } else {
          label = `${value}`;
        }
      }
      return { y, value, label };
    });
  }, [maxVal, innerHeight, paddingTop, chartMetric]);

  // X-axis label sampling (up to 6 labels)
  const xLabels = useMemo(() => {
    if (points.length <= 6) return points;
    const step = Math.ceil(points.length / 5);
    return points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);
  }, [points]);

  // Donut Chart calculations for Regional Sales
  const donutRadius = 55;
  const donutStrokeWidth = 20;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = useMemo(() => {
    let currentOffset = 0;
    return regionSales.map(r => {
      const strokeLength = totalSalesOmzet > 0 ? (r.omzet / totalSalesOmzet) * donutCircumference : 0;
      const strokeDasharray = `${strokeLength} ${donutCircumference - strokeLength}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += strokeLength;
      return {
        ...r,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [regionSales, totalSalesOmzet, donutCircumference]);

  // Recent transactions: last 6 sales & last 6 purchases
  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [sales]);

  const recentPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [purchases]);

  // Active point for tooltip
  const activePoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
                Peringatan Inventaris: {lowStockItems.length} Varian Rokok Menipis
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {lowStockItems
                  .map(item => `${item.product.name} (Sisa ${item.currentStock} slop)`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToPurchases}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shrink-0 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>+ Beli Stok Pabrik</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROW 1: 5 COMPACT KPI CARDS                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Penjualan */}
        <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-4 shadow-xs hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Penjualan
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-bold tracking-tight text-white font-mono tabular-nums">
                {formatRupiah(totalSalesOmzet)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="text-amber-400 font-semibold font-mono">
                  {formatNumber(totalSalesSlots)} Slop
                </span>
                <span>·</span>
                <span>{sales.length} Trx</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Kas Masuk: <strong className="text-slate-200 font-mono">{formatRupiah(totalPaid)}</strong></span>
            <button
              type="button"
              onClick={onNavigateToSales}
              className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-0.5"
            >
              Lihat <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 2: Total Pembelian */}
        <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-4 shadow-xs hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total Pembelian
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <PackagePlus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-bold tracking-tight text-white font-mono tabular-nums">
                {formatRupiah(totalPurchasesCost)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="text-indigo-400 font-semibold font-mono">
                  {formatNumber(totalPurchasesSlots)} Slop
                </span>
                <span>·</span>
                <span>{purchases.length} Faktur Pabrik</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Rata-rata: <strong className="text-slate-200 font-mono">{formatRupiah(avgPurchaseCostPerSlot)}/slop</strong></span>
            <button
              type="button"
              onClick={onNavigateToPurchases}
              className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-0.5"
            >
              Lihat <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 3: Sisa Stok Gudang */}
        <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-4 shadow-xs hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Sisa Stok Siap Jual
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-bold tracking-tight text-white font-mono tabular-nums">
                {formatNumber(totalStockSlots)}{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">Slop</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span>{uniqueProducts.length} Varian</span>
                <span>·</span>
                <span>4 Wilayah Aktif</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className={lowStockItems.length > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : 'Stok Aman'}
            </span>
            <button
              type="button"
              onClick={onNavigateToStock}
              className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-0.5"
            >
              Kelola <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 4: Laba Bersih */}
        <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-4 shadow-xs hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Laba Bersih
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div
                className={`text-xl font-bold tracking-tight font-mono tabular-nums ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatRupiah(netProfit)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span>Margin: <strong className="text-slate-200">{profitMargin}%</strong></span>
                <span>·</span>
                <span>Kotor: {formatRupiah(grossProfit)}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Beban Ops: <strong className="text-slate-200 font-mono">{formatRupiah(totalExpenses)}</strong></span>
            <span className="text-slate-500">Estimasi</span>
          </div>
        </div>

        {/* KPI 5: Piutang / Tagihan */}
        <div className="bg-[#111827] rounded-xl border border-slate-800/80 p-4 shadow-xs hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Piutang / Tagihan
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <div
                className={`text-xl font-bold tracking-tight font-mono tabular-nums ${
                  totalReceivables > 0 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {formatRupiah(totalReceivables)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="text-rose-400 font-medium">
                  {unpaidSalesCount} Faktur Belum Lunas
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Kolektibilitas: <strong className="text-slate-200 font-mono">{paidRatio}%</strong></span>
            <span className="text-rose-400/80 text-[10px]">Aktif</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: LARGE SALES TREND (8 cols) + REGIONAL DISTRIBUTION (4 cols)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Sales Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          {/* Card Header & Chart Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Tren Penjualan & Distribusi
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">({dateRangeLabel})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring grafik omzet, volume slop, dan laba harian
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric Selector Buttons */}
              <div className="flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMetric('omzet')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMetric === 'omzet'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Omzet (Rp)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('slots')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMetric === 'slots'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Volume (Slop)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('profit')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMetric === 'profit'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Laba Kotor
                </button>
              </div>

              {/* Period Quick Shortcuts (7 Hari, 30 Hari, 3 Bulan, 1 Tahun) */}
              {onDateFilterChange && (
                <div className="hidden sm:flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-slate-800">
                  {(['7d', '30d', '3m', '1y'] as TimeRangeFilter[]).map(key => {
                    const label = key === '7d' ? '7H' : key === '30d' ? '30H' : key === '3m' ? '3B' : '1T';
                    const active = dateFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onDateFilterChange(key)}
                        className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                          active
                            ? 'bg-slate-700 text-slate-100 font-semibold'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={key === '7d' ? '7 Hari' : key === '30d' ? '30 Hari' : key === '3m' ? '3 Bulan' : '1 Tahun'}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="pt-4 flex-1 relative min-h-[240px]">
            {trendData.length === 0 ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                <BarChart3 className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs font-medium text-slate-400">
                  Belum ada rekaman transaksi penjualan pada periode ini.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToSales}
                  className="mt-3 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition-colors shadow-xs"
                >
                  + Catat Penjualan Sekarang
                </button>
              </div>
            ) : (
              <div className="w-full relative">
                {/* SVG Responsive Area & Line Chart */}
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-56 sm:h-64 overflow-visible"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {yTicks.map(tick => (
                    <g key={tick.y}>
                      <line
                        x1={paddingLeft}
                        y1={tick.y}
                        x2={chartWidth - paddingRight}
                        y2={tick.y}
                        stroke="rgba(255, 255, 255, 0.06)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={tick.y + 3}
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Area Fill */}
                  <path d={areaPath} fill="url(#salesGradient)" />

                  {/* Smooth Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Hover Crosshair Line */}
                  {activePoint && (
                    <line
                      x1={activePoint.x}
                      y1={paddingTop}
                      x2={activePoint.x}
                      y2={paddingTop + innerHeight}
                      stroke="rgba(245, 158, 11, 0.5)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Data Points */}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    return (
                      <g key={p.data.date}>
                        {/* Invisible hover capture area */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="14"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                        />
                        {/* Visible Point */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? '5' : '3'}
                          fill={isHovered ? '#F59E0B' : '#0B0F19'}
                          stroke="#F59E0B"
                          strokeWidth={isHovered ? '2.5' : '1.5'}
                          className="transition-all pointer-events-none"
                        />
                      </g>
                    );
                  })}

                  {/* X-Axis Labels */}
                  {xLabels.map(p => (
                    <text
                      key={p.data.date}
                      x={p.x}
                      y={chartHeight - 8}
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {formatDateDDMMYYYY(p.data.date).slice(0, 5)}
                    </text>
                  ))}
                </svg>

                {/* Floating Interactive Tooltip */}
                {activePoint && (
                  <div
                    className="absolute z-20 pointer-events-none bg-[#0D1322] border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs text-white transform -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                      left: `${(activePoint.x / chartWidth) * 100}%`,
                      top: `${Math.max(10, (activePoint.y / chartHeight) * 100)}%`,
                    }}
                  >
                    <div className="font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1 font-mono">
                      {formatDateDDMMYYYY(activePoint.data.date)}
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Omzet:</span>
                        <span className="font-bold text-amber-400 font-mono">
                          {formatRupiah(activePoint.data.omzet)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Volume:</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {formatNumber(activePoint.data.slots)} slop
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Laba Kotor:</span>
                        <span className="font-semibold text-emerald-400 font-mono">
                          {formatRupiah(activePoint.data.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Card Summary Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Total Omzet</span>
              <strong className="text-slate-200 font-mono">{formatRupiah(totalSalesOmzet)}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Volume Terjual</span>
              <strong className="text-slate-200 font-mono">{formatNumber(totalSalesSlots)} Slop</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Rata-rata/Faktur</span>
              <strong className="text-slate-200 font-mono">
                {sales.length > 0 ? formatRupiah(Math.round(totalSalesOmzet / sales.length)) : 'Rp 0'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Hari Berjalan</span>
              <strong className="text-amber-400 font-mono">{trendData.length} Hari Aktif</strong>
            </div>
          </div>
        </div>

        {/* Smaller Sales / Distribution Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Distribusi per Wilayah
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pangsa pasar 4 daerah operasional
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <PieChart className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Donut Chart Visual */}
            <div className="py-4 flex items-center justify-center relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={donutRadius}
                  stroke="#1E293B"
                  strokeWidth={donutStrokeWidth}
                  fill="transparent"
                />

                {/* Segments */}
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={seg.id}
                    cx="70"
                    cy="70"
                    r={donutRadius}
                    stroke={seg.color}
                    strokeWidth={donutStrokeWidth}
                    fill="transparent"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredRegionIndex(idx)}
                    onMouseLeave={() => setHoveredRegionIndex(null)}
                    style={{
                      opacity: hoveredRegionIndex === null || hoveredRegionIndex === idx ? 1 : 0.35,
                    }}
                  />
                ))}
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  {hoveredRegionIndex !== null ? regionSales[hoveredRegionIndex].name : 'Total'}
                </span>
                <span className="text-xs font-bold text-white font-mono tabular-nums">
                  {hoveredRegionIndex !== null
                    ? `${regionSales[hoveredRegionIndex].share}%`
                    : formatNumber(totalSalesSlots) + ' slop'}
                </span>
              </div>
            </div>

            {/* Ranked Regional List */}
            <div className="space-y-2 mt-1">
              {regionSales.map((reg, idx) => {
                const isHovered = hoveredRegionIndex === idx;
                return (
                  <div
                    key={reg.id}
                    onMouseEnter={() => setHoveredRegionIndex(idx)}
                    onMouseLeave={() => setHoveredRegionIndex(null)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-[#0B0F19]/50 border-slate-800/60 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: reg.color }}
                        />
                        <span className="font-semibold text-slate-200">{reg.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white font-mono">{formatRupiah(reg.omzet)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({reg.share}%)</span>
                      </div>
                    </div>
                    {/* Share Progress Bar */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${reg.share}%`, backgroundColor: reg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Daerah Distribusi Terdaftar</span>
            <span className="font-mono text-slate-300">4 Wilayah Aktif</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: PRODUCT PERFORMANCE (6 cols) + STOCK OVERVIEW (6 cols)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Product Performance (Left 6 cols) */}
        <div className="lg:col-span-6 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Performa Varian Rokok
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Volume penjualan & kontribusi omzet 5 varian
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {variantSales.map((v, idx) => {
                const percent = totalSalesSlots > 0 ? Math.round((v.slots / totalSalesSlots) * 100) : 0;
                return (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border border-slate-800/70 bg-[#0B0F19]/40 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-amber-400 text-[11px] font-bold flex items-center justify-center border border-slate-700 font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-white text-xs">{v.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({formatRupiah(v.price)}/slop)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 font-mono">
                          {formatNumber(v.slots)} slop
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                          ({percent}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-1.5">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>Omzet: <strong className="text-slate-200 font-mono">{formatRupiah(v.omzet)}</strong></span>
                      <span className={v.isLow ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                        Sisa Gudang: <strong className="font-mono">{v.currentStock}</strong> slop
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total Volume Terjual</span>
            <span className="font-bold text-white font-mono">{formatNumber(totalSalesSlots)} Slop</span>
          </div>
        </div>

        {/* Stock Overview (Right 6 cols) */}
        <div className="lg:col-span-6 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Status & Ketahanan Stok Gudang
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ketersediaan fisik saat ini vs batas aman
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToStock}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                Lihat Matriks <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Warehouse Valuation Snapshot */}
            <div className="grid grid-cols-2 gap-3 mt-4 mb-4 p-3 rounded-lg bg-[#0B0F19]/60 border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Unit Gudang</span>
                <span className="text-base font-bold text-white font-mono tabular-nums">
                  {formatNumber(totalStockSlots)} <span className="text-xs font-normal text-slate-400">slop</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Estimasi Nilai Aset</span>
                <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                  {formatRupiah(totalStockValuation)}
                </span>
              </div>
            </div>

            {/* Stock Level Bars per Variant */}
            <div className="space-y-3">
              {stockByProduct.map(item => {
                const ratio = item.threshold > 0 ? (item.currentStock / (item.threshold * 2.5)) * 100 : 100;
                const cappedRatio = Math.min(100, Math.max(8, ratio));
                return (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-lg border border-slate-800/60 bg-[#0B0F19]/30"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200">{item.product.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300">
                          {item.currentStock} / {item.threshold} slop
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            item.currentStock === 0
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                              : item.isLow
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          }`}
                        >
                          {item.currentStock === 0 ? 'Habis' : item.isLow ? 'Menipis' : 'Aman'}
                        </span>
                      </div>
                    </div>

                    {/* Stock Meter */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        style={{ width: `${cappedRatio}%` }}
                        className={`h-full rounded-full transition-all ${
                          item.currentStock === 0
                            ? 'bg-rose-500'
                            : item.isLow
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Kondisi Seluruh Varian</span>
            <span className={lowStockItems.length > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} Perlu Restok` : 'Semua Varian Aman'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: FINANCIAL SUMMARY (6 cols) + RECENT TRANSACTIONS (6 cols)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial Summary & Cash Flow (Left 6 cols) */}
        <div className="lg:col-span-6 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Ringkasan Finansial & Arus Kas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Arus kas riil dan kalkulasi laba periode ini
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* In vs Out Volume & Nominal Bars */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-[#0B0F19]/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Beli dari Pabrik</span>
                <span className="text-sm font-bold text-indigo-400 font-mono block mt-0.5">
                  {formatRupiah(totalPurchasesCost)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  {formatNumber(totalPurchasesSlots)} slop masuk
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0F19]/50 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Jual ke Pelanggan</span>
                <span className="text-sm font-bold text-amber-400 font-mono block mt-0.5">
                  {formatRupiah(totalSalesOmzet)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  {formatNumber(totalSalesSlots)} slop keluar
                </span>
              </div>
            </div>

            {/* P&L Waterfall Step Breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-300">
                <span>1. Pendapatan Penjualan (Omzet)</span>
                <strong className="text-white font-mono">{formatRupiah(totalSalesOmzet)}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
                <span>2. Harga Pokok Penjualan (HPP Modal)</span>
                <span className="text-rose-400 font-mono">- {formatRupiah(totalSalesCost)}</span>
              </div>
              <div className="flex justify-between py-1.5 bg-slate-800/50 px-2.5 rounded border border-slate-700/50 text-amber-300 font-semibold">
                <span>= Laba Kotor</span>
                <span className="font-mono">{formatRupiah(grossProfit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-slate-400">
                <span>3. Beban Operasional / Ongkir</span>
                <span className="text-rose-400 font-mono">- {formatRupiah(totalExpenses)}</span>
              </div>
              <div className="flex justify-between py-2 bg-emerald-950/40 px-3 rounded-lg border border-emerald-800/60 text-emerald-300 font-bold">
                <span>= Laba Bersih Estimasi</span>
                <span className={`font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatRupiah(netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Selisih Kas Riil (In - Out)</span>
            <span
              className={`font-bold font-mono ${
                totalPaid - (totalPurchasesCost + totalExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatRupiah(totalPaid - (totalPurchasesCost + totalExpenses))}
            </span>
          </div>
        </div>

        {/* Recent Transactions (Right 6 cols) */}
        <div className="lg:col-span-6 bg-[#111827] rounded-xl border border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Aktivitas Transaksi Terkini
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Faktur penjualan & pembelian stok terakhir
                </p>
              </div>

              {/* Tab Selector: Penjualan vs Pembelian */}
              <div className="flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveRecentTab('sales')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    activeRecentTab === 'sales'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Penjualan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRecentTab('purchases')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    activeRecentTab === 'purchases'
                      ? 'bg-indigo-500 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pembelian
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="mt-3 divide-y divide-slate-800/60">
              {activeRecentTab === 'sales' ? (
                recentSales.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Belum ada transaksi penjualan di periode ini.
                  </div>
                ) : (
                  recentSales.map(s => {
                    const prod = products.find(p => p.id === s.productId);
                    const reg = regions.find(r => r.id === s.regionId);
                    return (
                      <div key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-slate-200 truncate">
                              {s.customerName || 'Pelanggan'}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-[11px] text-amber-400 font-medium">
                              {prod ? prod.name : 'Rokok'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{formatDateDDMMYYYY(s.date)}</span>
                            <span>•</span>
                            <span>{reg ? reg.name : '-'}</span>
                            <span>•</span>
                            <span className="font-mono">{s.slots} slop</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-white font-mono">
                            {formatRupiah(s.totalAmount)}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                              s.paymentStatus === 'lunas'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : s.paymentStatus === 'sebagian'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {s.paymentStatus === 'lunas' ? 'Lunas' : s.paymentStatus === 'sebagian' ? 'Sebagian' : 'Belum Lunas'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : recentPurchases.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Belum ada transaksi pembelian stok di periode ini.
                </div>
              ) : (
                recentPurchases.map(p => {
                  const prod = products.find(prodItem => prodItem.id === p.productId);
                  const reg = regions.find(r => r.id === p.targetRegionId);
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-200 truncate">
                            {prod ? prod.name : 'Varian Rokok'}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-[11px] text-indigo-400 font-mono">
                            {p.slots} slop
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{formatDateDDMMYYYY(p.date)}</span>
                          <span>•</span>
                          <span>Tujuan: {reg ? reg.name : 'Gudang'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-indigo-300 font-mono">
                          {formatRupiah(p.totalCost)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          @{formatRupiah(p.buyPricePerSlot)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Daftar Transaksi Lengkap</span>
            <button
              type="button"
              onClick={activeRecentTab === 'sales' ? onNavigateToSales : onNavigateToPurchases}
              className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-0.5"
            >
              Buka Modul {activeRecentTab === 'sales' ? 'Penjualan' : 'Pembelian'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

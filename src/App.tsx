import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  ShoppingBag,
  Wallet,
  Tag,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  Download,
  Lock,
} from 'lucide-react';
import { auth, testConnection } from './firebase/config';
import {
  Product,
  Region,
  Customer,
  Purchase,
  Sale,
  Expense,
  AppSettings,
  TimeRangeFilter,
} from './types';
import {
  getProducts,
  saveProduct,
  removeProduct,
  getRegions,
  saveRegion,
  removeRegion,
  getCustomers,
  saveCustomer,
  removeCustomer,
  getPurchases,
  savePurchase,
  removePurchase,
  getSales,
  saveSale,
  removeSale,
  getExpenses,
  saveExpense,
  removeExpense,
  getSettings,
  saveSettings,
  initializeSeedData,
  DEFAULT_SETTINGS,
} from './services/dataService';
import { exportBusinessReportToExcel } from './utils/excelExport';
import { getTodayDateString, formatDateDDMMYYYY } from './utils/formatters';

// Views
import { PinLogin } from './components/PinLogin';
import { Header } from './components/Header';
import { DateRangeFilterBar } from './components/DateRangeFilter';
import { DashboardView } from './components/DashboardView';
import { PurchasesView } from './components/PurchasesView';
import { StockView } from './components/StockView';
import { SalesView } from './components/SalesView';
import { FinanceView } from './components/FinanceView';
import { MasterDataView } from './components/MasterDataView';
import { SettingsView } from './components/SettingsView';

type ActiveView = 'dashboard' | 'purchases' | 'stock' | 'sales' | 'finance' | 'master' | 'settings';

export default function App() {
  // Auth & Lock State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('sigarethub_unlocked_device') === 'true';
  });

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active View & Navigation
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Date Range Filter State
  const [dateFilter, setDateFilter] = useState<TimeRangeFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDateString());
  const [isExporting, setIsExporting] = useState(false);

  // 1. Initial Load & Firebase Auth Listener
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });

    loadAllData();
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data
  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      // Seed default products & regions if empty and strictly deduplicate
      const { products: cleanProducts, regions: cleanRegions } = await initializeSeedData();

      const [c, pur, s, exp, sett] = await Promise.all([
        getCustomers(),
        getPurchases(),
        getSales(),
        getExpenses(),
        getSettings(),
      ]);

      setProducts(cleanProducts);
      setRegions(cleanRegions);
      setCustomers(c);
      setPurchases(pur);
      setSales(s);
      setExpenses(exp);
      setSettings(sett);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 3. Date Filtering Logic
  const { startDateStr, endDateStr, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    const today = getTodayDateString();

    if (dateFilter === '7d') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return {
        startDateStr: past.toISOString().split('T')[0],
        endDateStr: today,
        dateRangeLabel: '7 Hari Terakhir',
      };
    }
    if (dateFilter === '30d') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return {
        startDateStr: past.toISOString().split('T')[0],
        endDateStr: today,
        dateRangeLabel: '30 Hari Terakhir',
      };
    }
    if (dateFilter === '3m') {
      const past = new Date();
      past.setMonth(now.getMonth() - 3);
      return {
        startDateStr: past.toISOString().split('T')[0],
        endDateStr: today,
        dateRangeLabel: '3 Bulan Terakhir',
      };
    }
    if (dateFilter === '6m') {
      const past = new Date();
      past.setMonth(now.getMonth() - 6);
      return {
        startDateStr: past.toISOString().split('T')[0],
        endDateStr: today,
        dateRangeLabel: '6 Bulan Terakhir',
      };
    }
    if (dateFilter === '1y') {
      const past = new Date();
      past.setFullYear(now.getFullYear() - 1);
      return {
        startDateStr: past.toISOString().split('T')[0],
        endDateStr: today,
        dateRangeLabel: '1 Tahun Terakhir',
      };
    }
    if (dateFilter === 'custom') {
      return {
        startDateStr: customStartDate,
        endDateStr: customEndDate,
        dateRangeLabel: 'Pilihan Khusus',
      };
    }

    // 'all'
    return {
      startDateStr: '2000-01-01',
      endDateStr: '2099-12-31',
      dateRangeLabel: 'Semua Waktu',
    };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filtered collections
  const filteredSales = useMemo(() => {
    return sales.filter(s => s.date >= startDateStr && s.date <= endDateStr);
  }, [sales, startDateStr, endDateStr]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => p.date >= startDateStr && p.date <= endDateStr);
  }, [purchases, startDateStr, endDateStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= startDateStr && e.date <= endDateStr);
  }, [expenses, startDateStr, endDateStr]);

  // Stock counts (calculated across ALL transactions, lifetime)
  const totalCurrentStockSlots = useMemo(() => {
    const totalBought = purchases.reduce((acc, p) => acc + p.slots, 0);
    const totalSold = sales.reduce((acc, s) => acc + s.slots, 0);
    return Math.max(0, totalBought - totalSold);
  }, [purchases, sales]);

  // Quick Lock
  const handleLock = () => {
    localStorage.removeItem('sigarethub_unlocked_device');
    setIsUnlocked(false);
  };

  // Handlers for Data Mutation
  const handleSaveProduct = async (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    await saveProduct(prod);
    const updated = await getProducts();
    setProducts(updated);
  };

  const handleDeleteProduct = async (id: string) => {
    await removeProduct(id);
    const updated = await getProducts();
    setProducts(updated);
  };

  const handleSaveRegion = async (name: string, id?: string) => {
    await saveRegion(name, id);
    const updated = await getRegions();
    setRegions(updated);
  };

  const handleDeleteRegion = async (id: string) => {
    await removeRegion(id);
    const updated = await getRegions();
    setRegions(updated);
  };

  const handleSaveCustomer = async (cust: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    await saveCustomer(cust);
    const updated = await getCustomers();
    setCustomers(updated);
  };

  const handleDeleteCustomer = async (id: string) => {
    await removeCustomer(id);
    const updated = await getCustomers();
    setCustomers(updated);
  };

  const handleSavePurchase = async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'> & { id?: string }) => {
    await savePurchase(purchase);
    const updated = await getPurchases();
    setPurchases(updated);
  };

  const handleDeletePurchase = async (id: string) => {
    await removePurchase(id);
    const updated = await getPurchases();
    setPurchases(updated);
  };

  const handleSaveSale = async (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount' | 'remainingAmount'> & { id?: string }) => {
    await saveSale(sale);
    const updatedSales = await getSales();
    const updatedCust = await getCustomers();
    setSales(updatedSales);
    setCustomers(updatedCust);
  };

  const handleDeleteSale = async (id: string) => {
    await removeSale(id);
    const updated = await getSales();
    setSales(updated);
  };

  const handleQuickPaySale = async (saleId: string, additionalPay: number) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const newPaid = Math.min(sale.totalAmount, sale.paidAmount + additionalPay);
    await saveSale({
      ...sale,
      paidAmount: newPaid,
      paymentStatus: newPaid >= sale.totalAmount ? 'lunas' : 'sebagian',
    });
    const updated = await getSales();
    setSales(updated);
  };

  const handleSaveExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    await saveExpense(expense);
    const updated = await getExpenses();
    setExpenses(updated);
  };

  const handleDeleteExpense = async (id: string) => {
    await removeExpense(id);
    const updated = await getExpenses();
    setExpenses(updated);
  };

  const handleSaveSettings = async (newSett: AppSettings) => {
    await saveSettings(newSett);
    setSettings(newSett);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const totalSalesSlots = filteredSales.reduce((acc, s) => acc + s.slots, 0);
      const totalSalesOmzet = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const totalPurchasesSlots = filteredPurchases.reduce((acc, p) => acc + p.slots, 0);
      const totalPurchasesCost = filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0);
      const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
      const totalHPP = filteredSales.reduce((acc, s) => acc + (s.slots * (s.costPerSlot || 0)), 0);
      const grossProfit = totalSalesOmzet - totalHPP;
      const netProfit = grossProfit - totalExpenses;
      const totalCashIn = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
      const totalCashOut = totalPurchasesCost + totalExpenses;
      const cashBalance = totalCashIn - totalCashOut;
      const totalReceivable = sales.reduce((acc, s) => acc + s.remainingAmount, 0);

      exportBusinessReportToExcel({
        dateRangeLabel,
        startDate: startDateStr,
        endDate: endDateStr,
        filteredSales,
        filteredPurchases,
        filteredExpenses,
        products,
        regions,
        allPurchases: purchases,
        allSales: sales,
        summary: {
          totalSalesSlots,
          totalSalesOmzet,
          totalPurchasesSlots,
          totalPurchasesCost,
          totalExpenses,
          grossProfit,
          netProfit,
          totalReceivable,
          totalCashIn,
          totalCashOut,
          cashBalance,
          totalCurrentStockSlots,
        },
      });
    } catch (err) {
      console.error('Excel Export error', err);
    } finally {
      setIsExporting(false);
    }
  };

  // If locked, render PIN Gate
  if (!isUnlocked) {
    return (
      <PinLogin
        storedPin={settings.pin || '1234'}
        onSuccess={() => setIsUnlocked(true)}
        currentUser={currentUser}
      />
    );
  }

  // View title helper
  const viewTitles: Record<ActiveView, string> = {
    dashboard: 'Dashboard Analisis Bisnis',
    master: 'Produk / Rokok & Data Master',
    purchases: 'Pembelian Stok Pabrik',
    sales: 'Penjualan & Distribusi Daerah',
    stock: 'Monitoring Level Stok Real-Time',
    finance: 'Keuangan, Arus Kas & Piutang',
    settings: 'Pengaturan Bisnis & Keamanan PIN',
  };

  // Main Navigation Items:
  // Dashboard, Produk / Rokok, Pembelian, Penjualan / Distribusi, Stok, Keuangan
  const navItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master' as ActiveView, label: 'Produk / Rokok', icon: Package },
    { id: 'purchases' as ActiveView, label: 'Pembelian', icon: PackagePlus },
    { id: 'sales' as ActiveView, label: 'Penjualan / Distribusi', icon: ShoppingBag },
    { id: 'stock' as ActiveView, label: 'Stok', icon: Layers },
    { id: 'finance' as ActiveView, label: 'Keuangan', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans pb-16 md:pb-0">
      {/* Fixed Vertical Sidebar on Desktop / Laptop */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-[#0D1322] border-r border-slate-800/80 z-30">
        {/* Sidebar Brand Header: h1 = CigaretteHub, span = Admin (no icon) */}
        <div className="h-14 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-tight text-white leading-tight">
              CigaretteHub
            </h1>
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full">
              Admin
            </span>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 font-mono">
            Menu Utama
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}

          {/* Laporan Section */}
          <div className="pt-4 mt-2 border-t border-slate-800/60">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 font-mono">
              Dokumen & Analisis
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 group-hover:scale-105 transition-transform" />
                <span>Laporan (Excel)</span>
              </div>
              <Download className={`w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ${isExporting ? 'animate-bounce' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Settings & Admin Profile */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0B0F19]/40 shrink-0 space-y-2">
          <button
            type="button"
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeView === 'settings'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Pengaturan & PIN</span>
          </button>

          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-slate-400">
            <div className="truncate max-w-[130px]">
              <div className="font-semibold text-slate-200 truncate">{settings.ownerName || 'Admin'}</div>
              <div className="text-[10px] text-slate-500 font-mono">v1.2 Analytics</div>
            </div>
            <button
              type="button"
              onClick={handleLock}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
              title="Kunci Layar"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Wrapper (offset by sidebar width on desktop) */}
      <div className="md:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          businessName={settings.businessName}
          currentUser={currentUser}
          onLock={handleLock}
          onRefresh={loadAllData}
          isRefreshing={isRefreshing}
          viewTitle={viewTitles[activeView]}
          dateRangeLabel={dateRangeLabel}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {/* Universal Date Range Filter & Excel Download Bar */}
          <DateRangeFilterBar
            currentFilter={dateFilter}
            onFilterChange={setDateFilter}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={(s, e) => {
              setCustomStartDate(s);
              setCustomEndDate(e);
            }}
            onExportExcel={handleExportExcel}
            isExporting={isExporting}
          />

          {/* Active View Renderer */}
          {activeView === 'dashboard' && (
            <DashboardView
              sales={filteredSales}
              purchases={filteredPurchases}
              expenses={filteredExpenses}
              products={products}
              regions={regions}
              allPurchases={purchases}
              allSales={sales}
              onNavigateToStock={() => setActiveView('stock')}
              onNavigateToSales={() => setActiveView('sales')}
              onNavigateToPurchases={() => setActiveView('purchases')}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              dateRangeLabel={dateRangeLabel}
            />
          )}

          {activeView === 'purchases' && (
            <PurchasesView
              purchases={filteredPurchases}
              products={products}
              regions={regions}
              onSavePurchase={handleSavePurchase}
              onDeletePurchase={handleDeletePurchase}
            />
          )}

          {activeView === 'stock' && (
            <StockView
              products={products}
              regions={regions}
              allPurchases={purchases}
              allSales={sales}
              onNavigateToPurchases={() => setActiveView('purchases')}
              onNavigateToSales={() => setActiveView('sales')}
            />
          )}

          {activeView === 'sales' && (
            <SalesView
              sales={filteredSales}
              products={products}
              regions={regions}
              customers={customers}
              onSaveSale={handleSaveSale}
              onDeleteSale={handleDeleteSale}
              onQuickPay={handleQuickPaySale}
            />
          )}

          {activeView === 'finance' && (
            <FinanceView
              sales={filteredSales}
              purchases={filteredPurchases}
              expenses={filteredExpenses}
              allSales={sales}
              regions={regions}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              onQuickPaySale={handleQuickPaySale}
            />
          )}

          {activeView === 'master' && (
            <MasterDataView
              products={products}
              regions={regions}
              customers={customers}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveRegion={handleSaveRegion}
              onDeleteRegion={handleDeleteRegion}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              settings={settings}
              currentUser={currentUser}
              onSaveSettings={handleSaveSettings}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0D1322] border-t border-slate-800 shadow-xl px-2 py-1 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('master')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'master' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('purchases')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'purchases' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>Beli</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('sales')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'sales' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Jual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('stock')}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'stock' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stok</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-medium transition-colors ${
            activeView === 'finance' || activeView === 'settings' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Mobile Drawer for Extra Menus */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0D1322] w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-white text-sm">Navigasi Tambahan</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setActiveView('finance');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  activeView === 'finance' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800/60 text-slate-200'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Keuangan, Arus Kas & Piutang</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleExportExcel();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800/60 text-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Unduh Laporan Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  activeView === 'settings' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800/60 text-slate-200'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-slate-300" />
                <span>Pengaturan & Ganti PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLock();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/50 text-rose-300 border border-rose-900/60"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Kunci Aplikasi Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

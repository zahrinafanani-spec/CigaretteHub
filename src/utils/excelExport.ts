import * as XLSX from 'xlsx';
import { Product, Region, Purchase, Sale, Expense } from '../types';
import { formatRupiah, formatDateDDMMYYYY, formatNumber } from './formatters';

interface ExportDataParams {
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  filteredSales: Sale[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  products: Product[];
  regions: Region[];
  allPurchases: Purchase[];
  allSales: Sale[];
  summary: {
    totalSalesSlots: number;
    totalSalesOmzet: number;
    totalPurchasesSlots: number;
    totalPurchasesCost: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    totalReceivable: number;
    totalCashIn: number;
    totalCashOut: number;
    cashBalance: number;
    totalCurrentStockSlots: number;
  };
}

export function exportBusinessReportToExcel({
  dateRangeLabel,
  startDate,
  endDate,
  filteredSales,
  filteredPurchases,
  filteredExpenses,
  products,
  regions,
  allPurchases,
  allSales,
  summary,
}: ExportDataParams) {
  const wb = XLSX.utils.book_new();

  // 1. SHEET RINGKASAN
  const ringkasanRows = [
    ['LAPORAN BISNIS CIGARETTEHUB'],
    ['Periode:', `${dateRangeLabel} (${formatDateDDMMYYYY(startDate)} - ${formatDateDDMMYYYY(endDate)})`],
    ['Tanggal Unduh:', formatDateDDMMYYYY(new Date())],
    [],
    ['METRIK UTAMA', 'NILAI', 'KETERANGAN'],
    ['Total Omzet Penjualan', summary.totalSalesOmzet, `${summary.totalSalesSlots} slop terjual`],
    ['Estimasi Laba Kotor', summary.grossProfit, 'Penjualan dikurangi HPP produk'],
    ['Biaya Operasional / Pengeluaran Lain', summary.totalExpenses, 'Ongkir, bensin, gudang, dll'],
    ['Estimasi Laba Bersih', summary.netProfit, 'Laba kotor dikurangi biaya operasional'],
    ['Total Uang Masuk (Kas Masuk)', summary.totalCashIn, 'Pembayaran penjualan yang sudah diterima'],
    ['Total Uang Keluar (Kas Keluar)', summary.totalCashOut, 'Pembelian stok pabrik + pengeluaran lain'],
    ['Saldo Kas Periode Ini', summary.cashBalance, 'Kas Masuk - Kas Keluar'],
    ['Total Piutang Belum Lunas', summary.totalReceivable, 'Tagihan yang belum dibayar pembeli'],
    ['Sisa Total Stok Saat Ini (Gudang)', summary.totalCurrentStockSlots, 'Total slop di seluruh varian & daerah'],
    [],
    ['CATATAN SISTEM'],
    ['1. Semua angka dihitung dari rekaman transaksi aktual.'],
    ['2. Perubahan harga master tidak mengubah riwayat transaksi lampau.'],
  ];

  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanRows);
  wsRingkasan['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan');

  // 2. SHEET PENJUALAN
  const penjualanHeader = [
    'No',
    'Tanggal',
    'Nama Pembeli',
    'No. HP',
    'Alamat',
    'Daerah',
    'Varian Rokok',
    'Jumlah Slop',
    'Harga / Slop (Rp)',
    'HPP / Slop (Rp)',
    'Total Tagihan (Rp)',
    'Terbayar (Rp)',
    'Sisa Piutang (Rp)',
    'Status Bayar',
    'Catatan',
  ];

  const penjualanData = filteredSales.map((s, idx) => [
    idx + 1,
    formatDateDDMMYYYY(s.date),
    s.customerName,
    s.customerPhone || '-',
    s.customerAddress || '-',
    s.regionName,
    s.productName,
    s.slots,
    s.pricePerSlot,
    s.costPerSlot || 0,
    s.totalAmount,
    s.paidAmount,
    s.remainingAmount,
    s.paymentStatus.toUpperCase(),
    s.notes || '-',
  ]);

  // Total baris penjualan
  const totalPenjualanSlots = filteredSales.reduce((acc, s) => acc + s.slots, 0);
  const totalPenjualanTagihan = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalPenjualanTerbayar = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalPenjualanPiutang = filteredSales.reduce((acc, s) => acc + s.remainingAmount, 0);

  const penjualanFooter = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    totalPenjualanSlots,
    '',
    '',
    totalPenjualanTagihan,
    totalPenjualanTerbayar,
    totalPenjualanPiutang,
    '',
    '',
  ];

  const wsPenjualan = XLSX.utils.aoa_to_sheet([
    [`REKAP PENJUALAN (${formatDateDDMMYYYY(startDate)} - ${formatDateDDMMYYYY(endDate)})`],
    penjualanHeader,
    ...penjualanData,
    penjualanFooter,
  ]);
  wsPenjualan['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPenjualan, 'Penjualan');

  // 3. SHEET PEMBELIAN
  const pembelianHeader = [
    'No',
    'Tanggal',
    'Varian Rokok',
    'Jumlah Slop',
    'Harga Beli / Slop (Rp)',
    'Total Biaya (Rp)',
    'Daerah Tujuan',
    'Catatan',
  ];

  const pembelianData = filteredPurchases.map((p, idx) => [
    idx + 1,
    formatDateDDMMYYYY(p.date),
    p.productName,
    p.slots,
    p.buyPricePerSlot,
    p.totalCost,
    p.targetRegionName,
    p.notes || '-',
  ]);

  const totalPembelianSlots = filteredPurchases.reduce((acc, p) => acc + p.slots, 0);
  const totalPembelianCost = filteredPurchases.reduce((acc, p) => acc + p.totalCost, 0);

  const pembelianFooter = [
    'TOTAL',
    '',
    '',
    totalPembelianSlots,
    '',
    totalPembelianCost,
    '',
    '',
  ];

  const wsPembelian = XLSX.utils.aoa_to_sheet([
    [`REKAP PEMBELIAN STOK PABRIK (${formatDateDDMMYYYY(startDate)} - ${formatDateDDMMYYYY(endDate)})`],
    pembelianHeader,
    ...pembelianData,
    pembelianFooter,
  ]);
  wsPembelian['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPembelian, 'Pembelian');

  // 4. SHEET STOK PER VARIAN & PER DAERAH (Dihitung dari semua transaksi)
  const stokMatrixHeader = ['Varian Produk', 'Harga Master / Slop', ...regions.map(r => `Stok di ${r.name}`), 'Total Stok Slop', 'Peringatan'];
  
  const stokMatrixRows = products.map(prod => {
    let totalProdStock = 0;
    const regionStocks = regions.map(reg => {
      const bought = allPurchases
        .filter(p => p.productId === prod.id && p.targetRegionId === reg.id)
        .reduce((sum, p) => sum + p.slots, 0);
      const sold = allSales
        .filter(s => s.productId === prod.id && s.regionId === reg.id)
        .reduce((sum, s) => sum + s.slots, 0);
      const current = bought - sold;
      totalProdStock += current;
      return current;
    });

    const isLow = totalProdStock <= (prod.minStockThreshold || 10);
    return [
      prod.name,
      prod.pricePerSlot,
      ...regionStocks,
      totalProdStock,
      isLow ? 'MENIPIS' : 'AMAN',
    ];
  });

  const wsStok = XLSX.utils.aoa_to_sheet([
    ['REKAP STOK AKTUAL (PER VARIAN & PER DAERAH)'],
    ['Kondisi Real-Time di Gudang / Lapangan'],
    [],
    stokMatrixHeader,
    ...stokMatrixRows,
  ]);
  wsStok['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    ...regions.map(() => ({ wch: 16 })),
    { wch: 16 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStok, 'Stok');

  // 5. SHEET KEUANGAN & PIUTANG
  const expensesHeader = [
    'No',
    'Tanggal',
    'Kategori',
    'Keterangan',
    'Daerah Terkait',
    'Nominal (Rp)',
  ];

  const expensesData = filteredExpenses.map((e, idx) => [
    idx + 1,
    formatDateDDMMYYYY(e.date),
    e.category,
    e.description,
    e.regionName || '-',
    e.amount,
  ]);

  const totalExpensesAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const expensesFooter = [
    'TOTAL PENGELUARAN LAIN',
    '',
    '',
    '',
    '',
    totalExpensesAmount,
  ];

  // Daftar Piutang
  const receivables = allSales.filter(s => s.remainingAmount > 0);
  const receivablesHeader = [
    'No',
    'Tanggal Jual',
    'Nama Pembeli',
    'No HP',
    'Daerah',
    'Total Tagihan (Rp)',
    'Sudah Dibayar (Rp)',
    'Sisa Piutang (Rp)',
    'Status',
  ];
  const receivablesData = receivables.map((s, idx) => [
    idx + 1,
    formatDateDDMMYYYY(s.date),
    s.customerName,
    s.customerPhone || '-',
    s.regionName,
    s.totalAmount,
    s.paidAmount,
    s.remainingAmount,
    s.paymentStatus.toUpperCase(),
  ]);

  const wsKeuangan = XLSX.utils.aoa_to_sheet([
    [`PENGELUARAN OPERASIONAL & ONGKIR (${formatDateDDMMYYYY(startDate)} - ${formatDateDDMMYYYY(endDate)})`],
    expensesHeader,
    ...expensesData,
    expensesFooter,
    [],
    ['DAFTAR PIUTANG AKTIF PEMBELI (BELUM LUNAS)'],
    receivablesHeader,
    ...receivablesData,
    [
      'TOTAL PIUTANG',
      '',
      '',
      '',
      '',
      receivables.reduce((sum, s) => sum + s.totalAmount, 0),
      receivables.reduce((sum, s) => sum + s.paidAmount, 0),
      receivables.reduce((sum, s) => sum + s.remainingAmount, 0),
      '',
    ],
  ]);
  wsKeuangan['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsKeuangan, 'Keuangan & Piutang');

  // Download
  const filename = `Laporan_Rokok_${startDate}_sd_${endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

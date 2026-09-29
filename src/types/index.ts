export interface Product {
  id: string;
  name: string;
  pricePerSlot: number; // Harga jual per slot
  defaultBuyPrice?: number; // Estimasi harga beli dari pabrik
  itemsPerSlot: number; // isi per slot (default 10)
  minStockThreshold: number; // Peringatan stok menipis (default e.g. 10)
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  regionId: string;
  regionName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  date: string; // YYYY-MM-DD
  productId: string;
  productName: string;
  slots: number;
  buyPricePerSlot: number;
  totalCost: number; // slots * buyPricePerSlot
  targetRegionId: string;
  targetRegionName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'lunas' | 'belum' | 'sebagian';

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  regionId: string;
  regionName: string;
  productId: string;
  productName: string;
  slots: number;
  pricePerSlot: number; // Harga jual saat transaksi
  costPerSlot: number; // Estimasi harga pokok per slot
  totalAmount: number; // slots * pricePerSlot
  paidAmount: number; // Jumlah yang sudah dibayar
  remainingAmount: number; // totalAmount - paidAmount (piutang)
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'Ongkir' | 'Bensin / Transport' | 'Operasional' | 'Gudang' | 'Lainnya';
  amount: number;
  description: string;
  regionId?: string;
  regionName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  pin: string;
  businessName: string;
  ownerName: string;
  defaultMinStock: number;
  lastUpdated?: string;
}

export type TimeRangeFilter = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom' | 'all';

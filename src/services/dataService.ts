import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import {
  Product,
  Region,
  Customer,
  Purchase,
  Sale,
  Expense,
  AppSettings,
} from '../types';

// Default Seed Data
export const DEFAULT_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Javio', pricePerSlot: 90000, defaultBuyPrice: 75000, itemsPerSlot: 10, minStockThreshold: 10 },
  { name: 'Javier', pricePerSlot: 90000, defaultBuyPrice: 75000, itemsPerSlot: 10, minStockThreshold: 10 },
  { name: 'Kopi', pricePerSlot: 90000, defaultBuyPrice: 75000, itemsPerSlot: 10, minStockThreshold: 10 },
  { name: 'Apel', pricePerSlot: 90000, defaultBuyPrice: 75000, itemsPerSlot: 10, minStockThreshold: 10 },
  { name: 'Matcha', pricePerSlot: 92000, defaultBuyPrice: 77000, itemsPerSlot: 10, minStockThreshold: 10 },
];

export const DEFAULT_REGIONS: string[] = ['Gresik', 'Lamongan', 'Surabaya', 'Tuban'];

export const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  businessName: 'CigaretteHub',
  ownerName: 'Zahrin Fanani',
  defaultMinStock: 10,
};

// LocalStorage Keys for offline / immediate speed
const LS_PREFIX = 'sigarethub_';
function getLS<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}
function setLS<T>(key: string, val: T): void {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.error('LS set error', e);
  }
}

// Generate friendly clean ID
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Allowed strictly: Javio, Javier, Kopi, Apel, Matcha
export const ALLOWED_PRODUCT_NAMES = ['Javio', 'Javier', 'Kopi', 'Apel', 'Matcha'] as const;
// Allowed strictly in alphabetical order: Gresik, Lamongan, Surabaya, Tuban
export const ALLOWED_REGION_NAMES = ['Gresik', 'Lamongan', 'Surabaya', 'Tuban'] as const;

// Helper to sanitize & deduplicate products
export function sanitizeProducts(rawList: Product[]): { clean: Product[]; duplicateIds: string[] } {
  const duplicateIds: string[] = [];
  const mapByName = new Map<string, Product>();

  for (const p of rawList) {
    if (!p || !p.name) continue;
    let normalizedName = p.name.trim();
    if (normalizedName.toLowerCase() === 'cethek') {
      normalizedName = 'Kopi';
    }

    const matchedAllowed = ALLOWED_PRODUCT_NAMES.find(
      a => a.toLowerCase() === normalizedName.toLowerCase()
    );

    if (matchedAllowed) {
      if (!mapByName.has(matchedAllowed)) {
        mapByName.set(matchedAllowed, {
          ...p,
          name: matchedAllowed,
        });
      } else {
        // Mark duplicate document ID for removal
        if (p.id) duplicateIds.push(p.id);
      }
    } else {
      // Disallowed product variant ID
      if (p.id) duplicateIds.push(p.id);
    }
  }

  // Ensure all 5 allowed products exist in canonical order
  const clean: Product[] = [];
  for (const name of ALLOWED_PRODUCT_NAMES) {
    const existing = mapByName.get(name);
    if (existing) {
      clean.push(existing);
    } else {
      const def = DEFAULT_PRODUCTS.find(dp => dp.name === name) || {
        name,
        pricePerSlot: 90000,
        defaultBuyPrice: 75000,
        itemsPerSlot: 10,
        minStockThreshold: 10,
      };
      clean.push({
        id: generateId('prod'),
        ...def,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { clean, duplicateIds };
}

// Helper to sanitize & deduplicate regions in alphabetical order
export function sanitizeRegions(rawList: Region[]): { clean: Region[]; duplicateIds: string[] } {
  const duplicateIds: string[] = [];
  const mapByName = new Map<string, Region>();

  for (const r of rawList) {
    if (!r || !r.name) continue;
    const normalizedName = r.name.trim();
    const matchedAllowed = ALLOWED_REGION_NAMES.find(
      a => a.toLowerCase() === normalizedName.toLowerCase()
    );

    if (matchedAllowed) {
      if (!mapByName.has(matchedAllowed)) {
        mapByName.set(matchedAllowed, {
          ...r,
          name: matchedAllowed,
        });
      } else {
        if (r.id) duplicateIds.push(r.id);
      }
    } else {
      if (r.id) duplicateIds.push(r.id);
    }
  }

  // Ensure all 4 allowed regions exist, sorted alphabetically (Gresik, Lamongan, Surabaya, Tuban)
  const clean: Region[] = [];
  for (const name of ALLOWED_REGION_NAMES) {
    const existing = mapByName.get(name);
    if (existing) {
      clean.push(existing);
    } else {
      clean.push({
        id: generateId('reg'),
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Strictly sort alphabetically
  clean.sort((a, b) => a.name.localeCompare(b.name));

  return { clean, duplicateIds };
}

// --- PRODUCTS ---
export async function getProducts(): Promise<Product[]> {
  const local = getLS<Product[]>('products', []);
  let candidateList = local;

  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        candidateList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      }
    } catch (e) {
      console.warn('Error reading products from Firestore, using cache', e);
    }
  }

  const { clean, duplicateIds } = sanitizeProducts(candidateList);
  setLS('products', clean);

  // Clean up duplicate docs in Firestore asynchronously
  if (auth.currentUser && duplicateIds.length > 0) {
    duplicateIds.forEach(id => {
      deleteDoc(doc(db, 'products', id)).catch(() => {});
    });
  }

  return clean;
}

export async function saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Product> {
  const now = new Date().toISOString();
  const id = product.id || generateId('prod');
  const fullProduct: Product = {
    ...product,
    id,
    createdAt: (product as any).createdAt || now,
    updatedAt: now,
  };

  // Update local
  const current = getLS<Product[]>('products', []);
  const idx = current.findIndex(p => p.id === id);
  if (idx >= 0) {
    current[idx] = fullProduct;
  } else {
    current.push(fullProduct);
  }
  setLS('products', current);

  // Sync to Firestore if authenticated
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'products', id), fullProduct);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products/${id}`);
    }
  }

  return fullProduct;
}

export async function removeProduct(id: string): Promise<void> {
  const current = getLS<Product[]>('products', []).filter(p => p.id !== id);
  setLS('products', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }
  }
}

// --- REGIONS ---
export async function getRegions(): Promise<Region[]> {
  const local = getLS<Region[]>('regions', []);
  let candidateList = local;

  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'regions'));
      if (!snap.empty) {
        candidateList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Region));
      }
    } catch (e) {
      console.warn('Error reading regions from Firestore, using cache', e);
    }
  }

  const { clean, duplicateIds } = sanitizeRegions(candidateList);
  setLS('regions', clean);

  // Clean up duplicate docs in Firestore asynchronously
  if (auth.currentUser && duplicateIds.length > 0) {
    duplicateIds.forEach(id => {
      deleteDoc(doc(db, 'regions', id)).catch(() => {});
    });
  }

  return clean;
}

export async function saveRegion(name: string, id?: string): Promise<Region> {
  const now = new Date().toISOString();
  const regionId = id || generateId('reg');
  const region: Region = {
    id: regionId,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const current = getLS<Region[]>('regions', []);
  const idx = current.findIndex(r => r.id === regionId);
  if (idx >= 0) {
    current[idx] = region;
  } else {
    current.push(region);
  }
  setLS('regions', current);

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'regions', regionId), region);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `regions/${regionId}`);
    }
  }

  return region;
}

export async function removeRegion(id: string): Promise<void> {
  const current = getLS<Region[]>('regions', []).filter(r => r.id !== id);
  setLS('regions', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'regions', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `regions/${id}`);
    }
  }
}

// --- CUSTOMERS ---
export async function getCustomers(): Promise<Customer[]> {
  const local = getLS<Customer[]>('customers', []);
  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        setLS('customers', items);
        return items;
      }
    } catch (e) {
      console.warn('Error reading customers from Firestore, using cache', e);
    }
  }
  return local;
}

export async function saveCustomer(cust: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Customer> {
  const now = new Date().toISOString();
  const id = cust.id || generateId('cust');
  const fullCust: Customer = {
    ...cust,
    id,
    createdAt: (cust as any).createdAt || now,
    updatedAt: now,
  };

  const current = getLS<Customer[]>('customers', []);
  const idx = current.findIndex(c => c.id === id);
  if (idx >= 0) {
    current[idx] = fullCust;
  } else {
    current.push(fullCust);
  }
  setLS('customers', current);

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'customers', id), fullCust);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `customers/${id}`);
    }
  }

  return fullCust;
}

export async function removeCustomer(id: string): Promise<void> {
  const current = getLS<Customer[]>('customers', []).filter(c => c.id !== id);
  setLS('customers', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `customers/${id}`);
    }
  }
}

// --- PURCHASES ---
export async function getPurchases(): Promise<Purchase[]> {
  const local = getLS<Purchase[]>('purchases', []);
  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'purchases'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
        setLS('purchases', items);
        return items;
      }
    } catch (e) {
      console.warn('Error reading purchases from Firestore, using cache', e);
    }
  }
  return local;
}

export async function savePurchase(purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'> & { id?: string; totalCost?: number }): Promise<Purchase> {
  const now = new Date().toISOString();
  const id = purchase.id || generateId('pur');
  const totalCost = purchase.slots * purchase.buyPricePerSlot;
  const fullPurchase: Purchase = {
    ...purchase,
    id,
    totalCost,
    createdAt: (purchase as any).createdAt || now,
    updatedAt: now,
  };

  const current = getLS<Purchase[]>('purchases', []);
  const idx = current.findIndex(p => p.id === id);
  if (idx >= 0) {
    current[idx] = fullPurchase;
  } else {
    current.unshift(fullPurchase); // new first
  }
  setLS('purchases', current);

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'purchases', id), fullPurchase);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `purchases/${id}`);
    }
  }

  return fullPurchase;
}

export async function removePurchase(id: string): Promise<void> {
  const current = getLS<Purchase[]>('purchases', []).filter(p => p.id !== id);
  setLS('purchases', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'purchases', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `purchases/${id}`);
    }
  }
}

// --- SALES ---
export async function getSales(): Promise<Sale[]> {
  const local = getLS<Sale[]>('sales', []);
  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'sales'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
        setLS('sales', items);
        return items;
      }
    } catch (e) {
      console.warn('Error reading sales from Firestore, using cache', e);
    }
  }
  return local;
}

export async function saveSale(sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount' | 'remainingAmount'> & { id?: string; totalAmount?: number; remainingAmount?: number }): Promise<Sale> {
  const now = new Date().toISOString();
  const id = sale.id || generateId('sale');
  const totalAmount = sale.slots * sale.pricePerSlot;
  const paidAmount = Number(sale.paidAmount) || 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus = sale.paymentStatus;
  if (paidAmount >= totalAmount) {
    paymentStatus = 'lunas';
  } else if (paidAmount <= 0) {
    paymentStatus = 'belum';
  } else {
    paymentStatus = 'sebagian';
  }

  const fullSale: Sale = {
    ...sale,
    id,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    costPerSlot: Number(sale.costPerSlot) || 0,
    createdAt: (sale as any).createdAt || now,
    updatedAt: now,
  };

  const current = getLS<Sale[]>('sales', []);
  const idx = current.findIndex(s => s.id === id);
  if (idx >= 0) {
    current[idx] = fullSale;
  } else {
    current.unshift(fullSale);
  }
  setLS('sales', current);

  // Auto-record customer if new or update phone/address
  if (fullSale.customerName) {
    const customers = getLS<Customer[]>('customers', []);
    const existingCust = customers.find(c => c.name.toLowerCase() === fullSale.customerName.toLowerCase());
    if (existingCust) {
      if (fullSale.customerPhone || fullSale.customerAddress) {
        saveCustomer({
          ...existingCust,
          phone: fullSale.customerPhone || existingCust.phone,
          address: fullSale.customerAddress || existingCust.address,
          regionId: fullSale.regionId || existingCust.regionId,
          regionName: fullSale.regionName || existingCust.regionName,
        });
      }
    } else {
      saveCustomer({
        name: fullSale.customerName,
        phone: fullSale.customerPhone || '',
        address: fullSale.customerAddress || '',
        regionId: fullSale.regionId,
        regionName: fullSale.regionName,
      });
    }
  }

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'sales', id), fullSale);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sales/${id}`);
    }
  }

  return fullSale;
}

export async function removeSale(id: string): Promise<void> {
  const current = getLS<Sale[]>('sales', []).filter(s => s.id !== id);
  setLS('sales', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'sales', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `sales/${id}`);
    }
  }
}

// --- EXPENSES ---
export async function getExpenses(): Promise<Expense[]> {
  const local = getLS<Expense[]>('expenses', []);
  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, 'expenses'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        setLS('expenses', items);
        return items;
      }
    } catch (e) {
      console.warn('Error reading expenses from Firestore, using cache', e);
    }
  }
  return local;
}

export async function saveExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Expense> {
  const now = new Date().toISOString();
  const id = expense.id || generateId('exp');
  const fullExpense: Expense = {
    ...expense,
    id,
    createdAt: (expense as any).createdAt || now,
    updatedAt: now,
  };

  const current = getLS<Expense[]>('expenses', []);
  const idx = current.findIndex(e => e.id === id);
  if (idx >= 0) {
    current[idx] = fullExpense;
  } else {
    current.unshift(fullExpense);
  }
  setLS('expenses', current);

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'expenses', id), fullExpense);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `expenses/${id}`);
    }
  }

  return fullExpense;
}

export async function removeExpense(id: string): Promise<void> {
  const current = getLS<Expense[]>('expenses', []).filter(e => e.id !== id);
  setLS('expenses', current);

  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `expenses/${id}`);
    }
  }
}

// --- SETTINGS ---
export async function getSettings(): Promise<AppSettings> {
  const local = getLS<AppSettings>('settings', DEFAULT_SETTINGS);
  if (auth.currentUser) {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'app_settings'));
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setLS('settings', data);
        return data;
      }
    } catch (e) {
      console.warn('Error reading settings from Firestore, using cache', e);
    }
  }
  return local;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const updated: AppSettings = {
    ...settings,
    lastUpdated: new Date().toISOString(),
  };
  setLS('settings', updated);

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'settings', 'app_settings'), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/app_settings');
    }
  }

  return updated;
}

// Initialize and sanitize seed data (remove duplicates, ensure valid master items)
export async function initializeSeedData(): Promise<{
  products: Product[];
  regions: Region[];
}> {
  const products = await getProducts();
  const regions = await getRegions();

  // If connected to Firestore, ensure all 5 default products and 4 default regions are persisted
  if (auth.currentUser) {
    try {
      for (const prod of products) {
        await setDoc(doc(db, 'products', prod.id), prod, { merge: true });
      }
      for (const reg of regions) {
        await setDoc(doc(db, 'regions', reg.id), reg, { merge: true });
      }
    } catch (e) {
      console.warn('Error syncing seed products/regions to Firestore', e);
    }
  }

  return { products, regions };
}

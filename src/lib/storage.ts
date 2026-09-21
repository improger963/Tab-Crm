import { Order, OrderStatus, OrderEvent, OrderItem, PaymentStatus, SaleType, PaymentTerms, PaymentMethod } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'crm_orders',
  PRODUCTS: 'crm_products_catalog',
};

export interface ProductCatalogItem {
  code: string;
  artikul?: string;
  name?: string;
  price: number;
  category?: string;
  lastUpdated?: string;
}

// Get saved products from catalog + seed from all historical order items
export const getSavedProducts = (): ProductCatalogItem[] => {
  let catalogMap = new Map<string, ProductCatalogItem>();

  // 1. Read explicitly stored products catalog
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      const parsed: ProductCatalogItem[] = JSON.parse(raw);
      parsed.forEach(p => {
        if (p.code && p.code.trim()) {
          catalogMap.set(p.code.trim().toLowerCase(), p);
        }
      });
    }
  } catch (e) {
    console.error('Error reading products catalog', e);
  }

  // 2. Aggregate items from stored orders to ensure every historical product is remembered
  try {
    const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (rawOrders) {
      const orders: Order[] = JSON.parse(rawOrders);
      orders.forEach(o => {
        (o.items || []).forEach(item => {
          const cleanCode = (item.code || '').trim();
          if (cleanCode && !catalogMap.has(cleanCode.toLowerCase())) {
            catalogMap.set(cleanCode.toLowerCase(), {
              code: cleanCode,
              artikul: item.artikul || `ART-${cleanCode}`,
              name: item.name || `Ապրանք #${cleanCode}`,
              price: item.price || 0,
              lastUpdated: o.purchaseDate || getTodayLocalYMD()
            });
          }
        });
      });
    }
  } catch (e) {
    console.error('Error reading orders for products aggregation', e);
  }

  return Array.from(catalogMap.values());
};

// Save or update products in catalog
export const saveProductsToCatalog = (newItems: Array<{ code: string; artikul?: string; name?: string; price: number }>) => {
  if (!newItems || newItems.length === 0) return;

  const currentProducts = getSavedProducts();
  const catalogMap = new Map<string, ProductCatalogItem>();

  currentProducts.forEach(p => {
    catalogMap.set(p.code.toLowerCase(), p);
  });

  newItems.forEach(item => {
    const cleanCode = (item.code || '').trim();
    if (!cleanCode) return;

    catalogMap.set(cleanCode.toLowerCase(), {
      code: cleanCode,
      artikul: item.artikul || `ART-${cleanCode}`,
      name: item.name || catalogMap.get(cleanCode.toLowerCase())?.name || `Ապրանք #${cleanCode}`,
      price: item.price !== undefined ? item.price : (catalogMap.get(cleanCode.toLowerCase())?.price || 0),
      lastUpdated: getTodayLocalYMD()
    });
  });

  const updatedList = Array.from(catalogMap.values());
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));
};

// Find product by code or artikul
export const findProductByCode = (query: string): ProductCatalogItem | undefined => {
  if (!query || !query.trim()) return undefined;
  const q = query.trim().toLowerCase();
  const products = getSavedProducts();
  return products.find(p => 
    p.code.toLowerCase() === q || 
    (p.artikul && p.artikul.toLowerCase() === q)
  );
};

export const toLocalYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getTodayLocalYMD = (): string => {
  return toLocalYMD(new Date());
};

export const parseDateSafe = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const s = String(dateStr).trim();
  if (!s) return null;

  // 1. Direct YYYY-MM-DD (with optional time)
  const ymdMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Direct DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Direct DD/MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 4. Fallback standard Date constructor
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

export const calculateItemLineSubtotal = (item: OrderItem): number => {
  return (item.quantity || 0) * (item.price || 0);
};

export const calculateItemDiscount = (item: OrderItem): number => {
  const lineSubtotal = calculateItemLineSubtotal(item);
  if (!item.discount || item.discount <= 0) return 0;
  if (item.discountType === 'FIXED') {
    return Math.min(lineSubtotal, item.discount);
  }
  // PERCENT by default
  const percent = Math.min(100, Math.max(0, item.discount));
  return Math.round((lineSubtotal * percent) / 100);
};

export const calculateItemLineTotal = (item: OrderItem): number => {
  const lineSubtotal = calculateItemLineSubtotal(item);
  const discount = calculateItemDiscount(item);
  return Math.max(0, lineSubtotal - discount);
};

export const calculateOrderSubtotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemLineSubtotal(item), 0);
};

export const calculateTotalItemDiscounts = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemDiscount(item), 0);
};

export const calculateOrderTotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemLineTotal(item), 0);
};

const MOCK_ORDERS: Order[] = [];

export const getDemoOrders = (): Order[] => {
  const today = getTodayLocalYMD();
  return [
    {
      id: '1001',
      customerName: 'Արմեն Կարապետյան',
      phoneNumber: '+374 91 123456',
      purchaseDate: today,
      deliveryDate: today,
      address: 'Երևան, Թումանյան 12, բն. 4',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      saleType: SaleType.DELIVERY,
      salesRep: 'Սրահի աշխատակից',
      cashierNote: 'Առաքել մինչև ժամը 18:00',
      items: [
        { id: 'item-1', code: '1001', artikul: 'ART-1001', name: 'Օդորակիչ Smart Inverter', quantity: 1, price: 185000, discount: 5000, discountType: 'FIXED' }
      ],
      totalAmount: 180000,
      notes: 'Արագ առաքում',
      latitude: 40.1792,
      longitude: 44.4991,
      statusHistory: [],
      events: []
    },
    {
      id: '1002',
      customerName: 'Աննա Հակոբյան',
      phoneNumber: '+374 98 654321',
      purchaseDate: today,
      deliveryDate: today,
      address: 'Երևան, Կոմիտաս 35',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      saleType: SaleType.ON_SITE,
      salesRep: 'Սրահի աշխատակից',
      cashierNote: 'Վճարվել է կանխիկ',
      items: [
        { id: 'item-2', code: '2004', artikul: 'ART-2004', name: 'Էլեկտրական Թեյնիկ Bosch', quantity: 2, price: 24000, discount: 0 }
      ],
      totalAmount: 48000,
      notes: 'Տեղում վաճառք',
      latitude: 40.2012,
      longitude: 44.5123,
      statusHistory: [],
      events: []
    }
  ];
};

export const resetToDemoOrders = () => {
  const demos = getDemoOrders();
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(demos));
  return { orders: demos, clients: [] };
};

export const clearAllOrders = () => {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  return { orders: [], clients: [] };
};

const nextNumericIdAbove = (orders: Order[]): string => {
  let maxNum = 999;
  const taken = new Set<string>();
  for (const o of orders) {
    const cleanId = String(o.id ?? '').trim();
    taken.add(cleanId);
    const num = parseInt(cleanId.replace(/^ORD-/, ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  // Guard against collisions with non-parsable edge IDs: keep advancing until the
  // candidate is guaranteed free in the current dataset.
  let candidate = maxNum + 1;
  while (taken.has(String(candidate))) {
    candidate += 1;
  }
  return String(candidate);
};

export const generateNextNumericOrderId = (): string => {
  const { orders } = getStoredData();
  return nextNumericIdAbove(orders);
};

/** Overwrite the full orders collection in local storage (used by JSON imports). */
export const saveAllOrders = (orders: Order[]) => {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
};

export interface OrderImportResult {
  orders: Order[];
  /** Incoming orders skipped in merge mode because their ID already exists. */
  skippedDuplicates: number;
  /** Incoming orders assigned a fresh unique ID to avoid a collision. */
  renumbered: number;
}

/**
 * Merge-hardened import of orders into local storage.
 *
 * Guarantees that the resulting dataset can never contain two orders with the
 * same ID (which would silently break save/update/delete lookups):
 * - 'replace': takes the imported list, but de-duplicates IDs within the file itself.
 * - 'merge':   keeps existing orders; an incoming order whose ID already exists is
 *              treated as a duplicate and skipped, any other ID clash gets renumbered
 *              to the next free numeric ID instead of overwriting real data.
 */
export const importOrdersIntoStorage = (
  existingOrders: Order[],
  importedOrders: Order[],
  mode: 'replace' | 'merge'
): OrderImportResult => {
  let skippedDuplicates = 0;
  let renumbered = 0;

  const base: Order[] = mode === 'replace' ? [] : [...existingOrders];
  const taken = new Set(base.map(o => String(o.id ?? '').trim()));

  for (const rawIncoming of importedOrders) {
    let incoming = rawIncoming;
    const id = String(incoming.id ?? '').trim();
    if (taken.has(id)) {
      if (mode === 'merge') {
        // Same ID already present -> treat as duplicate backup entry, skip it.
        skippedDuplicates += 1;
        continue;
      }
      // Inside replace mode the only clash possible is within the imported file
      // itself: give the later one a fresh unique ID rather than duplicating it.
      incoming = { ...incoming, id: nextNumericIdAbove([...base, ...importedOrders]) };
      renumbered += 1;
    } else if (!id) {
      incoming = { ...incoming, id: nextNumericIdAbove(base) };
      renumbered += 1;
    }
    taken.add(String(incoming.id).trim());
    base.unshift(incoming);
  }

  saveAllOrders(base);
  return { orders: base, skippedDuplicates, renumbered };
};

export const getStoredData = () => {
  const isResetDone = localStorage.getItem('crm_orders_reset_v2');
  if (!isResetDone) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem('crm_orders_reset_v2', 'true');
    return { orders: [], clients: [] };
  }

  const storedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
  let orders: Order[] = [];
  
  if (storedOrders) {
    try {
      orders = JSON.parse(storedOrders);
      // Migration: ensure all existing orders are updated to numeric IDs and items have code, artikul, and name
      orders = orders.map((o, index) => {
        const assignedId = (o.id && String(o.id).trim()) ? String(o.id).trim() : String(1000 + index);
        return {
          ...o,
          id: assignedId,
          saleType: o.saleType || SaleType.ON_SITE,
          salesRep: o.salesRep || 'Սրահի աշխատակից',
          cashierNote: o.cashierNote || '',
          items: (Array.isArray(o.items) ? o.items : []).map(item => {
            const code = item.code || '1001';
            const artikul = item.artikul || `ART-${code}`;
            return {
              ...item,
              code,
              artikul
            };
          }),
          totalAmount: o.totalAmount || 0,
          paymentStatus: o.paymentStatus || PaymentStatus.UNPAID,
          statusHistory: o.statusHistory || []
        };
      });
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      orders = [];
    }
  } else {
    orders = [];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
  
  return { orders, clients: [] };
};

export const saveOrder = (order: Order) => {
  const { orders } = getStoredData();
  
  const orderIndex = orders.findIndex((o: Order) => o.id === order.id);
  const updatedOrders = [...orders];
  if (orderIndex > -1) {
    updatedOrders[orderIndex] = order;
  } else {
    updatedOrders.unshift(order);
  }

  // Auto-save products to database
  if (order.items && order.items.length > 0) {
    saveProductsToCatalog(order.items);
  }

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  return { orders: updatedOrders, clients: [] };
};

export const updateOrder = (orderId: string, updates: Partial<Order>) => {
  const { orders } = getStoredData();
  const orderIndex = orders.findIndex((o: Order) => o.id === orderId);
  if (orderIndex === -1) return { orders, clients: [] };

  const updatedOrders = [...orders];
  updatedOrders[orderIndex] = { ...updatedOrders[orderIndex], ...updates };
  
  // Auto-save products to database if items were updated
  if (updates.items && updates.items.length > 0) {
    saveProductsToCatalog(updates.items);
  }

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  return { orders: updatedOrders, clients: [] };
};

export const deleteOrder = (orderId: string) => {
  const { orders } = getStoredData();
  const updatedOrders = orders.filter(o => o.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  return { orders: updatedOrders, clients: [] };
};

export const createEvent = (type: OrderEvent['type'], message: string): OrderEvent => ({
  id: Math.random().toString(36).substr(2, 9),
  type,
  message,
  timestamp: new Date().toISOString(),
});

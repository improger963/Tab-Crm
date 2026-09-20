import { Client, Order, OrderStatus, OrderEvent, OrderItem, PaymentStatus, SaleType, PaymentTerms, PaymentMethod } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'crm_orders',
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

export const generateNextNumericOrderId = (): string => {
  const { orders } = getStoredData();
  let maxNum = 999;
  for (const o of orders) {
    const cleanId = (o.id || '').replace(/^ORD-/, '');
    const num = parseInt(cleanId, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return String(nextNum);
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

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  return { orders: updatedOrders, clients: [] };
};

export const updateOrder = (orderId: string, updates: Partial<Order>) => {
  const { orders } = getStoredData();
  const orderIndex = orders.findIndex((o: Order) => o.id === orderId);
  if (orderIndex === -1) return { orders, clients: [] };

  const updatedOrders = [...orders];
  updatedOrders[orderIndex] = { ...updatedOrders[orderIndex], ...updates };
  
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

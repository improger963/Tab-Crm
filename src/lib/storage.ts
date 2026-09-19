import { Client, Order, OrderStatus, OrderEvent, OrderItem, PaymentStatus, SaleType, PaymentTerms, PaymentMethod } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'crm_orders',
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
        const cleanId = (o.id || '').replace(/^ORD-/, '');
        const num = parseInt(cleanId, 10);
        const assignedId = (!isNaN(num) && num >= 1000) ? String(num) : String(1000 + index);
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

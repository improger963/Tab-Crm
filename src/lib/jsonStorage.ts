import { Order, OrderStatus, PaymentStatus, SaleType } from '../types';
import { getTodayLocalYMD } from './storage';

export interface JsonDatabasePayload {
  app: string;
  version: string;
  exportedAt: string;
  totalOrders: number;
  orders: Order[];
}

/**
 * Downloads the current orders as a formatted .json file
 */
export const downloadOrdersAsJsonFile = (orders: Order[], filename?: string): void => {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalFileName = filename || `tab_am_orders_backup_${dateStr}.json`;

  const payload: JsonDatabasePayload = {
    app: 'tab.am POS & CRM',
    version: '2.0-local-json',
    exportedAt: new Date().toISOString(),
    totalOrders: orders.length,
    orders,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validates and extracts orders from a JSON string or file content
 */
export const parseOrdersJson = (jsonString: string): { success: boolean; orders: Order[]; message?: string } => {
  try {
    const parsed = JSON.parse(jsonString);
    let extracted: any[] = [];

    if (Array.isArray(parsed)) {
      extracted = parsed;
    } else if (parsed && Array.isArray(parsed.orders)) {
      extracted = parsed.orders;
    } else {
      return {
        success: false,
        orders: [],
        message: 'JSON ֆայլը չի պարունակում պատվերների ճիշտ ցանկ (orders array):',
      };
    }

    // Basic sanitization of each order
    const validOrders: Order[] = extracted.map((o: any, idx: number) => ({
      id: String(o.id || (1000 + idx)).trim(),
      customerName: String(o.customerName || 'Անանուն Հաճախորդ'),
      phoneNumber: String(o.phoneNumber || o.customerPhone || ''),
      purchaseDate: String(o.purchaseDate || getTodayLocalYMD()),
      deliveryDate: String(o.deliveryDate || getTodayLocalYMD()),
      address: String(o.address || o.customerAddress || 'Երևան'),
      saleType: o.saleType || SaleType.ON_SITE,
      salesRep: o.salesRep || 'Սրահի աշխատակից',
      cashierNote: o.cashierNote || '',
      pickupBranch: o.pickupBranch || '',
      items: Array.isArray(o.items) ? o.items : [],
      totalAmount: Number(o.totalAmount || 0),
      subtotalAmount: o.subtotalAmount ? Number(o.subtotalAmount) : undefined,
      discount: o.discount ? Number(o.discount) : 0,
      discountType: o.discountType || 'PERCENT',
      paymentTerms: o.paymentTerms,
      prepaymentAmount: o.prepaymentAmount ? Number(o.prepaymentAmount) : 0,
      remainingBalance: o.remainingBalance ? Number(o.remainingBalance) : 0,
      paymentMethod: o.paymentMethod,
      cashReceived: o.cashReceived ? Number(o.cashReceived) : 0,
      changeAmount: o.changeAmount ? Number(o.changeAmount) : 0,
      hdmPrinted: Boolean(o.hdmPrinted),
      status: o.status || OrderStatus.PENDING,
      paymentStatus: o.paymentStatus || PaymentStatus.UNPAID,
      notes: String(o.notes || ''),
      statusHistory: Array.isArray(o.statusHistory) ? o.statusHistory : [],
      latitude: Number(o.latitude || 40.1792),
      longitude: Number(o.longitude || 44.4991),
      events: Array.isArray(o.events) ? o.events : [],
    }));

    return {
      success: true,
      orders: validOrders,
    };
  } catch (err: any) {
    return {
      success: false,
      orders: [],
      message: `JSON ֆայլի ընթերցման սխալ՝ ${err.message || 'Անվավեր JSON ձևաչափ'}`,
    };
  }
};

/**
 * Calculates estimated storage size of orders in KB
 */
export const getJsonStorageSizeInKB = (orders: Order[]): string => {
  try {
    const str = JSON.stringify(orders);
    const bytes = new Blob([str]).size;
    return (bytes / 1024).toFixed(2);
  } catch {
    return '0.00';
  }
};

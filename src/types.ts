export enum SaleType {
  ON_SITE = 'Վաճառք տեղում',
  DELIVERY = 'Առաքում',
  PICKUP = 'Մոտեցնել խանութ'
}

export enum OrderStatus {
  PENDING = 'Սպասում է դրամարկղին',
  SOLD = 'Վաճառված է (POS)',
  IN_TRANSIT = 'Առաքման մեջ',
  DELIVERED = 'Ավարտված / Հանձնված',
  CANCELLED = 'Չեղարկված'
}

export enum PaymentStatus {
  PAID = 'Վճարված է',
  UNPAID = 'Չվճարված',
  PARTIAL = 'Մասնակի վճարված'
}

export enum PaymentTerms {
  FULL = 'Լրիվ վճարում',
  PREPAYMENT = 'Մասնակի վճարում'
}

export enum PaymentMethod {
  CASH = 'Կանխիկ',
  CARD = 'Քարտով (POS)',
  IDRAM = 'Idram',
  TRANSFER = 'Փոխանցում քարտին'
}

export interface OrderItem {
  id: string;
  code: string;      // Ապրանքի կոդ (ներքին / POS)
  artikul?: string;  // Գործարանային կոդ (Արտիկուլ / Gorcaranayin code)
  name?: string;     // Ապրանքի անվանում (ըստ ցանկության)
  quantity: number;  // Քանակ
  price: number;     // Միավորի գին (AMD)
  discount?: number; // Անհատական զեղչի արժեք
  discountType?: 'PERCENT' | 'FIXED'; // '%' կամ '֏' (Լռելյայն՝ PERCENT)
}

export interface StatusHistoryLog {
  status: OrderStatus;
  timestamp: string; // ISO string date-time of change
}

export interface OrderEvent {
  id: string;
  type: 'STATUS_CHANGE' | 'CREATED' | 'NOTE_ADDED' | 'LOCATION_UPDATE';
  message: string;
  timestamp: string; // ISO string
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrderDate: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerName: string;
  phoneNumber: string;
  additionalPhoneNumbers?: string[]; // Հավելյալ հեռախոսահամարներ
  purchaseDate: string;
  deliveryDate: string;
  address: string;
  saleType: SaleType;
  salesRep?: string;          // Սրահի աշխատակցի անուն
  cashierNote?: string;       // Դրամարկղի համար ինֆորմացիա / POS նշում
  pickupBranch?: string;      // Մասնաճյուղ (եթե մոտեցնել խանութ)
  items: OrderItem[];         // Dynamic list with codes
  totalAmount: number;        // Auto-calculated sum (after discount)
  subtotalAmount?: number;    // Pre-discount sum
  discount?: number;          // Discount value
  discountType?: 'PERCENT' | 'FIXED';
  paymentTerms?: PaymentTerms | string; // 'Լրիվ վճարում' կամ 'Մասնակի վճարում'
  prepaymentAmount?: number;  // Մասնակի վճարման գումար (֏)
  remainingBalance?: number;  // Մնացորդ գումար (֏)
  paymentMethod?: PaymentMethod | string;
  cashReceived?: number;      // Կանխիկ ստացված գումար
  changeAmount?: number;      // Մանր վերադարձնելու գումար
  hdmPrinted?: boolean;       // ՀԴՄ կտրոնը խփված է
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes: string;
  statusHistory: StatusHistoryLog[]; 
  latitude: number;
  longitude: number;
  events: OrderEvent[];
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

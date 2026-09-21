import React, { useState, useMemo } from 'react';
import SelectField from './SelectField';
import { 
  Plus, Trash2, ShoppingBag, Truck, Store, 
  FileText, User, Phone, MapPin, Calendar, CheckCircle2, 
  Receipt, AlertCircle, Sparkles, Minus, DollarSign, 
  CreditCard, Smartphone, Percent, Tag, ScanLine, Search, 
  ArrowRightLeft, Clock, ShieldCheck
} from 'lucide-react';
import { Order, OrderStatus, OrderItem, PaymentStatus, SaleType, PaymentMethod, PaymentTerms } from '../types';
import { 
  calculateOrderTotal, 
  calculateOrderSubtotal, 
  calculateTotalItemDiscounts, 
  calculateItemLineSubtotal, 
  calculateItemDiscount, 
  calculateItemLineTotal,
  generateNextNumericOrderId,
  getTodayLocalYMD,
  getSavedProducts,
  findProductByCode,
  saveProductsToCatalog
} from '../lib/storage';
import { posAudio } from '../lib/posAudio';

interface CreateOrderPageProps {
  onSave: (order: Order, printSlip: boolean) => void;
  onCancel: () => void;
}

export default function CreateOrderPage({ onSave, onCancel }: CreateOrderPageProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    purchaseDate: getTodayLocalYMD(),
    deliveryDate: '',
    address: '',
    saleType: SaleType.ON_SITE,
    salesRep: 'Անի Մարտիրոսյան',
    cashierNote: 'ՀԴՄ տպել տեղում',
    pickupBranch: 'Գլխավոր Մասնաճյուղ (Կենտրոն)',
    notes: '',
    paymentTerms: PaymentTerms.FULL,
    prepaymentAmount: 0,
    paymentMethod: PaymentMethod.CASH,
    discount: 0,
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    cashReceived: 0
  });

  // Additional phone numbers list
  const [additionalPhoneNumbers, setAdditionalPhoneNumbers] = useState<string[]>([]);

  // No default item pre-added! Start with an empty array.
  const [items, setItems] = useState<OrderItem[]>([]);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get saved products from catalog memory (database)
  const savedProducts = useMemo(() => getSavedProducts(), [items]);

  // Armenian Phone Formatter: +374 (XX) XX-XX-XX
  const formatPhoneNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    let numbers = cleanValue;
    if (numbers.startsWith('374')) {
      numbers = numbers.slice(3);
    } else if (numbers.startsWith('0')) {
      numbers = numbers.slice(1);
    }
    const limited = numbers.slice(0, 8);
    if (limited.length === 0) return '';
    
    let formatted = '+374';
    if (limited.length > 0) formatted += ` (${limited.slice(0, 2)}`;
    if (limited.length > 2) formatted += `) ${limited.slice(2, 4)}`;
    if (limited.length > 4) formatted += `-${limited.slice(4, 6)}`;
    if (limited.length > 6) formatted += `-${limited.slice(6, 8)}`;
    
    return formatted;
  };

  const handleAddAdditionalPhone = () => {
    setAdditionalPhoneNumbers(prev => [...prev, '']);
  };

  const handleAdditionalPhoneChange = (index: number, val: string) => {
    const formatted = formatPhoneNumber(val);
    setAdditionalPhoneNumbers(prev => {
      const next = [...prev];
      next[index] = formatted;
      return next;
    });
  };

  const handleRemoveAdditionalPhone = (index: number) => {
    setAdditionalPhoneNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumber') {
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAddItem = (preset?: { code: string; artikul?: string; name?: string; price: number }) => {
    posAudio.playScanBeep();
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        code: preset ? preset.code : '',
        artikul: preset ? (preset.artikul || `ART-${preset.code}`) : '',
        name: preset ? (preset.name || '') : '',
        quantity: 1,
        price: preset ? preset.price : 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    posAudio.playScanBeep();
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // Auto-match saved product when code or artikul is typed
        if ((field === 'code' || field === 'artikul') && typeof value === 'string' && value.trim().length >= 1) {
          const matchedProduct = findProductByCode(value.trim());
          if (matchedProduct) {
            updated.name = matchedProduct.name || updated.name;
            updated.price = matchedProduct.price !== undefined ? matchedProduct.price : updated.price;
            if (field === 'code' && matchedProduct.artikul) updated.artikul = matchedProduct.artikul;
            if (field === 'artikul' && matchedProduct.code) updated.code = matchedProduct.code;
          }
        }

        return updated;
      }
      return item;
    }));

    if (errors.items) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.items;
        return next;
      });
    }
  };

  const handleAdjustQuantity = (id: string, delta: number) => {
    posAudio.playScanBeep();
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Gross Subtotal (sum of price * quantity before any discount)
  const grossSubtotalAmount = useMemo(() => calculateOrderSubtotal(items), [items]);

  // Total discounts applied to individual items
  const itemsDiscountTotal = useMemo(() => calculateTotalItemDiscounts(items), [items]);

  // Subtotal after individual item discounts
  const itemsNetSubtotal = useMemo(() => calculateOrderTotal(items), [items]);

  // Overall Order Discount calculation
  const orderDiscountAmount = useMemo(() => {
    if (!formData.discount || formData.discount <= 0) return 0;
    if (formData.discountType === 'PERCENT') {
      const percent = Math.min(100, Math.max(0, formData.discount));
      return Math.round((itemsNetSubtotal * percent) / 100);
    }
    return Math.min(formData.discount, itemsNetSubtotal);
  }, [itemsNetSubtotal, formData.discount, formData.discountType]);

  // Total combined discounts
  const totalCombinedDiscount = itemsDiscountTotal + orderDiscountAmount;

  // Final Total Amount
  const totalAmount = useMemo(() => {
    return Math.max(0, itemsNetSubtotal - orderDiscountAmount);
  }, [itemsNetSubtotal, orderDiscountAmount]);

  // Prepayment & Remaining Balance Calculations
  const isPrepayment = formData.paymentTerms === PaymentTerms.PREPAYMENT;
  const currentPrepayment = useMemo(() => {
    if (!isPrepayment) return 0;
    return Math.min(totalAmount, Math.max(0, formData.prepaymentAmount || 0));
  }, [isPrepayment, formData.prepaymentAmount, totalAmount]);

  const remainingBalance = useMemo(() => {
    if (!isPrepayment) return 0;
    return Math.max(0, totalAmount - currentPrepayment);
  }, [isPrepayment, totalAmount, currentPrepayment]);

  const payableNowAmount = isPrepayment ? currentPrepayment : totalAmount;

  // Change amount calculation when paying with cash
  const changeAmount = useMemo(() => {
    if (formData.paymentMethod !== PaymentMethod.CASH || !formData.cashReceived) return 0;
    return Math.max(0, formData.cashReceived - payableNowAmount);
  }, [formData.paymentMethod, formData.cashReceived, payableNowAmount]);

  // Filter saved catalog items from database memory
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return savedProducts;
    const q = catalogSearch.toLowerCase().trim();
    return savedProducts.filter(item => 
      item.code.toLowerCase().includes(q) || 
      (item.artikul && item.artikul.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q))
    );
  }, [catalogSearch, savedProducts]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.saleType === SaleType.DELIVERY) {
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Առաքման համար հաճախորդի անունը պարտադիր է';
      }
      if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 18) {
        newErrors.phoneNumber = 'Առաքման համար անհրաժեշտ է լիարժեք հեռախոսահամար (+374...)';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Առաքման հասցեն պարտադիր է';
      }
    } else if (formData.saleType === SaleType.PICKUP) {
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Մոտեցնել խանութ պատվերի համար հաճախորդի անունը պարտադիր է';
      }
      if (!formData.phoneNumber.trim() || formData.phoneNumber.length < 18) {
        newErrors.phoneNumber = 'Մոտեցնել խանութ պատվերի համար անհրաժեշտ է հեռախոսահամար (+374...)';
      }
      if (!formData.pickupBranch) {
        newErrors.pickupBranch = 'Մասնաճյուղն ընտրելը պարտադիր է';
      }
    } else {
      // SaleType.ON_SITE - Customer details are optional!
    }

    if (items.length === 0) {
      newErrors.items = 'Պատվերը պետք է ունենա առնվազն 1 ապրանք: Խնդրում ենք ավելացնել ապրանք:';
    } else {
      const invalidItems = items.some(item => (!item.code.trim() && !item.artikul?.trim()) || item.price <= 0 || item.quantity <= 0);
      if (invalidItems) {
        newErrors.items = 'Խնդրում ենք լրացնել ապրանքի կոդը կամ արտիկուլը, քանակը և գինը բոլոր տողերում';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (shouldPrint: boolean = false) => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    posAudio.playSuccessChime();

    // Determine initial payment status:
    const isStoreSale = formData.saleType === SaleType.ON_SITE;
    const customerDisplayName = formData.customerName.trim() || (isStoreSale ? 'Տեղում հաճախորդ' : 'Անանուն');

    const initialPaymentStatus = (!isStoreSale && isPrepayment && currentPrepayment > 0)
      ? PaymentStatus.PARTIAL 
      : PaymentStatus.UNPAID;

    // Filter valid additional phone numbers
    const validAdditionalPhones = additionalPhoneNumbers.filter(p => p.trim() !== '');

    const orderData: Order = {
      id: generateNextNumericOrderId(),
      customerName: customerDisplayName,
      phoneNumber: formData.phoneNumber,
      additionalPhoneNumbers: validAdditionalPhones,
      purchaseDate: formData.purchaseDate,
      deliveryDate: formData.deliveryDate,
      address: formData.address.trim() || (isStoreSale ? 'Խանութ-Սրահ (Տեղում)' : formData.pickupBranch),
      saleType: formData.saleType,
      salesRep: formData.salesRep.trim() || 'Սրահի աշխատակից',
      cashierNote: formData.cashierNote.trim(),
      pickupBranch: formData.pickupBranch,
      items: items,
      subtotalAmount: grossSubtotalAmount,
      discount: formData.discount,
      discountType: formData.discountType,
      totalAmount: totalAmount,
      paymentTerms: isStoreSale ? PaymentTerms.FULL : formData.paymentTerms,
      prepaymentAmount: isStoreSale ? 0 : currentPrepayment,
      remainingBalance: isStoreSale ? 0 : remainingBalance,
      paymentMethod: formData.paymentMethod,
      cashReceived: formData.cashReceived,
      changeAmount: changeAmount,
      hdmPrinted: false,
      status: OrderStatus.PENDING,
      paymentStatus: initialPaymentStatus,
      notes: formData.notes.trim(),
      statusHistory: [
        { status: OrderStatus.PENDING, timestamp: new Date().toISOString() }
      ],
      latitude: 40.1792 + (Math.random() - 0.5) * 0.05,
      longitude: 44.5152 + (Math.random() - 0.5) * 0.05,
      events: [
        {
          id: Math.random().toString(36).substr(2, 9),
          type: 'CREATED',
          message: `Պատվերը գրանցվել է (${formData.saleType}) • ${formData.paymentTerms === PaymentTerms.PREPAYMENT ? 'Մասնակի վճարումով' : 'Լրիվ վճարում'} (${formData.paymentMethod})`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    onSave(orderData, shouldPrint);
  };

  return (
    /* Page enter/exit is driven once by App's PAGE_VARIANTS wrapper. */
    <div 
      className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-36 sm:pb-32 px-1 sm:px-0"
    >
      {/* Global Validation Alert */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold shadow-xs animate-rise-in">
          <AlertCircle className="w-5 h-5 text-danger-edge shrink-0" />
          <span>Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը կարմիրով նշված հատվածներում:</span>
        </div>
      )}

      {/* Step Indicators Header - Fully Adaptive */}
      <div className="bg-surface p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Mobile Stepper (< sm) */}
        <div className="block sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800">Վաճառքի 3 Քայլ</span>
            </div>
            <span className="text-xs font-mono font-bold text-primary-ink bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Քայլ 1 / 3
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-1/3 rounded-full transition-all duration-300" />
          </div>
          <p className="text-xs font-bold text-primary-ink truncate">
            1. Հավաքել Ապրանքները և Ասել Գումարը
          </p>
        </div>

        {/* Tablet & Desktop Stepper (sm+) */}
        <div className="hidden sm:flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-800 whitespace-nowrap">Վաճառքի Գործընթաց՝</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2 flex-1 justify-end">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-primary-ink rounded-xl font-bold shadow-2xs">
              <span className="w-4.5 h-4.5 rounded-full bg-primary text-white flex items-center justify-center text-2xs shrink-0">1</span>
              <span className="truncate">1. Ապրանքներ & Գումար</span>
            </div>
            <span className="text-slate-500 font-bold">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold">
              <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-2xs shrink-0">2</span>
              <span className="truncate">2. Հաճախորդ</span>
            </div>
            <span className="text-slate-500 font-bold">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold">
              <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-2xs shrink-0">3</span>
              <span className="truncate">3. Վճարում & Դրամարկղ</span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: Products Table & Instant Price to Tell Customer */}
      <div className="bg-surface p-4 sm:p-6 rounded-2xl border-2 border-indigo-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0 mt-0.5 sm:mt-0">
              1
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-900 leading-tight">
                  Ապրանքների Հավաքում և Գումարի Հաշվարկ
                </h2>
                <span className="text-2xs font-bold text-primary-ink bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                  առաջին հերթին
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                Ավելացրեք ապրանքները SKU-ով կամ կատալոգից և հաճախորդին ասեք ընդհանուր գումարը
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAddItem()}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-primary hover:bg-primary-strong text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ավելացնել Ապրանք</span>
          </button>
        </div>

        {/* Quick Add Presets & Fast Search Bar */}
        <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                aria-label="Որոնել կատալոգում ըստ Կոդի կամ Արտիկուլի"
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Որոնել կատալոգում ըստ Կոդի կամ Արտիկուլի..."
                className="w-full pl-9 pr-3 py-2 bg-surface border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 hidden xl:inline shrink-0">
              Արագ ընտրություն՝
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            {filteredCatalog.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddItem(preset)}
                className="px-2.5 sm:px-3 py-1.5 bg-surface hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-primary-ink text-xs sm:text-xs font-medium rounded-xl shrink-0 transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
              >
                <span className="font-mono font-bold text-primary-ink bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-2xs sm:text-2xs">
                  {preset.code}
                </span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 text-2xs sm:text-2xs">
                  {preset.artikul}
                </span>
                <span className="text-slate-500 font-mono text-2xs sm:text-2xs whitespace-nowrap">({preset.price.toLocaleString()} ֏)</span>
              </button>
            ))}
          </div>
        </div>

        {errors.items && (
          <p className="text-xs text-danger-edge font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
            {errors.items}
          </p>
        )}

        {/* Desktop Table View (lg+) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-2xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/60">
                <th className="py-2.5 px-3 w-40 rounded-l-xl">Ապրանքի Կոդ</th>
                <th className="py-2.5 px-3 w-40">Արտիկուլ (Artikul)</th>
                <th className="py-2.5 px-3 w-28 text-center">Քանակ</th>
                <th className="py-2.5 px-3 w-32">Միավորի Գին</th>
                <th className="py-2.5 px-3 w-32">Ապրանքի Զեղչ</th>
                <th className="py-2.5 px-3 w-32 text-right">Տողի Գումար</th>
                <th className="py-2.5 px-2 w-10 text-center rounded-r-xl"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-3 text-center">
                    <div className="flex flex-col items-center gap-1.5 text-slate-400">
                      <ShoppingBag className="w-6 h-6 opacity-60" />
                      <p className="text-xs font-semibold">Ապրանքներ դեռ չեն ավելացվել</p>
                      <p className="text-2xs font-medium">Սեղմեք «Ավելացնել Ապրանք» կամ ընտրեք արագ կատալոգից</p>
                    </div>
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const lineSubtotal = calculateItemLineSubtotal(item);
                const itemDiscount = calculateItemDiscount(item);
                const lineTotal = calculateItemLineTotal(item);
                const hasDiscount = itemDiscount > 0;

                return (
                  <tr key={item.id} className="row-interactive animate-rise-in">
                    <td className="py-2.5 px-3">
                      <input
                        aria-label="Ապրանքի կոդ"
                        type="text"
                        value={item.code || ''}
                        onChange={(e) => handleItemChange(item.id, 'code', e.target.value)}
                        placeholder="օր.՝ 4203"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-primary-ink focus:bg-surface focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        aria-label="Արտիկուլ (Artikul)"
                        type="text"
                        value={item.artikul || ''}
                        onChange={(e) => handleItemChange(item.id, 'artikul', e.target.value)}
                        placeholder="օր.՝ ART-4203"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-amber-800 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item.id, -1)}
                          className="h-6 w-6 rounded bg-surface hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-2xs text-xs font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          aria-label="Քանակ"
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-10 text-center bg-transparent text-xs font-mono font-bold text-slate-900 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item.id, 1)}
                          className="h-6 w-6 rounded bg-surface hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-2xs text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        aria-label="Միավորի Գին (֏)"
                        type="number"
                        min="0"
                        step="100"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-800 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          aria-label="Ապրանքի Զեղչ"
                          type="number"
                          min="0"
                          max={item.discountType === 'FIXED' ? lineSubtotal : 100}
                          value={item.discount || ''}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center text-slate-900 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-surface shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'discountType', 'PERCENT')}
                            className={`px-1.5 py-1 text-xs font-bold cursor-pointer transition-all ${
                              (!item.discountType || item.discountType === 'PERCENT')
                                ? 'bg-primary text-white' 
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Տոկոսային զեղչ (%)"
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'discountType', 'FIXED')}
                            className={`px-1.5 py-1 text-xs font-bold cursor-pointer transition-all ${
                              item.discountType === 'FIXED' 
                                ? 'bg-primary text-white' 
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Գումարային զեղչ (֏)"
                          >
                            ֏
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {hasDiscount ? (
                        <div>
                          <span className="font-mono text-2xs text-slate-500 line-through block">
                            {lineSubtotal.toLocaleString()} ֏
                          </span>
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-mono text-xs font-bold text-emerald-700">
                              {lineTotal.toLocaleString()} ֏
                            </span>
                            <span className="text-2xs font-bold bg-rose-50 text-rose-600 px-1 py-0.5 rounded border border-rose-200">
                              -{itemDiscount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {lineTotal.toLocaleString()} ֏
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-20 hover:bg-rose-50 cursor-pointer"
                        title="Հեռացնել տողը"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tablet & Mobile Items Card View (< lg) */}
        <div className="block lg:hidden space-y-3">
          {items.length === 0 && (
            <div className="py-8 px-3 text-center flex flex-col items-center gap-1.5 text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <ShoppingBag className="w-6 h-6 opacity-60" />
              <p className="text-xs font-semibold">Ապրանքներ դեռ չեն ավելացվել</p>
              <p className="text-2xs font-medium">Սեղմեք «Ավելացնել Ապրանք» կամ ընտրեք արագ կատալոգից</p>
            </div>
          )}
          {items.map((item, idx) => {
            const lineSubtotal = calculateItemLineSubtotal(item);
            const itemDiscount = calculateItemDiscount(item);
            const lineTotal = calculateItemLineTotal(item);
            const hasDiscount = itemDiscount > 0;

            return (
              <div 
                key={item.id} 
                className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 relative shadow-2xs animate-rise-in"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-bold text-primary-ink bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Ապրանքի Տվյալներ</span>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-danger-edge hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Հեռացնել"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-2xs font-bold text-slate-500 block mb-1">Ապրանքի Կոդ</label>
                    <input
                      aria-label="Ապրանքի Կոդ"
                      type="text"
                      value={item.code || ''}
                      onChange={(e) => handleItemChange(item.id, 'code', e.target.value)}
                      placeholder="օր.՝ 4203"
                      className="w-full px-3 py-2 bg-surface border border-slate-200 rounded-xl text-xs font-mono font-bold text-primary-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-500 block mb-1">Արտիկուլ (Artikul)</label>
                    <input
                      aria-label="Արտիկուլ (Artikul)"
                      type="text"
                      value={item.artikul || ''}
                      onChange={(e) => handleItemChange(item.id, 'artikul', e.target.value)}
                      placeholder="օր.՝ ART-4203"
                      className="w-full px-3 py-2 bg-surface border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-warning/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-2xs font-bold text-slate-500 block mb-1">Քանակ</label>
                    <div className="flex items-center justify-between bg-surface border border-slate-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustQuantity(item.id, -1)}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustQuantity(item.id, 1)}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-500 block mb-1">Միավորի Գին (֏)</label>
                    <input
                      aria-label="Միավորի Գին (֏)"
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2.5 py-2 bg-surface border border-slate-200 rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xs font-bold text-slate-500">Զեղչ՝</span>
                    <input
                      aria-label="Ապրանքի Զեղչ"
                      type="number"
                      value={item.discount || ''}
                      onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 px-2 py-1 bg-surface border border-slate-200 rounded-lg text-xs font-mono text-center"
                    />
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-surface shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'discountType', 'PERCENT')}
                        className={`px-2 py-1 text-2xs font-bold cursor-pointer ${(!item.discountType || item.discountType === 'PERCENT') ? 'bg-primary text-white' : 'text-slate-600'}`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'discountType', 'FIXED')}
                        className={`px-2 py-1 text-2xs font-bold cursor-pointer ${item.discountType === 'FIXED' ? 'bg-primary text-white' : 'text-slate-600'}`}
                      >
                        ֏
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    {hasDiscount && (
                      <span className="text-2xs text-slate-500 line-through font-mono block">
                        {lineSubtotal.toLocaleString()} ֏
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {lineTotal.toLocaleString()} ֏
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Discount & PROMINENT PRICE DISPLAY FOR TELLING CUSTOMER */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
          {/* Order Level Discount */}
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary-ink" /> Պատվերի Ընդհանուր Լրացուցիչ Զեղչ՝
              </span>
              {itemsDiscountTotal > 0 && (
                <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ապրանքների զեղչ՝ -{itemsDiscountTotal.toLocaleString()} ֏
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                aria-label="Պատվերի ընդհանուր լրացուցիչ զեղչ"
                type="number"
                min="0"
                value={formData.discount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="w-24 px-2.5 py-1.5 bg-surface border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-surface shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discountType: 'PERCENT' }))}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${formData.discountType === 'PERCENT' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discountType: 'FIXED' }))}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${formData.discountType === 'FIXED' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ֏
                </button>
              </div>

              {orderDiscountAmount > 0 && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                  -{orderDiscountAmount.toLocaleString()} ֏
                </span>
              )}
            </div>
          </div>

          {/* TOTAL ANNOUNCEMENT BANNER - "Հաճախորդին ասելու գումարը" */}
          <div className="bg-ink-inverse text-white p-4 sm:p-5 rounded-2xl shadow-md border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Հաճախորդին Ասելու Գումարը
                </span>
              </div>
              <div className="text-xs text-white/75">
                Ապրանքներ՝ {items.length} հատ • Ենթագումար՝ {grossSubtotalAmount.toLocaleString()} ֏
                {totalCombinedDiscount > 0 && (
                  <span className="text-emerald-400 font-bold ml-1.5">
                    (Զեղչ՝ -{totalCombinedDiscount.toLocaleString()} ֏)
                  </span>
                )}
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/15 sm:pl-4">
              <span className="text-2xs font-bold uppercase tracking-wider text-white/70 block">
                Ընդհանուր Վճարման Գումար
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tracking-tight">
                {totalAmount.toLocaleString()} <span className="text-sm font-normal text-white/60">֏</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Sale Type & Customer Registration */}
      <div className="bg-surface p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <span className="w-8 h-8 rounded-2xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-xs">
            2
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Վաճառքի Տեսակ և Հաճախորդի Տվյալների Գրանցում
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Լրացրեք հաճախորդի տվյալները գումարը ճշտելուց հետո
            </p>
          </div>
        </div>

        {/* 2.1 Sale Type Selector Cards */}
        <div>
          <label className="section-title block mb-2">
            Վաճառքի Տեսակ <span className="text-danger-edge">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                posAudio.playScanBeep();
                setFormData(prev => ({ 
                  ...prev, 
                  saleType: SaleType.ON_SITE,
                  paymentTerms: PaymentTerms.FULL,
                  prepaymentAmount: 0
                }));
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-px active:scale-[0.99] flex flex-col justify-between gap-3 cursor-pointer ${
                formData.saleType === SaleType.ON_SITE 
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-primary/25' 
                  : 'border-slate-200 hover:border-slate-300 bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${formData.saleType === SaleType.ON_SITE ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                {formData.saleType === SaleType.ON_SITE && (
                  <span className="text-2xs font-bold text-primary-ink bg-indigo-100 px-2 py-0.5 rounded-full">
                    Ընտրված
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Վաճառք Տեղում (Սրահ)</p>
                <p className="text-2xs text-slate-500 font-medium mt-0.5">Հաճախորդը գնում է խանութ-սրահից</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                posAudio.playScanBeep();
                setFormData(prev => ({ ...prev, saleType: SaleType.DELIVERY }));
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-px active:scale-[0.99] flex flex-col justify-between gap-3 cursor-pointer ${
                formData.saleType === SaleType.DELIVERY 
                  ? 'border-sky-600 bg-sky-50/50 shadow-xs ring-2 ring-info/25' 
                  : 'border-slate-200 hover:border-slate-300 bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${formData.saleType === SaleType.DELIVERY ? 'bg-info text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Truck className="w-5 h-5" />
                </div>
                {formData.saleType === SaleType.DELIVERY && (
                  <span className="text-2xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    Ընտրված
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Առաքում (Delivery)</p>
                <p className="text-2xs text-slate-500 font-medium mt-0.5">Առաքիչով հասցեին հասցնելու համար</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                posAudio.playScanBeep();
                setFormData(prev => ({ ...prev, saleType: SaleType.PICKUP }));
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all hover:-translate-y-px active:scale-[0.99] flex flex-col justify-between gap-3 cursor-pointer ${
                formData.saleType === SaleType.PICKUP 
                  ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-warning/25' 
                  : 'border-slate-200 hover:border-slate-300 bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${formData.saleType === SaleType.PICKUP ? 'bg-warning text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Store className="w-5 h-5" />
                </div>
                {formData.saleType === SaleType.PICKUP && (
                  <span className="text-2xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Ընտրված
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Մոտեցնել Խանութ</p>
                <p className="text-2xs text-slate-500 font-medium mt-0.5">Պահեստից տեղափոխել նշված մասնաճյուղ</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2.2 Customer & Location Form Fields */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Հաճախորդի Անուն / Կոնտակտ {formData.saleType !== SaleType.ON_SITE ? <span className="text-danger-edge">*</span> : <span className="text-2xs text-slate-500 font-normal">(օպցիոնալ)</span>}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="customerName"
                  aria-label="Հաճախորդի անուն / կոնտակտ"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder={formData.saleType === SaleType.ON_SITE ? "Տեղում հաճախորդ (օպցիոնալ)" : "օր.՝ Արմեն Գրիգորյան"}
                  className={`input-field pl-9 ${errors.customerName ? 'border-danger-edge ring-1 ring-danger-edge/30' : ''}`}
                />
              </div>
              {errors.customerName && (
                <p className="text-2xs text-danger-edge font-bold mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Հեռախոսահամար {formData.saleType !== SaleType.ON_SITE ? <span className="text-danger-edge">*</span> : <span className="text-2xs text-slate-500 font-normal">(օպցիոնալ)</span>}
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  aria-label="Հեռախոսահամար"
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+374 (XX) XX-XX-XX"
                  className={`input-field pl-9 font-mono font-bold ${errors.phoneNumber ? 'border-danger-edge ring-1 ring-danger-edge/30' : ''}`}
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-2xs text-danger-edge font-bold mt-1">{errors.phoneNumber}</p>
              )}

              {/* Additional Phone Numbers */}
              <div className="mt-2.5 space-y-2">
                {additionalPhoneNumbers.map((phone, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        aria-label="Հեռախոսահամար"
                        type="text"
                        value={phone}
                        onChange={(e) => handleAdditionalPhoneChange(pIdx, e.target.value)}
                        placeholder={`Հավելյալ հեռ. #${pIdx + 1} (+374...)`}
                        className="input-field pl-9 font-mono font-bold text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalPhone(pIdx)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                      title="Հեռացնել"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddAdditionalPhone}
                  className="text-xs font-bold text-primary-ink flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer border border-dashed border-indigo-200 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ավելացնել հավելյալ հեռախոսահամար</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Սրահի Խորհրդատու (Աշխատակից)
              </label>
              <SelectField
                aria-label="Սրահի խորհրդատու (աշխատակից)"
                name="salesRep"
                value={formData.salesRep}
                onChange={(v) => handleChange({ target: { name: 'salesRep', value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>)}
                className="font-semibold"
              >
                <option value="Անի Մարտիրոսյան">Անի Մարտիրոսյան</option>
                <option value="Գոռ Խաչատրյան">Գոռ Խաչատրյան</option>
                <option value="Տիգրան Բաբայան">Տիգրան Բաբայան</option>
                <option value="Սրահի Աշխատակից">Սրահի Աշխատակից</option>
              </SelectField>
            </div>

            {formData.saleType === SaleType.PICKUP && (
              <div className="animate-rise-in">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Նպատակակետ Մասնաճյուղ
                </label>
                <SelectField
                  aria-label="Նպատակակետ մասնաճյուղ"
                  name="pickupBranch"
                  value={formData.pickupBranch}
                  onChange={(v) => handleChange({ target: { name: 'pickupBranch', value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>)}
                >
                  <option value="Գլխավոր Մասնաճյուղ (Կենտրոն)">Գլխավոր Մասնաճյուղ (Կենտրոն)</option>
                  <option value="Մասնաճյուղ Կոմիտաս">Մասնաճյուղ Կոմիտաս</option>
                  <option value="Մասնաճյուղ Մաշտոց">Մասնաճյուղ Մաշտոց</option>
                  <option value="Մասնաճյուղ Գարեգին Նժդեհ">Մասնաճյուղ Գարեգին Նժդեհ</option>
                </SelectField>
              </div>
            )}
          </div>

          {formData.saleType === SaleType.DELIVERY && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 animate-rise-in">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Առաքման Հասցե <span className="text-danger-edge">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-sky-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    aria-label="Առաքման հասցե"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="օր.՝ Կոմիտաս 45, բն. 12"
                    className={`input-field pl-9 ${errors.address ? 'border-danger-edge ring-1 ring-danger-edge/30' : ''}`}
                  />
                </div>
                {errors.address && (
                  <p className="text-2xs text-danger-edge font-bold mt-1">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Առաքման Ամսաթիվ
                </label>
                <input
                  type="date"
                  name="deliveryDate"
                  aria-label="Առաքման ամսաթիվ"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 3: Payment Conditions & Transfer to Kassa */}
      <div className="bg-surface p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-xs">
              3
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Վճարման Պայմաններ և Փոխանցում Դրամարկղին (POS)
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Նշեք վճարման պայմանները և փոխանցեք դրամարկղին՝ ՀԴՄ տպելու կամ գումարը գանձելու համար
              </p>
            </div>
          </div>
          <span className="text-2xs font-bold text-slate-500 font-mono hidden sm:inline">
            Սրահ / POS Դրամարկղ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Terms (Full vs Prepayment) */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Վճարման Պայման (Տեսակ)
              </label>
              {formData.saleType === SaleType.ON_SITE ? (
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between animate-rise-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Լրիվ վճարում (100%)</span>
                  </div>
                  <span className="text-2xs text-slate-500 font-semibold bg-surface px-2.5 py-1 rounded-lg border border-slate-200">
                    Տեղում վաճառքի դեպքում մասնակի վճարում չկա
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 animate-rise-in">
                  <button
                    type="button"
                    onClick={() => {
                      posAudio.playScanBeep();
                      setFormData(prev => ({ ...prev, paymentTerms: PaymentTerms.FULL, prepaymentAmount: 0 }));
                    }}
                    className={`px-3 py-2.5 rounded-2xl text-xs font-bold border text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer ${
                      formData.paymentTerms === PaymentTerms.FULL
                        ? 'bg-ink-inverse text-white border-white/10 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${formData.paymentTerms === PaymentTerms.FULL ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      <span>Լրիվ վճարում</span>
                    </div>
                    <span className="text-2xs opacity-70">100%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      posAudio.playScanBeep();
                      const defaultDeposit = Math.round(totalAmount * 0.3); // 30% default deposit
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentTerms: PaymentTerms.PREPAYMENT, 
                        prepaymentAmount: prev.prepaymentAmount > 0 ? prev.prepaymentAmount : defaultDeposit 
                      }));
                    }}
                    className={`px-3 py-2.5 rounded-2xl text-xs font-bold border text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer ${
                      formData.paymentTerms === PaymentTerms.PREPAYMENT
                        ? 'bg-warning text-white border-white/20 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${formData.paymentTerms === PaymentTerms.PREPAYMENT ? 'bg-surface' : 'bg-amber-400'}`} />
                      <span>Մասնակի վճարում</span>
                    </div>
                    <span className="text-2xs opacity-90 font-mono">Մասնակի</span>
                  </button>
                </div>
              )}
            </div>

            {/* Prepayment Input & Remaining Balance Card */}
            {isPrepayment && (
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-2.5 animate-rise-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950">
                    Մասնակի վճարման Գումար՝
                  </span>
                  <div className="flex gap-1">
                    {[
                      { label: '20%', val: Math.round(totalAmount * 0.2) },
                      { label: '30%', val: Math.round(totalAmount * 0.3) },
                      { label: '50%', val: Math.round(totalAmount * 0.5) },
                    ].map((pct, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, prepaymentAmount: pct.val }))}
                        className="text-2xs font-bold bg-surface text-amber-900 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                      >
                        {pct.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    aria-label="Մասնակի վճարման չափը"
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="500"
                    value={formData.prepaymentAmount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, prepaymentAmount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Մասնակի վճարման չափը..."
                    className="w-full px-3 py-1.5 bg-surface border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-900 font-mono shrink-0">֏</span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/70 text-xs">
                  <span className="font-bold text-amber-900">Մնացորդ Վճարման Ենթակա՝</span>
                  <span className="font-mono text-xs font-bold text-amber-950 bg-surface px-2 py-0.5 rounded-lg border border-amber-300">
                    {remainingBalance.toLocaleString()} ֏
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Վճարման Եղանակ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: PaymentMethod.CASH, label: 'Կանխիկ', icon: DollarSign },
                  { id: PaymentMethod.CARD, label: 'Քարտով (POS)', icon: CreditCard },
                  { id: PaymentMethod.IDRAM, label: 'Idram', icon: Smartphone },
                  { id: PaymentMethod.TRANSFER, label: 'Փոխանցում քարտին', icon: ArrowRightLeft },
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = formData.paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        posAudio.playScanBeep();
                        setFormData(prev => ({ 
                          ...prev, 
                          paymentMethod: method.id
                        }));
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer ${
                        isSelected 
                          ? 'bg-ink-inverse text-white border-white/10 shadow-2xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cashier Notes & Status */}
          <div className="space-y-3.5 flex flex-col justify-between">
            {/* POS & Cashier Note */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Նշում Դրամարկղին (POS / ՀԴՄ)
                </label>
                <div className="flex items-center gap-1 text-2xs">
                  {['ՀԴՄ տեղում', 'POS վաճառք', 'Տեղում վճարում', 'Մասնակի վճարումով'].map((quickNote, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cashierNote: quickNote }))}
                      className="text-primary-ink hover:underline font-semibold cursor-pointer"
                    >
                      {quickNote}
                    </button>
                  ))}
                </div>
              </div>
              <input
                aria-label="Դրամարկղի նշում"
                type="text"
                name="cashierNote"
                value={formData.cashierNote}
                onChange={handleChange}
                placeholder="օր.՝ ՀԴՄ տպել, POS արագ վաճառք"
                className="input-field text-xs font-medium"
              />
            </div>

            {/* Cashier Workflow Info Badge */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-primary-ink shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">
                  Կարգավիճակ՝ {isPrepayment ? 'Մասնակի վճարված' : 'Սպասում է դրամարկղին (Չվճարված)'}
                </p>
                <p className="text-2xs text-slate-500 leading-snug">
                  Պատվերը գրանցելուց հետո կփոխանցվի դրամարկղին։ Վերջնական վճարումը կհաստատվի դրամարկղում։
                </p>
              </div>
            </div>

            {/* Summary of what is payable now */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900">Դրամարկղում գանձվող գումարը՝</span>
              <span className="font-mono text-sm font-bold text-indigo-950">
                {payableNowAmount.toLocaleString()} ֏
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar / Actions - Fully Responsive Stacking */}
      <div className="bg-surface/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-raised sticky bottom-3 sm:bottom-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-primary hover:bg-primary-strong text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Գրանցել և Փոխանցել Դրամարկղին</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-ink-inverse hover:bg-ink-inverse/85 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ring-2 ring-emerald-400/30 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Գրանցել & Բացել PDF Էջը</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all text-center cursor-pointer order-2 sm:order-1"
        >
          Չեղարկել
        </button>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Trash2, ShoppingBag, Truck, Store, 
  User, Phone, MapPin, Calendar, CheckCircle2, 
  Receipt, AlertCircle, Minus, DollarSign, 
  CreditCard, Smartphone, Percent, Tag, ArrowRightLeft, Clock, ShieldCheck
} from 'lucide-react';
import { Order, OrderStatus, OrderItem, PaymentStatus, SaleType, PaymentMethod, PaymentTerms } from '../types';
import { 
  calculateOrderTotal, 
  calculateOrderSubtotal, 
  calculateTotalItemDiscounts, 
  calculateItemLineSubtotal, 
  calculateItemDiscount, 
  calculateItemLineTotal 
} from '../lib/storage';
import { posAudio } from '../lib/posAudio';

interface EditOrderPageProps {
  order: Order;
  onSave: (orderId: string, updates: Partial<Order>) => void;
  onCancel: () => void;
}

export default function EditOrderPage({ order, onSave, onCancel }: EditOrderPageProps) {
  const [formData, setFormData] = useState({
    customerName: order.customerName || '',
    phoneNumber: order.phoneNumber || '',
    purchaseDate: order.purchaseDate || new Date().toISOString().split('T')[0],
    deliveryDate: order.deliveryDate || '',
    address: order.address || '',
    saleType: order.saleType || SaleType.ON_SITE,
    salesRep: order.salesRep || '',
    cashierNote: order.cashierNote || '',
    pickupBranch: order.pickupBranch || 'Գլխավոր Մասնաճյուղ (Կենտրոն)',
    notes: order.notes || '',
    discount: order.discount || 0,
    discountType: (order.discountType || 'PERCENT') as 'PERCENT' | 'FIXED',
    status: order.status || OrderStatus.PENDING,
    paymentStatus: order.paymentStatus || PaymentStatus.UNPAID,
    paymentTerms: (order.paymentTerms || PaymentTerms.FULL) as PaymentTerms,
    prepaymentAmount: order.prepaymentAmount || 0,
    paymentMethod: (order.paymentMethod || PaymentMethod.CASH) as PaymentMethod,
    cashReceived: order.cashReceived || 0
  });

  const [items, setItems] = useState<OrderItem[]>(
    (order.items && order.items.length > 0)
      ? order.items.map(item => ({ ...item }))
      : [{ id: Math.random().toString(36).substr(2, 9), code: '', name: '', quantity: 1, price: 0 }]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Armenian Phone Formatter
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

  const handleAddItem = (preset?: { code: string; name: string; price: number }) => {
    posAudio.playScanBeep();
    setItems(prev => [
      ...prev, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        code: preset ? preset.code : '', 
        name: preset ? preset.name : '', 
        quantity: 1, 
        price: preset ? preset.price : 0 
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      posAudio.playScanBeep();
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
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

  // Gross Subtotal before any discounts
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

  // Prepayment & Remaining Balance
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

  const changeAmount = useMemo(() => {
    if (formData.paymentMethod !== PaymentMethod.CASH || !formData.cashReceived) return 0;
    return Math.max(0, formData.cashReceived - payableNowAmount);
  }, [formData.paymentMethod, formData.cashReceived, payableNowAmount]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Cannot mark as DELIVERED if payment is not PAID
    if (formData.status === OrderStatus.DELIVERED && formData.paymentStatus !== PaymentStatus.PAID) {
      newErrors.status = 'Վճարումը հաստատված չէ։ Պատվերը հնարավոր չէ ավարտել, քանի դեռ վճարումը չի հաստատվել (Լրիվ վճարված)։';
    }

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

    const invalidItems = items.some(item => (!item.code.trim() && !item.artikul?.trim()) || item.price <= 0 || item.quantity <= 0);
    if (invalidItems) {
      newErrors.items = 'Խնդրում ենք լրացնել ապրանքի կոդը կամ արտիկուլը, քանակը և գինը';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    posAudio.playSuccessChime();

    const isStoreSale = formData.saleType === SaleType.ON_SITE;
    const customerDisplayName = formData.customerName.trim() || (isStoreSale ? 'Տեղում հաճախորդ' : 'Անանուն');

    const updates: Partial<Order> = {
      customerName: customerDisplayName,
      phoneNumber: formData.phoneNumber,
      purchaseDate: formData.purchaseDate,
      deliveryDate: formData.deliveryDate,
      address: formData.address.trim() || (isStoreSale ? 'Խանութ-Սրահ (Տեղում)' : formData.pickupBranch),
      saleType: formData.saleType,
      salesRep: formData.salesRep.trim(),
      cashierNote: formData.cashierNote.trim(),
      pickupBranch: formData.pickupBranch,
      notes: formData.notes.trim(),
      status: formData.status as OrderStatus,
      paymentStatus: formData.paymentStatus as PaymentStatus,
      paymentTerms: isStoreSale ? PaymentTerms.FULL : formData.paymentTerms,
      prepaymentAmount: isStoreSale ? 0 : currentPrepayment,
      remainingBalance: isStoreSale ? 0 : remainingBalance,
      paymentMethod: formData.paymentMethod,
      cashReceived: formData.cashReceived,
      changeAmount: changeAmount,
      items: items,
      subtotalAmount: grossSubtotalAmount,
      discount: formData.discount,
      discountType: formData.discountType as 'PERCENT' | 'FIXED',
      totalAmount: totalAmount
    };

    onSave(order.id, updates);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-36 sm:pb-32 px-1 sm:px-0"
    >
      {/* Global Validation Alert */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը:</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {order.id}
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Պատվերի Խմբագրում</h2>
            <p className="text-[11px] text-slate-400">Կատարեք անհրաժեշտ փոփոխությունները և պահպանեք</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Ընդհանուր՝</span>
          <span className="font-mono font-black text-slate-900 text-sm">{totalAmount.toLocaleString()} ֏</span>
        </div>
      </div>

      {/* 1. Sale Type Selector Cards */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-800">
            1. Վաճառքի Տեսակ <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-slate-400 font-medium">Ընտրեք պատվերի իրականացման եղանակը</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              posAudio.playScanBeep();
              setFormData(prev => ({ ...prev, saleType: SaleType.ON_SITE }));
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 sm:gap-3 cursor-pointer ${
              formData.saleType === SaleType.ON_SITE 
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-100' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-2.5 rounded-xl ${formData.saleType === SaleType.ON_SITE ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {formData.saleType === SaleType.ON_SITE && (
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Ընտրված
                </span>
              )}
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">Վաճառք Տեղում (Սրահ)</p>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5 leading-tight">Հաճախորդը գնում է խանութ-սրահից</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              posAudio.playScanBeep();
              setFormData(prev => ({ ...prev, saleType: SaleType.DELIVERY }));
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 sm:gap-3 cursor-pointer ${
              formData.saleType === SaleType.DELIVERY 
                ? 'border-sky-600 bg-sky-50/50 shadow-xs ring-2 ring-sky-100' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-2.5 rounded-xl ${formData.saleType === SaleType.DELIVERY ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {formData.saleType === SaleType.DELIVERY && (
                <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  Ընտրված
                </span>
              )}
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">Առաքում (Delivery)</p>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5 leading-tight">Առաքիչով հասցեին հասցնելու համար</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              posAudio.playScanBeep();
              setFormData(prev => ({ ...prev, saleType: SaleType.PICKUP }));
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 sm:gap-3 cursor-pointer ${
              formData.saleType === SaleType.PICKUP 
                ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-100' 
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 sm:p-2.5 rounded-xl ${formData.saleType === SaleType.PICKUP ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {formData.saleType === SaleType.PICKUP && (
                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Ընտրված
                </span>
              )}
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900">Ինքնարտահանում</p>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5 leading-tight">Հաճախորդը վերցնում է մասնաճյուղից</p>
            </div>
          </button>
        </div>
      </div>

      {/* 2 & 3. Customer Info & Payment Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer & Location */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              2. Հաճախորդի Տվյալներ
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Հաճախորդի Անուն {formData.saleType !== SaleType.ON_SITE ? <span className="text-rose-500">*</span> : <span className="text-[10px] text-slate-400 font-normal">(օպցիոնալ)</span>}
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder={formData.saleType === SaleType.ON_SITE ? "Տեղում հաճախորդ (օպցիոնալ)" : "օր.՝ Արմեն Գրիգորյան"}
                className={`input-field ${errors.customerName ? 'border-rose-300 ring-1 ring-rose-300' : ''}`}
              />
              {errors.customerName && (
                <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.customerName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Հեռախոսահամար {formData.saleType !== SaleType.ON_SITE ? <span className="text-rose-500">*</span> : <span className="text-[10px] text-slate-400 font-normal">(օպցիոնալ)</span>}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className={`input-field pl-9 font-mono font-bold ${errors.phoneNumber ? 'border-rose-300 ring-1 ring-rose-300' : ''}`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.phoneNumber}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Սրահի Աշխատակից
                </label>
                <input
                  type="text"
                  name="salesRep"
                  value={formData.salesRep}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            {formData.saleType === SaleType.DELIVERY && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Առաքման Հասցե <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-sky-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className={`input-field pl-9 ${errors.address ? 'border-rose-300 ring-1 ring-rose-300' : ''}`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Առաքման Ամսաթիվ
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleChange}
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {formData.saleType === SaleType.PICKUP && (
              <div className="pt-1 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Նպատակակետ Մասնաճյուղ
                </label>
                <select
                  name="pickupBranch"
                  value={formData.pickupBranch}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="Գլխավոր Մասնաճյուղ (Կենտրոն)">Գլխավոր Մասնաճյուղ (Կենտրոն)</option>
                  <option value="Մասնաճյուղ Կոմիտաս">Մասնաճյուղ Կոմիտաս</option>
                  <option value="Մասնաճյուղ Մաշտոց">Մասնաճյուղ Մաշտոց</option>
                  <option value="Մասնաճյուղ Գարեգին Նժդեհ">Մասնաճյուղ Գարեգին Նժդեհ</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Cashier Register */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                3. Վճարում և Դրամարկղ (POS)
              </h3>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Payment Terms: Full vs Prepayment */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Վճարման Պայման
              </label>
              {formData.saleType === SaleType.ON_SITE ? (
                <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Լրիվ վճարում (100%)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    Տեղում վաճառքի դեպքում մասնակի վճարում չկա
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      posAudio.playScanBeep();
                      setFormData(prev => ({ ...prev, paymentTerms: PaymentTerms.FULL, prepaymentAmount: 0 }));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all flex items-center justify-between ${
                      formData.paymentTerms === PaymentTerms.FULL
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Լրիվ վճարում</span>
                    <span className="text-[10px] opacity-70">100%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      posAudio.playScanBeep();
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentTerms: PaymentTerms.PREPAYMENT, 
                        prepaymentAmount: prev.prepaymentAmount > 0 ? prev.prepaymentAmount : Math.round(totalAmount * 0.3)
                      }));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all flex items-center justify-between ${
                      formData.paymentTerms === PaymentTerms.PREPAYMENT
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Մասնակի վճարում</span>
                    <span className="text-[10px] opacity-90">Մասնակի</span>
                  </button>
                </div>
              )}
            </div>

            {isPrepayment && (
              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">Մասնակի վճարման Գումար՝</span>
                  <span className="font-mono text-xs font-black text-amber-950">
                    Մնացորդ՝ {remainingBalance.toLocaleString()} ֏
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={formData.prepaymentAmount || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, prepaymentAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Մասնակի վճարում..."
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black text-slate-900"
                />
              </div>
            )}

            {/* Payment Method Selector (4 methods) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
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
                        setFormData(prev => ({ ...prev, paymentMethod: method.id }));
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
                        isSelected 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
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

            {/* Payment Status & Order Status */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Վճարման Կարգավիճակ
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleChange}
                  className="input-field font-bold"
                >
                  <option value={PaymentStatus.UNPAID}>Չվճարված</option>
                  <option value={PaymentStatus.PARTIAL}>Մասնակի վճարված</option>
                  <option value={PaymentStatus.PAID}>Վճարված է</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Պատվերի Կարգավիճակ
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field font-bold"
                >
                  <option value={OrderStatus.PENDING}>Սպասում է դրամարկղին</option>
                  <option value={OrderStatus.SOLD}>Վաճառված է (POS)</option>
                  <option value={OrderStatus.IN_TRANSIT}>Առաքման մեջ</option>
                  <option value={OrderStatus.DELIVERED}>Ավարտված / Հանձնված</option>
                  <option value={OrderStatus.CANCELLED}>Չեղարկված</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Դրամարկղի Նշում (POS)
              </label>
              <input
                type="text"
                name="cashierNote"
                value={formData.cashierNote}
                onChange={handleChange}
                placeholder="օր.՝ ՀԴՄ տպել տեղում"
                className="input-field text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Products Table */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              4. Ապրանքներ (POS SKU)
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Կառավարեք ապրանքների ցանկը և քանակները</p>
          </div>

          <button
            type="button"
            onClick={() => handleAddItem()}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-indigo-200/70 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ավելացնել Տող</span>
          </button>
        </div>

        {errors.items && (
          <p className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-200">
            {errors.items}
          </p>
        )}

        {/* Desktop Table View (lg+) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/60">
                <th className="py-2.5 px-3 w-40 rounded-l-xl">Ապրանքի Կոդ</th>
                <th className="py-2.5 px-3 w-40">Արտիկուլ (Artikul)</th>
                <th className="py-2.5 px-3 w-28 text-center">Քանակ</th>
                <th className="py-2.5 px-3 w-32">Գին (֏)</th>
                <th className="py-2.5 px-3 w-32">Զեղչ</th>
                <th className="py-2.5 px-3 w-32 text-right">Տողի Գումար</th>
                <th className="py-2.5 px-2 w-10 text-center rounded-r-xl"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const lineSubtotal = calculateItemLineSubtotal(item);
                const itemDiscount = calculateItemDiscount(item);
                const lineTotal = calculateItemLineTotal(item);
                const hasDiscount = itemDiscount > 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.code || ''}
                        onChange={(e) => handleItemChange(item.id, 'code', e.target.value)}
                        placeholder="օր.՝ 4203"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-black text-indigo-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.artikul || ''}
                        onChange={(e) => handleItemChange(item.id, 'artikul', e.target.value)}
                        placeholder="օր.՝ ART-4203"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-amber-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item.id, -1)}
                          className="h-6 w-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-10 text-center bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(item.id, 1)}
                          className="h-6 w-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={item.discount || ''}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'discountType', 'PERCENT')}
                            className={`px-1.5 py-1 text-[11px] font-bold cursor-pointer ${(!item.discountType || item.discountType === 'PERCENT') ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemChange(item.id, 'discountType', 'FIXED')}
                            className={`px-1.5 py-1 text-[11px] font-bold cursor-pointer ${item.discountType === 'FIXED' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            ֏
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {hasDiscount ? (
                        <div>
                          <span className="font-mono text-[10.5px] text-slate-400 line-through block">
                            {lineSubtotal.toLocaleString()} ֏
                          </span>
                          <span className="font-mono text-xs font-black text-emerald-700">
                            {lineTotal.toLocaleString()} ֏
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-black text-slate-900">
                          {lineTotal.toLocaleString()} ֏
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-20 cursor-pointer hover:bg-rose-50"
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

        {/* Mobile & Tablet Items Cards (< lg) */}
        <div className="block lg:hidden space-y-3">
          {items.map((item, idx) => {
            const lineSubtotal = calculateItemLineSubtotal(item);
            const itemDiscount = calculateItemDiscount(item);
            const lineTotal = calculateItemLineTotal(item);
            const hasDiscount = itemDiscount > 0;

            return (
              <div 
                key={item.id} 
                className="p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 relative shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Ապրանքի Տվյալներ</span>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Հեռացնել"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Ապրանքի Կոդ</label>
                    <input
                      type="text"
                      value={item.code || ''}
                      onChange={(e) => handleItemChange(item.id, 'code', e.target.value)}
                      placeholder="օր.՝ 4203"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Արտիկուլ (Artikul)</label>
                    <input
                      type="text"
                      value={item.artikul || ''}
                      onChange={(e) => handleItemChange(item.id, 'artikul', e.target.value)}
                      placeholder="օր.՝ ART-4203"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Քանակ</label>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1">
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
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Միավորի Գին (֏)</label>
                    <input
                      type="number"
                      value={item.price || ''}
                      onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">Զեղչ՝</span>
                    <input
                      type="number"
                      value={item.discount || ''}
                      onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                    />
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'discountType', 'PERCENT')}
                        className={`px-2 py-1 text-[10.5px] font-black cursor-pointer ${(!item.discountType || item.discountType === 'PERCENT') ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'discountType', 'FIXED')}
                        className={`px-2 py-1 text-[10.5px] font-black cursor-pointer ${item.discountType === 'FIXED' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                      >
                        ֏
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    {hasDiscount && (
                      <span className="text-[10px] text-slate-400 line-through font-mono block">
                        {lineSubtotal.toLocaleString()} ֏
                      </span>
                    )}
                    <span className="font-mono text-xs font-black text-slate-900">
                      {lineTotal.toLocaleString()} ֏
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-center">
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-indigo-600" /> Լրացուցիչ Զեղչ Պատվերին՝
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={formData.discount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
              />
              <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discountType: 'PERCENT' }))}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${formData.discountType === 'PERCENT' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discountType: 'FIXED' }))}
                  className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${formData.discountType === 'FIXED' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                >
                  ֏
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 text-white p-4 sm:p-4.5 rounded-2xl shadow-sm gap-2">
            <div>
              {isPrepayment ? (
                <div className="text-xs">
                  <span className="text-amber-400 font-bold">Մասնակի վճարում՝ {currentPrepayment.toLocaleString()} ֏</span>
                  <span className="text-slate-400 block text-[10px]">Մնացորդ՝ {remainingBalance.toLocaleString()} ֏</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Լրիվ Վճարում (POS)
                </span>
              )}
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Ընդհանուր Գումար
              </span>
              <span className="text-2xl font-black text-amber-300 font-mono">
                {totalAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">֏</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl sticky bottom-3 sm:bottom-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer order-1 sm:order-2 sm:ml-auto"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Պահպանել Փոփոխությունները</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all text-center cursor-pointer order-2 sm:order-1"
        >
          Չեղարկել
        </button>
      </div>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit3, FileText, Copy, Check, Trash2, 
  MapPin, Phone, User, Calendar, Clock, ShoppingBag, 
  Truck, Store, AlertTriangle, CheckCircle2, Package, 
  Receipt, Share2, History, AlertCircle, ChevronRight,
  DollarSign, CreditCard, Smartphone, Tag, ArrowLeft, Percent,
  ArrowRightLeft, ShieldCheck, CheckCircle
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, SaleType, PaymentMethod, PaymentTerms } from '../types';
import { posAudio } from '../lib/posAudio';
import { 
  calculateItemLineSubtotal, 
  calculateItemDiscount, 
  calculateItemLineTotal, 
  calculateOrderSubtotal, 
  calculateTotalItemDiscounts,
  calculateOrderTotal 
} from '../lib/storage';

interface ViewOrderPageProps {
  order: Order;
  onBack: () => void;
  onEdit: (order: Order) => void;
  onOpenReportsPage: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  onDelete: (orderId: string) => void;
}

export default function ViewOrderPage({
  order,
  onBack,
  onEdit,
  onOpenReportsPage,
  onUpdateStatus,
  onUpdateOrder,
  onDelete
}: ViewOrderPageProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = (text: string, field: string) => {
    posAudio.playScanBeep();
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    posAudio.playScanBeep();
    const itemsText = (order.items || []).map(item => `  - [Կոդ: ${item.code || '---'} | Արտիկուլ: ${item.artikul || '---'}] x${item.quantity} (${(item.quantity * item.price).toLocaleString()} ֏)`).join('\n');
    const formattedText = `📋 ՊԱՏՎԵՐԱԹԵՐԹ՝ ${order.id}
🛒 Վաճառքի տեսակ՝ ${order.saleType || SaleType.ON_SITE}
👤 Հաճախորդ՝ ${order.customerName}
📞 Հեռախոս՝ ${order.phoneNumber || '---'}
📍 Հասցե/Մասնաճյուղ՝ ${order.address || '---'}
👤 Սրահի աշխատակից՝ ${order.salesRep || '---'}
💳 Վճարման պայման՝ ${order.paymentTerms || PaymentTerms.FULL}
💵 Վճարման եղանակ՝ ${order.paymentMethod || PaymentMethod.CASH}
⚡ Վճարման վիճակ՝ ${order.paymentStatus || PaymentStatus.UNPAID}
💰 Ընդհանուր գումար՝ ${order.totalAmount?.toLocaleString()} ֏
${order.paymentTerms === PaymentTerms.PREPAYMENT ? `🟡 Մասնակի վճարում՝ ${(order.prepaymentAmount || 0).toLocaleString()} ֏ | Մնացորդ՝ ${(order.remainingBalance || 0).toLocaleString()} ֏\n` : ''}🏷️ POS Կոդեր՝ ${(order.items || []).map(i => i.code).filter(Boolean).join(', ')}
🏭 Արտիկուլներ (Gorcaranayin)՝ ${(order.items || []).map(i => i.artikul).filter(Boolean).join(', ')}
💬 Դրամարկղի նշում՝ ${order.cashierNote || '---'}
🛍️ Ապրանքներ՝
${itemsText}`;
    
    handleCopy(formattedText, 'all');
  };

  const handleCopyAllSKUs = () => {
    const allSkus = (order.items || []).map(i => i.code).filter(Boolean).join(', ');
    handleCopy(allSkus, 'all-skus');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case OrderStatus.SOLD:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case OrderStatus.IN_TRANSIT:
        return 'bg-sky-50 text-sky-800 border-sky-200/80';
      case OrderStatus.DELIVERED:
        return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
      case OrderStatus.CANCELLED:
        return 'bg-rose-50 text-rose-800 border-rose-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case PaymentStatus.PARTIAL:
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case PaymentStatus.UNPAID:
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getPaymentMethodIcon = (method?: PaymentMethod | string) => {
    switch (method) {
      case PaymentMethod.CARD:
        return <CreditCard className="w-4 h-4 text-sky-600 shrink-0" />;
      case PaymentMethod.IDRAM:
        return <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />;
      case PaymentMethod.TRANSFER:
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0" />;
      case PaymentMethod.CASH:
      default:
        return <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
  };

  const getSaleTypeIcon = (type: SaleType) => {
    switch (type) {
      case SaleType.DELIVERY:
        return <Truck className="w-4 h-4 text-sky-600" />;
      case SaleType.PICKUP:
        return <Store className="w-4 h-4 text-amber-600" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-indigo-600" />;
    }
  };

  const handleCashierPaymentUpdate = (newStatus: PaymentStatus) => {
    posAudio.playSuccessChime();
    if (onUpdateOrder) {
      let targetStatus = order.status;
      const isOnSite = (order.saleType || SaleType.ON_SITE) === SaleType.ON_SITE;

      if (newStatus === PaymentStatus.PAID) {
        if (isOnSite) {
          // Rule 3: For In-Store sale, confirming payment immediately sets status to DELIVERED (Ավարտված)!
          targetStatus = OrderStatus.DELIVERED;
        } else if (order.status === OrderStatus.PENDING) {
          // For Delivery/Pickup, confirming payment advances from PENDING to SOLD (Ամրագրված/Պատվիրված)
          targetStatus = OrderStatus.SOLD;
        }
      } else {
        // If payment is unpaid or partial, ensure status cannot be DELIVERED
        if (targetStatus === OrderStatus.DELIVERED) {
          targetStatus = isOnSite ? OrderStatus.PENDING : OrderStatus.SOLD;
        }
      }

      onUpdateOrder(order.id, { 
        paymentStatus: newStatus,
        status: targetStatus
      });
    }
  };

  const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);

  // Status progression steps
  const STATUS_STEPS = [
    { status: OrderStatus.PENDING, label: '1. Գրանցված' },
    { status: OrderStatus.SOLD, label: '2. POS Դրամարկղ' },
    { status: OrderStatus.IN_TRANSIT, label: '3. Առաքում/Պատրաստ' },
    { status: OrderStatus.DELIVERED, label: '4. Ավարտված' },
  ];

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="max-w-6xl mx-auto space-y-6 pb-20"
    >
      {/* Top Action Bar */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Վերադառնալ ցուցակին"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {order.id}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
                {getSaleTypeIcon(order.saleType || SaleType.ON_SITE)}
                <span>{order.saleType || SaleType.ON_SITE}</span>
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${getStatusBadge(order.status)}`}>
                {order.status}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${getPaymentStatusBadge(order.paymentStatus)}`}>
                {order.paymentStatus || PaymentStatus.UNPAID}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {order.customerName}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status !== OrderStatus.SOLD && (
            <button
              onClick={() => {
                posAudio.playSuccessChime();
                onUpdateStatus(order.id, OrderStatus.SOLD);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Հաստատել POS Վաճառքը</span>
            </button>
          )}

          <button
            onClick={() => onEdit(order)}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Խմբագրել</span>
          </button>

          <button
            onClick={onOpenReportsPage}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Բացել Փաստաթղթերի և PDF Արտահանման Էջը"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>PDF Հաշվետվություններ</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Պատճենել ամբողջ տեքստը"
          >
            {copiedField === 'all' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Պատճենվեց</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Պատճենել</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-all border border-rose-100 ml-1 cursor-pointer"
            title="Ջնջել պատվերը"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-black text-slate-900">Ջնջե՞լ այս պատվերը</h3>
                <p className="text-xs text-slate-500 mt-1">Այս գործողությունը անվերադարձ է:</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Չեղարկել
                </button>
                <button
                  onClick={() => {
                    onDelete(order.id);
                    setShowDeleteConfirm(false);
                    onBack();
                  }}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Այո, Ջնջել
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Status Progression Stepper */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black uppercase tracking-wider text-slate-500 text-[10px]">
            Կարգավիճակի Փոխում (Սեղմեք ցանկացած փուլի վրա)՝
          </span>
          <span className="text-[11px] font-bold text-indigo-600 font-mono">
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_STEPS.map((step, idx) => {
            const isActive = order.status === step.status;
            const isPast = currentStepIndex !== -1 && idx <= currentStepIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (step.status === OrderStatus.DELIVERED && order.paymentStatus !== PaymentStatus.PAID) {
                    posAudio.playErrorBeep();
                    alert('⚠️ Վճարումը հաստատված չէ: Պատվերը հնարավոր չէ ավարտել, քանի դեռ վճարումը չի հաստատվել (Լրիվ վճարված):');
                    return;
                  }
                  posAudio.playScanBeep();
                  onUpdateStatus(order.id, step.status);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs ring-2 ring-indigo-200'
                    : isPast
                    ? 'border-slate-200 bg-slate-50/80 hover:bg-slate-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-700' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                    Փուլ {idx + 1}
                  </span>
                  {isActive ? (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  ) : isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : null}
                </div>
                <p className={`text-xs font-extrabold ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {step.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Products and Payment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Products List & Summary (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Պատվիրված Ապրանքներ (POS SKU)
                </h2>
              </div>

              {skuCodes.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllSKUs}
                  className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Պատճենել բոլոր SKU կոդերը POS-ի համար"
                >
                  {copiedField === 'all-skus' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Պատճենվեց</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Պատճենել բոլոր SKU-ները</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/60">
                    <th className="py-2.5 px-3 rounded-l-xl">Ապրանքի Կոդ</th>
                    <th className="py-2.5 px-3">Արտիկուլ (Artikul)</th>
                    <th className="py-2.5 px-3 text-center">Քանակ</th>
                    <th className="py-2.5 px-3 text-right">Գին</th>
                    <th className="py-2.5 px-3 text-right">Զեղչ</th>
                    <th className="py-2.5 px-3 text-right rounded-r-xl">Ընդհանուր</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((item, idx) => {
                    const lineSubtotal = calculateItemLineSubtotal(item);
                    const itemDiscount = calculateItemDiscount(item);
                    const lineTotal = calculateItemLineTotal(item);
                    const hasDiscount = itemDiscount > 0;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code || '', `sku-${idx}`)}
                            className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200/70 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Սեղմեք պատճենելու համար"
                          >
                            <span>{item.code || '---'}</span>
                            {copiedField === `sku-${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-indigo-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                            {item.artikul || '---'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                          {(item.price || 0).toLocaleString()} ֏
                        </td>
                        <td className="py-3 px-3 text-right">
                          {hasDiscount ? (
                            <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              -{itemDiscount.toLocaleString()} ֏
                              {item.discountType === 'PERCENT' && ` (${item.discount}%)`}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs font-black text-slate-900">
                          {hasDiscount && (
                            <span className="text-[10px] text-slate-400 line-through block font-normal">
                              {lineSubtotal.toLocaleString()} ֏
                            </span>
                          )}
                          <span className={hasDiscount ? 'text-emerald-700' : 'text-slate-900'}>
                            {lineTotal.toLocaleString()} ֏
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total summary bar */}
            {(() => {
              const grossSubtotal = calculateOrderSubtotal(order.items || []);
              const itemsDiscount = calculateTotalItemDiscounts(order.items || []);
              const netItemsSubtotal = calculateOrderTotal(order.items || []);
              const orderDiscountAmount = order.discount && order.discount > 0
                ? (order.discountType === 'PERCENT'
                    ? Math.round((netItemsSubtotal * Math.min(100, order.discount)) / 100)
                    : Math.min(order.discount, netItemsSubtotal))
                : 0;
              const totalDiscount = itemsDiscount + orderDiscountAmount;

              return (
                <div className="pt-4 border-t border-slate-200 bg-slate-50/80 -mx-6 -mb-6 p-6 rounded-b-3xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Վճարման Պայման՝
                        </span>
                        <span className="text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {order.paymentTerms || PaymentTerms.FULL}
                        </span>
                      </div>

                      {/* Discount Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {itemsDiscount > 0 && (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                            Ապրանքների զեղչ՝ -{itemsDiscount.toLocaleString()} ֏
                          </span>
                        )}
                        {orderDiscountAmount > 0 && (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                            Պատվերի զեղչ՝ -{orderDiscountAmount.toLocaleString()} ֏ ({order.discountType === 'PERCENT' ? `${order.discount}%` : `${order.discount} ֏`})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {totalDiscount > 0 && (
                        <div className="text-[11px] text-slate-400 font-mono mb-0.5">
                          Սկզբնական՝ <span className="line-through">{grossSubtotal.toLocaleString()} ֏</span>
                        </div>
                      )}
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {(order.totalAmount || 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">֏</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Cashier Note & POS Info Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Դրամարկղի և POS Նշումներ
              </h3>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 leading-relaxed font-medium">
              {order.cashierNote || 'Դրամարկղի համար լրացուցիչ նշում չկա:'}
            </p>
            {order.notes && (
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ընդհանուր նշումներ՝
                </span>
                <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                  {order.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dedicated Cashier Payment Center & Customer Details */}
        <div className="space-y-6">
          {/* Cashier Payment Center (վճարման եղանակ և կարգավիճակի փոփոխում կասիրի կողմից) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Վճարում և Դրամարկղ
                </h3>
              </div>
              <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${getPaymentStatusBadge(order.paymentStatus)}`}>
                {order.paymentStatus || PaymentStatus.UNPAID}
              </span>
            </div>

            {/* Payment Method & Terms Grid */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Վճարման Եղանակ
                </span>
                <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-sm">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    {getPaymentMethodIcon(order.paymentMethod)}
                  </div>
                  <span>{order.paymentMethod || PaymentMethod.CASH}</span>
                </div>
              </div>

              {/* Payment Terms: Full vs Prepayment details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Վճարման Տեսակ
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-800 font-mono">
                    {order.paymentTerms || PaymentTerms.FULL}
                  </span>
                </div>

                {order.paymentTerms === PaymentTerms.PREPAYMENT ? (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-800 font-bold">Մասնակի վճարում՝</span>
                      <span className="font-mono font-black text-amber-950 bg-amber-100/70 px-2 py-0.5 rounded-lg border border-amber-200">
                        {(order.prepaymentAmount || 0).toLocaleString()} ֏
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-bold">Մնացորդ գումար՝</span>
                      <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {(order.remainingBalance || (order.totalAmount - (order.prepaymentAmount || 0))).toLocaleString()} ֏
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 font-medium pt-1">
                    Վճարվում է ամբողջ գումարը (100%)
                  </div>
                )}
              </div>

              {/* Interactive Cashier Status Buttons */}
              <div className="pt-2 space-y-2">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 block">
                  Դրամարկղի Գործողություն (Վճարումը ստանալուց հետո)՝
                </label>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCashierPaymentUpdate(PaymentStatus.PAID)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      order.paymentStatus === PaymentStatus.PAID
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Հաստատել Վճարումը (Վճարված է)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCashierPaymentUpdate(PaymentStatus.PARTIAL)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        order.paymentStatus === PaymentStatus.PARTIAL
                          ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span>🟡 Մասնակի վճարված</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCashierPaymentUpdate(PaymentStatus.UNPAID)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        order.paymentStatus === PaymentStatus.UNPAID
                          ? 'bg-slate-800 text-white ring-2 ring-slate-400'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>Չվճարված</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Location Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Հաճախորդ և Առաքում
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Անուն Ազգանուն
                </span>
                <p className="font-extrabold text-sm text-slate-900">
                  {order.customerName}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Հեռախոսահամար
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-800 text-xs">
                    {order.phoneNumber || '---'}
                  </span>
                  {order.phoneNumber && (
                    <a
                      href={`tel:${order.phoneNumber.replace(/\D/g, '')}`}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Զանգել</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Հասցե / Վայր
                </span>
                <p className="font-medium text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{order.address || '---'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ամսաթիվ
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">
                    {order.purchaseDate}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Սրահի Աշխատակից
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 truncate block">
                    {order.salesRep || '---'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PDF & Reports Callout Card */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">PDF Փաստաթղթեր և Արտահանում</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Ձևավորեք Առաքման Թերթիկ, Մոտեցնել Խանութի Թերթիկ կամ Մատակարարման Ապրանքացանկ, ներբեռնեք PDF կամ ուղարկեք էլ․ փոստով։
            </p>
            <button
              type="button"
              onClick={onOpenReportsPage}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Բացել PDF Հաշվետվությունների Էջը</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

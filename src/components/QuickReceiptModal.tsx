import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Copy, Check, X, CheckCircle2, Phone, MapPin, Tag } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, SaleType, PaymentTerms } from '../types';
import { posAudio } from '../lib/posAudio';
import { calculateItemLineTotal, calculateItemDiscount, calculateItemLineSubtotal, getTodayLocalYMD } from '../lib/storage';

interface QuickReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickReceiptModal: React.FC<QuickReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const printTimestamp = new Date().toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const todayYmd = getTodayLocalYMD();

  const handlePrint = () => {
    posAudio.playScanBeep();
    window.print();
  };

  const handleCopySummary = () => {
    posAudio.playScanBeep();
    const itemsText = (order.items || [])
      .map((item, idx) => {
        const itemTotal = calculateItemLineTotal(item);
        const itemDiscount = calculateItemDiscount(item);
        const discountNote = itemDiscount > 0 ? ` (Զեղչ՝ -${itemDiscount.toLocaleString()} ֏)` : '';
        return `${idx + 1}. [${item.code || item.artikul || '---'}] ${item.name || 'Ապրանք'} | Քնկ: ${item.quantity || 1} x ${(item.price || 0).toLocaleString()} ֏ = ${itemTotal.toLocaleString()} ֏${discountNote}`;
      })
      .join('\n');

    const summary = `🧾 ԴՐԱՄԱՐԿՂԱՅԻՆ ԿՏՐՈՆ (POS RECEIPT)
ՊԱՏՎԵՐ #: ${order.id}
Ամսաթիվ: ${order.purchaseDate} (Տպված՝ ${todayYmd} ${printTimestamp})
Հաճախորդ: ${order.customerName}
Հեռախոս: ${order.phoneNumber || '---'}
Հասցե: ${order.address || 'Տեղում / Խանութ'}
Վաճառքի տեսակ: ${order.saleType || SaleType.ON_SITE}
----------------------------------------
ԱՊՐԱՆՔՆԵՐԻ ՑԱՆԿ:
${itemsText}
----------------------------------------
${order.subtotalAmount && order.subtotalAmount !== order.totalAmount ? `Ենթագումար: ${order.subtotalAmount.toLocaleString()} ֏\n` : ''}${order.discount && order.discount > 0 ? `Զեղչ: -${order.discount.toLocaleString()} ֏\n` : ''}ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ: ${(order.totalAmount || 0).toLocaleString()} ֏
${order.prepaymentAmount && order.prepaymentAmount > 0 ? `Կանխավճար: ${order.prepaymentAmount.toLocaleString()} ֏\n` : ''}${order.remainingBalance && order.remainingBalance > 0 ? `Ենթակա է վճարման: ${order.remainingBalance.toLocaleString()} ֏\n` : ''}Վճարում: ${order.paymentMethod || 'Կանխիկ'} (${order.paymentStatus})
----------------------------------------
Շնորհակալություն գնումների համար:`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/30 text-indigo-300">
                <Printer className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm tracking-wide">POS Ջերմային Կտրոն (80mm Thermal Receipt)</h3>
                <p className="text-[11px] text-slate-300">Պատվեր #{order.id} • {order.purchaseDate}</p>
              </div>
            </div>
            <button
              onClick={() => {
                posAudio.playScanBeep();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Thermal Receipt Container */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70">
            <div 
              id="pos-thermal-receipt" 
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 font-mono text-xs text-slate-900 space-y-3.5 shadow-md w-full max-w-[80mm] mx-auto relative print-receipt-wrapper"
            >
              
              {/* Receipt Top Header */}
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-900 space-y-1 receipt-header">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                  ★★★ TAB.AM POS STORE ★★★
                </div>
                <h4 className="font-black text-base sm:text-lg text-slate-900 tracking-wider">ԴՐԱՄԱՐԿՂԱՅԻՆ ԿՏՐՈՆ</h4>
                <p className="text-[10px] text-slate-600 font-medium">Երևան, Հայաստան • Հեռ․ +374 10 00-00-00</p>
                
                {/* Prominent Order ID Box */}
                <div className="pt-1">
                  <div className="inline-block bg-slate-900 text-white font-mono font-black px-3.5 py-1 rounded-md text-xs sm:text-sm tracking-wide shadow-2xs order-id-badge">
                    ՊԱՏՎԵՐ #{order.id}
                  </div>
                </div>
              </div>

              {/* Order Meta / Dates */}
              <div className="space-y-1 text-[11px] pb-3 border-b-2 border-dashed border-slate-900 receipt-meta">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Պատվերի Ամսաթիվ:</span>
                  <span className="font-bold text-slate-900">{order.purchaseDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Տպման Ժամանակ:</span>
                  <span className="font-bold text-slate-800">{todayYmd} {printTimestamp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Հաճախորդ:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[170px]">{order.customerName}</span>
                </div>
                {order.phoneNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Հեռախոս:</span>
                    <span className="font-bold font-mono text-slate-900">{order.phoneNumber}</span>
                  </div>
                )}
                {order.address && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-600 font-medium shrink-0">Հասցե:</span>
                    <span className="font-bold text-slate-900 text-right truncate max-w-[170px]">{order.address}</span>
                  </div>
                )}
                {order.salesRep && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Գանձապահ/Սրահ:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">{order.salesRep}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-600 font-medium">Վաճառքի տեսակ:</span>
                  <span className="font-black uppercase text-slate-900">{order.saleType || SaleType.ON_SITE}</span>
                </div>
              </div>

              {/* Items Table Layout */}
              <div className="space-y-1 pb-3 border-b-2 border-dashed border-slate-900 receipt-table-container">
                <table className="w-full border-collapse text-[10.5px] receipt-table">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-black text-slate-700">
                      <th className="py-1 text-left">Ապրանք / Կոդ</th>
                      <th className="py-1 text-center w-10">Քնկ</th>
                      <th className="py-1 text-right w-16">Գին</th>
                      <th className="py-1 text-right w-18">Գումար</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-slate-200">
                    {(order.items || []).map((item, idx) => {
                      const lineTotal = calculateItemLineTotal(item);
                      const itemDiscount = calculateItemDiscount(item);
                      const itemCode = item.code || item.artikul || '---';

                      return (
                        <tr key={idx} className="align-top">
                          <td className="py-1.5 pr-1">
                            <div className="font-bold text-slate-900 leading-tight">
                              {item.name || `Ապրանք #${idx + 1}`}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              Կոդ: {itemCode}
                            </div>
                            {itemDiscount > 0 && (
                              <div className="text-[9px] text-emerald-700 font-semibold">
                                Զեղչ: -{itemDiscount.toLocaleString()} ֏
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 text-center font-bold text-slate-900 font-mono">
                            {item.quantity || 1}
                          </td>
                          <td className="py-1.5 text-right font-medium text-slate-700 font-mono">
                            {(item.price || 0).toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right font-black text-slate-900 font-mono">
                            {lineTotal.toLocaleString()} ֏
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals and Payment Summary */}
              <div className="space-y-1 text-xs pt-1 receipt-totals">
                {order.subtotalAmount && order.subtotalAmount !== order.totalAmount && (
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Ենթագումար:</span>
                    <span className="font-mono font-bold">{order.subtotalAmount.toLocaleString()} ֏</span>
                  </div>
                )}
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-slate-700 text-[11px] font-bold">
                    <span>Ընդհանուր Զեղչ:</span>
                    <span className="font-mono">-{order.discount.toLocaleString()} ֏</span>
                  </div>
                )}
                
                {/* Grand Total */}
                <div className="flex justify-between items-center text-sm font-black text-slate-900 py-1.5 border-t-2 border-b-2 border-slate-900 grand-total-row">
                  <span className="uppercase tracking-wider">ԸՆԴՀԱՆՈՒՐ:</span>
                  <span className="text-base sm:text-lg font-mono font-black">{(order.totalAmount || 0).toLocaleString()} ֏</span>
                </div>

                {order.prepaymentAmount && order.prepaymentAmount > 0 && (
                  <div className="flex justify-between text-slate-800 text-[11px] font-bold pt-1">
                    <span>Կանխավճար:</span>
                    <span className="font-mono">{order.prepaymentAmount.toLocaleString()} ֏</span>
                  </div>
                )}
                {order.remainingBalance && order.remainingBalance > 0 ? (
                  <div className="flex justify-between text-slate-900 text-[11px] font-black">
                    <span>Ենթակա է վճարման:</span>
                    <span className="font-mono">{order.remainingBalance.toLocaleString()} ֏</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center text-slate-800 text-[10.5px] pt-1.5 border-t border-dashed border-slate-300">
                  <span>Վճարման եղանակ:</span>
                  <span className="font-bold">{order.paymentMethod || 'Կանխիկ'} ({order.paymentStatus || PaymentStatus.PAID})</span>
                </div>
              </div>

              {/* Simulated Barcode Stripes */}
              <div className="pt-2 text-center space-y-1 receipt-barcode">
                <div className="h-9 flex items-center justify-center gap-1 opacity-90 overflow-hidden">
                  {Array.from({ length: 34 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-full bg-slate-900 ${i % 4 === 0 ? 'w-1.5' : i % 2 === 0 ? 'w-1' : 'w-0.5'}`} 
                    />
                  ))}
                </div>
                <p className="font-mono text-[10px] font-bold text-slate-700 tracking-widest uppercase">
                  *{order.id}*
                </p>
              </div>

              {/* Footer Return Policy & Thank You */}
              <div className="text-center pt-2 text-[9.5px] text-slate-600 space-y-0.5 border-t border-dashed border-slate-900 receipt-footer">
                <p className="font-black text-slate-900">ՇՆՈՐՀԱԿԱԼՈՒԹՅՈՒՆ ԳՆՈՒՄՆԵՐԻ ՀԱՄԱՐ</p>
                <p className="text-[9px]">Ապրանքի փոխանակումը կատարվում է կտրոնի առկայությամբ 14 օրվա ընթացքում:</p>
                <p className="text-[8.5px] text-slate-500 pt-0.5">tab.am • POS Վաճառքի և Պատվերների Համակարգ</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={handleCopySummary}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'Պատճենված է!' : 'Պատճենել տեքստը'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md hover:shadow-indigo-200"
            >
              <Printer className="w-4 h-4" />
              <span>Տպել 80mm Կտրոնը (Print Receipt)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

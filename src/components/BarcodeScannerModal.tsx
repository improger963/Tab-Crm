import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScanLine, X, Search, Sparkles, CheckCircle2, 
  ShoppingBag, ArrowRight, Tag, Volume2, Plus, Zap
} from 'lucide-react';
import { posAudio } from '../lib/posAudio';
import { Order, OrderItem } from '../types';
import { getSavedProducts, ProductCatalogItem } from '../lib/storage';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateWithItem?: (item: { code: string; name: string; price: number }) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  orders,
  onSelectOrder,
  onCreateWithItem
}: BarcodeScannerModalProps) {
  const [scannedCode, setScannedCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [matchResult, setMatchResult] = useState<{
    type: 'order' | 'product' | 'none';
    order?: Order;
    product?: ProductCatalogItem;
  } | null>(null);

  const savedProducts = getSavedProducts();

  useEffect(() => {
    if (isOpen) {
      setScannedCode('');
      setMatchResult(null);
      setIsScanning(true);
    }
  }, [isOpen]);

  const handleScanInput = (code: string) => {
    const clean = code.trim();
    setScannedCode(clean);
    if (!clean) {
      setMatchResult(null);
      return;
    }

    posAudio.playScanBeep();

    // 1. Check if matches existing order ID
    const foundOrder = orders.find(o => 
      o.id.toLowerCase() === clean.toLowerCase() ||
      o.id.toLowerCase().replace(/ord-?/i, '') === clean.toLowerCase()
    );

    if (foundOrder) {
      posAudio.playSuccessChime();
      setMatchResult({ type: 'order', order: foundOrder });
      return;
    }

    // 2. Check if matches saved products database SKU/Code or Artikul
    const foundProduct = savedProducts.find(p => 
      p.code.toLowerCase() === clean.toLowerCase() ||
      (p.artikul && p.artikul.toLowerCase() === clean.toLowerCase())
    );
    if (foundProduct) {
      posAudio.playSuccessChime();
      setMatchResult({ type: 'product', product: foundProduct });
      return;
    }

    // 3. Check if found in any order's items
    const orderWithItem = orders.find(o => 
      (o.items || []).some(item => 
        (item.code && item.code.toLowerCase() === clean.toLowerCase()) ||
        (item.artikul && item.artikul.toLowerCase() === clean.toLowerCase())
      )
    );

    if (orderWithItem) {
      posAudio.playSuccessChime();
      setMatchResult({ type: 'order', order: orderWithItem });
      return;
    }

    setMatchResult({ type: 'none' });
  };

  const handleSimulateScan = (code: string) => {
    handleScanInput(code);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/40 rounded-2xl border border-indigo-400/30 text-indigo-300">
                <ScanLine className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>POS Ինտերակտիվ Շտրիխ-Կոդ Սկաներ</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                    LIVE POS
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Սկանավորեք SKU ապրանքի կոդը կամ պատվերի ID-ն
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Viewport Simulation */}
          <div className="p-6 space-y-6">
            <div className="relative h-44 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-slate-800 shadow-inner">
              {/* Laser beam animation */}
              <motion.div 
                className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                animate={{
                  top: ['15%', '85%', '15%'],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: "easeInOut"
                }}
              />

              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" />

              {/* Central crosshair & text */}
              <div className="text-center z-10 space-y-1">
                <Tag className="w-6 h-6 text-indigo-400 mx-auto opacity-70" />
                <p className="font-mono text-xs font-bold text-slate-300">
                  {scannedCode ? `ԿՈԴ՝ [ ${scannedCode} ]` : 'Ուղղեք սկաները շտրիխ-կոդի վրա...'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Աջակցում է POS SKU և Պատվերի ID-ներ
                </p>
              </div>
            </div>

            {/* Manual Code Input Bar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Մուտքագրել կոդը ձեռքով կամ սկաներով՝
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={scannedCode}
                  onChange={(e) => handleScanInput(e.target.value)}
                  placeholder="օր.՝ 4203, 1118, 8491..."
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {scannedCode && (
                  <button
                    onClick={() => {
                      setScannedCode('');
                      setMatchResult(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Մաքրել
                  </button>
                )}
              </div>
            </div>

            {/* Quick Test Barcode Buttons */}
            {savedProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Հիշված Ապրանքներ Բազայում (1-Սեղմումով)՝
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {savedProducts.slice(0, 6).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSimulateScan(item.code)}
                      className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-left transition-all text-[11px] group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-indigo-600 text-[11px]">{item.code}</span>
                        <span className="font-mono text-[9.5px] text-slate-400 font-bold">{(item.price || 0).toLocaleString()}֏</span>
                      </div>
                      <p className="truncate text-[10px] text-indigo-700 font-bold mt-0.5">{item.name || item.artikul || 'Ապրանք'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Match Result Display */}
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border transition-all"
              >
                {matchResult.type === 'order' && matchResult.order && (
                  <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-xs text-indigo-950">Գտնվել է Պատվեր՝ {matchResult.order.id}</span>
                      </div>
                      <span className="font-mono font-black text-xs text-indigo-900">
                        {matchResult.order.totalAmount?.toLocaleString()} ֏
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Հաճախորդ՝ <strong className="text-slate-900">{matchResult.order.customerName}</strong> | Կարգավիճակ՝ {matchResult.order.status}
                    </p>
                    <button
                      onClick={() => {
                        onSelectOrder(matchResult.order!);
                        onClose();
                      }}
                      className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Բացել Պատվերի Էջը</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {matchResult.type === 'product' && matchResult.product && (
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-emerald-950">Ապրանք՝ Կոդ {matchResult.product.code} ({matchResult.product.artikul})</span>
                      </div>
                      <span className="font-mono font-black text-xs text-emerald-900">
                        {matchResult.product.price.toLocaleString()} ֏
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      SKU՝ <strong className="font-mono text-emerald-800">{matchResult.product.code}</strong> | Կատեգորիա՝ {matchResult.product.category}
                    </p>
                    {onCreateWithItem && (
                      <button
                        onClick={() => {
                          onCreateWithItem(matchResult.product!);
                          onClose();
                        }}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Գրանցել Նոր Պատվեր այս Ապրանքով</span>
                      </button>
                    )}
                  </div>
                )}

                {matchResult.type === 'none' && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center text-xs text-amber-800 font-semibold">
                    «{scannedCode}» կոդով պատվեր կամ ապրանք չգտնվեց:
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Փակել
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

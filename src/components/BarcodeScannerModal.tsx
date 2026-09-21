import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MODAL_BACKDROP, MODAL_SHELL, MICRO_ENTER } from '../lib/motionPresets';
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

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        {...MODAL_BACKDROP}
        className="modal-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          {...MODAL_SHELL}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scanner-title"
          className="modal-shell w-full max-w-lg"
        >
          {/* Header */}
          <div className="modal-header-dark p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg border border-white/15 text-white">
                <ScanLine className="w-5 h-5 animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <h3 id="scanner-title" className="font-semibold text-sm text-white flex items-center gap-2">
                  <span>POS Ինտերակտիվ Շտրիխ-Կոդ Սկաներ</span>
                  <span className="px-1.5 py-px rounded text-2xs font-semibold bg-white/15 text-white/90 border border-white/20">
                    LIVE POS
                  </span>
                </h3>
                <p className="text-xs text-white/60">
                  Սկանավորեք SKU ապրանքի կոդը կամ պատվերի ID-ն
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Փակել սկաները"
              className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Scanner Viewport Simulation */}
          <div className="p-6 space-y-6">
            <div className="relative h-40 bg-[#060b18] rounded-xl overflow-hidden flex flex-col items-center justify-center border border-white/10 shadow-inner">
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
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl" aria-hidden="true" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr" aria-hidden="true" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl" aria-hidden="true" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br" aria-hidden="true" />

              {/* Central crosshair & text */}
              <div className="text-center z-10 space-y-1">
                <Tag className="w-6 h-6 text-indigo-400 mx-auto opacity-70" aria-hidden="true" />
                <p className="font-mono text-xs font-semibold text-white/85">
                  {scannedCode ? `ԿՈԴ՝ [ ${scannedCode} ]` : 'Ուղղեք սկաները շտրիխ-կոդի վրա...'}
                </p>
                <p className="text-2xs text-white/55">
                  Աջակցում է POS SKU և Պատվերի ID-ներ
                </p>
              </div>
            </div>

            {/* Manual Code Input Bar */}
            <div className="space-y-1.5">
              <label htmlFor="manual-scan-code" className="text-xs font-medium text-slate-600 block">
                Մուտքագրել կոդը ձեռքով կամ սկաներով՝
              </label>
              <div className="relative">
                <input
                  id="manual-scan-code"
                  type="text"
                  value={scannedCode}
                  onChange={(e) => handleScanInput(e.target.value)}
                  placeholder="օր.՝ 4203, 1118, 8491..."
                  autoFocus
                  className="input-field font-mono py-2.5 pr-16"
                />
                {scannedCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setScannedCode('');
                      setMatchResult(null);
                    }}
                    aria-label="Մաքրել կոդը"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
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
                  <span className="text-2xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" aria-hidden="true" />
                    Հիշված Ապրանքներ Բազայում (1-Սեղմումով)՝
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {savedProducts.slice(0, 6).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSimulateScan(item.code)}
                      className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200/80 rounded-lg text-left transition-all duration-150 text-xs group cursor-pointer active:scale-[0.97]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-primary-ink text-xs tabular-nums">{item.code}</span>
                        <span className="font-mono text-2xs text-slate-500 font-medium tabular-nums">{(item.price || 0).toLocaleString()}֏</span>
                      </div>
                      <p className="truncate text-2xs text-primary-ink font-medium mt-0.5">{item.name || item.artikul || 'Ապրանք'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Match Result Display */}
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={MICRO_ENTER}
                className="p-4 rounded-2xl"
              >
                {matchResult.type === 'order' && matchResult.order && (
                  <div className="bg-indigo-50/70 border border-indigo-200/80 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary-ink" aria-hidden="true" />
                        <span className="font-semibold text-xs text-indigo-950">Գտնվել է Պատվեր՝ {matchResult.order.id}</span>
                      </div>
                      <span className="font-mono font-semibold text-xs text-indigo-900 tabular-nums">
                        {matchResult.order.totalAmount?.toLocaleString()} ֏
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Հաճախորդ՝ <strong className="text-slate-900">{matchResult.order.customerName}</strong> | Կարգավիճակ՝ {matchResult.order.status}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectOrder(matchResult.order!);
                        onClose();
                      }}
                      className="btn btn-primary w-full mt-2 justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Բացել Պատվերի Էջը</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {matchResult.type === 'product' && matchResult.product && (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                        <span className="font-semibold text-xs text-emerald-950">Ապրանք՝ Կոդ {matchResult.product.code} ({matchResult.product.artikul})</span>
                      </div>
                      <span className="font-mono font-semibold text-xs text-emerald-900 tabular-nums">
                        {matchResult.product.price.toLocaleString()} ֏
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      SKU՝ <strong className="font-mono text-emerald-800">{matchResult.product.code}</strong> | Կատեգորիա՝ {matchResult.product.category}
                    </p>
                    {onCreateWithItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateWithItem(matchResult.product!);
                          onClose();
                        }}
                        className="btn w-full mt-2 justify-center gap-1.5 bg-success hover:brightness-110 text-white active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
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
          <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-md btn-ghost"
            >
              Փակել
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

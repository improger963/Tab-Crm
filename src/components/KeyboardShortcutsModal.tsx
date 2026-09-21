import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MODAL_BACKDROP, MODAL_SHELL } from '../lib/motionPresets';
import { Keyboard, X, Command, Sparkles, Layers, FileText, LayoutDashboard, Database, Plus, ScanLine, Search, Printer } from 'lucide-react';
import { posAudio } from '../lib/posAudio';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const shortcutGroups = [
    {
      title: 'Էջերի Արագ Անցում (Navigation)',
      shortcuts: [
        { key: '1', label: 'Պատվերների Ցանկ (Feed)', icon: Layers },
        { key: '2', label: 'Վիճակագրություն & Analytics', icon: LayoutDashboard },
        { key: '3', label: 'PDF Հաշվետվություններ', icon: FileText },
        { key: '4', label: 'Տեղային JSON Բազա', icon: Database },
      ]
    },
    {
      title: 'Գործառույթներ (POS Actions)',
      shortcuts: [
        { key: 'N', label: 'Նոր Պատվերի Գրանցում', icon: Plus },
        { key: 'S', label: 'Շտրիխ-Կոդի / SKU Սկաներ', icon: ScanLine },
        { key: '/', label: 'Ակնթարթային Որոնում', icon: Search },
        { key: 'P', label: 'Արագ Տպել Էջը / Կտրոնը', icon: Printer },
        { key: '?', label: 'Ստեղնաշարի Օգնություն', icon: Keyboard },
        { key: 'Esc', label: 'Փակել Պատուհանը / Որոնումը', icon: X },
      ]
    }
  ];

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
          aria-labelledby="shortcuts-title"
          className="modal-shell w-full max-w-lg max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="modal-header-dark px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-lg border border-white/15">
                <Keyboard className="w-[18px] h-[18px] text-indigo-400" aria-hidden="true" />
              </div>
              <div>
                <h3 id="shortcuts-title" className="font-semibold text-sm tracking-tight">Ստեղնաշարի Կոճակներ (Hotkeys)</h3>
                <p className="text-xs text-white/60 font-medium">Արագ աշխատանքի կարճուղիներ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                posAudio.playScanBeep();
                onClose();
              }}
              aria-label="Փակել օգնության պատուհանը"
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Shortcuts Body */}
          <div className="p-5 overflow-y-auto space-y-5">
            {shortcutGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2.5">
                <h4 className="section-title">
                  {group.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.shortcuts.map((sc, sIdx) => {
                    const Icon = sc.icon;
                    return (
                      <div 
                        key={sIdx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors animate-rise-in"
                        style={{ animationDelay: `${Math.min(gIdx * 6 + sIdx, 12) * 0.03}s` }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-primary-ink shrink-0" aria-hidden="true" />
                          <span className="text-xs font-medium text-slate-700 truncate">{sc.label}</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 bg-surface border border-slate-300 text-slate-900 rounded-md text-xs font-mono font-semibold shadow-2xs">
                          {sc.key}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center gap-2.5 text-xs text-indigo-900 font-medium">
              <Sparkles className="w-4 h-4 text-primary-ink shrink-0" aria-hidden="true" />
              <span>Կոճակները ակտիվ են համակարգի բոլոր էջերում՝ արագագործ POS ռեժիմով։</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                posAudio.playScanBeep();
                onClose();
              }}
              className="btn btn-md btn-dark active:scale-[0.98]"
            >
              Փակել
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X, Command, Sparkles, Layers, FileText, LayoutDashboard, Database, Plus, ScanLine, Search, Printer } from 'lucide-react';
import { posAudio } from '../lib/posAudio';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Էջերի Արագ Անցում (Navigation)',
      shortcuts: [
        { key: '1', label: 'Պատվերների Ցանկ (Feed)', icon: Layers },
        { key: '2', label: 'Վիճակագրություն & Analytics', icon: LayoutDashboard },
        { key: '3', label: 'PDF Հաշվետվություններ (5 Ձև)', icon: FileText },
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Keyboard className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-wide">Ստեղնաշարի Կոճակներ (Hotkeys)</h3>
                <p className="text-[11px] text-slate-400 font-medium">Արագ աշխատանքի կարճուղիներ</p>
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

          {/* Shortcuts Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {shortcutGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  {group.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.shortcuts.map((sc, sIdx) => {
                    const Icon = sc.icon;
                    return (
                      <div 
                        key={sIdx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{sc.label}</span>
                        </div>
                        <kbd className="px-2 py-1 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-mono font-black shadow-2xs">
                          {sc.key}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Կոճակները ակտիվ են համակարգի բոլոր էջերում՝ արագագործ POS ռեժիմով։</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => {
                posAudio.playScanBeep();
                onClose();
              }}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Փակել
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  LayoutDashboard, 
  Database, 
  FileText, 
  Plus, 
  ScanLine, 
  Download, 
  Volume2, 
  VolumeX, 
  Bell, 
  Trash2, 
  X as CloseIcon,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { View } from './Sidebar';

interface MobileNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
  ordersCount: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner: () => void;
  onExportJson: () => void;
  isSoundMuted: boolean;
  toggleSoundMute: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onClearAllOrders: () => void;
  currentTime: Date;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  setActiveView,
  ordersCount,
  isOpen,
  onClose,
  onOpenScanner,
  onExportJson,
  isSoundMuted,
  toggleSoundMute,
  unreadCount,
  onOpenNotifications,
  onClearAllOrders,
  currentTime,
}) => {
  const isOrdersActive = activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order';

  return (
    <>
      {/* 1. Sleek Mobile Bottom Dock (Always visible on mobile/tablet) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around select-none"
        aria-label="Mobile Navigation"
      >
        {/* Orders */}
        <button
          type="button"
          onClick={() => setActiveView('orders')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            isOrdersActive ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {ordersCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1 py-0.2 bg-indigo-600 text-white rounded-full text-[8px] font-mono font-black">
                {ordersCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Պատվերներ</span>
          {isOrdersActive && (
            <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-0.5" />
          )}
        </button>

        {/* Analytics */}
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeView === 'dashboard' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Վիճակ</span>
          {activeView === 'dashboard' && (
            <span className="w-1 h-1 rounded-full bg-indigo-600 absolute bottom-0.5" />
          )}
        </button>

        {/* Center: "+ Գրանցել" Elevated Action */}
        <button
          type="button"
          onClick={() => setActiveView('create-order')}
          className="flex flex-col items-center justify-center -mt-5 group cursor-pointer active:scale-90 transition-transform"
          title="Գրանցել Նոր Պատվեր"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300 ring-4 ring-white">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-black text-indigo-700 mt-0.5">Գրանցել</span>
        </button>

        {/* JSON Database */}
        <button
          type="button"
          onClick={() => setActiveView('json-database')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeView === 'json-database' ? 'text-amber-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Database className="w-5 h-5" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5" />
          </div>
          <span className="text-[10px]">Բազա</span>
          {activeView === 'json-database' && (
            <span className="w-1 h-1 rounded-full bg-amber-600 absolute bottom-0.5" />
          )}
        </button>

        {/* Reports */}
        <button
          type="button"
          onClick={() => setActiveView('reports')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeView === 'reports' ? 'text-emerald-600 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Հաշվետվություն</span>
          {activeView === 'reports' && (
            <span className="w-1 h-1 rounded-full bg-emerald-600 absolute bottom-0.5" />
          )}
        </button>
      </nav>

      {/* 2. Slide-over Mobile Tools Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="absolute inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <Layers className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">tab.am POS</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Կառավարման Մենյու</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Quick Order Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('create-order');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-indigo-100 active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-xl">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="text-left">
                      <div>➕ Գրանցել Նոր Պատվեր</div>
                      <div className="text-[10px] text-indigo-100 font-medium">POS դրամարկղ և առաքում</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                </button>

                {/* Navigation Links */}
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                    Բաժիններ
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('orders');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isOrdersActive ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>📦 Պատվերների Ցանկ</span>
                    </div>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-mono font-black">
                      {ordersCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('dashboard');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'dashboard' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                      <span>📊 Վիճակագրություն & Վաճառք</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('reports');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'reports' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>📄 PDF Հաշվետվություններ</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      3 Ձև
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('json-database');
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeView === 'json-database' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-amber-600" />
                      <span>🗄️ JSON Բազա (Ֆայլ)</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                      Ֆայլային
                    </span>
                  </button>
                </div>

                {/* Tools */}
                <div className="space-y-1 pt-2 border-t border-slate-150">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                    Գործիքներ
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenScanner();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <ScanLine className="w-4 h-4 text-indigo-600" />
                      <span>⚡ Շտրիխ-Կոդի Սկաներ</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Կամերա</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onExportJson();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>💾 Արտահանել JSON Backup</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">.json</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={toggleSoundMute}
                      className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                      <span>{isSoundMuted ? 'Ձայնը ❌' : 'Ձայնը 🔊'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNotifications();
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <span>Ծանուցում</span>
                      {unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Danger action: Clear orders */}
                <div className="pt-2 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onClearAllOrders();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Մաքրել Բոլոր Պատվերները</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Տեղային Բազա</span>
                </div>
                <span className="font-mono font-bold">
                  {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MODAL_BACKDROP, EASE_PREMIUM, EASE_IN_FAST } from '../lib/motionPresets';
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
  HardDrive,
  Sun,
  Moon
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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
}) => {
  const isOrdersActive = activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order';

  return (
    <>
      {/* 1. Sleek Mobile Bottom Dock (Always visible on mobile/tablet) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/[0.97] backdrop-blur-xl border-t border-slate-200/50 shadow-up px-2 pt-1.5 pb-safe flex items-center justify-around select-none"
        aria-label="Ստորին նավիգացիա"
      >
        {/* Orders */}
        <button
          type="button"
          onClick={() => setActiveView('orders')}
          aria-current={isOrdersActive ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-[0.94] cursor-pointer relative ${
            isOrdersActive ? 'text-primary-ink font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" aria-hidden="true" />
            {ordersCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1 py-0.5 bg-primary text-white rounded-full text-2xs font-mono font-bold tabular-nums" aria-hidden="true">
                {ordersCount}
              </span>
            )}
          </div>
          <span className="text-2xs">Պատվերներ</span>
          <span className={`w-4 h-[2px] rounded-full bg-primary absolute bottom-0.5 transition-all duration-300 ease-premium ${isOrdersActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} aria-hidden="true" />
        </button>

        {/* Analytics */}
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          aria-current={activeView === 'dashboard' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-[0.94] cursor-pointer relative ${
            activeView === 'dashboard' ? 'text-primary-ink font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
          <span className="text-2xs">Վիճակ</span>
          <span className={`w-4 h-[2px] rounded-full bg-primary absolute bottom-0.5 transition-all duration-300 ease-premium ${activeView === 'dashboard' ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} aria-hidden="true" />
        </button>

        {/* Center: "Գրանցել" Elevated Action */}
        <button
          type="button"
          onClick={() => setActiveView('create-order')}
          className="flex flex-col items-center justify-center -mt-5 group cursor-pointer active:scale-90 transition-transform duration-200"
          aria-label="Գրանցել նոր պատվեր"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary to-accent text-white flex items-center justify-center shadow-md ring-4 ring-surface">
            <Plus className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>
          <span className="text-2xs font-semibold text-primary-ink mt-0.5">Գրանցել</span>
        </button>

        {/* JSON Database */}
        <button
          type="button"
          onClick={() => setActiveView('json-database')}
          aria-current={activeView === 'json-database' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-[0.94] cursor-pointer relative ${
            activeView === 'json-database' ? 'text-amber-700 font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <div className="relative">
            <Database className="w-5 h-5" aria-hidden="true" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5" aria-hidden="true" />
          </div>
          <span className="text-2xs">Բազա</span>
          <span className={`w-4 h-[2px] rounded-full bg-amber-500 absolute bottom-0.5 transition-all duration-300 ease-premium ${activeView === 'json-database' ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} aria-hidden="true" />
        </button>

        {/* Reports */}
        <button
          type="button"
          onClick={() => setActiveView('reports')}
          aria-current={activeView === 'reports' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-[0.94] cursor-pointer relative ${
            activeView === 'reports' ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'
          }`}
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          <span className="text-2xs">Հաշվետվություն</span>
          <span className={`w-4 h-[2px] rounded-full bg-emerald-500 absolute bottom-0.5 transition-all duration-300 ease-premium ${activeView === 'reports' ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} aria-hidden="true" />
        </button>
      </nav>

      {/* 2. Slide-over Mobile Tools Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Կառավարման մենյուն">
            {/* Backdrop */}
            <motion.div
              {...MODAL_BACKDROP}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0, transition: { duration: 0.3, ease: EASE_PREMIUM } }}
              exit={{ x: '-100%', transition: { duration: 0.22, ease: EASE_IN_FAST } }}
              className="absolute inset-y-0 left-0 max-w-xs w-full bg-surface/98 backdrop-blur-xl shadow-drawer flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm shadow-indigo-200/60">
                    <Layers className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">tab.am POS</h3>
                    <p className="text-2xs text-slate-500 font-medium">Կառավարման Մենյու</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Փակել մենյուն"
                  className="p-2 -mr-1 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <CloseIcon className="w-5 h-5" aria-hidden="true" />
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
                  className="w-full flex items-center justify-between p-3.5 bg-primary hover:bg-primary-strong text-white rounded-xl font-semibold text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-xl">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="text-left">
                      <div>Գրանցել Նոր Պատվեր</div>
                      <div className="text-2xs text-white/80 font-medium">POS դրամարկղ և առաքում</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>

                {/* Navigation Links */}
                <div className="space-y-1">
                  <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1.5">
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
                      <Layers className="w-4 h-4 text-primary-ink" />
                      <span>Պատվերների Ցանկ</span>
                    </div>
                    <span className="px-2 py-0.5 bg-surface border border-slate-200 text-slate-700 rounded-lg text-2xs font-mono font-bold">
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
                      <LayoutDashboard className="w-4 h-4 text-primary-ink" />
                      <span>Վիճակագրություն & Վաճառք</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
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
                      <FileText className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      <span>PDF Հաշվետվություններ</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
                      <Database className="w-4 h-4 text-amber-700" />
                      <span>JSON Բազա (Ֆայլ)</span>
                    </div>
                    <span className="text-2xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                      Ֆայլային
                    </span>
                  </button>
                </div>

                {/* Tools */}
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1.5">
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
                      <ScanLine className="w-4 h-4 text-primary-ink" />
                      <span>Շտրիխ-Կոդի Սկաներ</span>
                    </div>
                    <span className="text-2xs font-mono text-slate-500">Կամերա</span>
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
                      <Download className="w-4 h-4 text-emerald-700" />
                      <span>Արտահանել JSON Backup</span>
                    </div>
                    <span className="text-2xs font-mono text-emerald-700 font-bold">.json</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={toggleSoundMute}
                      className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-primary-ink" />}
                      <span>{isSoundMuted ? 'Ձայնը՝ անջատված' : 'Ձայնը'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNotifications();
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                      aria-label={unreadCount > 0 ? `Բացել ծանուցումները (${unreadCount} նոր)` : 'Բացել ծանուցումները'}
                    >
                      <Bell className="w-4 h-4 text-primary-ink" aria-hidden="true" />
                      <span>Ծանուցում</span>
                      {unreadCount > 0 && (
                        <span className="bg-primary text-white text-2xs font-bold px-1.5 py-0.5 rounded-full" aria-hidden="true">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Interface theme */}
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    aria-pressed={theme === 'dark'}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {theme === 'dark'
                        ? <Moon className="w-4 h-4 text-primary-ink" aria-hidden="true" />
                        : <Sun className="w-4 h-4 text-amber-700" aria-hidden="true" />}
                      <span>Ինտերֆեյսի Գույնը</span>
                    </div>
                    <span className="text-2xs font-bold">{theme === 'dark' ? 'Մուգ' : 'Բաց'}</span>
                  </button>
                </div>

                {/* Danger action: Clear orders */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onClearAllOrders();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" aria-hidden="true" />
                    <span>Մաքրել Բոլոր Պատվերները</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100/80 bg-gradient-to-t from-slate-50/80 to-transparent flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
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

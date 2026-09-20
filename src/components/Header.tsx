import React from 'react';
import { 
  Menu, 
  Search, 
  Plus, 
  ScanLine, 
  Volume2, 
  VolumeX, 
  Bell, 
  ArrowLeft, 
  X as CloseIcon,
  Phone,
  Layers,
  Sparkles
} from 'lucide-react';
import { View } from './Sidebar';
import { Order } from '../types';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  stats: {
    all: number;
    pending: number;
    sold: number;
    active: number;
    delivered: number;
  };
  ordersCount: number;
  unreadCount: number;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  onOpenScanner: () => void;
  isSoundMuted: boolean;
  toggleSoundMute: () => void;
  onOpenMobileMenu: () => void;
  currentOrder: Order | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stats,
  unreadCount,
  isNotificationsOpen,
  setIsNotificationsOpen,
  onOpenScanner,
  isSoundMuted,
  toggleSoundMute,
  onOpenMobileMenu,
  currentOrder,
}) => {
  const isDetailView = activeView === 'create-order' || activeView === 'view-order' || activeView === 'edit-order';

  const getViewTitle = () => {
    switch (activeView) {
      case 'orders':
        return { title: 'Պատվերների Կառավարում', subtitle: `${stats.all} ակտիվ գրանցում` };
      case 'dashboard':
        return { title: 'Վիճակագրություն & Վաճառքներ', subtitle: 'POS և առաքման ցուցանիշներ' };
      case 'reports':
        return { title: 'Ֆինանսական Հաշվետվություններ', subtitle: 'PDF տպագրություն և ամփոփագրեր' };
      case 'json-database':
        return { title: 'Տեղային JSON Ֆայլային Բազա', subtitle: 'Ֆայլային պահպանում և Backup' };
      case 'create-order':
        return { title: 'Նոր Պատվերի Գրանցում', subtitle: 'POS դրամարկղ և առաքում' };
      case 'view-order':
        return { 
          title: currentOrder ? `Պատվեր #${currentOrder.id}` : 'Պատվերի Դիտում', 
          subtitle: currentOrder?.customerName || 'Մանրամասն տեղեկատվություն' 
        };
      case 'edit-order':
        return { 
          title: currentOrder ? `Խմբագրել #${currentOrder.id}` : 'Խմբագրում', 
          subtitle: 'Փոփոխել պատվերի տվյալները' 
        };
      default:
        return { title: 'tab.am POS', subtitle: 'Խանութ-սրահի համակարգ' };
    }
  };

  const currentMeta = getViewTitle();

  const statusTabs = [
    { label: 'Բոլորը', count: stats.all },
    { label: 'Սպասում է դրամարկղին', count: stats.pending },
    { label: 'Վաճառված (POS)', count: stats.sold },
    { label: 'Առաքման մեջ', count: stats.active },
    { label: 'Ավարտված', count: stats.delivered },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Top Bar Row */}
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        
        {/* Left: View title or Back navigation */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer active:scale-95 transition-all"
            title="Բացել Մենյուն"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isDetailView ? (
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 group border border-slate-200/60"
              title="Վերադառնալ պատվերներին"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 transition-transform group-hover:-translate-x-0.5" />
              <span>Պատվերներ</span>
            </button>
          ) : (
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Layers className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-black text-slate-900 text-base tracking-tight">tab.am</span>
            </div>
          )}

          {/* Desktop Breadcrumb / Title */}
          <div className="hidden lg:block min-w-0">
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none truncate">
              {currentMeta.title}
            </h1>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 relative">
          <div className="relative">
            {searchQuery.replace(/\D/g, '').length > 0 ? (
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-pulse" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            )}
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'orders' && e.target.value) {
                  setActiveView('orders');
                }
              }}
              placeholder="Որոնել հեռախոս, ID կամ անուն... (/)"
              className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Right: Actions, Notifications, Primary Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Barcode Scanner (Desktop Header Shortcut) */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer active:scale-95"
            title="Շտրիխ-կոդի Սկաներ (Ստեղն՝ S)"
          >
            <ScanLine className="w-4 h-4 text-indigo-600" />
            <span className="hidden xl:inline">Սկաներ</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSoundMute}
            className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              isSoundMuted 
                ? 'bg-slate-50 border-slate-200 text-slate-400' 
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-600'
            }`}
            title={isSoundMuted ? 'Միացնել ձայնային ազդանշանները' : 'Անջատել ձայները'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Notification Center */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              isNotificationsOpen 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' 
                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
            }`}
            title="Ծանուցումներ"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-indigo-600 animate-bounce' : 'text-slate-500'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-black text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* New Order Button (Always visible on mobile/tablet header) */}
          <button
            type="button"
            onClick={() => setActiveView('create-order')}
            className="flex lg:hidden items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Գրանցել նոր պատվեր"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Գրանցել</span>
          </button>
        </div>
      </div>

      {/* Status Filter Sub-Bar (Shown when activeView is 'orders') */}
      {activeView === 'orders' && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-slate-50/70 border-t border-slate-150 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setStatusFilter(tab.label)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white font-black shadow-xs'
                      : 'bg-white hover:bg-slate-100/80 text-slate-600 font-bold border border-slate-200/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-2 text-[11px] font-bold text-slate-400 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Թարմացվում է ակնթարթորեն</span>
          </div>
        </div>
      )}
    </header>
  );
};

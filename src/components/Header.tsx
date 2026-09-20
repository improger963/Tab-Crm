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
  Sparkles,
  Sun,
  Moon
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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
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
    <header className="bg-surface/90 backdrop-blur-md border-b border-slate-200/80 shrink-0 z-20 shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.03)]">
      {/* Top Bar Row */}
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        
        {/* Left: View title or Back navigation */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2.5 -ml-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg lg:hidden cursor-pointer active:scale-95 transition-all"
            aria-label="Բացել կառավարման մենյուն"
            aria-haspopup="dialog"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {isDetailView ? (
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="btn btn-ghost !px-3 !py-1.5 group"
              aria-label="Վերադառնալ պատվերների ցանկին"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
              <span>Պատվերներ</span>
            </button>
          ) : (
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.12),inset_0_1px_0_var(--fill-highlight)]">
                <Layers className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
              </div>
              <span className="font-bold text-slate-900 text-[13px] tracking-tight">tab.am</span>
            </div>
          )}

          {/* Desktop Breadcrumb / Title */}
          <div className="hidden lg:block min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 tracking-[-0.01em] leading-none truncate">
              {currentMeta.title}
            </h1>
            <p className="text-2xs font-medium text-slate-500 mt-1 truncate">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 relative" role="search">
          <div className="relative group">
            {searchQuery.replace(/\D/g, '').length > 0 ? (
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-ink" aria-hidden="true" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-primary-ink" aria-hidden="true" />
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
              aria-label="Որոնել պատվեր՝ ըստ հեռախոսի, ID-ի կամ հաճախորդի անվան"
              className="w-full pl-10 pr-9 py-2 bg-surface-muted hover:bg-slate-100/80 focus:bg-surface border border-slate-200/90 focus:border-indigo-400 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all duration-150 font-medium shadow-2xs"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                aria-label="Մաքրել որոնումը"
              >
                <CloseIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-2xs font-mono font-semibold text-slate-400 bg-surface border border-slate-200/90 rounded-md shadow-2xs transition-opacity group-focus-within:opacity-0">
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
            className="btn btn-ghost !px-3 hidden sm:flex"
            aria-label="Բացել շտրիխ-կոդի սկաները (ստեղն՝ S)"
          >
            <ScanLine className="w-4 h-4 text-primary-ink" aria-hidden="true" />
            <span className="hidden xl:inline">Սկաներ</span>
          </button>

          {/* Light / Dark theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border bg-surface-muted border-slate-200/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 cursor-pointer active:scale-[0.96]"
            aria-label={theme === 'dark' ? 'Միացնել լուսային ռեժիմը' : 'Միացնել մուգ ռեժիմը'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSoundMute}
            className={`p-2 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.96] ${
              isSoundMuted 
                ? 'bg-surface-muted border-slate-200/90 text-slate-400 hover:bg-slate-100 hover:text-slate-600' 
                : 'bg-indigo-50 border-indigo-200/80 text-primary-ink hover:bg-indigo-100/70'
            }`}
            aria-label={isSoundMuted ? 'Միացնել ձայնային ազդանշանները' : 'Անջատել ձայնային ազդանշանները'}
            aria-pressed={!isSoundMuted}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Notification Center */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.96] ${
              isNotificationsOpen 
                ? 'bg-indigo-50 border-indigo-200/80 text-primary-ink shadow-2xs' 
                : 'bg-surface-muted border-slate-200/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
            aria-label={unreadCount > 0 ? `Ծանուցումներ (${unreadCount} չկարդացված)` : 'Ծանուցումներ'}
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-2xs font-bold text-white ring-2 ring-surface shadow-2xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* New Order Button (Always visible on mobile/tablet header) */}
          <button
            type="button"
            onClick={() => setActiveView('create-order')}
            className="btn btn-primary flex lg:hidden shrink-0"
            aria-label="Գրանցել նոր պատվեր"
          >
            <Plus className="w-4 h-4 stroke-[3]" aria-hidden="true" />
            <span className="hidden sm:inline">Գրանցել</span>
          </button>
        </div>
      </div>

      {/* Status Filter Sub-Bar (Shown when activeView is 'orders') */}
      {activeView === 'orders' && (
        <div className="px-4 sm:px-6 lg:px-8 py-2 bg-slate-50/70 border-t border-slate-200/60 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-0.5 rounded-lg bg-slate-100/70 border border-slate-200/60" role="group" aria-label="Ֆիլտրել պատվերները ըստ կարգավիճակի">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.label;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setStatusFilter(tab.label)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-surface text-slate-900 font-semibold shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.08),0_0_0_1px_rgb(var(--shadow-rgb)/0.04)]'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-px rounded text-2xs font-mono font-semibold ${
                    isActive ? 'bg-indigo-50 text-primary-ink' : 'bg-slate-200/70 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center gap-2 text-2xs font-medium text-slate-400 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-indigo-400" aria-hidden="true" />
            <span>Թարմացվում է ակնթարթորեն</span>
          </div>
        </div>
      )}
    </header>
  );
};

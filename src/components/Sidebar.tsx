import React from 'react';
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
  ChevronLeft, 
  ChevronRight,
  Clock,
  Sparkles,
  HardDrive,
  Keyboard,
  Sun,
  Moon
} from 'lucide-react';

export type View = 'dashboard' | 'orders' | 'create-order' | 'view-order' | 'edit-order' | 'json-database' | 'reports';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  ordersCount: number;
  onOpenScanner: () => void;
  onExportJson: () => void;
  isSoundMuted: boolean;
  toggleSoundMute: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentTime: Date;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  ordersCount,
  onOpenScanner,
  onExportJson,
  isSoundMuted,
  toggleSoundMute,
  isCollapsed,
  setIsCollapsed,
  currentTime,
  theme,
  onToggleTheme,
  onOpenShortcuts,
}) => {
  const isOrdersActive = activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order';

  const navItems = [
    {
      id: 'orders' as View,
      label: 'Պատվերներ',
      shortLabel: 'Պատվեր',
      icon: Layers,
      count: ordersCount,
      isActive: isOrdersActive,
      badgeColor: 'bg-indigo-100 text-primary-ink'
    },
    {
      id: 'dashboard' as View,
      label: 'Վիճակագրություն',
      shortLabel: 'Վիճակ',
      icon: LayoutDashboard,
      isActive: activeView === 'dashboard',
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'reports' as View,
      label: 'PDF Հաշվետվություններ',
      shortLabel: 'PDF',
      icon: FileText,
      isActive: activeView === 'reports',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'json-database' as View,
      label: 'JSON Բազա (Տեղային)',
      shortLabel: 'Բազա',
      icon: Database,
      isActive: activeView === 'json-database',
      isLive: true,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
  ];

  return (
    <aside 
      aria-label="Հիմնական նավիգացիա"
      className={`hidden lg:flex flex-col bg-surface/90 backdrop-blur-md border-r border-slate-200/80 transition-all duration-300 ease-in-out select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Brand & Workspace Identity */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div 
          onClick={() => setActiveView('orders')}
          className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          title="tab.am POS"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center text-white shadow-[0_2px_6px_-1px_rgb(var(--shadow-rgb)/0.20),inset_0_1px_0_var(--fill-highlight)] shrink-0 transition-transform duration-200 group-hover:scale-[1.04]" aria-hidden="true">
            <Layers className="w-[18px] h-[18px] stroke-[2.2]" />
          </div>
          
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-[13px] tracking-tight leading-none">tab.am</span>
                <span className="px-1 py-px rounded text-2xs font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  POS
                </span>
              </div>
              <p className="text-2xs font-medium text-slate-400 mt-1 truncate">Առցանց Դրամարկղ</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all duration-150 cursor-pointer"
          aria-label={isCollapsed ? 'Բացել կողային վահանակը' : 'Ծալել կողային վահանակը'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Primary Action: "+ Գրանցել Պատվեր" */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setActiveView('create-order')}
          aria-label="Գրանցել նոր պատվեր"
          aria-current={activeView === 'create-order' ? 'page' : undefined}
          title="Գրանցել նոր պատվեր (Կոճակ՝ N)"
          className={`w-full flex items-center justify-center gap-2.5 py-2 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer active:scale-[0.98] shadow-[0_1px_2px_rgb(var(--shadow-rgb)/0.10),inset_0_1px_0_var(--fill-highlight)] ${
            activeView === 'create-order'
              ? 'bg-ink-inverse text-white ring-2 ring-primary/30'
              : 'bg-primary hover:bg-primary-strong text-white'
          } ${isCollapsed ? 'px-0' : 'px-3.5'}`}
        >
          <div className="p-1 bg-white/15 rounded-md" aria-hidden="true">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>Նոր Պատվեր</span>
              <kbd className="text-2xs font-mono px-1.5 py-0.5 bg-white/15 text-white/90 rounded-md font-semibold border border-white/10">N</kbd>
            </div>
          )}
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
        {/* Main Section */}
        <div>
          {!isCollapsed && (
            <p className="text-2xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Հիմնական
            </p>
          )}

          <nav className="space-y-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 cursor-pointer text-left relative group ${
                    item.isActive
                      ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-[inset_2px_0_0_var(--color-primary)]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon className={`w-[17px] h-[17px] shrink-0 transition-colors duration-150 ${
                    item.isActive ? 'text-primary-ink' : 'text-slate-400 group-hover:text-slate-600'
                  }`} aria-hidden="true" />

                  {!isCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}

                  {!isCollapsed && item.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-2xs font-mono font-semibold tabular-nums ${
                      item.isActive ? 'bg-primary text-white' : 'bg-slate-200/70 text-slate-500'
                    }`}>
                      {item.count}
                    </span>
                  )}

                  {item.isLive && (
                    <span className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ${isCollapsed ? 'absolute top-2 right-2' : ''}`} />
                  )}

                  {/* Collapsed Tooltip Preview */}
                  {isCollapsed && (
                    <div role="tooltip" className="absolute left-full ml-2 px-2 py-1 bg-ink-inverse text-white text-xs font-medium rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label} {item.count !== undefined && `(${item.count})`}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Tools Section */}
        <div>
          {!isCollapsed && (
            <p className="text-2xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Գործիքներ
            </p>
          )}

          <div className="space-y-px">
            {/* Barcode Scanner Tool */}
            <button
              type="button"
              onClick={onOpenScanner}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-primary-ink hover:bg-indigo-50/60 transition-all duration-150 cursor-pointer text-left group ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Շտրիխ-կոդի / SKU Սկաներ (Ստեղն՝ S)"
            >
              <ScanLine className="w-4 h-4 text-slate-400 group-hover:text-primary-ink shrink-0 transition-colors" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Շտրիխ-Կոդի Սկաներ</span>
                  <kbd className="text-2xs font-mono px-1 py-0.5 bg-slate-100 text-slate-400 rounded border border-slate-200/80">S</kbd>
                </div>
              )}
            </button>

            {/* Quick Export JSON Backup */}
            <button
              type="button"
              onClick={onExportJson}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all duration-150 cursor-pointer text-left group ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Արտահանել JSON Backup ֆայլ"
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Արտահանել JSON</span>
                  <span className="text-2xs font-mono text-emerald-600 font-medium">Backup</span>
                </div>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSoundMute}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left group ${
                isSoundMuted ? 'text-slate-500 hover:bg-slate-100/80' : 'text-slate-700 hover:bg-indigo-50/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              aria-label={isSoundMuted ? 'Միացնել ձայները' : 'Անջատել ձայները'}
              aria-pressed={isSoundMuted}
              title={isSoundMuted ? "Միացնել ձայները" : "Անջատել ձայները"}
            >
              {isSoundMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4 text-primary-ink shrink-0" aria-hidden="true" />
              )}
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Ձայնային Էֆեկտներ</span>
                  <span className={`text-2xs font-medium ${isSoundMuted ? 'text-slate-400' : 'text-primary-ink'}`}>
                    {isSoundMuted ? 'Անջատված' : 'Միացված'}
                  </span>
                </div>
              )}
            </button>

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Միացնել լուսավոր ռեժիմը' : 'Միացնել մուգ ռեժիմը'}
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? 'Լուսավոր ռեժիմ' : 'Մուգ ռեժիմ'}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left group ${
                isCollapsed ? 'justify-center px-0' : ''
              } ${
                theme === 'dark' ? 'text-slate-700 bg-indigo-50/60 hover:bg-indigo-50' : 'text-slate-600 hover:bg-slate-100/80'
              }`}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-primary-ink shrink-0" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
              )}
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Ինտերֆեյսի Գույնը</span>
                  <span className={`text-2xs font-medium ${theme === 'dark' ? 'text-primary-ink' : 'text-slate-400'}`}>
                    {theme === 'dark' ? 'Մուգ' : 'Բաց'}
                  </span>
                </div>
              )}
            </button>

            {/* Keyboard Shortcuts Helper */}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-primary-ink hover:bg-indigo-50/60 transition-all duration-150 cursor-pointer text-left group ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                title="Ստեղնաշարի Կոճակներ (Ստեղն՝ ?)"
              >
                <Keyboard className="w-4 h-4 text-slate-400 group-hover:text-primary-ink shrink-0 transition-colors" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>Կարճուղիներ</span>
                    <kbd className="text-2xs font-mono px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded border border-slate-200/80">?</kbd>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: System Status & Time */}
      <div className="p-3 border-t border-slate-100/80">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1.5">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-2xs font-semibold text-slate-600">Տեղային Բազա</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Offline
              </span>
            </div>

            <div className="flex items-center justify-between px-1.5 text-2xs text-slate-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-600 tabular-nums">
                  {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="truncate max-w-[120px]">
                {currentTime.toLocaleDateString('hy-AM', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5" title="Տեղային Բազա • Offline Ready">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xs font-mono font-medium text-slate-400 tabular-nums">
              {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

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
  Keyboard
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
      badgeColor: 'bg-indigo-100 text-indigo-800'
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
      badge: '5 Ձև',
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
      className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out select-none z-30 shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Brand & Workspace Identity */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-150">
        <div 
          onClick={() => setActiveView('orders')}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          title="tab.am POS"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200/80 shrink-0 transition-transform group-hover:scale-105">
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>
          
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-base tracking-tight leading-none">tab.am</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  POS
                </span>
              </div>
              <p className="text-[10.5px] font-medium text-slate-400 mt-0.5 truncate">Առցանց Դրամարկղ</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          title={isCollapsed ? "Բացել կողային վահանակը" : "Ծալել կողային վահանակը"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action: "+ Գրանցել Պատվեր" */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setActiveView('create-order')}
          className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-black text-xs transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
            activeView === 'create-order'
              ? 'bg-slate-900 text-white ring-2 ring-indigo-500/50'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
          } ${isCollapsed ? 'px-0' : 'px-4'}`}
          title="Գրանցել նոր պատվեր (Կոճակ՝ N)"
        >
          <div className="p-1 bg-white/20 rounded-lg">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1">
              <span>Նոր Պատվեր</span>
              <kbd className="text-[9.5px] font-mono px-1.5 py-0.5 bg-white/20 text-white rounded font-bold">N</kbd>
            </div>
          )}
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
        {/* Main Section */}
        <div>
          {!isCollapsed && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2">
              Հիմնական
            </p>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer text-left relative group ${
                    item.isActive
                      ? 'bg-indigo-50/90 text-indigo-900 font-black shadow-2xs border border-indigo-150/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    item.isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'
                  }`} />

                  {!isCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}

                  {!isCollapsed && item.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      item.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}>
                      {item.count}
                    </span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800">
                      {item.badge}
                    </span>
                  )}

                  {item.isLive && (
                    <span className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ${isCollapsed ? 'absolute top-2 right-2' : ''}`} />
                  )}

                  {/* Collapsed Tooltip Preview */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2">
              Գործիքներ
            </p>
          )}

          <div className="space-y-1">
            {/* Barcode Scanner Tool */}
            <button
              type="button"
              onClick={onOpenScanner}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer text-left group ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Շտրիխ-կոդի / SKU Սկաներ (Ստեղն՝ S)"
            >
              <ScanLine className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Շտրիխ-Կոդի Սկաներ</span>
                  <kbd className="text-[9px] font-mono px-1 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">S</kbd>
                </div>
              )}
            </button>

            {/* Quick Export JSON Backup */}
            <button
              type="button"
              onClick={onExportJson}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all cursor-pointer text-left group ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
              title="Արտահանել JSON Backup ֆայլ"
            >
              <Download className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Արտահանել JSON</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-bold">Backup</span>
                </div>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSoundMute}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left group ${
                isSoundMuted ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-700 hover:bg-indigo-50/50 text-indigo-900'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isSoundMuted ? "Միացնել ձայները" : "Անջատել ձայները"}
            >
              {isSoundMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Ձայնային Էֆեկտներ</span>
                  <span className={`text-[9.5px] font-bold ${isSoundMuted ? 'text-slate-400' : 'text-indigo-600'}`}>
                    {isSoundMuted ? 'Անջատված' : 'Միացված'}
                  </span>
                </div>
              )}
            </button>

            {/* Keyboard Shortcuts Helper */}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer text-left group ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                title="Ստեղնաշարի Կոճակներ (Ստեղն՝ ?)"
              >
                <Keyboard className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 shrink-0 transition-transform group-hover:scale-110" />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>Կարճուղիներ</span>
                    <kbd className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">?</kbd>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer: System Status & Time */}
      <div className="p-3 border-t border-slate-150 bg-slate-50/60">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10.5px] font-black text-slate-700">Տեղային Բազա</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Անցանց (Offline)
              </span>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="truncate max-w-[120px]">
                {currentTime.toLocaleDateString('hy-AM', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1" title="Տեղային Բազա • Offline Ready">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-slate-500">
              {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

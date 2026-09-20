import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  Lock, 
  LogOut,
  LayoutDashboard, 
  Layers, 
  ChevronRight,
  X as CloseIcon,
  Bell, 
  BellOff, 
  Check, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cloud, 
  RefreshCw, 
  Link, 
  ShieldCheck, 
  ArrowLeft, 
  Phone,
  ScanLine,
  Volume2,
  VolumeX,
  Sparkles,
  Menu,
  Trash2,
  Settings,
  FileText,
  Key,
  Database,
  FileJson,
  Download,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import OrderFeed from './components/OrderFeed';
import CreateOrderPage from './components/CreateOrderPage';
import ViewOrderPage from './components/ViewOrderPage';
import EditOrderPage from './components/EditOrderPage';
import ReportsPage from './components/ReportsPage';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import DeliveryDashboard from './components/DeliveryDashboard';
import { ToastContainer, useToast } from './components/Toast';
import { posAudio } from './lib/posAudio';
import { JsonDatabasePage } from './components/JsonDatabasePage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { NotificationCenter } from './components/NotificationCenter';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// Types & Libs
import { Order, OrderStatus, PaymentStatus, SaleType } from './types';
import { getStoredData, saveOrder, updateOrder, deleteOrder, clearAllOrders, resetToDemoOrders } from './lib/storage';
import { downloadOrdersAsJsonFile } from './lib/jsonStorage';

type View = 'dashboard' | 'orders' | 'create-order' | 'view-order' | 'edit-order' | 'json-database' | 'reports';


export interface InAppNotification {
  id: string;
  orderId?: string;
  title: string;
  body: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string; // ISO string
  read: boolean;
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('orders');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('tab_pos_sidebar_collapsed') === 'true';
  });
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Բոլորը');
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const currentTime = now;

  // Design-system theme (light / dark) — presentation only, persisted locally.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('tab_pos_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Keep the browser chrome (mobile URL bar, form controls) on the same page as the app shell.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1120' : '#4f46e5');
    localStorage.setItem('tab_pos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    posAudio.playScanBeep();
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const currentOrder = useMemo(() => {
    if (!currentOrderId) return null;
    return orders.find(o => o.id === currentOrderId) || null;
  }, [orders, currentOrderId]);
  
  const { toasts, addToast, removeToast } = useToast();

  // In-App Notification Center Setup
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    const saved = localStorage.getItem('logiconnect_notifications_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'welcome-notification-1',
        title: 'Բարի գալուստ',
        body: 'Ծանուցումների կենտրոնը պատրաստ է աշխատանքի:',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
  });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(() => posAudio.isMuted());
  const [isAlertEnabled, setIsAlertEnabled] = useState(() => {
    return localStorage.getItem('logiconnect_notify_delivered') !== 'false';
  });
  const [activeBannerNotification, setActiveBannerNotification] = useState<InAppNotification | null>(null);

  const toggleSoundMute = () => {
    const nextMuted = !isSoundMuted;
    posAudio.setMuted(nextMuted);
    setIsSoundMuted(nextMuted);
    if (!nextMuted) {
      posAudio.playScanBeep();
      addToast('success', 'Ձայնային ազդանշանները միացված են');
    } else {
      addToast('save', 'Ձայնն անջատված է');
    }
  };

  // Global POS Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ս' || e.key === 'Ս') {
        e.preventDefault();
        posAudio.playScanBeep();
        setIsBarcodeScannerOpen(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'ն' || e.key === 'Ն') {
        e.preventDefault();
        posAudio.playScanBeep();
        setActiveView('create-order');
      } else if (e.key === '1') {
        e.preventDefault();
        posAudio.playScanBeep();
        setActiveView('orders');
      } else if (e.key === '2') {
        e.preventDefault();
        posAudio.playScanBeep();
        setActiveView('dashboard');
      } else if (e.key === '3') {
        e.preventDefault();
        posAudio.playScanBeep();
        setActiveView('reports');
      } else if (e.key === '4') {
        e.preventDefault();
        posAudio.playScanBeep();
        setActiveView('json-database');
      } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        posAudio.playScanBeep();
        setIsShortcutsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsBarcodeScannerOpen(false);
        setIsNotificationsOpen(false);
        setIsShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('logiconnect_notifications_history', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('logiconnect_notify_delivered', String(isAlertEnabled));
  }, [isAlertEnabled]);

  const playNotificationSound = () => {
    if (isSoundMuted || posAudio.isMuted()) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // F5 -> A5 lovely ascending success major chord interval chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(698.46, audioCtx.currentTime); // F5
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio Context chime play failed:', e);
    }
  };

  const triggerNotification = (title: string, body: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', orderId?: string) => {
    const newNotif: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      title,
      body,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);
    playNotificationSound();
    setActiveBannerNotification(newNotif);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          tag: orderId || newNotif.id
        });
      } catch (e) {
        console.log('Browser notification fallback blocked by sandbox, showing in-app banner', e);
      }
    }
  };

  useEffect(() => {
    if (activeBannerNotification) {
      const timer = setTimeout(() => {
        setActiveBannerNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [activeBannerNotification]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      sold: orders.filter(o => o.status === OrderStatus.SOLD).length,
      active: orders.filter(o => o.status === OrderStatus.IN_TRANSIT).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
    };
  }, [orders]);

  // Load Initial Data
  useEffect(() => {
    const { orders: initialOrders } = getStoredData();
    setOrders(initialOrders);
    
    // Subtle load delay for smooth animated entrance
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (initialOrders.length > 0) {
        setCurrentOrderId(initialOrders[0].id);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Local JSON Database Handlers
  const handleImportOrdersFromJson = (importedOrders: Order[], mode: 'replace' | 'merge') => {
    let updated: Order[];
    if (mode === 'replace') {
      updated = importedOrders;
    } else {
      const existingIds = new Set(orders.map(o => o.id));
      const newItems = importedOrders.filter(o => !existingIds.has(o.id));
      updated = [...newItems, ...orders];
    }
    localStorage.setItem('crm_orders', JSON.stringify(updated));
    setOrders(updated);
    if (updated.length > 0) {
      setCurrentOrderId(updated[0].id);
    }
  };

  const handleResetToDemoOrders = () => {
    const { orders: demoOrders } = resetToDemoOrders();
    setOrders(demoOrders);
    if (demoOrders.length > 0) {
      setCurrentOrderId(demoOrders[0].id);
    }
    addToast('success', 'Օրինակելի պատվերները վերականգնվեցին։');
  };

  // Bulletproof custom Armenian Date Formatter
  const formattedDate = useMemo(() => {
    const days = ['Կիրակի', 'Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի', 'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ'];
    const months = [
      'Հունվարի', 'Փետրվարի', 'Մարտի', 'Ապրիլի', 'Մայիսի', 'Հունիսի',
      'Հուլիսի', 'Օգոստոսի', 'Սեպտեմբերի', 'Հոկտեմբերի', 'Նոյեմբերի', 'Դեկտեմբերի'
    ];
    
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${dayName}, ${dayNum} ${monthName}, ${year} • ${hours}:${minutes}:${seconds}`;
  }, [now]);

  // Handlers
  const handleSelectOrder = (order: Order) => {
    setCurrentOrderId(order.id);
    setActiveView('view-order');
  };

  const handleAddNewOrder = (orderData: Order, shouldPrint?: boolean) => {
    posAudio.playSuccessChime();
    const historyEntry = { status: orderData.status, timestamp: new Date().toISOString() };
    const orderWithHistory = { 
      ...orderData, 
      statusHistory: [historyEntry],
      events: [{ id: Date.now().toString(), type: 'CREATED' as const, message: `Պատվերը գրանցվել է (${orderData.saleType})`, timestamp: new Date().toISOString() }]
    };
    
    const { orders: updatedOrders } = saveOrder(orderWithHistory as Order);
    setOrders(updatedOrders);
    setCurrentOrderId(orderWithHistory.id);
    setActiveView('view-order');
    addToast('success', 'Պատվերը հաջողությամբ գրանցվեց');

    if (shouldPrint) {
      setActiveView('reports');
    }

    // Trigger in-app notification
    triggerNotification(
      'Նոր Պատվեր է Գրանցվել',
      `Գրանցվեց նոր պատվեր՝ #${orderData.id}\nՀաճախորդ՝ ${orderData.customerName}\nՏեսակ՝ ${orderData.saleType}`,
      'success',
      orderData.id
    );
  };

  const handleUpdateOrder = (orderId: string, updates: Partial<Order>) => {
    const existingOrder = orders.find(o => o.id === orderId);
    if (!existingOrder) return;

    const targetStatus = updates.status || existingOrder.status;
    const targetPaymentStatus = updates.paymentStatus || existingOrder.paymentStatus;

    // Rule 6: Block completing an unpaid order
    if (targetStatus === OrderStatus.DELIVERED && targetPaymentStatus !== PaymentStatus.PAID) {
      posAudio.playErrorBeep();
      addToast('warning', '⚠️ Վճարումը հաստատված չէ: Պատվերը հնարավոր չէ ավարտել, քանի դեռ վճարումը չի հաստատվել (Լրիվ վճարված):');
      return;
    }
    
    const newEvents = [...(existingOrder.events || [])];
    
    // Check if what changed was more than payment stuff
    let changeMessage = 'Արվել են փոփոխություններ պատվերի տվյալներում';
    if (updates.paymentStatus && updates.paymentStatus !== existingOrder.paymentStatus) {
      changeMessage = `Վճարման կարգավիճակը դարձել է՝ ${updates.paymentStatus}`;
    }
    
    newEvents.push({
      id: Date.now().toString(),
      type: 'NOTE_ADDED' as const,
      message: changeMessage,
      timestamp: new Date().toISOString()
    });

    const { orders: updatedOrders } = updateOrder(orderId, { ...updates, events: newEvents });
    setOrders(updatedOrders);
    setCurrentOrderId(orderId);
    setActiveView('view-order');
    addToast('save', 'Փոփոխությունները պահպանված են');
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    let targetStatus = newStatus;
    let targetPaymentStatus = currentOrder.paymentStatus;

    // Rule 3: For In-Store sale (SaleType.ON_SITE), confirming POS or changing status automatically sets DELIVERED and PAID
    const isOnSite = (currentOrder.saleType || SaleType.ON_SITE) === SaleType.ON_SITE;
    if (isOnSite && (newStatus === OrderStatus.SOLD || newStatus === OrderStatus.DELIVERED)) {
      targetStatus = OrderStatus.DELIVERED;
      targetPaymentStatus = PaymentStatus.PAID;
    }

    // Rule 6: Block completing an unpaid order
    if (targetStatus === OrderStatus.DELIVERED && targetPaymentStatus !== PaymentStatus.PAID) {
      posAudio.playErrorBeep();
      addToast('warning', '⚠️ Վճարումը հաստատված չէ: Պատվերը հնարավոր չէ ավարտել, քանի դեռ վճարումը չի հաստատվել (Լրիվ վճարված):');
      return;
    }

    const historyEntry = { status: targetStatus, timestamp: new Date().toISOString() };
    const newEvents = [...(currentOrder.events || [])];
    newEvents.push({
      id: Date.now().toString(),
      type: 'STATUS_CHANGE' as const,
      message: `Կարգավիճակը փոխվել է ՝ ${targetStatus}`,
      timestamp: new Date().toISOString()
    });

    const { orders: updatedOrders } = updateOrder(orderId, { 
      status: targetStatus,
      paymentStatus: targetPaymentStatus,
      statusHistory: [...(currentOrder.statusHistory || []), historyEntry],
      events: newEvents
    });
    setOrders(updatedOrders);

    if (targetStatus === OrderStatus.SOLD || targetStatus === OrderStatus.DELIVERED || targetPaymentStatus === PaymentStatus.PAID) {
      posAudio.playCashRegisterSound();
    } else {
      posAudio.playSuccessChime();
    }

    // Trigger in-app notifications
    if (newStatus === OrderStatus.DELIVERED) {
      if (isAlertEnabled) {
        triggerNotification(
          'ՊԱՏՎԵՐՆ ԱՎԱՐՏՎԵԼ Է',
          `Պատվեր՝ #${currentOrder.id}\nՀաճախորդ՝ ${currentOrder.customerName || 'Անհայտ'}\nՀասցե՝ ${currentOrder.address || 'Չկա'}`,
          'success',
          currentOrder.id
        );
        addToast('success', `🎉 Պատվերն Ավարտված է՝ ${currentOrder.customerName || ''}`);
      } else {
        addToast('save', `Կարգավիճակը թարմացվել է՝ ${newStatus}`);
      }
    } else {
      let type: 'info' | 'warning' = 'info';
      let ArmenianStatus = newStatus;
      if (newStatus === OrderStatus.CANCELLED) {
        type = 'warning';
      }
      
      triggerNotification(
        `Կարգավիճակը Փոխվել է`,
        `Պատվեր #${currentOrder.id}-ի կարգավիճակը դարձավ՝ «${ArmenianStatus}»\nՀաճախորդ՝ ${currentOrder.customerName}`,
        type,
        currentOrder.id
      );
      addToast('save', `Կարգավիճակը թարմացվել է՝ ${newStatus}`);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const { orders: updatedOrders } = deleteOrder(orderId);
    setOrders(updatedOrders);
    setCurrentOrderId(null);
    setActiveView('orders');
    addToast('delete', 'Պատվերը հեռացվեց');
  };

  const handleClearAllOrders = () => {
    if (window.confirm('Վստա՞հ եք, որ ցանկանում եք մաքրել բոլոր պատվերները և սկսել 0-ից։')) {
      const { orders: cleared } = clearAllOrders();
      setOrders(cleared);
      setCurrentOrderId(null);
      setActiveView('orders');
      addToast('delete', 'Բոլոր պատվերները մաքրվեցին: Համակարգը զրոյացված է (0):');
      posAudio.playSuccessChime();
    }
  };

  const handleToggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('tab_pos_sidebar_collapsed', String(collapsed));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--app-bg)] text-slate-900 font-sans antialiased">
      {/* 1. Desktop Modern Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        ordersCount={orders.length}
        onOpenScanner={() => {
          posAudio.playScanBeep();
          setIsBarcodeScannerOpen(true);
        }}
        onExportJson={() => {
          downloadOrdersAsJsonFile(orders);
          addToast('success', `Արտահանվել է ${orders.length} պատվեր JSON ֆայլով։`);
        }}
        isSoundMuted={isSoundMuted}
        toggleSoundMute={toggleSoundMute}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={handleToggleSidebar}
        currentTime={currentTime}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 2. Main Workstation View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Modern Top Header with Breadcrumbs, Global Search, and Quick Actions */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stats={stats}
          ordersCount={orders.length}
          unreadCount={unreadCount}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          onOpenScanner={() => {
            posAudio.playScanBeep();
            setIsBarcodeScannerOpen(true);
          }}
          isSoundMuted={isSoundMuted}
          toggleSoundMute={toggleSoundMute}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          currentOrder={currentOrder}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Dynamic Notification Center Dropdown */}
        <NotificationCenter
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          onMarkAllRead={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            addToast('save', 'Բոլոր ծանուցումները նշվեցին կարդացված');
          }}
          onClearHistory={() => {
            setNotifications([]);
            addToast('delete', 'Ծանուցումների պատմությունը մաքրվեց');
          }}
          onSelectNotification={(notif) => {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            if (notif.orderId) {
              const ord = orders.find(o => o.id === notif.orderId);
              if (ord) {
                setCurrentOrderId(ord.id);
                setActiveView('view-order');
              } else {
                addToast('save', 'Պատվերը համակարգում չի գտնվել');
              }
            }
            setIsNotificationsOpen(false);
          }}
          isAlertEnabled={isAlertEnabled}
          onToggleAlert={() => setIsAlertEnabled(!isAlertEnabled)}
          onTestNotification={() => {
            triggerNotification(
              'Ծանուցման Ստուգում',
              'Համակարգի ծանուցումները և ազդանշանը հաջողությամբ գործում են։',
              'success'
            );
          }}
        />

        {/* Scrollable Main View Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-7 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="max-w-[1700px] mx-auto">
            <AnimatePresence mode="wait">
              {activeView === 'orders' && (
                <motion.div 
                  key="order-list"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -6, scale: 0.995 }} 
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0 space-y-4"
                >
                  <OrderFeed 
                    orders={orders}
                    selectedOrderId={currentOrderId || undefined}
                    onSelectOrder={handleSelectOrder}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    onEditOrder={(ord) => {
                      setCurrentOrderId(ord.id);
                      setActiveView('edit-order');
                    }}
                    onOpenReportsPage={() => setActiveView('reports')}
                    onUpdateStatus={handleUpdateStatus}
                    onClearAllOrders={handleClearAllOrders}
                    onResetFilters={() => {
                      setStatusFilter('Բոլորը');
                      setSearchQuery('');
                    }}
                  />
                </motion.div>
              )}

              {activeView === 'create-order' && (
                <motion.div
                  key="create-order"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0"
                >
                  <CreateOrderPage 
                    onSave={handleAddNewOrder}
                    onCancel={() => setActiveView('orders')}
                  />
                </motion.div>
              )}

              {activeView === 'view-order' && (
                <motion.div
                  key="view-order"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0"
                >
                  {currentOrder ? (
                    <ViewOrderPage 
                      order={currentOrder}
                      onBack={() => setActiveView('orders')}
                      onEdit={(ord) => {
                        setCurrentOrderId(ord.id);
                        setActiveView('edit-order');
                      }}
                      onOpenReportsPage={() => setActiveView('reports')}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdateOrder={handleUpdateOrder}
                      onDelete={handleDeleteOrder}
                    />
                  ) : (
                    <div className="solid-card p-10 text-center space-y-4 max-w-md mx-auto my-12">
                      <p className="text-sm font-bold text-slate-700">Պատվերը չի գտնվել կամ հեռացվել է:</p>
                      <button
                        type="button"
                        onClick={() => setActiveView('orders')}
                        className="btn btn-md btn-primary"
                      >
                        Վերադառնալ Պատվերների Ցանկին
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeView === 'edit-order' && (
                <motion.div
                  key="edit-order"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0"
                >
                  {currentOrder ? (
                    <EditOrderPage 
                      order={currentOrder}
                      onSave={handleUpdateOrder}
                      onCancel={() => setActiveView('view-order')}
                    />
                  ) : (
                    <div className="solid-card p-10 text-center space-y-4 max-w-md mx-auto my-12">
                      <p className="text-sm font-bold text-slate-700">Պատվերը չի գտնվել:</p>
                      <button
                        type="button"
                        onClick={() => setActiveView('orders')}
                        className="btn btn-md btn-primary"
                      >
                        Վերադառնալ Պատվերների Ցանկին
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeView === 'dashboard' && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.995 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                >
                  <DeliveryDashboard orders={orders} />
                </motion.div>
              )}

              {activeView === 'json-database' && (
                <motion.div 
                  key="json-database-page"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -6, scale: 0.995 }} 
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0"
                >
                  <JsonDatabasePage 
                    orders={orders}
                    onImportOrders={handleImportOrdersFromJson}
                    onClearDatabase={handleClearAllOrders}
                    onResetToDemo={handleResetToDemoOrders}
                    onToast={(type, msg) => {
                      const toastType = type === 'error' ? 'delete' : type;
                      addToast(toastType, msg);
                    }}
                  />
                </motion.div>
              )}

              {activeView === 'reports' && (
                <motion.div 
                  key="reports-page"
                  initial={{ opacity: 0, y: 8, scale: 0.995 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -6, scale: 0.995 }} 
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="flex-1 min-h-0"
                >
                  <ReportsPage 
                    orders={orders} 
                    onBackToOrders={() => setActiveView('orders')} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* 3. Modern Mobile Bottom Dock & Slide-Over Drawer */}
        <MobileNav
          activeView={activeView}
          setActiveView={setActiveView}
          ordersCount={orders.length}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenScanner={() => {
            posAudio.playScanBeep();
            setIsBarcodeScannerOpen(true);
          }}
          onExportJson={() => {
            downloadOrdersAsJsonFile(orders);
            addToast('success', `Արտահանվել է ${orders.length} պատվեր JSON ֆայլով։`);
          }}
          isSoundMuted={isSoundMuted}
          toggleSoundMute={toggleSoundMute}
          unreadCount={unreadCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onClearAllOrders={handleClearAllOrders}
          currentTime={currentTime}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Interactive Barcode & SKU Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        orders={orders}
        onSelectOrder={(ord) => {
          setIsBarcodeScannerOpen(false);
          handleSelectOrder(ord);
        }}
        onCreateWithItem={(product) => {
          setIsBarcodeScannerOpen(false);
          setActiveView('create-order');
          addToast('success', `${product.name} ապրանքն ավելացվեց`);
        }}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Custom In-App Floating Notification Banner */}
      <AnimatePresence>
        {activeBannerNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.93 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            role="status"
            aria-live="polite"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[380px] px-4"
          >
            <div className="glass-card shadow-xl rounded-xl p-1.5 flex gap-1 text-left">
              <button
                type="button"
                onClick={() => {
                  if (activeBannerNotification.orderId) {
                    const ord = orders.find(o => o.id === activeBannerNotification.orderId);
                    if (ord) {
                      setCurrentOrderId(ord.id);
                      setActiveView('view-order');
                    }
                  }
                  setActiveBannerNotification(null);
                }}
                className="flex-1 min-w-0 flex gap-3 text-left items-start cursor-pointer rounded-lg p-2 transition-colors hover:bg-slate-50"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-[inset_0_1px_0_var(--fill-highlight)] ${
                  activeBannerNotification.type === 'success' ? 'bg-success' :
                  activeBannerNotification.type === 'warning' ? 'bg-danger' :
                  'bg-primary'
                }`}>
                  <Bell className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 tracking-tight leading-none">
                      {activeBannerNotification.title}
                    </span>
                    <span className="text-2xs text-primary-ink font-semibold uppercase tracking-wider ml-1 bg-indigo-50 px-1.5 py-px rounded-full">
                      Հիմա
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 font-medium leading-normal mt-1.5 whitespace-pre-line">
                    {activeBannerNotification.body}
                  </p>
                  {activeBannerNotification.orderId && (
                    <span className="text-2xs text-primary-ink font-semibold mt-2 flex items-center gap-1">
                      Անցնել պատվերին <ChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveBannerNotification(null)}
                aria-label="Փակել ծանուցումը"
                className="p-1.5 hover:bg-slate-100 rounded-lg h-fit text-slate-400 hover:text-slate-900 self-start transition-colors cursor-pointer shrink-0"
              >
                <CloseIcon className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast System */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

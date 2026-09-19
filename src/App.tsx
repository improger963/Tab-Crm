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
  Key
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

// Types & Libs
import { Order, OrderStatus, PaymentStatus, SaleType } from './types';
import { getStoredData, saveOrder, updateOrder, deleteOrder, clearAllOrders } from './lib/storage';
import { initAuth, googleSignIn, logout, clearCachedToken, connectWithDirectToken } from './lib/firebase';
import { 
  listSpreadsheets, 
  createSpreadsheet, 
  readOrdersFromSheet, 
  overwriteAllOrdersInSheet, 
  getFirstSheetTitle,
  addOrderToSheet,
  updateOrderInSheet
} from './lib/sheetsService';

type View = 'dashboard' | 'orders' | 'create-order' | 'view-order' | 'edit-order' | 'google-sheets' | 'reports';


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
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Բոլորը');
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const currentTime = now;

  const currentOrder = useMemo(() => {
    if (!currentOrderId) return null;
    return orders.find(o => o.id === currentOrderId) || null;
  }, [orders, currentOrderId]);
  
  const { toasts, addToast, removeToast } = useToast();

  // Google Sheets integration state values
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string>('');
  const [spreadsheets, setSpreadsheets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('logiconnect_spreadsheet_id') || '';
  });
  const [selectedSpreadsheetName, setSelectedSpreadsheetName] = useState<string>(() => {
    return localStorage.getItem('logiconnect_spreadsheet_name') || '';
  });
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>(() => {
    return localStorage.getItem('logiconnect_sheet_title') || 'Sheet1';
  });
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [spreadsheetLoading, setSpreadsheetLoading] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [showManualTokenForm, setShowManualTokenForm] = useState<boolean>(true);
  const [customClientId, setCustomClientId] = useState<string>(() => {
    return localStorage.getItem('custom_google_client_id') || '';
  });

  // Unified handler for Google Sheets API errors
  const handleGoogleApiError = (err: any, customPrefix: string) => {
    console.error(`${customPrefix}:`, err);
    const errMsg = String(err.message || err).toLowerCase();
    if (errMsg.includes('401') || errMsg.includes('credentials') || errMsg.includes('expired') || errMsg.includes('token')) {
      setGoogleToken('');
      clearCachedToken();
      addToast('delete', 'Google հաշվի կապն ընդհատվել է (լրացել է ժամկետը)։ Խնդրում ենք նորից միացնել Sheets-ը։');
    } else {
      addToast('delete', `${customPrefix}՝ ${err.message || err}`);
    }
  };

  // Load spreadsheets function and auto-initialize if missing
  const fetchSpreadsheets = async (token: string) => {
    try {
      const list = await listSpreadsheets(token);
      setSpreadsheets(list);

      let storedId = localStorage.getItem('logiconnect_spreadsheet_id') || '';
      let storedTitle = localStorage.getItem('logiconnect_sheet_title') || 'Sheet1';

      if (!storedId && list.length > 0) {
        // Auto-select existing spreadsheet
        const firstSheet = list[0];
        storedId = firstSheet.id;
        storedTitle = await getFirstSheetTitle(storedId, token).catch(() => 'Sheet1');
        setSelectedSpreadsheetId(storedId);
        setSelectedSpreadsheetName(firstSheet.name);
        setSelectedSheetTitle(storedTitle);
        localStorage.setItem('logiconnect_spreadsheet_id', storedId);
        localStorage.setItem('logiconnect_spreadsheet_name', firstSheet.name);
        localStorage.setItem('logiconnect_sheet_title', storedTitle);
      } else if (!storedId && list.length === 0) {
        // Auto-create spreadsheet if user has none
        const newName = `tab.am POS Պատվերներ`;
        const created = await createSpreadsheet(token, newName);
        const firstTitle = await getFirstSheetTitle(created.id, token).catch(() => 'Sheet1');
        storedId = created.id;
        storedTitle = firstTitle;
        setSelectedSpreadsheetId(created.id);
        setSelectedSpreadsheetName(newName);
        setSelectedSheetTitle(firstTitle);
        localStorage.setItem('logiconnect_spreadsheet_id', created.id);
        localStorage.setItem('logiconnect_spreadsheet_name', newName);
        localStorage.setItem('logiconnect_sheet_title', firstTitle);
        setSpreadsheets([{ id: created.id, name: newName }]);
      }

      // Auto-import orders on connect
      if (storedId) {
        readOrdersFromSheet(storedId, storedTitle, token)
          .then(res => {
            if (res && res.orders) {
              setOrders(res.orders);
              localStorage.setItem('crm_orders', JSON.stringify(res.orders));
            }
          })
          .catch(err => console.warn('Auto initial read error:', err));
      }
    } catch (err: any) {
      handleGoogleApiError(err, 'Failed to load spreadsheets list');
    }
  };

  // Listen to Google/Firebase auth session state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        if (token) {
          fetchSpreadsheets(token);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken('');
      }
    );
    return () => unsubscribe();
  }, []);

  // Periodic background polling (Real-time sync from Google Sheets every 15 seconds)
  useEffect(() => {
    if (!googleToken || !selectedSpreadsheetId) return;

    const interval = setInterval(() => {
      readOrdersFromSheet(selectedSpreadsheetId, selectedSheetTitle, googleToken)
        .then(res => {
          if (res && Array.isArray(res.orders)) {
            setOrders(prevOrders => {
              if (JSON.stringify(prevOrders) !== JSON.stringify(res.orders)) {
                localStorage.setItem('crm_orders', JSON.stringify(res.orders));
                return res.orders;
              }
              return prevOrders;
            });
          }
        })
        .catch(err => {
          console.warn('Background sync check error:', err);
        });
    }, 15000);

    return () => clearInterval(interval);
  }, [googleToken, selectedSpreadsheetId, selectedSheetTitle]);

  // Save changes of local spreadsheet config to localStorage
  useEffect(() => {
    localStorage.setItem('logiconnect_autosync_enabled', 'true');
  }, [autoSync]);

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
        title: '🎉 Բարի գալուստ',
        body: 'Ծանուցումների կենտրոնը պատրաստ է աշխատանքի:',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
  });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
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
      addToast('success', 'Ձայնային ազդանշանները միացված են 🔊');
    } else {
      addToast('save', 'Ձայնն անջատված է 🔇');
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
        setIsBarcodeScannerOpen(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'ն' || e.key === 'Ն') {
        e.preventDefault();
        setActiveView('create-order');
      } else if (e.key === 'Escape') {
        setIsBarcodeScannerOpen(false);
        setIsNotificationsOpen(false);
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

  const filteredOrders = useMemo(() => {
    const rawSearch = searchQuery.trim();
    const searchLower = rawSearch.toLowerCase();
    const searchDigits = rawSearch.replace(/\D/g, '');

    return orders.filter(order => {
      if (!rawSearch) {
        if (statusFilter === 'Բոլորը') return true;
        if (statusFilter === 'Սպասում է դրամարկղին' || statusFilter === 'Սպասում է կասային') return order.status === OrderStatus.PENDING;
        if (statusFilter === 'Վաճառված (POS)' || statusFilter === 'Վաճառված (ArmSoft)') return order.status === OrderStatus.SOLD;
        if (statusFilter === 'Առաքման մեջ' || statusFilter === 'Ընթացքի մեջ') return order.status === OrderStatus.IN_TRANSIT;
        if (statusFilter === 'Ավարտված') return order.status === OrderStatus.DELIVERED;
        return order.status === statusFilter;
      }

      const orderPhoneDigits = (order.phoneNumber || '').replace(/\D/g, '');
      const itemCodesMatch = (order.items || []).some(item => 
        (item.code && item.code.toLowerCase().includes(searchLower)) ||
        (item.artikul && item.artikul.toLowerCase().includes(searchLower))
      );

      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
        (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchLower)) ||
        (searchDigits.length > 0 && orderPhoneDigits.includes(searchDigits)) ||
        (order.address && order.address.toLowerCase().includes(searchLower)) ||
        itemCodesMatch;
      
      if (statusFilter === 'Բոլորը') return matchesSearch;
      if (statusFilter === 'Սպասում է դրամարկղին' || statusFilter === 'Սպասում է կասային') return matchesSearch && order.status === OrderStatus.PENDING;
      if (statusFilter === 'Վաճառված (POS)' || statusFilter === 'Վաճառված (ArmSoft)') return matchesSearch && order.status === OrderStatus.SOLD;
      if (statusFilter === 'Առաքման մեջ' || statusFilter === 'Ընթացքի մեջ') {
        return matchesSearch && order.status === OrderStatus.IN_TRANSIT;
      }
      if (statusFilter === 'Ավարտված') return matchesSearch && order.status === OrderStatus.DELIVERED;
      return matchesSearch && order.status === statusFilter;
    });
  }, [orders, searchQuery, statusFilter]);

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

  // Google Sync Handlers
  const handleGoogleConnect = async () => {
    setSpreadsheetLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        addToast('success', 'Google հաշիվը հաջողությամբ միացվեց');
        await fetchSpreadsheets(res.accessToken);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        addToast('save', 'Մուտքի պատուհանը փակվեց օգտատիրոջ կողմից։');
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        addToast('warning', 'Բրաուզերը արգելափակել է pop-up պատուհանը։ Խնդրում ենք թույլատրել pop-up-ները։');
      } else {
        addToast('delete', `Կապակցման սխալ՝ ${err.message || err}`);
      }
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleDirectTokenConnect = async () => {
    if (!manualTokenInput.trim()) {
      addToast('warning', 'Խնդրում ենք մուտքագրել Access Token-ը։');
      return;
    }
    setSpreadsheetLoading(true);
    try {
      const res = await connectWithDirectToken(manualTokenInput.trim());
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        addToast('success', 'Google Access Token-ով հաջողությամբ միացվեց');
        await fetchSpreadsheets(res.accessToken);
        setShowManualTokenForm(false);
        setManualTokenInput('');
      }
    } catch (err: any) {
      addToast('delete', `Token-ի սխալ՝ ${err.message || err}`);
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleSaveCustomClientId = (clientIdVal: string) => {
    const val = clientIdVal.trim();
    if (val) {
      localStorage.setItem('custom_google_client_id', val);
      addToast('success', 'Custom Google Client ID-ն հաջողությամբ պահպանվեց։');
    } else {
      localStorage.removeItem('custom_google_client_id');
      addToast('success', 'Custom Google Client ID-ն ջնջվեց (լռելյայն ID-ն վերականգնված է)։');
    }
    setCustomClientId(val);
  };

  const handleGoogleDisconnect = async () => {
    setSpreadsheetLoading(true);
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken('');
      setSpreadsheets([]);
      addToast('delete', 'Google հաշիվն անջատվեց');
    } catch (err: any) {
      addToast('delete', `Անջատման սխալ՝ ${err.message || err}`);
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!googleToken) return;
    setSpreadsheetLoading(true);
    try {
      const name = `LogiConnect Orders - ${new Date().toLocaleDateString()}`;
      const sheet = await createSpreadsheet(googleToken, name);
      
      const firstTitle = await getFirstSheetTitle(sheet.id, googleToken);
      
      setSelectedSpreadsheetId(sheet.id);
      setSelectedSpreadsheetName(name);
      setSelectedSheetTitle(firstTitle);
      
      localStorage.setItem('logiconnect_spreadsheet_id', sheet.id);
      localStorage.setItem('logiconnect_spreadsheet_name', name);
      localStorage.setItem('logiconnect_sheet_title', firstTitle);
      
      addToast('success', 'Նոր աղյուսակը հաջողությամբ ստեղծվեց Google Drive-ում');
      await fetchSpreadsheets(googleToken);
    } catch (err: any) {
      handleGoogleApiError(err, 'Աղյուսակի ստեղծման սխալ');
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleSelectSpreadsheet = async (id: string) => {
    const found = spreadsheets.find(s => s.id === id);
    if (!found) return;
    setSpreadsheetLoading(true);
    try {
      const firstTitle = await getFirstSheetTitle(id, googleToken);
      setSelectedSpreadsheetId(id);
      setSelectedSpreadsheetName(found.name);
      setSelectedSheetTitle(firstTitle);
      
      localStorage.setItem('logiconnect_spreadsheet_id', id);
      localStorage.setItem('logiconnect_spreadsheet_name', found.name);
      localStorage.setItem('logiconnect_sheet_title', firstTitle);
      
      addToast('success', 'Աղյուսակը հաջողությամբ ընտրվեց');
    } catch (err: any) {
      handleGoogleApiError(err, 'Աղյուսակի միացման սխալ');
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleImportOrders = async () => {
    if (!googleToken || !selectedSpreadsheetId) return;
    setSpreadsheetLoading(true);
    try {
      const result = await readOrdersFromSheet(selectedSpreadsheetId, selectedSheetTitle, googleToken);
      if (result.orders) {
        setOrders(result.orders);
        localStorage.setItem('crm_orders', JSON.stringify(result.orders));
        addToast('success', `${result.orders.length} պատվերներ բեռնվեցին Google Sheets-ից`);
      }
    } catch (err: any) {
      handleGoogleApiError(err, 'Ներմուծման սխալ');
    } finally {
      setSpreadsheetLoading(false);
    }
  };

  const handleExportOrders = async () => {
    if (!googleToken || !selectedSpreadsheetId) return;
    setSpreadsheetLoading(true);
    try {
      await overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, orders, googleToken);
      addToast('success', 'Բոլոր պատվերները արտահանվել են Google Sheets');
    } catch (err: any) {
      handleGoogleApiError(err, 'Արտահանման սխալ');
    } finally {
      setSpreadsheetLoading(false);
    }
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
      '🆕 Նոր Պատվեր է Գրանցվել',
      `Գրանցվեց նոր պատվեր՝ #${orderData.id}\nՀաճախորդ՝ ${orderData.customerName}\nՏեսակ՝ ${orderData.saleType}`,
      'success',
      orderData.id
    );

    // Auto-sync addition to Google Sheets
    if (autoSync && googleToken && selectedSpreadsheetId) {
      overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, updatedOrders, googleToken)
        .then(() => addToast('success', 'Սինխրոնացվեց Google Sheets-ի հետ'))
        .catch(err => {
          handleGoogleApiError(err, 'Google Sheets ավտոմատ սինխրոնացման սխալ');
        });
    }
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

    // Auto-sync update to Google Sheets
    if (autoSync && googleToken && selectedSpreadsheetId) {
      overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, updatedOrders, googleToken)
        .catch(err => handleGoogleApiError(err, 'Ավտոմատ սինխրոնացման թարմացման սխալ'));
    }
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

    // Trigger in-app notifications
    if (newStatus === OrderStatus.DELIVERED) {
      if (isAlertEnabled) {
        triggerNotification(
          '📦 ՊԱՏՎԵՐՆ ԱՎԱՐՏՎԵԼ Է',
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
        `🔄 Կարգավիճակը Փոխվել է`,
        `Պատվեր #${currentOrder.id}-ի կարգավիճակը դարձավ՝ «${ArmenianStatus}»\nՀաճախորդ՝ ${currentOrder.customerName}`,
        type,
        currentOrder.id
      );
      addToast('save', `Կարգավիճակը թարմացվել է՝ ${newStatus}`);
    }

    // Auto-sync status to Google Sheets
    if (autoSync && googleToken && selectedSpreadsheetId) {
      overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, updatedOrders, googleToken)
        .catch(err => handleGoogleApiError(err, 'Ավտոմատ կարգավիճակի սինխրոնացման սխալ'));
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const { orders: updatedOrders } = deleteOrder(orderId);
    setOrders(updatedOrders);
    setCurrentOrderId(null);
    setActiveView('orders');
    addToast('delete', 'Պատվերը հեռացվեց');

    // Real-time sync deletion to Google Sheets
    if (googleToken && selectedSpreadsheetId) {
      overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, updatedOrders, googleToken)
        .then(() => addToast('save', '🟢 Հեռացումը սինխրոնացվեց Google Sheets-ում'))
        .catch(err => handleGoogleApiError(err, 'Google Sheets հեռացման սխալ'));
    }
  };

  const handleClearAllOrders = () => {
    if (window.confirm('Վստա՞հ եք, որ ցանկանում եք մաքրել բոլոր պատվերները և սկսել 0-ից։')) {
      const { orders: cleared } = clearAllOrders();
      setOrders(cleared);
      setCurrentOrderId(null);
      setActiveView('orders');
      addToast('delete', 'Բոլոր պատվերները մաքրվեցին: Համակարգը զրոյացված է (0):');
      posAudio.playSuccessChime();

      // Real-time sync clear to Google Sheets
      if (googleToken && selectedSpreadsheetId) {
        overwriteAllOrdersInSheet(selectedSpreadsheetId, selectedSheetTitle, cleared, googleToken)
          .then(() => addToast('save', '🟢 Google Sheets-ը զրոյացվեց'))
          .catch(err => handleGoogleApiError(err, 'Google Sheets զրոյացման սխալ'));
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navigation Panel (Navpanel) */}
        <header className="border-b border-slate-200/80 bg-white shrink-0 z-30 shadow-2xs w-full">
          {/* Main Top Nav Bar */}
          <div className="px-3 sm:px-5 lg:px-7 py-2.5 flex items-center justify-between gap-2 sm:gap-3 w-full">
            
            {/* Left: Brand Identity or Back Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/90 rounded-xl transition-all active:scale-95 cursor-pointer md:hidden shrink-0 flex items-center justify-center shadow-2xs"
                title="Բացել Մենյուն"
              >
                <Menu className="w-4 h-4 text-slate-800" />
              </button>

              {(activeView === 'create-order' || activeView === 'view-order' || activeView === 'edit-order') ? (
                <button 
                  onClick={() => setActiveView('orders')}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-200/80 shadow-2xs cursor-pointer"
                  title="Վերադառնալ պատվերների ցանկ"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span className="font-bold hidden xs:inline">Պատվերներ</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-white shadow-xs shadow-indigo-200 shrink-0">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="font-black text-slate-900 tracking-tight text-sm sm:text-base lg:text-lg leading-none">
                        tab.am
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Առցանց POS</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold hidden xl:block">Խանութ-սրահի համակարգ</p>
                  </div>
                </div>
              )}
            </div>

            {/* Center: Top Navigation Panel Tabs */}
            <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-slate-200/80 shrink min-w-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveView('orders')}
                className={`nav-link text-xs px-2 sm:px-3 py-1 sm:py-1.5 ${
                  activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order'
                    ? 'nav-link-active'
                    : 'nav-link-inactive'
                }`}
              >
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">Պատվերներ</span>
                {orders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveView('dashboard')}
                className={`nav-link text-xs px-2 sm:px-3 py-1 sm:py-1.5 ${activeView === 'dashboard' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
                <span className="hidden md:inline">Վիճակագրություն</span>
                <span className="hidden sm:inline md:hidden">Վիճակ</span>
              </button>

              <button
                onClick={() => setActiveView('google-sheets')}
                className={`nav-link text-xs px-2 sm:px-3 py-1 sm:py-1.5 ${activeView === 'google-sheets' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">Google Sheets</span>
                <span className="hidden sm:inline md:hidden">Sheets</span>
                {googleUser && googleToken ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => setActiveView('reports')}
                className={`nav-link text-xs px-2 sm:px-3 py-1 sm:py-1.5 ${activeView === 'reports' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">PDF Հաշվետվություններ</span>
                <span className="hidden sm:inline md:hidden">PDF</span>
              </button>
            </nav>

            {/* Right: Actions, Search, Scanner, Sound, Notifications, New Order */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Ultra-Wide Live Clock Badge (2xl+ full, xl+ compact time) */}
              <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600">
                <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="font-mono font-bold text-slate-800">{formattedDate}</span>
              </div>
              <div className="hidden xl:flex 2xl:hidden items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600">
                <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="font-mono font-bold text-slate-800">
                  {currentTime.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Desktop Quick Search */}
              <div className="relative hidden lg:block w-32 xl:w-44">
                {searchQuery.replace(/\D/g, '').length > 0 ? (
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 animate-pulse" />
                ) : (
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
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
                  placeholder="Որոնել (/)"
                  className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Barcode & SKU Scanner Tool */}
              <button
                type="button"
                onClick={() => {
                  posAudio.playScanBeep();
                  setIsBarcodeScannerOpen(true);
                }}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Բացել Շտրիխ-Կոդի Սկաները (Ստեղն՝ S)"
              >
                <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden 2xl:inline">Սկաներ</span>
                <span className="hidden xl:inline text-[9.5px] font-mono opacity-50 bg-slate-200/80 px-1 rounded">S</span>
              </button>

              {/* Daily Orders & Items PDF Report Page Button */}
              <button
                type="button"
                onClick={() => {
                  posAudio.playScanBeep();
                  setActiveView('reports');
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white border border-emerald-500/30 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-200 shrink-0"
                title="Փաստաթղթերի և PDF Արտահանման Էջ"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-100" />
                <span className="inline">PDF Հաշվետվություններ</span>
              </button>

              {/* Sound Mute/Unmute Toggle */}
              <button
                type="button"
                onClick={toggleSoundMute}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer ${
                  isSoundMuted 
                    ? 'bg-slate-100 border-slate-200 text-slate-400' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}
                title={isSoundMuted ? 'Միացնել ձայները' : 'Անջատել ձայները'}
              >
                {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Dynamic Notification Bell with custom popover */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-1.5 sm:p-2 rounded-xl border transition-all duration-200 active:scale-95 hover:bg-slate-50 cursor-pointer ${isNotificationsOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-slate-50/50 border-slate-200/60 text-slate-650'}`}
                  title="Ծանուցումներ"
                >
                  <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${unreadCount > 0 ? 'animate-bounce text-indigo-600' : 'text-slate-500'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-black text-white ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      {/* Backdrop mask */}
                       <div 
                         className="fixed inset-0 z-40" 
                         onClick={() => setIsNotificationsOpen(false)}
                       />
                       
                       <motion.div
                         initial={{ opacity: 0, y: 15, scale: 0.95 }}
                         animate={{ opacity: 1, y: 8, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         transition={{ type: "spring", duration: 0.25 }}
                         className="fixed inset-x-4 top-20 mx-auto max-w-sm sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-none bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col text-left"
                       >
                         {/* Dropdown Header */}
                         <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <Bell className="w-4 h-4 text-indigo-600" />
                             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Ծանուցումներ</h3>
                           </div>
                           {unreadCount > 0 && (
                             <button
                               onClick={() => {
                                 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                 addToast('save', 'Բոլորը նշվեցին որպես կարդացված');
                               }}
                               className="text-[9.5px] font-bold text-indigo-650 hover:underline hover:text-indigo-755 bg-transparent border-0 outline-none cursor-pointer"
                             >
                               Նշել կարդացված
                             </button>
                           )}
                         </div>

                         {/* History Area */}
                         <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                           {notifications.length === 0 ? (
                             <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                               <BellOff className="w-8 h-8 opacity-40 mb-2" />
                               <p className="text-[10px] font-bold uppercase tracking-wider">Ծանուցումներ չկան</p>
                               <p className="text-[9px] text-slate-400/90 leading-tight mt-1 px-4 text-center font-medium">Նոր իրադարձությունների կամ կարգավիճակի փոփոխություններն այստեղ կլինեն:</p>
                             </div>
                           ) : (
                             notifications.map((notif) => {
                               const isOrderNotif = !!notif.orderId;
                               
                               return (
                                 <div
                                   key={notif.id}
                                   onClick={() => {
                                     // Mark as read
                                     setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                     
                                     // Navigate to order if applies
                                     if (isOrderNotif) {
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
                                   className={`p-4 flex gap-3 transition-colors text-left relative cursor-pointer group select-none ${notif.read ? 'bg-white hover:bg-slate-50/30' : 'bg-indigo-50/10 hover:bg-indigo-50/20'}`}
                                 >
                                   {/* Unread indicator dot */}
                                   {!notif.read && (
                                     <span className="absolute top-4.5 right-4 h-2 w-2 rounded-full bg-indigo-600" />
                                   )}

                                   <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                                     notif.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/40' :
                                     notif.type === 'warning' ? 'bg-rose-50 text-rose-600 border border-rose-100/40' :
                                     'bg-indigo-50 text-indigo-600 border border-indigo-100/40'
                                   }`}>
                                     {notif.type === 'success' && <CheckCircle className="w-4 h-4 stroke-[2.2]" />}
                                     {notif.type === 'warning' && <XCircle className="w-4 h-4 stroke-[2.2]" />}
                                     {notif.type === 'info' && <Clock className="w-4 h-4 stroke-[2.2]" />}
                                     {notif.type === 'error' && <Bell className="w-4 h-4 stroke-[2.2]" />}
                                   </div>

                                   <div className="flex-1 min-w-0 pr-4">
                                     <h4 className="text-[11px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug tracking-tight">
                                       {notif.title}
                                     </h4>
                                     <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5 whitespace-pre-wrap">
                                       {notif.body}
                                     </p>
                                     <div className="flex items-center gap-2 mt-2">
                                       <span className="text-[8px] font-black text-slate-400 font-mono tracking-wider">
                                         {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       {isOrderNotif && (
                                         <span className="text-[8.5px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">
                                           Պատվեր՝ {notif.orderId}
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               );
                             })
                           )}
                         </div>

                         {/* Controls Section */}
                         <div className="bg-slate-50 p-4 border-t border-slate-150 text-[10.5px] text-slate-500 font-bold space-y-3">
                           <div className="flex items-center justify-between">
                             <span className="uppercase tracking-widest text-[8.5px] text-slate-400 font-black">ԿԱՐԳԱՎՈՐՈՒՄՆԵՐ</span>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 triggerNotification(
                                   '🔔 Ստուգում',
                                   'Ծանուցումները հաջողությամբ աշխատում են։',
                                   'success'
                                 );
                               }}
                               className="text-[9px] font-extrabold text-indigo-650 hover:bg-slate-50/80 px-2.5 py-1 rounded bg-white border border-slate-200/60 shadow-sm active:scale-95 transition-all outline-none cursor-pointer"
                             >
                               Ստուգել
                             </button>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               {isAlertEnabled ? <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" /> : <XCircle className="w-3.5 h-3.5 text-slate-450" />}
                               <span>Ավարտված պատվերների ծանուցումներ</span>
                             </div>
                             <button
                               onClick={() => setIsAlertEnabled(!isAlertEnabled)}
                               className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none ${isAlertEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                             >
                               <div className={`w-3 h-3 rounded-full bg-white shadow transform transition-transform duration-200 ${isAlertEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                             </button>
                           </div>

                           {notifications.length > 0 && (
                             <button
                               onClick={() => {
                                 setNotifications([]);
                                 addToast('delete', 'Ծանուցումները մաքրվեցին');
                               }}
                               className="w-full text-center text-rose-600 text-[9px] font-black uppercase tracking-wider hover:underline pt-1 bg-transparent border-none outline-none cursor-pointer block"
                             >
                               Մաքրել պատմությունը
                             </button>
                           )}
                         </div>
                       </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Primary Action Button: "+ Գրանցել [N]" - Always prioritized and fully visible */}
              <button 
                onClick={() => {
                  posAudio.playScanBeep();
                  setActiveView('create-order');
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shadow-indigo-200 active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
                title="Նոր պատվերի գրանցում (Ստեղն՝ N)"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="inline">Գրանցել</span>
                <span className="hidden xl:inline text-[9.5px] font-mono opacity-60 bg-indigo-800/60 px-1 py-0.2 rounded">N</span>
              </button>
            </div>
          </div>

        {/* Status Filter Tabs Bar (Shown when activeView is 'orders') */}
        {activeView === 'orders' && (
          <div className="px-3 sm:px-5 lg:px-7 py-2 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { label: 'Բոլորը', count: stats.all, active: statusFilter === 'Բոլորը' },
                { label: 'Սպասում է դրամարկղին', count: stats.pending, active: statusFilter === 'Սպասում է դրամարկղին' },
                { label: 'Վաճառված (POS)', count: stats.sold, active: statusFilter === 'Վաճառված (POS)' },
                { label: 'Առաքման մեջ', count: stats.active, active: statusFilter === 'Առաքման մեջ' },
                { label: 'Ավարտված', count: stats.delivered, active: statusFilter === 'Ավարտված' }
              ].map((stat, i) => (
                <button 
                  key={i}
                  onClick={() => setStatusFilter(stat.label)}
                  className={`flex items-center gap-1.5 shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all text-xs cursor-pointer whitespace-nowrap ${
                    stat.active 
                      ? 'bg-slate-900 text-white font-black shadow-xs' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 font-bold border border-slate-200/60'
                  }`}
                >
                  <span>{stat.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    stat.active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {stat.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 font-medium font-mono shrink-0 pl-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
          </div>
        )}
      </header>

        {/* Scrolling View Canvas */}
        <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 bg-slate-50/50">
          <div className="max-w-[1700px] mx-auto flex flex-col space-y-4">
            
            {/* Mobile/Tablet Search Bar overlay (shown only on mobile/tablet screen widths) */}
            {activeView === 'orders' && (
              <div className="block md:hidden mb-4 relative shrink-0">
                {searchQuery.replace(/\D/g, '').length > 0 ? (
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-pulse" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Որոնել ըստ հեռախոսի, ID-ի կամ անվան..."
                  className="w-full pl-10 pr-9 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-850 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeView === 'orders' && (
                <motion.div 
                  key="order-list"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="flex-1 min-h-0 space-y-4"
                >
                  {(!googleUser || !googleToken) && (
                    <div 
                      onClick={() => {
                        setActiveView('google-sheets');
                        setShowManualTokenForm(true);
                      }}
                      className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/60 transition group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Cloud className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                        <span className="text-xs font-bold text-amber-800 leading-normal">
                          📢 Google Sheets-ը միացված չէ։ Սեղմեք այստեղ՝ անհատական Access Token-ով արագ միացնելու կամ սեփական Google Client ID-ն կարգավորելու համար։
                        </span>
                      </div>
                      <div className="text-[10.5px] font-extrabold text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-3xs group-hover:bg-amber-50 transition shrink-0">
                        Միացնել
                      </div>
                    </div>
                  )}

                  <OrderFeed 
                    orders={filteredOrders}
                    selectedOrderId={currentOrderId || undefined}
                    onSelectOrder={handleSelectOrder}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
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
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
                      <p className="text-sm font-bold text-slate-700">Պատվերը չի գտնվել կամ հեռացվել է:</p>
                      <button
                        onClick={() => setActiveView('orders')}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors"
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 min-h-0"
                >
                  {currentOrder ? (
                    <EditOrderPage 
                      order={currentOrder}
                      onSave={handleUpdateOrder}
                      onCancel={() => setActiveView('view-order')}
                    />
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
                      <p className="text-sm font-bold text-slate-700">Պատվերը չի գտնվել:</p>
                      <button
                        onClick={() => setActiveView('orders')}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors"
                      >
                        Վերադառնալ Պատվերների Ցանկին
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeView === 'dashboard' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <DeliveryDashboard orders={orders} />
                </motion.div>
              )}


              {activeView === 'google-sheets' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-4xl mx-auto space-y-6"
                >
                  {/* Google Sheets info header */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-150 shadow-sm flex flex-col md:flex-row items-add sticky top-0 bg-opacity-90 backdrop-blur-md justify-between gap-6">
                    <div className="flex items-center gap-4.5">
                      <div className="bg-emerald-50 text-emerald-600 h-14 w-14 rounded-2xl flex items-center justify-center border border-emerald-100">
                        <Cloud className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight">Google Sheets</h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">Կառավարեք և պահպանեք պատվերները անմիջապես Google Աղյուսակներում</p>
                      </div>
                    </div>
                    {googleUser && googleToken && (
                      <button
                        onClick={handleGoogleDisconnect}
                        disabled={spreadsheetLoading}
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-extrabold rounded-xl transition duration-200 flex items-center gap-1.5 active:scale-95 border border-rose-100"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Անջատել Google-ը
                      </button>
                    )}
                  </div>

                  {!googleUser || !googleToken ? (
                    /* Setup instructions and Google sign-in */
                    <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-150 shadow-sm text-center max-w-2xl mx-auto flex flex-col items-center justify-center">
                      <div className="bg-indigo-50 text-indigo-650 h-16 w-16 rounded-[22px] flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-black text-slate-800 uppercase tracking-wider mb-2">Միացեք Google-ին</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-md leading-relaxed mb-6">
                        Միացեք, որպեսզի պատվերները ավտոմատ պահպանվեն և թարմացվեն Google աղյուսակներում:
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <button
                          onClick={handleGoogleConnect}
                          disabled={spreadsheetLoading}
                          className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                        >
                          {spreadsheetLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" /> Միանում է...
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4" /> Միացնել Google-ը
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setShowManualTokenForm(!showManualTokenForm)}
                          className="w-full sm:w-auto px-4 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1.5"
                        >
                          <Key className="w-4 h-4 text-slate-500" /> {showManualTokenForm ? 'Թաքցնել' : 'Անհատական Access Token'}
                        </button>
                      </div>

                      {showManualTokenForm && (
                        <div className="w-full mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-5">
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-800">
                              Անհատական Google Access Token (Արագ լուծում)
                            </p>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Եթե Vercel-ում Google-ով մուտքը արգելափակվում է `unauthorized-domain` սխալով, կարող եք տեղադրել Google OAuth Access Token-ը այստեղ.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="password"
                                placeholder="ya29.a0..."
                                value={manualTokenInput}
                                onChange={(e) => setManualTokenInput(e.target.value)}
                                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                onClick={handleDirectTokenConnect}
                                disabled={spreadsheetLoading || !manualTokenInput.trim()}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 shrink-0 cursor-pointer"
                              >
                                Միացնել
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-slate-200/60 pt-4 space-y-3">
                            <p className="text-xs font-bold text-slate-800">
                              Սեփական Google Client ID (Մշտական լուծում Vercel-ի համար)
                            </p>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Տեղադրեք ձեր սեփական Google OAuth Client ID-ն, որպեսզի «Միացնել Google-ը» կոճակը միշտ անխափան աշխատի Vercel դոմեյնի վրա:
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                placeholder="854020054293-e5sd8vcb...apps.googleusercontent.com"
                                value={customClientId}
                                onChange={(e) => setCustomClientId(e.target.value)}
                                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                onClick={() => handleSaveCustomClientId(customClientId)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
                              >
                                Պահպանել ID-ն
                              </button>
                            </div>
                          </div>

                          <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 space-y-2">
                            <p className="text-[11px] font-bold text-amber-800">
                              📋 Ինչպե՞ս կարգավորել Vercel-ի դոմեյնը Google-ում.
                            </p>
                            <ol className="list-decimal list-inside text-[10.5px] text-slate-650 leading-relaxed space-y-1">
                              <li>Մտեք <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Firebase Console</a> &rarr; Authentication &rarr; Settings &rarr; Authorized domains և ավելացրեք ձեր Vercel դոմեյնը (<code>tab-crm.vercel.app</code>)։</li>
                              <li>Մտեք <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Google Cloud Console</a> &rarr; APIs & Services &rarr; Credentials։</li>
                              <li>Խմբագրեք ձեր OAuth 2.0 Web Client-ը և <strong>Authorized JavaScript origins</strong> բաժնում ավելացրեք <code>https://tab-crm.vercel.app</code>:</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-8 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Անվտանգությունն ապահովված է</span>
                      </div>
                    </div>
                  ) : (
                    /* Sync controls dashboard */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: Account profile and active spreadsheet configuration */}
                      <div className="md:col-span-1 space-y-6">
                        
                        {/* Profile card */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Google Հաշիվ</p>
                          <div className="flex items-center gap-3">
                            <img 
                              src={googleUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} 
                              alt={googleUser.displayName || 'Google User'} 
                              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate leading-none">{googleUser.displayName || 'Օգտատեր'}</p>
                              <p className="text-[10.5px] text-slate-400 font-medium truncate mt-1">{googleUser.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Document setup card */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Աղյուսակի Կարգավորում</p>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ընտրել աղյուսակը</label>
                            {spreadsheets.length === 0 ? (
                              <p className="text-[10.5px] text-slate-400 font-medium italic">Աղյուսակներ չեն գտնվել Google Drive-ում</p>
                            ) : (
                              <select
                                value={selectedSpreadsheetId}
                                onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                                disabled={spreadsheetLoading}
                                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              >
                                <option value="">-- Ընտրել աղյուսակ Drive-ից --</option>
                                {spreadsheets.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="pt-2 text-center border-t border-slate-100/50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">կամ ստեղծել նորը</p>
                            <button
                              onClick={handleCreateNewSpreadsheet}
                              disabled={spreadsheetLoading}
                              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 border border-slate-255 border-dashed rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1 active:scale-98"
                            >
                              <Plus className="w-4 h-4" /> Ստեղծել նոր աղյուսակ
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right: Data operations and sync logs */}
                      <div className="md:col-span-2 space-y-6">
                        
                        {/* Selected Spreadsheet information & sync panel */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Ակտիվ Փաստաթուղթ</p>
                              <h4 className="text-sm font-black text-slate-800">
                                {selectedSpreadsheetId ? selectedSpreadsheetName : 'Աղյուսակ ընտրված չէ'}
                              </h4>
                              {selectedSpreadsheetId && (
                                <span className="inline-block text-[9px] font-extrabold bg-emerald-50 text-emerald-600 rounded px-1.5 py-0.5 mt-1.5 font-mono">
                                  Թերթ՝ {selectedSheetTitle}
                                </span>
                              )}
                            </div>
                            
                            {selectedSpreadsheetId && (
                              <a
                                href={`https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}`}
                                target="_blank"
                                rel="noreferrer"
                                referrerPolicy="no-referrer"
                                className="px-3.5 py-2 bg-emerald-50 text-emerald-650 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-xs font-black transition duration-200 flex items-center gap-1.5"
                              >
                                <Link className="w-3.5 h-3.5" /> Բացել
                              </a>
                            )}
                          </div>

                          {selectedSpreadsheetId ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="border border-slate-150 rounded-2xl p-4 space-y-3">
                                <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Ներմուծում (Import)</h5>
                                <p className="text-[10px] text-slate-500 leading-normal font-medium">Բեռնել բոլոր պատվերները Google Sheets-ից և թարմացնել տեղային ցուցակը։</p>
                                <button
                                  onClick={handleImportOrders}
                                  disabled={spreadsheetLoading}
                                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {spreadsheetLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Cloud className="w-3.5 h-3.5" />
                                  )}
                                  <span>Բեռնել պատվերները</span>
                                </button>
                              </div>

                              <div className="border border-slate-150 rounded-2xl p-4 space-y-3">
                                <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Արտահանում (Export)</h5>
                                <p className="text-[10px] text-slate-500 leading-normal font-medium">Ուղարկել տեղային բոլոր պատվերները աղյուսակի մեջ (կմաքրի նախորդները)։</p>
                                <button
                                  onClick={handleExportOrders}
                                  disabled={spreadsheetLoading}
                                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                                >
                                  {spreadsheetLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Cloud className="w-3.5 h-3.5" />
                                  )}
                                  <span>Արտահանել բոլորը</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-8 text-center border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center">
                              <Cloud className="w-10 h-10 text-slate-300 stroke-[1.5] mb-2" />
                              <p className="text-xs font-bold text-slate-600 leading-none">Սկսելու համար ընտրեք կամ ստեղծեք Google Sheets</p>
                              <p className="text-[10px] text-slate-400 mt-1 max-w-sm">Աղյուսակը միացնելուն պես կհայտնվեն ներմուծման և արտահանման ամբողջական կառավարման վահանակները։</p>
                            </div>
                          )}

                          {/* Auto Sync and live events tracking */}
                          {selectedSpreadsheetId && (
                            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${autoSync ? 'bg-indigo-50 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                  <RefreshCw className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800 leading-none">Ինքնաշխատ սինխրոնացում (Auto-Sync)</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">Յուրաքանչյուր նոր պատվեր կամ կարգավիճակ ակնթարթորեն կգրվի Google Sheets-ում:</p>
                                </div>
                              </div>

                              <button
                                onClick={() => setAutoSync(!autoSync)}
                                className={`w-12 h-6.5 rounded-full p-1 transition-colors cursor-pointer focus:outline-none ${autoSync ? 'bg-indigo-600' : 'bg-slate-300'}`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transform transition-transform duration-200 ${autoSync ? 'translate-x-5.5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  )}

                </motion.div>
              )}

              {activeView === 'reports' && (
                <motion.div 
                  key="reports-page"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
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
        </div>
      </main>

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

      {/* Custom In-App Floating Notification Banner */}
      <AnimatePresence>
        {activeBannerNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.93 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[380px] px-4"
          >
            <div 
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
              className="cursor-pointer bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_24px_50px_rgba(15,23,42,0.14)] rounded-[20px] p-4 flex gap-3 text-left hover:border-indigo-200 transition-all active:scale-[0.98] group"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeBannerNotification.type === 'success' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 
                activeBannerNotification.type === 'warning' ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 
                'bg-indigo-650 text-white shadow-md shadow-indigo-100'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 tracking-tight leading-none">
                    {activeBannerNotification.title}
                  </span>
                  <span className="text-[8px] text-indigo-600 font-extrabold uppercase tracking-wider ml-1 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    Հիմա
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium leading-normal mt-1.5 whitespace-pre-line">
                  {activeBannerNotification.body}
                </p>
                {activeBannerNotification.orderId && (
                  <span className="text-[8.5px] text-indigo-600 font-bold mt-2 flex items-center gap-1 group-hover:underline">
                    Անցնել պատվերին <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBannerNotification(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg h-fit text-slate-400 hover:text-slate-650 self-start transition-all"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Dock Bar (Visible only on mobile screen widths < md) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 z-40 px-3 py-1.5 flex items-center justify-around md:hidden shadow-lg shadow-slate-900/10">
        <button
          onClick={() => {
            setActiveView('orders');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeView === 'orders' || activeView === 'view-order' || activeView === 'edit-order'
              ? 'text-indigo-600 font-extrabold'
              : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {orders.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[9px] font-black font-mono px-1.5 py-0.2 rounded-full border border-white">
                {orders.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Պատվերներ</span>
        </button>

        {/* Highlighted Primary Create Button */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveView('create-order');
            setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center justify-center gap-0.5 -mt-5 py-2.5 px-4 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-300 active:scale-95 transition-all cursor-pointer ring-4 ring-white"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span className="text-[9.5px] font-black tracking-wider uppercase">Գրանցել</span>
        </button>

        <button
          onClick={() => {
            setActiveView('dashboard');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            activeView === 'dashboard' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Վիճակ</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            isMobileMenuOpen ? 'text-indigo-600 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Մենյու</span>
        </button>
      </nav>

      {/* Mobile Menu Drawer Modal Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop Mask */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Slide-Up Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-[32px] border-t border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-left flex flex-col"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-600 h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-xs shadow-indigo-200 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 tracking-tight text-base leading-none">tab.am POS</span>
                      <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md border border-emerald-200">Առցանց</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Արագ Մենյու և Կառավարում</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Fast Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value && activeView !== 'orders') {
                      setActiveView('orders');
                    }
                  }}
                  placeholder="Որոնել պատվեր, հեռախոս կամ ID..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Navigation Grid / List */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => {
                    posAudio.playScanBeep();
                    setActiveView('create-order');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-sm">➕ Գրանցել Նոր Պատվեր</div>
                      <div className="text-[10px] text-indigo-100 font-medium">Ստեղծել նոր պատվեր դրամարկղում</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-200" />
                </button>

                <button
                  onClick={() => {
                    setActiveView('orders');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold active:scale-98 cursor-pointer ${
                    activeView === 'orders' ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950' : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>📦 Պատվերների Ցանկ</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-mono font-black">
                    {orders.length} պատվեր
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold active:scale-98 cursor-pointer ${
                    activeView === 'dashboard' ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950' : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    <span>📊 Վիճակագրություն & Վաճառքներ</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveView('google-sheets');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold active:scale-98 cursor-pointer ${
                    activeView === 'google-sheets' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>🟢 Google Sheets Սինխրոնացում</span>
                  </div>
                  {googleUser && googleToken ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">Ակտիվ է</span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-lg">Անջատված</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    posAudio.playScanBeep();
                    setIsBarcodeScannerOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-800 transition-all active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ScanLine className="w-4 h-4 text-indigo-600" />
                    <span>⚡ Շտրիխ-Կոդի / SKU Սկաներ</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Կամերա</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    posAudio.playScanBeep();
                    setActiveView('reports');
                  }}
                  className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl text-xs font-bold text-emerald-950 transition-all active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>📄 PDF Հաշվետվությունների Էջ</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-lg">3 Ձևաչափ</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      toggleSoundMute();
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 active:scale-95 cursor-pointer"
                  >
                    {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                    <span>{isSoundMuted ? 'Ձայնը Անջատված' : 'Ձայնը Միացված'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNotificationsOpen(!isNotificationsOpen);
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 active:scale-95 cursor-pointer relative"
                  >
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Ծանուցումներ</span>
                    {unreadCount > 0 && (
                      <span className="ml-1 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleClearAllOrders();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl text-xs font-bold transition-all active:scale-98 cursor-pointer mt-2"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>🗑️ Մաքրել Բոլոր Պատվերները (0)</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold flex items-center justify-between">
                <span>tab.am Cloud POS System v2.5</span>
                <span className="font-mono text-slate-500">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY GOOGLE AUTH & SHEETS SETUP GATE */}
      {(!googleToken || !selectedSpreadsheetId) && !isLoading && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 sm:p-8 space-y-6 text-center relative"
          >
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 via-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Cloud className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black rounded-full uppercase tracking-wider">
                ⚠️ Պարտադիր Քայլ • Mandatory Setup
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                tab.am POS • Google Account & Sheets Միացում
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                Ծրագիրն աշխատում է Google Sheets-ի հետ իրական ժամանակում (Real-time)։ Սկսելու համար խնդրում ենք մուտք գործել Google հաշվով և ընտրել կամ ստեղծել Google Sheets աղյուսակ։
              </p>
            </div>

            {!googleUser || !googleToken ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleGoogleConnect}
                  disabled={spreadsheetLoading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {spreadsheetLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Globe className="w-5 h-5 text-indigo-200" />
                  )}
                  <span>🔑 Մուտք Գործել Google Հաշվով</span>
                </button>
                <p className="text-[10.5px] text-slate-400 font-medium">
                  Մուտք գործելուց հետո համակարգը ավտոմատ կպատրաստի ձեր Google Sheets աղյուսակը։
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-800">Մուտք է գործված՝</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 truncate max-w-[180px]">
                    {googleUser.email || googleUser.displayName || 'Google User'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Ընտրել կամ Ստեղծել Google Sheet Աղյուսակ
                  </label>

                  {spreadsheets.length > 0 && (
                    <select
                      value={selectedSpreadsheetId}
                      onChange={(e) => handleSelectSpreadsheet(e.target.value)}
                      disabled={spreadsheetLoading}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Ընտրել առկա աղյուսակը --</option>
                      {spreadsheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          📊 {s.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={handleCreateNewSpreadsheet}
                    disabled={spreadsheetLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {spreadsheetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>✨ Ստեղծել Նոր Google Sheet Աղյուսակ (tab.am POS)</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Toast alert system container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

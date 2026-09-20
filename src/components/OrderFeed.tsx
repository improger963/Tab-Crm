import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Truck, Store, Phone, Copy, Check, 
  Search, ArrowUpDown, ChevronRight, Inbox, Eye, FileText, Calendar,
  CheckCircle2, Clock, Download, LayoutGrid, List, Sparkles, AlertCircle, Trash2,
  Printer, X, Filter, Edit3
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, SaleType, PaymentMethod } from '../types';
import { posAudio } from '../lib/posAudio';
import { parseDateSafe, toLocalYMD as toYMD, getTodayLocalYMD } from '../lib/storage';
import { QuickReceiptModal } from './QuickReceiptModal';

interface OrderFeedProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  isLoading?: boolean;
  onResetFilters?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  onOpenReportsPage?: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onClearAllOrders?: () => void;
}

export default function OrderFeed({
  orders,
  selectedOrderId,
  onSelectOrder,
  onEditOrder,
  isLoading,
  onResetFilters,
  searchQuery: parentSearchQuery = '',
  setSearchQuery: parentSetSearchQuery,
  statusFilter: parentStatusFilter,
  setStatusFilter: parentSetStatusFilter,
  onOpenReportsPage,
  onUpdateStatus,
  onClearAllOrders
}: OrderFeedProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'id-asc' | 'id-desc'>('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Smart Filters State
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('Բոլորը');
  const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'delivery' | 'onsite' | 'pickup'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [internalSearch, setInternalSearch] = useState<string>('');
  
  // Quick receipt modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Sync status filter between parent and local state
  const effectiveStatusFilter = parentStatusFilter ?? localStatusFilter;
  const setEffectiveStatusFilter = (val: string) => {
    setLocalStatusFilter(val);
    if (parentSetStatusFilter) {
      parentSetStatusFilter(val);
    }
  };

  // Sync search query between parent and local state
  const effectiveSearchQuery = parentSearchQuery || internalSearch;
  const setEffectiveSearchQuery = (val: string) => {
    setInternalSearch(val);
    if (parentSetSearchQuery) {
      parentSetSearchQuery(val);
    }
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    posAudio.playScanBeep();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const isPhoneMatch = (phone: string, query: string) => {
    const cleanQ = query.replace(/\D/g, '');
    const cleanP = (phone || '').replace(/\D/g, '');
    return cleanQ.length > 0 && cleanP.includes(cleanQ);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    const trimmed = query.trim();
    if (!trimmed) return text;
    try {
      const escaped = trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-amber-300 text-slate-900 font-black px-0.5 rounded not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const getSaleTypeBadge = (saleType: SaleType) => {
    switch (saleType) {
      case SaleType.DELIVERY:
        return {
          icon: <Truck className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Առաքում',
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80'
        };
      case SaleType.PICKUP:
        return {
          icon: <Store className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Մոտեցնել խանութ',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80'
        };
      default:
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />,
          label: 'Վաճառք տեղում',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
        };
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          text: 'Սպասում է դրամարկղին',
          dot: 'bg-amber-500',
          className: 'bg-amber-50 text-amber-800 border-amber-200/80'
        };
      case OrderStatus.SOLD:
        return {
          text: 'Վաճառված (POS)',
          dot: 'bg-emerald-500',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
        };
      case OrderStatus.IN_TRANSIT:
        return {
          text: 'Առաքման մեջ',
          dot: 'bg-sky-500',
          className: 'bg-sky-50 text-sky-800 border-sky-200/80'
        };
      case OrderStatus.DELIVERED:
        return {
          text: 'Ավարտված / Հանձնված',
          dot: 'bg-indigo-500',
          className: 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
        };
      case OrderStatus.CANCELLED:
        return {
          text: 'Չեղարկված',
          dot: 'bg-rose-500',
          className: 'bg-rose-50 text-rose-800 border-rose-200/80'
        };
      default:
        return {
          text: status,
          dot: 'bg-slate-400',
          className: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case PaymentStatus.UNPAID:
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case PaymentStatus.PARTIAL:
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getAvatarGradient = (name: string) => {
    const code = (name || '').charCodeAt(0) % 5;
    switch (code) {
      case 0: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 1: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 2: return 'bg-sky-100 text-sky-700 border-sky-200';
      case 3: return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  // Calculations for quick KPI metric cards
  const statsOverview = useMemo(() => {
    const totalCount = orders.length;
    const totalSum = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const inTransitOrders = orders.filter(o => o.status === OrderStatus.IN_TRANSIT || o.status.includes('Առաքման'));
    const inTransitSum = inTransitOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status.includes('Սպասում'));
    const pendingSum = pendingOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const soldOrders = orders.filter(o => o.status === OrderStatus.SOLD || o.status.includes('Վաճառված'));
    const soldSum = soldOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED || o.status.includes('Ավարտված'));
    const deliveredSum = deliveredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    // Today count
    const todayYMD = toYMD(new Date());
    const todayCount = orders.filter(o => {
      const d = parseDateSafe(o.purchaseDate);
      return d && toYMD(d) === todayYMD;
    }).length;

    // Yesterday count
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestYMD = toYMD(yest);
    const yestCount = orders.filter(o => {
      const d = parseDateSafe(o.purchaseDate);
      return d && toYMD(d) === yestYMD;
    }).length;

    return {
      totalCount,
      totalSum,
      inTransitCount: inTransitOrders.length,
      inTransitSum,
      pendingCount: pendingOrders.length,
      pendingSum,
      soldCount: soldOrders.length,
      soldSum,
      deliveredCount: deliveredOrders.length,
      deliveredSum,
      todayCount,
      yestCount
    };
  }, [orders]);

  // Master Filter Pipeline
  const filteredOrders = useMemo(() => {
    const todayYMD = toYMD(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYMD = toYMD(yesterday);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const rawSearch = effectiveSearchQuery.trim();
    const searchLower = rawSearch.toLowerCase();
    const searchDigits = rawSearch.replace(/\D/g, '');

    return orders.filter(order => {
      // 1. Date filter
      const parsedDate = parseDateSafe(order.purchaseDate);
      if (dateFilter !== 'all') {
        if (!parsedDate) return false;
        const orderYMD = toYMD(parsedDate);

        if (dateFilter === 'today' && orderYMD !== todayYMD) return false;
        if (dateFilter === 'yesterday' && orderYMD !== yesterdayYMD) return false;
        if (dateFilter === 'week' && parsedDate.getTime() < weekAgo.getTime()) return false;
        if (dateFilter === 'month' && (parsedDate.getFullYear() !== currentYear || parsedDate.getMonth() !== currentMonth)) return false;
        if (dateFilter === 'custom' && customDate && orderYMD !== customDate) return false;
      }

      // 2. Status Filter
      if (effectiveStatusFilter && effectiveStatusFilter !== 'Բոլորը') {
        if (effectiveStatusFilter === 'Սպասում է դրամարկղին' || effectiveStatusFilter === 'Սպասում է կասային') {
          if (order.status !== OrderStatus.PENDING && !order.status.includes('Սպասում')) return false;
        } else if (effectiveStatusFilter === 'Վաճառված (POS)' || effectiveStatusFilter === 'Վաճառված (ArmSoft)') {
          if (order.status !== OrderStatus.SOLD && !order.status.includes('Վաճառված')) return false;
        } else if (effectiveStatusFilter === 'Առաքման մեջ' || effectiveStatusFilter === 'Ընթացքի մեջ') {
          if (order.status !== OrderStatus.IN_TRANSIT && !order.status.includes('Առաքման') && !order.status.includes('Ընթացք')) return false;
        } else if (effectiveStatusFilter === 'Ավարտված') {
          if (order.status !== OrderStatus.DELIVERED && !order.status.includes('Ավարտված') && !order.status.includes('Հանձնված')) return false;
        } else if (effectiveStatusFilter === 'Չեղարկված') {
          if (order.status !== OrderStatus.CANCELLED && !order.status.includes('Չեղարկ')) return false;
        } else if (order.status !== effectiveStatusFilter) {
          return false;
        }
      }

      // 3. Sale Type Filter
      if (saleTypeFilter !== 'all') {
        if (saleTypeFilter === 'delivery' && order.saleType !== SaleType.DELIVERY) return false;
        if (saleTypeFilter === 'onsite' && order.saleType !== SaleType.ON_SITE && order.saleType) return false;
        if (saleTypeFilter === 'pickup' && order.saleType !== SaleType.PICKUP) return false;
      }

      // 4. Payment Filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'paid' && order.paymentStatus !== PaymentStatus.PAID) return false;
        if (paymentFilter === 'unpaid' && order.paymentStatus !== PaymentStatus.UNPAID) return false;
        if (paymentFilter === 'partial' && order.paymentStatus !== PaymentStatus.PARTIAL) return false;
      }

      // 5. Search Query Filter
      if (rawSearch) {
        const orderPhoneDigits = (order.phoneNumber || '').replace(/\D/g, '');
        const itemCodesMatch = (order.items || []).some(item => 
          (item.code && item.code.toLowerCase().includes(searchLower)) ||
          (item.artikul && item.artikul.toLowerCase().includes(searchLower)) ||
          (item.name && item.name.toLowerCase().includes(searchLower))
        );

        const matches = 
          order.id.toLowerCase().includes(searchLower) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
          (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchLower)) ||
          (searchDigits.length > 0 && orderPhoneDigits.includes(searchDigits)) ||
          (order.address && order.address.toLowerCase().includes(searchLower)) ||
          itemCodesMatch;

        if (!matches) return false;
      }

      return true;
    });
  }, [orders, dateFilter, customDate, effectiveStatusFilter, saleTypeFilter, paymentFilter, effectiveSearchQuery]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (sortBy === 'amount-desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'amount-asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
      if (sortBy === 'date-asc') {
        const dA = parseDateSafe(a.purchaseDate);
        const dB = parseDateSafe(b.purchaseDate);
        const diff = (dA?.getTime() || 0) - (dB?.getTime() || 0);
        if (diff !== 0) return diff;
        const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      if (sortBy === 'date-desc') {
        const dA = parseDateSafe(a.purchaseDate);
        const dB = parseDateSafe(b.purchaseDate);
        const diff = (dB?.getTime() || 0) - (dA?.getTime() || 0);
        if (diff !== 0) return diff;
        const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      }
      if (sortBy === 'id-asc') {
        const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      if (sortBy === 'id-desc') {
        const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      }
      return 0;
    });
  }, [filteredOrders, sortBy]);

  const totalSum = sortedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const hasActiveFilters = 
    dateFilter !== 'all' || 
    customDate !== '' ||
    effectiveStatusFilter !== 'Բոլորը' || 
    saleTypeFilter !== 'all' || 
    paymentFilter !== 'all' || 
    effectiveSearchQuery.trim() !== '';

  const handleResetAllFilters = () => {
    posAudio.playScanBeep();
    setDateFilter('all');
    setCustomDate('');
    setEffectiveStatusFilter('Բոլորը');
    setSaleTypeFilter('all');
    setPaymentFilter('all');
    setEffectiveSearchQuery('');
    if (onResetFilters) {
      onResetFilters();
    }
  };

  // Export orders to CSV for POS / Excel
  const handleExportCSV = () => {
    posAudio.playScanBeep();
    const headers = ['ID', 'Customer', 'Phone', 'SaleType', 'Status', 'PaymentStatus', 'PaymentMethod', 'Amount', 'Date', 'SKUs'];
    const rows = sortedOrders.map(o => [
      o.id,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.phoneNumber || ''}"`,
      `"${o.saleType || ''}"`,
      `"${o.status}"`,
      `"${o.paymentStatus}"`,
      `"${o.paymentMethod || ''}"`,
      o.totalAmount || 0,
      o.purchaseDate,
      `"${(o.items || []).map(i => i.code || i.artikul).filter(Boolean).join('; ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pos_orders_${getTodayLocalYMD()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick filter by SKU
  const handleQuickSkuFilter = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    posAudio.playScanBeep();
    if (effectiveSearchQuery === sku) {
      setEffectiveSearchQuery('');
      return;
    }
    setEffectiveSearchQuery(sku);
  };

  // 1-Click quick advance status for cashiers
  const handleQuickAdvanceStatus = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    if (!onUpdateStatus) return;

    posAudio.playSuccessChime();
    if (order.status === OrderStatus.PENDING) {
      onUpdateStatus(order.id, OrderStatus.SOLD);
    } else if (order.status === OrderStatus.SOLD) {
      if (order.saleType === SaleType.DELIVERY) {
        onUpdateStatus(order.id, OrderStatus.IN_TRANSIT);
      } else {
        onUpdateStatus(order.id, OrderStatus.DELIVERED);
      }
    } else if (order.status === OrderStatus.IN_TRANSIT) {
      onUpdateStatus(order.id, OrderStatus.DELIVERED);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top 5 Smart KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* All Orders */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setEffectiveStatusFilter('Բոլորը');
            setDateFilter('all');
            setCustomDate('');
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'text-indigo-100' : 'text-slate-500'
            }`}>
              Ընդհանուր
            </span>
            <span className={`h-2 w-2 rounded-full ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'bg-white' : 'bg-indigo-500'
            }`} />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono">
              {statsOverview.totalCount}
            </span>
            <span className={`text-xs font-bold font-mono truncate ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'text-indigo-100' : 'text-slate-600'
            }`}>
              {statsOverview.totalSum.toLocaleString()} ֏
            </span>
          </div>
        </button>

        {/* In Transit */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setEffectiveStatusFilter(OrderStatus.IN_TRANSIT);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            effectiveStatusFilter === OrderStatus.IN_TRANSIT || effectiveStatusFilter === 'Առաքման մեջ'
              ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-300'
              : 'bg-white hover:bg-sky-50/50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.IN_TRANSIT || effectiveStatusFilter === 'Առաքման մեջ' ? 'text-sky-100' : 'text-sky-700'
            }`}>
              <Truck className="w-3 h-3" />
              <span>Առաքման մեջ</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-sky-900">
              {statsOverview.inTransitCount}
            </span>
            <span className="text-xs font-bold font-mono text-sky-700 truncate">
              {statsOverview.inTransitSum.toLocaleString()} ֏
            </span>
          </div>
        </button>

        {/* Pending Cashier / POS */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setEffectiveStatusFilter(OrderStatus.PENDING);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            effectiveStatusFilter === OrderStatus.PENDING || effectiveStatusFilter.includes('Սպասում')
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
              : 'bg-white hover:bg-amber-50/50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.PENDING || effectiveStatusFilter.includes('Սպասում') ? 'text-amber-100' : 'text-amber-700'
            }`}>
              <Clock className="w-3 h-3" />
              <span>Սպասում է</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-900">
              {statsOverview.pendingCount}
            </span>
            <span className="text-xs font-bold font-mono text-amber-700 truncate">
              {statsOverview.pendingSum.toLocaleString()} ֏
            </span>
          </div>
        </button>

        {/* Sold / POS */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setEffectiveStatusFilter(OrderStatus.SOLD);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            effectiveStatusFilter === OrderStatus.SOLD || effectiveStatusFilter.includes('Վաճառված')
              ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
              : 'bg-white hover:bg-blue-50/50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.SOLD || effectiveStatusFilter.includes('Վաճառված') ? 'text-blue-100' : 'text-blue-700'
            }`}>
              <ShoppingBag className="w-3 h-3" />
              <span>Վաճառված</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-blue-900">
              {statsOverview.soldCount}
            </span>
            <span className="text-xs font-bold font-mono text-blue-700 truncate">
              {statsOverview.soldSum.toLocaleString()} ֏
            </span>
          </div>
        </button>

        {/* Delivered / Completed */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setEffectiveStatusFilter(OrderStatus.DELIVERED);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            effectiveStatusFilter === OrderStatus.DELIVERED || effectiveStatusFilter.includes('Ավարտված')
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
              : 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.DELIVERED || effectiveStatusFilter.includes('Ավարտված') ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Ավարտված</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-900">
              {statsOverview.deliveredCount}
            </span>
            <span className="text-xs font-bold font-mono text-emerald-700 truncate">
              {statsOverview.deliveredSum.toLocaleString()} ֏
            </span>
          </div>
        </button>
      </div>

      {/* Smart Filters and Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Row 1: Date Pills & Calendar Picker */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Բոլոր օրերը' },
              { id: 'today', label: `Այսօր (${statsOverview.todayCount})` },
              { id: 'yesterday', label: `Երեկ (${statsOverview.yestCount})` },
              { id: 'week', label: '7 օր' },
              { id: 'month', label: 'Այս ամիս' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  posAudio.playScanBeep();
                  setDateFilter(tab.id as any);
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
                  dateFilter === tab.id 
                    ? 'bg-white text-indigo-900 shadow-2xs font-black' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Calendar Custom Date Picker */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  posAudio.playScanBeep();
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }}
                className={`text-xs font-bold text-slate-700 bg-slate-50 border rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                  dateFilter === 'custom' && customDate 
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 font-black' 
                    : 'border-slate-200'
                }`}
                title="Ընտրել կոնկրետ օր"
              />
              {dateFilter === 'custom' && customDate && (
                <button
                  onClick={() => {
                    posAudio.playScanBeep();
                    setCustomDate('');
                    setDateFilter('all');
                  }}
                  className="ml-1 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Մաքրել օրացույցը"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Status, Sale Type, Payment Dropdowns + Live Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
          {/* Status Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Կարգավիճակ՝</span>
            <select
              value={effectiveStatusFilter}
              onChange={(e) => {
                posAudio.playScanBeep();
                setEffectiveStatusFilter(e.target.value);
              }}
              className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="Բոլորը">Բոլոր կարգավիճակները</option>
              <option value={OrderStatus.PENDING}>Սպասում է դրամարկղին</option>
              <option value={OrderStatus.SOLD}>Վաճառված (POS)</option>
              <option value={OrderStatus.IN_TRANSIT}>Առաքման մեջ</option>
              <option value={OrderStatus.DELIVERED}>Ավարտված / Հանձնված</option>
              <option value={OrderStatus.CANCELLED}>Չեղարկված</option>
            </select>
          </div>

          {/* Sale Type Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Տեսակ՝</span>
            <select
              value={saleTypeFilter}
              onChange={(e) => {
                posAudio.playScanBeep();
                setSaleTypeFilter(e.target.value as any);
              }}
              className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Բոլոր տեսակները</option>
              <option value="delivery">🚚 Առաքում (Delivery)</option>
              <option value="onsite">🛍️ Խանութում (On-site)</option>
              <option value="pickup">🏬 Մոտեցնել խանութ (Pickup)</option>
            </select>
          </div>

          {/* Payment Status Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Վճարում՝</span>
            <select
              value={paymentFilter}
              onChange={(e) => {
                posAudio.playScanBeep();
                setPaymentFilter(e.target.value as any);
              }}
              className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Բոլոր վճարումները</option>
              <option value="paid">✅ Վճարված</option>
              <option value="unpaid">❌ Չվճարված</option>
              <option value="partial">⏳ Մասնակի</option>
            </select>
          </div>

          {/* Search Input with Instant Clear */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
            <input
              type="text"
              value={effectiveSearchQuery}
              onChange={(e) => setEffectiveSearchQuery(e.target.value)}
              placeholder="Փնտրել ID, հեռախոս, անուն, հասցե, SKU..."
              className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
            />
            {effectiveSearchQuery && (
              <button
                onClick={() => {
                  posAudio.playScanBeep();
                  setEffectiveSearchQuery('');
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Մաքրել որոնումը"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Bar & Reset All Action */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold text-slate-500">Ակտիվ զտիչներ՝</span>
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span>📅 {dateFilter === 'custom' ? customDate : dateFilter}</span>
                  <button onClick={() => { setDateFilter('all'); setCustomDate(''); }} className="hover:text-indigo-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {effectiveStatusFilter !== 'Բոլորը' && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span>🏷️ {effectiveStatusFilter}</span>
                  <button onClick={() => setEffectiveStatusFilter('Բոլորը')} className="hover:text-amber-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {saleTypeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span>📦 {saleTypeFilter === 'delivery' ? 'Առաքում' : saleTypeFilter === 'onsite' ? 'Խանութում' : 'Մոտեցնել'}</span>
                  <button onClick={() => setSaleTypeFilter('all')} className="hover:text-sky-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {paymentFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span>💳 {paymentFilter === 'paid' ? 'Վճարված' : paymentFilter === 'unpaid' ? 'Չվճարված' : 'Մասնակի'}</span>
                  <button onClick={() => setPaymentFilter('all')} className="hover:text-emerald-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {effectiveSearchQuery && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                  <span>🔍 "{effectiveSearchQuery}"</span>
                  <button onClick={() => setEffectiveSearchQuery('')} className="hover:text-purple-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetAllFilters}
              className="text-xs font-black text-rose-600 hover:text-rose-700 underline cursor-pointer"
            >
              Մաքրել բոլոր զտիչները
            </button>
          </div>
        )}
      </div>

      {/* Sub-bar: Results count, View Mode, Sort & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white px-3.5 sm:px-5 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Left: Filtered count & Total Sum */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-extrabold text-slate-700">Արդյունքներ՝</span>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-black px-2 py-0.5 rounded-lg font-mono text-xs">
              {sortedOrders.length}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Գումար՝</span>
            <span className="font-black text-slate-900 font-mono bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
              {totalSum.toLocaleString()} ֏
            </span>
          </div>
        </div>

        {/* Right: View Toggle, Sort & CSV Export */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Table / Grid Toggle */}
          <div className="flex items-center bg-slate-100/80 p-0.5 sm:p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => {
                posAudio.playScanBeep();
                setViewMode('table');
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Աղյուսակային տեսք"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                posAudio.playScanBeep();
                setViewMode('grid');
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Քարտային տեսք"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => {
                posAudio.playScanBeep();
                setSortBy(e.target.value as any);
              }}
              className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="date-desc">Նորերը սկզբում (Ամսաթիվ)</option>
              <option value="date-asc">Հները սկզբում (Ամսաթիվ)</option>
              <option value="id-asc">ID Ըստ աճման (1000 →)</option>
              <option value="id-desc">ID Ըստ նվազման (→ 1000)</option>
              <option value="amount-desc">Գումարով (Նվազման)</option>
              <option value="amount-asc">Գումարով (Աճման)</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Արտահանել POS/Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">CSV Էքսպորտ</span>
          </button>

          {onClearAllOrders && (
            <button
              onClick={onClearAllOrders}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Մաքրել բոլոր պատվերները (Սկսել 0-ից)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">Մաքրել բոլորը (0)</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 shadow-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100/70 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {sortedOrders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center max-w-lg mx-auto w-full my-8"
              >
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Պատվերներ չեն գտնվել
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-5 leading-relaxed">
                  Նշված որոնմամբ կամ ակտիվ զտիչով համապատասխան պատվերներ չկան:
                </p>
                {onResetFilters && (
                  <button
                    onClick={onResetFilters}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Մաքրել Զտիչները և Որոնումը
                  </button>
                )}
              </motion.div>
            ) : viewMode === 'table' ? (
              <div className="flex flex-col space-y-3">
                {/* Desktop View Table Card */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200/80">
                          <th className="pl-6 pr-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal">
                            ID / Տեսակ / Ամսաթիվ
                          </th>
                          <th className="px-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal">
                            Հաճախորդ
                          </th>
                          <th className="px-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal">
                            POS SKU / Ապրանքներ
                          </th>
                          <th className="px-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal text-right sm:text-left">
                            Գումար
                          </th>
                          <th className="px-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal">
                            Վճարում
                          </th>
                          <th className="px-4 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal">
                            Կարգավիճակ
                          </th>
                          <th className="pl-4 pr-6 py-3.5 text-xs font-extrabold text-slate-500 border-b border-slate-200/80 tracking-normal text-right">
                            Գործողություն
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedOrders.map((order) => {
                          const isSel = selectedOrderId === order.id;
                          const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);
                          const totalItemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
                          const saleTypeInfo = getSaleTypeBadge(order.saleType || SaleType.ON_SITE);
                          const statusInfo = getStatusBadge(order.status);
                          
                          // Format creation date
                          const rawDate = order.purchaseDate;
                          const parsedDateObj = parseDateSafe(rawDate);
                          const formattedDateTime = parsedDateObj ? parsedDateObj.toLocaleString('hy-AM', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : (rawDate || '---');

                          return (
                            <tr
                              key={order.id}
                              onClick={() => onSelectOrder(order)}
                              className={`group cursor-pointer transition-all duration-150 ${
                                isSel ? 'bg-indigo-50/80' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Order ID, Sale Type & Date */}
                              <td className="pl-6 pr-4 py-4 align-top">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                                      {order.id}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${saleTypeInfo.badgeClass}`}>
                                      {saleTypeInfo.icon}
                                      <span>{saleTypeInfo.label}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{formattedDateTime}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Customer info */}
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-start gap-2.5">
                                  <div className={`h-8 w-8 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${getAvatarGradient(order.customerName || '')}`}>
                                    {(order.customerName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 max-w-[200px]">
                                    <span className="font-extrabold text-xs text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                                      {order.customerName}
                                    </span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className={`text-[11px] font-mono font-medium ${
                                        isPhoneMatch(order.phoneNumber || '', effectiveSearchQuery)
                                          ? 'bg-amber-100 text-amber-900 font-black px-1 rounded'
                                          : 'text-slate-500'
                                      }`}>
                                        {order.phoneNumber || '---'}
                                      </span>
                                    </div>
                                    {order.saleType === SaleType.DELIVERY && order.address && (
                                      <p className="text-[10.5px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                        <span>📍</span>
                                        <span>{highlightMatch(order.address, effectiveSearchQuery)}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* ArmSoft SKU Codes & Items preview */}
                               <td className="px-4 py-4 align-top">
                                <div className="max-w-xs space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(order.items || []).slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-1">
                                        {item.code && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopy(item.code, e)}
                                            title="Կոդ (POS)"
                                            className="font-mono text-[11px] font-black text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200/80 inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                          >
                                            <span>{item.code}</span>
                                            {copiedText === item.code ? (
                                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-2.5 h-2.5 text-indigo-400 opacity-60" />
                                            )}
                                          </button>
                                        )}
                                        {item.artikul && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopy(item.artikul!, e)}
                                            title="Արտիկուլ (Գործարանային)"
                                            className="font-mono text-[10.5px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200/80 inline-flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                          >
                                            <span>{item.artikul}</span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {(order.items || []).length > 3 && (
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        +{(order.items || []).length - 3}
                                      </span>
                                    )}
                                    <span className="text-[10.5px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                      {totalItemCount} հատ
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Amount with proper currency format */}
                              <td className="px-4 py-4 align-top">
                                <div className="font-mono">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-black text-slate-900 tracking-tight">
                                      {(order.totalAmount || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-extrabold text-slate-600">֏</span>
                                  </div>
                                  {order.discountAmount && order.discountAmount > 0 ? (
                                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                                      <span>Զեղչ՝ -{order.discountAmount.toLocaleString()} ֏</span>
                                    </div>
                                  ) : null}
                                </div>
                              </td>

                              {/* Payment status */}
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${getPaymentBadge(order.paymentStatus || PaymentStatus.UNPAID)}`}>
                                    {order.paymentStatus === PaymentStatus.PAID && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    <span>{order.paymentStatus || PaymentStatus.UNPAID}</span>
                                  </span>
                                  {order.paymentMethod && (
                                    <span className="block text-[10.5px] text-slate-400 font-medium">
                                      {order.paymentMethod}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Order Status with 1-click Advance */}
                              <td className="px-4 py-4 align-top">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${statusInfo.className}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                      <span>{statusInfo.text}</span>
                                    </span>
                                  </div>

                                  {onUpdateStatus && order.status === OrderStatus.PENDING && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickAdvanceStatus(e, order)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                      title="Արագ հաստատել POS վաճառքը"
                                    >
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      <span>Հաստատել POS</span>
                                    </button>
                                  )}
                                  {onUpdateStatus && order.status === OrderStatus.SOLD && order.saleType === SaleType.DELIVERY && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickAdvanceStatus(e, order)}
                                      className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                      title="Փոխանցել առաքիչին"
                                    >
                                      <Truck className="w-2.5 h-2.5" />
                                      <span>Տալ առաքիչին</span>
                                    </button>
                                  )}
                                  {onUpdateStatus && order.status === OrderStatus.IN_TRANSIT && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickAdvanceStatus(e, order)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                      title="Նշել որպես առաքված"
                                    >
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      <span>Հանձնված է</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="pl-4 pr-6 py-4 align-top text-right">
                                <div className="inline-flex items-center gap-1">
                                  {/* Quick Receipt Print */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      posAudio.playScanBeep();
                                      setReceiptOrder(order);
                                    }}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                                    title="Տպել / Դիտել Արագ Կտրոն"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                  </button>

                                  {/* Edit Order */}
                                  {onEditOrder && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        posAudio.playScanBeep();
                                        onEditOrder(order);
                                      }}
                                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200/80 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                                      title="Խմբագրել պատվերը"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                    </button>
                                  )}

                                  {onOpenReportsPage && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenReportsPage();
                                      }}
                                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200/80 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                                      title="Բացել PDF Հաշվետվությունների Էջը"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                    </button>
                                  )}
                                  <div className="h-8 w-8 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer Summary Bar */}
                  <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Ցուցադրված է՝ <strong className="text-slate-900 font-black">{sortedOrders.length}</strong> պատվեր</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Ընդհանուր՝ <strong className="text-slate-900 font-mono font-black text-sm">{totalSum.toLocaleString()} ֏</strong></span>
                    </div>
                  </div>
                </div>

                {/* Mobile View Cards (Hidden on MD+) */}
                <div className="block md:hidden space-y-3 overflow-y-auto no-scrollbar pb-10">
                  {sortedOrders.map((order) => {
                    const isSel = selectedOrderId === order.id;
                    const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);
                    const saleTypeInfo = getSaleTypeBadge(order.saleType || SaleType.ON_SITE);
                    const statusInfo = getStatusBadge(order.status);

                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                          isSel
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
                            : 'bg-white border-slate-200/90 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                              {order.id}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${saleTypeInfo.badgeClass}`}>
                              {saleTypeInfo.icon}
                              <span>{saleTypeInfo.label}</span>
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.text}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-sm text-slate-900">{order.customerName}</h4>
                            <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{order.phoneNumber || '---'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900 font-mono">
                              {(order.totalAmount || 0).toLocaleString()} AMD
                            </p>
                            <span className={`inline-block mt-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${getPaymentBadge(order.paymentStatus || PaymentStatus.UNPAID)}`}>
                              {order.paymentStatus || PaymentStatus.UNPAID}
                            </span>
                          </div>
                        </div>

                        {skuCodes.length > 0 && (
                          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                            <span className="text-[10.5px] font-bold text-slate-500">POS Կոդեր՝</span>
                            <span className="font-mono font-black text-indigo-700 truncate max-w-[200px]">
                              {skuCodes.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Grid / Touch Screen Card View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto no-scrollbar pb-10">
                {sortedOrders.map((order) => {
                  const isSel = selectedOrderId === order.id;
                  const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);
                  const saleTypeInfo = getSaleTypeBadge(order.saleType || SaleType.ON_SITE);
                  const statusInfo = getStatusBadge(order.status);

                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        isSel
                          ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200 shadow-md'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-100 px-2.5 py-0.5 rounded-lg text-slate-900 border border-slate-200">
                              {order.id}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${saleTypeInfo.badgeClass}`}>
                              {saleTypeInfo.icon}
                              <span>{saleTypeInfo.label}</span>
                            </span>
                          </div>

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusInfo.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.text}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-base text-slate-900 truncate">{order.customerName}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.phoneNumber || '---'}</span>
                          </p>
                        </div>

                        {skuCodes.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 mb-1">
                              <span>POS SKU</span>
                              <span>{order.items.length} ապրանք</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {skuCodes.slice(0, 4).map((c, i) => (
                                <span key={i} className="font-mono text-[10px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                                  {c}
                                </span>
                              ))}
                              {skuCodes.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-bold">+{skuCodes.length - 4}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Ընդհանուր</span>
                          <span className="text-base font-black text-slate-900 font-mono">
                            {(order.totalAmount || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">AMD</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Advance Status in Grid */}
                          {onUpdateStatus && order.status === OrderStatus.PENDING && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvanceStatus(e, order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10.5px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              title="Արագ հաստատել POS վաճառքը"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Հաստատել POS</span>
                            </button>
                          )}
                          {onUpdateStatus && order.status === OrderStatus.SOLD && order.saleType === SaleType.DELIVERY && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvanceStatus(e, order)}
                              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10.5px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              title="Փոխանցել առաքիչին"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Առաքիչին</span>
                            </button>
                          )}
                          {onUpdateStatus && order.status === OrderStatus.IN_TRANSIT && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvanceStatus(e, order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10.5px] font-black shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                              title="Նշել որպես առաքված"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Հանձնված է</span>
                            </button>
                          )}

                          {/* Quick Receipt Print */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              posAudio.playScanBeep();
                              setReceiptOrder(order);
                            }}
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 cursor-pointer shadow-2xs active:scale-95"
                            title="Տպել / Դիտել Արագ Կտրոն"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </button>

                          {/* Edit Order */}
                          {onEditOrder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                posAudio.playScanBeep();
                                onEditOrder(order);
                              }}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-200 cursor-pointer shadow-2xs active:scale-95"
                              title="Խմբագրել պատվերը"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}

                          {onOpenReportsPage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReportsPage();
                              }}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200 cursor-pointer"
                              title="Բացել PDF Հաշվետվությունների Էջը"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Instant POS Thermal Receipt Modal */}
      <QuickReceiptModal
        order={receiptOrder}
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
}

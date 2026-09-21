import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SelectField from './SelectField';
import { MICRO_ENTER } from '../lib/motionPresets';
import { 
  ShoppingBag, Truck, Store, Phone, Copy, Check, 
  Search, ArrowUpDown, ChevronRight, Inbox, Eye, FileText, Calendar,
  CheckCircle2, Clock, Download, LayoutGrid, List, Sparkles, AlertCircle, Trash2,
  Printer, X, Filter, Edit3, MapPin
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
          icon: <Truck className="w-3.5 h-3.5 text-sky-700" />,
          label: 'Առաքում',
          badgeClass: 'badge-info'
        };
      case SaleType.PICKUP:
        return {
          icon: <Store className="w-3.5 h-3.5 text-amber-700" />,
          label: 'Մոտեցնել խանութ',
          badgeClass: 'badge-warning'
        };
      default:
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-primary-ink" />,
          label: 'Վաճառք տեղում',
          badgeClass: 'badge-primary'
        };
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          text: 'Սպասում է դրամարկղին',
          dot: 'bg-warning',
          className: 'badge-warning'
        };
      case OrderStatus.SOLD:
        return {
          text: 'Վաճառված (POS)',
          dot: 'bg-success',
          className: 'badge-success'
        };
      case OrderStatus.IN_TRANSIT:
        return {
          text: 'Առաքման մեջ',
          dot: 'bg-sky-500',
          className: 'badge-info'
        };
      case OrderStatus.DELIVERED:
        return {
          text: 'Ավարտված / Հանձնված',
          dot: 'bg-indigo-500',
          className: 'badge-primary'
        };
      case OrderStatus.CANCELLED:
        return {
          text: 'Չեղարկված',
          dot: 'bg-danger',
          className: 'badge-danger'
        };
      default:
        return {
          text: status,
          dot: 'bg-slate-400',
          className: 'badge-neutral'
        };
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'badge-success';
      case PaymentStatus.UNPAID:
        return 'badge-danger';
      case PaymentStatus.PARTIAL:
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  const getAvatarGradient = (name: string) => {
    const code = (name || '').charCodeAt(0) % 5;
    switch (code) {
      case 0: return 'bg-indigo-100 text-primary-ink border-indigo-200';
      case 1: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 2: return 'bg-sky-100 text-sky-700 border-sky-200';
      case 3: return 'bg-violet-100 text-violet-700 border-violet-200';
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

        const addPhonesMatch = (order.additionalPhoneNumbers || []).some(addPhone => {
          const addDigits = addPhone.replace(/\D/g, '');
          return addPhone.toLowerCase().includes(searchLower) || (searchDigits.length > 0 && addDigits.includes(searchDigits));
        });

        const matches = 
          order.id.toLowerCase().includes(searchLower) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
          (order.phoneNumber && order.phoneNumber.toLowerCase().includes(searchLower)) ||
          (searchDigits.length > 0 && orderPhoneDigits.includes(searchDigits)) ||
          addPhonesMatch ||
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
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer ${
            effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all'
              ? 'bg-primary text-white border-transparent shadow-fill-strong'
              : 'bg-surface hover:bg-slate-50/80 text-slate-800 border-slate-200/80 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xs font-semibold uppercase tracking-wide ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'text-white/80' : 'text-slate-500'
            }`}>
              Ընդհանուր
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'bg-surface' : 'bg-indigo-500'
            }`} />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums">
              {statsOverview.totalCount}
            </span>
            <span className={`text-2xs font-medium font-mono tabular-nums truncate ${
              effectiveStatusFilter === 'Բոլորը' && dateFilter === 'all' ? 'text-white/80' : 'text-slate-600'
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
          className={`kpi-card hover:-translate-y-px active:scale-[0.99] ${
            effectiveStatusFilter === OrderStatus.IN_TRANSIT || effectiveStatusFilter === 'Առաքման մեջ'
              ? 'bg-info text-white border-transparent shadow-fill-strong'
              : 'bg-surface hover:bg-sky-50/40 text-slate-800 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xs font-semibold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.IN_TRANSIT || effectiveStatusFilter === 'Առաքման մեջ' ? 'text-white/85' : 'text-sky-700'
            }`}>
              <Truck className="w-3 h-3" />
              <span>Առաքման մեջ</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-sky-900">
              {statsOverview.inTransitCount}
            </span>
            <span className="text-2xs font-medium font-mono tabular-nums text-sky-700 truncate">
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
          className={`kpi-card hover:-translate-y-px active:scale-[0.99] ${
            effectiveStatusFilter === OrderStatus.PENDING || effectiveStatusFilter.includes('Սպասում')
              ? 'bg-warning text-white border-transparent shadow-fill-strong'
              : 'bg-surface hover:bg-amber-50/40 text-slate-800 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xs font-semibold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.PENDING || effectiveStatusFilter.includes('Սպասում') ? 'text-white/85' : 'text-amber-700'
            }`}>
              <Clock className="w-3 h-3" />
              <span>Սպասում է</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-900">
              {statsOverview.pendingCount}
            </span>
            <span className="text-2xs font-medium font-mono tabular-nums text-amber-700 truncate">
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
          className={`kpi-card hover:-translate-y-px active:scale-[0.99] ${
            effectiveStatusFilter === OrderStatus.SOLD || effectiveStatusFilter.includes('Վաճառված')
              ? 'bg-info text-white border-transparent shadow-fill-strong'
              : 'bg-surface hover:bg-sky-50/40 text-slate-800 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xs font-semibold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.SOLD || effectiveStatusFilter.includes('Վաճառված') ? 'text-white/85' : 'text-sky-700'
            }`}>
              <ShoppingBag className="w-3 h-3" />
              <span>Վաճառված</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-sky-900">
              {statsOverview.soldCount}
            </span>
            <span className="text-2xs font-medium font-mono tabular-nums text-sky-700 truncate">
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
          className={`kpi-card col-span-2 sm:col-span-1 hover:-translate-y-px active:scale-[0.99] ${
            effectiveStatusFilter === OrderStatus.DELIVERED || effectiveStatusFilter.includes('Ավարտված')
              ? 'bg-success text-white border-transparent shadow-fill-strong'
              : 'bg-surface hover:bg-emerald-50/40 text-slate-800 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-2xs font-semibold uppercase tracking-wide flex items-center gap-1 ${
              effectiveStatusFilter === OrderStatus.DELIVERED || effectiveStatusFilter.includes('Ավարտված') ? 'text-white/85' : 'text-emerald-700'
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Ավարտված</span>
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-900">
              {statsOverview.deliveredCount}
            </span>
            <span className="text-2xs font-medium font-mono tabular-nums text-emerald-700 truncate">
              {statsOverview.deliveredSum.toLocaleString()} ֏
            </span>
          </div>
        </button>
      </div>

      {/* Smart Filters and Search Toolbar */}
      <div className="bg-surface/95 backdrop-blur-xs p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-card space-y-3">
        {/* Row 1: Date Pills & Calendar Picker */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Date Pills */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/70 text-xs overflow-x-auto no-scrollbar">
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
                className={`px-2.5 py-1 rounded-md font-medium transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap text-xs ${
                  dateFilter === tab.id 
                    ? 'bg-surface text-slate-900 font-semibold shadow-edge' 
                    : 'text-slate-500 hover:text-slate-800'
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
                aria-label="Ընտրել կոնկրետ օր"
                onChange={(e) => {
                  posAudio.playScanBeep();
                  setCustomDate(e.target.value);
                  setDateFilter('custom');
                }}
                className={`text-xs font-medium text-slate-700 bg-surface border rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition-all ${
                  dateFilter === 'custom' && customDate 
                    ? 'border-indigo-400 bg-indigo-50/50 text-indigo-950 font-semibold' 
                    : 'border-slate-200 hover:border-slate-300'
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
                  className="ml-1 p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
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
          <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/90 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Կարգավիճակ՝</span>
            <SelectField
              aria-label="Կարգավիճակ"
              value={effectiveStatusFilter}
              onChange={(v) => {
                posAudio.playScanBeep();
                setEffectiveStatusFilter(v);
              }}
              size="bare"
              className="max-w-full"
            >
              <option value="Բոլորը">Բոլոր կարգավիճակները</option>
              <option value={OrderStatus.PENDING}>Սպասում է դրամարկղին</option>
              <option value={OrderStatus.SOLD}>Վաճառված (POS)</option>
              <option value={OrderStatus.IN_TRANSIT}>Առաքման մեջ</option>
              <option value={OrderStatus.DELIVERED}>Ավարտված / Հանձնված</option>
              <option value={OrderStatus.CANCELLED}>Չեղարկված</option>
            </SelectField>
          </div>

          {/* Sale Type Select */}
          <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/90 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Տեսակ՝</span>
            <SelectField
              aria-label="Տեսակ"
              value={saleTypeFilter}
              onChange={(v) => {
                posAudio.playScanBeep();
                setSaleTypeFilter(v as any);
              }}
              size="bare"
              className="max-w-full"
            >
              <option value="all">Բոլոր տեսակները</option>
              <option value="delivery">Առաքում (Delivery)</option>
              <option value="onsite">Խանութում (On-site)</option>
              <option value="pickup">Մոտեցնել խանութ (Pickup)</option>
            </SelectField>
          </div>

          {/* Payment Status Select */}
          <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/90 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Վճարում՝</span>
            <SelectField
              aria-label="Վճարում"
              value={paymentFilter}
              onChange={(v) => {
                posAudio.playScanBeep();
                setPaymentFilter(v as any);
              }}
              size="bare"
              className="max-w-full"
            >
              <option value="all">Բոլոր վճարումները</option>
              <option value="paid">Վճարված</option>
              <option value="unpaid">Չվճարված</option>
              <option value="partial">Մասնակի</option>
            </SelectField>
          </div>

          {/* Search Input with Instant Clear */}
          <div className="relative flex items-center bg-slate-50/80 border border-slate-200/90 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-400 focus-within:bg-surface transition-all">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
            <input
              aria-label="Փնտրել ID, հեռախոս, անուն, հասցե, SKU"
              type="text"
              value={effectiveSearchQuery}
              onChange={(e) => setEffectiveSearchQuery(e.target.value)}
              placeholder="Փնտրել ID, հեռախոս, անուն, հասցե, SKU..."
              className="w-full text-xs font-semibold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
            />
            {effectiveSearchQuery && (
              <button
                onClick={() => {
                  posAudio.playScanBeep();
                  setEffectiveSearchQuery('');
                }}
                className="p-0.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
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
              <span className="text-xs font-medium text-slate-400">Ակտիվ զտիչներ՝</span>
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-primary-ink border border-indigo-200/80 px-2 py-0.5 rounded-md font-medium text-xs">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" /> {dateFilter === 'custom' ? customDate : dateFilter}</span>
                  <button onClick={() => { setDateFilter('all'); setCustomDate(''); }} className="hover:text-indigo-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {effectiveStatusFilter !== 'Բոլորը' && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium text-xs">
                  <span>{effectiveStatusFilter}</span>
                  <button onClick={() => setEffectiveStatusFilter('Բոլորը')} className="hover:text-amber-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {saleTypeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200/80 px-2 py-0.5 rounded-md font-medium text-xs">
                  <span>{saleTypeFilter === 'delivery' ? 'Առաքում' : saleTypeFilter === 'onsite' ? 'Խանութում' : 'Մոտեցնել'}</span>
                  <button onClick={() => setSaleTypeFilter('all')} className="hover:text-sky-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {paymentFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md font-medium text-xs">
                  <span>{paymentFilter === 'paid' ? 'Վճարված' : paymentFilter === 'unpaid' ? 'Չվճարված' : 'Մասնակի'}</span>
                  <button onClick={() => setPaymentFilter('all')} className="hover:text-emerald-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {effectiveSearchQuery && (
                <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-800 border border-violet-200/80 px-2 py-0.5 rounded-md font-medium text-xs">
                  <span className="inline-flex items-center gap-1"><Search className="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" /> "{effectiveSearchQuery}"</span>
                  <button onClick={() => setEffectiveSearchQuery('')} className="hover:text-violet-900 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleResetAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2 cursor-pointer"
            >
              Մաքրել բոլոր զտիչները
            </button>
          </div>
        )}
      </div>

      {/* Sub-bar: Results count, View Mode, Sort & Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-surface/95 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
        
        {/* Left: Filtered count & Total Sum */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-slate-500">Արդյունքներ՝</span>
            <span className="bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold px-1.5 py-0.5 rounded-md font-mono text-xs tabular-nums">
              {sortedOrders.length}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Գումար՝</span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/80">
              {totalSum.toLocaleString()} ֏
            </span>
          </div>
        </div>

        {/* Right: View Toggle, Sort & CSV Export */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Table / Grid Toggle */}
          <div className="flex items-center bg-slate-100/80 p-0.5 sm:p-1 rounded-lg border border-slate-200/70">
            <button
              onClick={() => {
                posAudio.playScanBeep();
                setViewMode('table');
              }}
              className={`p-1.5 rounded-md transition-all active:scale-[0.94] cursor-pointer ${viewMode === 'table' ? 'bg-surface text-primary-ink shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Աղյուսակային տեսք"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                posAudio.playScanBeep();
                setViewMode('grid');
              }}
              className={`p-1.5 rounded-md transition-all active:scale-[0.94] cursor-pointer ${viewMode === 'grid' ? 'bg-surface text-primary-ink shadow-2xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Քարտային տեսք"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <SelectField
              aria-label="Դասավորման կարգ"
              value={sortBy}
              onChange={(v) => {
                posAudio.playScanBeep();
                setSortBy(v as any);
              }}
              size="sm"
              align="right"
              className="shadow-2xs"
            >
              <option value="date-desc">Նորերը սկզբում (Ամսաթիվ)</option>
              <option value="date-asc">Հները սկզբում (Ամսաթիվ)</option>
              <option value="id-asc">ID Ըստ աճման (1000 →)</option>
              <option value="id-desc">ID Ըստ նվազման (→ 1000)</option>
              <option value="amount-desc">Գումարով (Նվազման)</option>
              <option value="amount-asc">Գումարով (Աճման)</option>
            </SelectField>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn btn-ghost shrink-0"
            title="Արտահանել POS/Excel CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">CSV Էքսպորտ</span>
          </button>

          {onClearAllOrders && (
            <button
              onClick={onClearAllOrders}
              className="btn btn-soft-danger shrink-0"
              title="Մաքրել բոլոր պատվերները (Սկսել 0-ից)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden md:inline">Մաքրել բոլորը (0)</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="solid-card p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-5 w-20" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-14" style={{ animationDelay: `${i * 0.1}s` }} />
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
                className="state-card flex-1 max-w-lg mx-auto w-full my-8"
              >
                <div className="state-icon bg-indigo-50 border-indigo-200 text-primary-ink">
                  <Inbox className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Պատվերներ չեն գտնվել
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-5 leading-relaxed">
                  Նշված որոնմամբ կամ ակտիվ զտիչով համապատասխան պատվերներ չկան:
                </p>
                {onResetFilters && (
                  <button
                    onClick={onResetFilters}
                    className="btn btn-md btn-primary"
                  >
                    Մաքրել Զտիչները և Որոնումը
                  </button>
                )}
              </motion.div>
            ) : viewMode === 'table' ? (
              <motion.div
                key="table-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={MICRO_ENTER}
                className="flex flex-col space-y-3"
              >
                {/* Desktop View Table Card */}
                <div className="hidden md:block bg-surface rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/90">
                          <th className="pl-6 pr-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 whitespace-nowrap">
                            ID / Տեսակ / Ամսաթիվ
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 whitespace-nowrap">
                            Հաճախորդ
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 whitespace-nowrap">
                            POS SKU / Ապրանքներ
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 text-right sm:text-left whitespace-nowrap">
                            Գումար
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 whitespace-nowrap">
                            Վճարում
                          </th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 whitespace-nowrap">
                            Կարգավիճակ
                          </th>
                          <th className="pl-4 pr-6 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 text-right whitespace-nowrap">
                            Գործողություն
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedOrders.map((order, orderIdx) => {
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
                              style={{ animationDelay: `${Math.min(orderIdx, 14) * 0.025}s` }}
                              onClick={() => onSelectOrder(order)}
                              className={`group cursor-pointer animate-rise-in row-interactive ${
                                isSel ? '!bg-indigo-50/60 shadow-[inset_2px_0_0_var(--color-primary)]' : ''
                              }`}
                            >
                              {/* Order ID, Sale Type & Date */}
                              <td className="pl-6 pr-4 py-3 align-top">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="slate-chip tabular-nums">
                                      {order.id}
                                    </span>
                                    <span className={`badge ${saleTypeInfo.badgeClass}`}>
                                      {saleTypeInfo.icon}
                                      <span>{saleTypeInfo.label}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>{formattedDateTime}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Customer info */}
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-start gap-2.5">
                                  <div className={`h-7 w-7 rounded-lg border flex items-center justify-center font-semibold text-2xs shrink-0 mt-0.5 ${getAvatarGradient(order.customerName || '')}`}>
                                    {(order.customerName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 max-w-[200px]">
                                    <span className="font-semibold text-xs text-slate-900 block truncate group-hover:text-primary-ink transition-colors">
                                      {order.customerName}
                                    </span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span className={`text-xs font-mono font-medium ${
                                        isPhoneMatch(order.phoneNumber || '', effectiveSearchQuery)
                                          ? 'bg-amber-100 text-amber-900 font-black px-1 rounded'
                                          : 'text-slate-500'
                                      }`}>
                                        {order.phoneNumber || '---'}
                                      </span>
                                    </div>
                                    {order.saleType === SaleType.DELIVERY && order.address && (
                                      <p className="text-2xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" />
                                        <span>{highlightMatch(order.address, effectiveSearchQuery)}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* ArmSoft SKU Codes & Items preview */}
                               <td className="px-4 py-3 align-top">
                                <div className="max-w-xs space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(order.items || []).slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-1">
                                        {item.code && (
                                          <button
                                            type="button"
                                            onClick={(e) => handleCopy(item.code, e)}
                                            title="Կոդ (POS)"
                                            className="code-chip"
                                          >
                                            <span>{item.code}</span>
                                            {copiedText === item.code ? (
                                              <Check className="w-2.5 h-2.5 text-emerald-700" />
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
                                            className="amber-chip hover:bg-amber-100 active:scale-[0.97] cursor-pointer"
                                          >
                                            <span>{item.artikul}</span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {(order.items || []).length > 3 && (
                                      <span className="text-2xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        +{(order.items || []).length - 3}
                                      </span>
                                    )}
                                    <span className="text-2xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded tabular-nums">
                                      {totalItemCount} հատ
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Amount with proper currency format */}
                              <td className="px-4 py-3 align-top">
                                <div className="font-mono">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-slate-900 tracking-tight tabular-nums">
                                      {(order.totalAmount || 0).toLocaleString()}
                                    </span>
                                    <span className="text-2xs font-medium text-slate-500">֏</span>
                                  </div>
                                  {(() => {
                                    const discountGiven = (order.subtotalAmount || 0) - (order.totalAmount || 0);
                                    return discountGiven > 0 ? (
                                      <div className="flex items-center gap-1 text-2xs text-emerald-700 font-medium mt-0.5">
                                        <span>Զեղչ՝ -{discountGiven.toLocaleString()} ֏</span>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </td>

                              {/* Payment status */}
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <span className={`badge ${getPaymentBadge(order.paymentStatus || PaymentStatus.UNPAID)}`}>
                                    {order.paymentStatus === PaymentStatus.PAID && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    <span>{order.paymentStatus || PaymentStatus.UNPAID}</span>
                                  </span>
                                  {order.paymentMethod && (
                                    <span className="block text-2xs text-slate-500 font-medium">
                                      {order.paymentMethod}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Order Status with 1-click Advance */}
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`badge ${statusInfo.className}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                      <span>{statusInfo.text}</span>
                                    </span>
                                  </div>

                                  {onUpdateStatus && order.status === OrderStatus.PENDING && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickAdvanceStatus(e, order)}
                                      className="btn btn-success !px-2 !py-1 !text-2xs"
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
                                      className="btn btn-info !px-2 !py-1 !text-2xs"
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
                                      className="btn btn-success !px-2 !py-1 !text-2xs"
                                      title="Նշել որպես առաքված"
                                    >
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      <span>Հանձնված է</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="pl-4 pr-6 py-3 align-top text-right">
                                <div className="inline-flex items-center gap-1">
                                  {/* Quick Receipt Print */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      posAudio.playScanBeep();
                                      setReceiptOrder(order);
                                    }}
                                    className="icon-btn icon-btn-primary"
                                    title="Տպել / Դիտել Արագ Կտրոն"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
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
                                      className="icon-btn icon-btn-warning"
                                      title="Խմբագրել պատվերը"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {onOpenReportsPage && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenReportsPage();
                                      }}
                                      className="icon-btn icon-btn-success"
                                      title="Բացել PDF Հաշվետվությունների Էջը"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer Summary Bar */}
                  <div className="px-6 py-2.5 bg-slate-50/90 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span>Ցուցադրված է՝ <strong className="text-slate-900 font-semibold">{sortedOrders.length}</strong> պատվեր</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Ընդհանուր՝ <strong className="text-slate-900 font-mono font-semibold text-sm tabular-nums">{totalSum.toLocaleString()} ֏</strong></span>
                    </div>
                  </div>
                </div>

                {/* Mobile View Cards (Hidden on MD+) */}
                <div className="block md:hidden space-y-3 overflow-y-auto no-scrollbar pb-10">
                  {sortedOrders.map((order, orderIdx) => {
                    const isSel = selectedOrderId === order.id;
                    const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);
                    const saleTypeInfo = getSaleTypeBadge(order.saleType || SaleType.ON_SITE);
                    const statusInfo = getStatusBadge(order.status);

                    return (
                      <div
                        key={order.id}
                        style={{ animationDelay: `${Math.min(orderIdx, 10) * 0.03}s` }}
                        onClick={() => onSelectOrder(order)}
                        className={`p-4 rounded-xl border animate-rise-in transition-all cursor-pointer space-y-3 ${
                          isSel
                            ? 'bg-indigo-50/70 border-primary-ink/60 ring-2 ring-primary-ink/25'
                            : 'bg-surface border-slate-200/80 shadow-card'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200 tabular-nums">
                              {order.id}
                            </span>
                            <span className={`badge ${saleTypeInfo.badgeClass}`}>
                              {saleTypeInfo.icon}
                              <span>{saleTypeInfo.label}</span>
                            </span>
                          </div>
                          <span className={`badge ${statusInfo.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.text}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h4 className="font-semibold text-sm text-slate-900">{order.customerName}</h4>
                            <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{order.phoneNumber || '---'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                              {(order.totalAmount || 0).toLocaleString()} ֏
                            </p>
                            <span className={`badge mt-0.5 ${getPaymentBadge(order.paymentStatus || PaymentStatus.UNPAID)}`}>
                              {order.paymentStatus || PaymentStatus.UNPAID}
                            </span>
                          </div>
                        </div>

                        {skuCodes.length > 0 && (
                          <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                            <span className="text-2xs font-medium text-slate-500">POS Կոդեր՝</span>
                            <span className="font-mono font-semibold text-primary-ink truncate max-w-[200px]">
                              {skuCodes.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Grid / Touch Screen Card View */
              <motion.div
                key="grid-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={MICRO_ENTER}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto no-scrollbar pb-10"
              >
                {sortedOrders.map((order, orderIdx) => {
                  const isSel = selectedOrderId === order.id;
                  const skuCodes = (order.items || []).map(i => i.code).filter(Boolean);
                  const saleTypeInfo = getSaleTypeBadge(order.saleType || SaleType.ON_SITE);
                  const statusInfo = getStatusBadge(order.status);

                  return (
                    <div
                      key={order.id}
                      style={{ animationDelay: `${Math.min(orderIdx, 12) * 0.03}s` }}
                      onClick={() => onSelectOrder(order)}
                      className={`p-5 rounded-xl border animate-rise-in transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 ${
                        isSel
                          ? 'bg-indigo-50/70 border-primary-ink ring-2 ring-primary-ink/25'
                          : 'bg-surface border-slate-200/80 hover:border-slate-300 hover:-translate-y-px shadow-card hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded-md text-slate-900 border border-slate-200 tabular-nums">
                              {order.id}
                            </span>
                            <span className={`badge ${saleTypeInfo.badgeClass}`}>
                              {saleTypeInfo.icon}
                              <span>{saleTypeInfo.label}</span>
                            </span>
                          </div>

                          <span className={`badge ${statusInfo.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.text}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 truncate">{order.customerName}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{order.phoneNumber || '---'}</span>
                          </p>
                        </div>

                        {skuCodes.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs">
                            <div className="flex items-center justify-between text-2xs font-medium text-slate-500 mb-1">
                              <span>POS SKU</span>
                              <span>{order.items.length} ապրանք</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {skuCodes.slice(0, 4).map((c, i) => (
                                <span key={i} className="font-mono text-2xs font-semibold bg-indigo-50 text-primary-ink px-1.5 py-0.5 rounded border border-indigo-200">
                                  {c}
                                </span>
                              ))}
                              {skuCodes.length > 4 && (
                                <span className="text-2xs text-slate-500 font-medium">+{skuCodes.length - 4}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-2xs text-slate-400 font-medium uppercase block">Ընդհանուր</span>
                          <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                            {(order.totalAmount || 0).toLocaleString()} <span className="text-2xs font-normal text-slate-500">֏</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Advance Status in Grid */}
                          {onUpdateStatus && order.status === OrderStatus.PENDING && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvanceStatus(e, order)}
                              className="btn btn-success !px-2.5 !py-1.5 !text-2xs"
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
                              className="btn btn-info !px-2.5 !py-1.5 !text-2xs"
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
                              className="btn btn-success !px-2.5 !py-1.5 !text-2xs"
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
                            className="icon-btn icon-btn-primary"
                            title="Տպել / Դիտել Արագ Կտրոն"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
                              className="icon-btn icon-btn-warning"
                              title="Խմբագրել պատվերը"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenReportsPage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReportsPage();
                              }}
                              className="icon-btn icon-btn-success"
                              title="Բացել PDF Հաշվետվությունների Էջը"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
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

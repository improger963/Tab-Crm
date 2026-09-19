import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  CheckCircle,
  Activity,
  CreditCard,
  Trophy,
  ShoppingBag,
  DollarSign,
  Package,
  Calendar,
  Zap,
  ArrowUpRight,
  Truck,
  Store,
  Clock,
  Copy,
  Check,
  Smartphone,
  ArrowRightLeft
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, SaleType, PaymentMethod } from '../types';
import { posAudio } from '../lib/posAudio';

interface DeliveryDashboardProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
}

const PAYMENT_COLORS = {
  [PaymentMethod.CASH]: '#10b981', // emerald
  [PaymentMethod.CARD]: '#6366f1', // indigo
  [PaymentMethod.IDRAM]: '#f59e0b', // amber
  [PaymentMethod.TRANSFER]: '#06b6d4', // cyan
};

// Helper for robust date parsing in various formats
const parseDateSafe = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  const s = String(dateStr).trim();
  if (!s) return null;

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  const dmyMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return null;
};

export default function DeliveryDashboard({ orders, onSelectOrder }: DeliveryDashboardProps) {
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const handleCopySku = (sku: string) => {
    posAudio.playScanBeep();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1800);
  };

  // Filter orders by selected time
  const filteredOrders = useMemo(() => {
    if (timeFilter === 'all') return orders;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return orders.filter(order => {
      const parsedDate = parseDateSafe(order.purchaseDate);
      if (!parsedDate) return false;

      const dateStrYMD = parsedDate.toISOString().split('T')[0];

      if (timeFilter === 'today') {
        return dateStrYMD === todayStr;
      }
      if (timeFilter === 'yesterday') {
        return dateStrYMD === yesterdayStr;
      }
      if (timeFilter === 'week') {
        return parsedDate.getTime() >= weekAgo.getTime();
      }
      return true;
    });
  }, [orders, timeFilter]);

  const chartData = useMemo(() => {
    const last7Days = [];
    const armenianDays = ['Կիր', 'Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const localDate = d.toLocaleDateString();

      last7Days.push({
        isoDate,
        localDate,
        label: `${armenianDays[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
      });
    }

    return last7Days.map(day => {
      const dayOrders = orders.filter(o => {
        const parsedDate = parseDateSafe(o.purchaseDate);
        if (!parsedDate) return false;
        const dateStrYMD = parsedDate.toISOString().split('T')[0];
        const dateStrLocal = parsedDate.toLocaleDateString();
        return dateStrYMD === day.isoDate || dateStrLocal === day.localDate;
      });

      return {
        name: day.label,
        successful: dayOrders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.SOLD).length,
        pending: dayOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED).length
      };
    });
  }, [orders]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const successful = filteredOrders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.SOLD).length;
    const active = filteredOrders.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED).length;
    const pending = filteredOrders.filter(o => o.status === OrderStatus.PENDING).length;
    const rate = total > 0 ? Math.round((successful / total) * 100) : 0;

    const totalRevenue = filteredOrders
      .filter(o => o.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
    const outstandingAmount = filteredOrders
      .filter(o => o.paymentStatus === PaymentStatus.UNPAID)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const prepaymentAmount = filteredOrders
      .filter(o => o.paymentStatus === PaymentStatus.PARTIAL)
      .reduce((sum, o) => sum + (o.prepaymentAmount || 0), 0);

    const grossVolume = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const averageOrderValue = total > 0 
      ? Math.round(grossVolume / total) 
      : 0;

    // Payment methods breakdown
    const paymentBreakdown: Record<string, { count: number; total: number }> = {
      [PaymentMethod.CASH]: { count: 0, total: 0 },
      [PaymentMethod.CARD]: { count: 0, total: 0 },
      [PaymentMethod.IDRAM]: { count: 0, total: 0 },
      [PaymentMethod.TRANSFER]: { count: 0, total: 0 },
    };

    filteredOrders.forEach(o => {
      const method = o.paymentMethod || PaymentMethod.CASH;
      if (!paymentBreakdown[method]) {
        paymentBreakdown[method] = { count: 0, total: 0 };
      }
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].total += (o.totalAmount || 0);
    });

    // Sale types breakdown
    const saleTypeCounts = {
      [SaleType.ON_SITE]: filteredOrders.filter(o => o.saleType === SaleType.ON_SITE).length,
      [SaleType.DELIVERY]: filteredOrders.filter(o => o.saleType === SaleType.DELIVERY).length,
      [SaleType.PICKUP]: filteredOrders.filter(o => o.saleType === SaleType.PICKUP).length,
    };

    // Item popularity
    const itemMap: Record<string, { qty: number; code?: string; revenue: number }> = {};
    filteredOrders.forEach(o => {
      if (o.items) {
        o.items.forEach(itm => {
          if (itm.name && itm.name.trim()) {
            const trimmed = itm.name.trim();
            if (!itemMap[trimmed]) {
              itemMap[trimmed] = { qty: 0, code: itm.code, revenue: 0 };
            }
            itemMap[trimmed].qty += itm.quantity || 1;
            itemMap[trimmed].revenue += (itm.quantity || 1) * (itm.price || 0);
          }
        });
      }
    });

    const popularItems = Object.entries(itemMap)
      .map(([name, data]) => ({ name, qty: data.qty, code: data.code, revenue: data.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const maxQty = popularItems.length > 0 ? Math.max(...popularItems.map(i => i.qty)) : 1;

    return { 
      successful, 
      active, 
      pending,
      rate, 
      totalRevenue, 
      outstandingAmount, 
      prepaymentAmount,
      grossVolume,
      averageOrderValue,
      popularItems,
      maxQty,
      total,
      paymentBreakdown,
      saleTypeCounts
    };
  }, [filteredOrders]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6 pb-16 max-w-7xl mx-auto"
    >
      {/* Top Filter & Interactive Time Horizon Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>Գործառնական Վիճակագրություն & Վերլուծություն</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              POS Analytics
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Իրական ժամանակի տվյալներ վաճառքների, առաքումների և դրամական հոսքերի մասին
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
          {[
            { id: 'all', label: 'Ամբողջը' },
            { id: 'today', label: 'Այսօր' },
            { id: 'yesterday', label: 'Երեկ' },
            { id: 'week', label: 'Վերջին 7 օր' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                posAudio.playScanBeep();
                setTimeFilter(tab.id as any);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                timeFilter === tab.id 
                  ? 'bg-white text-indigo-900 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row 1: Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Արդյունավետություն
            </p>
            <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
              {stats.rate}%
            </h3>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Կատարված պատվերներ</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Ավարտված / Վաճառված
            </p>
            <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
              {stats.successful}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Ընդհանուր {stats.total} պատվերից
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Ընթացիկ Ակտիվ
            </p>
            <h3 className="text-3xl font-black text-slate-900 font-mono mt-1">
              {stats.active}
            </h3>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">
              Դրամարկղում կամ Առաքման մեջ
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Միջին Չեկ (AOV)
            </p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {stats.averageOrderValue.toLocaleString()} <span className="text-xs font-normal text-slate-400">֏</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
              Մեկ պատվերի միջին արժեք
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Financial Stats with Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Վճարված Եկամուտ (Փաստացի)
            </p>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            {stats.totalRevenue.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">AMD</span>
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.grossVolume > 0 ? (stats.totalRevenue / stats.grossVolume) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10.5px] text-slate-400">Հաստատված վճարումներ</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Սպասվող Գումար (Դրամարկղ / Տեղում)
            </p>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            {stats.outstandingAmount.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">AMD</span>
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.grossVolume > 0 ? (stats.outstandingAmount / stats.grossVolume) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10.5px] text-slate-400">Չվճարված կամ առաքման տեղում վճարում</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Ընդհանուր Շրջանառություն
            </p>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700 font-mono">
            {stats.grossVolume.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-400">AMD</span>
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full w-full" />
          </div>
          <p className="text-[10.5px] text-slate-400">Բոլոր պատվերների ընդհանուր արժեք</p>
        </div>
      </div>

      {/* Interactive Sales Pipeline & Process Stage Funnel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>Պատվերի Փուլերի Փոխակերպում (Sales Pipeline)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Ընդհանուր՝ {stats.total} պատվեր
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              step: '1. Գրանցված (Սրահ)',
              count: stats.pending,
              color: 'bg-amber-500',
              bg: 'bg-amber-50/70',
              border: 'border-amber-200',
              text: 'text-amber-900',
              desc: 'Սպասում է դրամարկղին'
            },
            {
              step: '2. POS Վաճառք',
              count: filteredOrders.filter(o => o.status === OrderStatus.SOLD).length,
              color: 'bg-emerald-500',
              bg: 'bg-emerald-50/70',
              border: 'border-emerald-200',
              text: 'text-emerald-900',
              desc: 'Դրամարկղում գանձված'
            },
            {
              step: '3. Առաքման մեջ / Խանութ',
              count: filteredOrders.filter(o => o.status === OrderStatus.IN_TRANSIT).length,
              color: 'bg-sky-500',
              bg: 'bg-sky-50/70',
              border: 'border-sky-200',
              text: 'text-sky-900',
              desc: 'Ճանապարհին է'
            },
            {
              step: '4. Ավարտված / Հանձնված',
              count: filteredOrders.filter(o => o.status === OrderStatus.DELIVERED).length,
              color: 'bg-indigo-600',
              bg: 'bg-indigo-50/70',
              border: 'border-indigo-200',
              text: 'text-indigo-900',
              desc: 'Հաջողությամբ հանձնված'
            },
          ].map((stage, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border ${stage.border} ${stage.bg} flex flex-col justify-between gap-2 shadow-2xs`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700">{stage.step}</span>
                <span className={`w-2 h-2 rounded-full ${stage.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black font-mono ${stage.text}`}>
                  {stage.count} <span className="text-xs font-medium opacity-70">պատվեր</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stage.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Breakdown & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">
              Վճարման Եղանակների Բաշխվածություն
            </h3>
            <span className="text-xs text-slate-400 font-medium">POS & Փոխանցումներ</span>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { id: PaymentMethod.CASH, label: 'Կանխիկ', icon: DollarSign, color: 'bg-emerald-500', text: 'text-emerald-700' },
              { id: PaymentMethod.CARD, label: 'Քարտով (POS Տերմինալ)', icon: CreditCard, color: 'bg-indigo-600', text: 'text-indigo-700' },
              { id: PaymentMethod.IDRAM, label: 'Idram QR', icon: Smartphone, color: 'bg-amber-500', text: 'text-amber-700' },
              { id: PaymentMethod.TRANSFER, label: 'Փոխանցում քարտին', icon: ArrowRightLeft, color: 'bg-cyan-600', text: 'text-cyan-700' },
            ].map(method => {
              const data = stats.paymentBreakdown[method.id] || { count: 0, total: 0 };
              const percent = stats.grossVolume > 0 ? Math.round((data.total / stats.grossVolume) * 100) : 0;
              const Icon = method.icon;

              return (
                <div key={method.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-slate-800">{method.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({data.count} հատ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">
                        {data.total.toLocaleString()} ֏
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${method.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sale Channels: On-Site vs Delivery vs Pickup */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">
              Վաճառքի Ուղիներ (Sale Channels)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Տեղում / Առաքում / Խանութ</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Տեղում</span>
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-950 font-mono">
                  {stats.saleTypeCounts[SaleType.ON_SITE]}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">Խանութ-սրահից</p>
              </div>
            </div>

            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <Truck className="w-5 h-5 text-sky-600" />
                <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">Առաքում</span>
              </div>
              <div>
                <p className="text-2xl font-black text-sky-950 font-mono">
                  {stats.saleTypeCounts[SaleType.DELIVERY]}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">Հասցեով առաքում</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <Store className="w-5 h-5 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Մասնաճյուղ</span>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-950 font-mono">
                  {stats.saleTypeCounts[SaleType.PICKUP]}
                </p>
                <p className="text-[10.5px] text-slate-500 font-medium">Տեղափոխում</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Popular Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Պատվերների Դինամիկա (Վերջին 7 օր)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Ավարտված և ընթացիկ պատվերների քանակն ըստ օրերի
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                <span>Ավարտված</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Ընթացքի մեջ</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '8px 12px'
                  }}
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                />
                <Bar dataKey="successful" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Ավարտված" />
                <Bar dataKey="pending" fill="#fbbf24" radius={[6, 6, 0, 0]} name="Ընթացքի մեջ" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Items Column (1 Col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Թոփ Պահանջված Ապրանքներ (SKU)
            </h3>
          </div>

          <div className="space-y-4 pt-1">
            {stats.popularItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Ապրանքների տվյալներ դեռ չկան</p>
            ) : (
              stats.popularItems.map((item, idx) => {
                const percentage = Math.round((item.qty / stats.maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {item.code && (
                          <button
                            type="button"
                            onClick={() => handleCopySku(item.code!)}
                            title="Սեղմեք պատճենելու համար"
                            className="font-mono text-[10.5px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.code}</span>
                            {copiedSku === item.code ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-50" />}
                          </button>
                        )}
                        <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 truncate">
                          {item.code || '---'}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-slate-900 text-xs shrink-0">
                        {item.qty} հատ
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

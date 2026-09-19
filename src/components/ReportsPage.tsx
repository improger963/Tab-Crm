import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, SaleType, PaymentStatus, PaymentMethod } from '../types';
import { 
  FileText, 
  Download, 
  Mail, 
  Calendar, 
  Truck, 
  ShoppingBag, 
  Package, 
  Send, 
  X, 
  Check, 
  Copy, 
  Filter, 
  RefreshCw,
  Sparkles,
  Search,
  CheckCircle2,
  Building2,
  Users
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { posAudio } from '../lib/posAudio';

interface ReportsPageProps {
  orders: Order[];
  onBackToOrders: () => void;
}

type ReportType = 'delivery' | 'pickup' | 'supplier';

export default function ReportsPage({ orders, onBackToOrders }: ReportsPageProps) {
  // Current Active Report Tab
  const [activeTab, setActiveTab] = useState<ReportType>('delivery');

  // Filter States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dateMode, setDateMode] = useState<'today' | 'custom' | 'all'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Filtered Orders based on Date and Status
  const dateFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Date Filter
      if (dateMode === 'today') {
        const orderDate = order.purchaseDate ? order.purchaseDate.split('T')[0] : '';
        if (orderDate !== todayStr && !order.purchaseDate?.includes(todayStr)) {
          const formattedToday = new Date().toLocaleDateString('hy-AM');
          if (!order.purchaseDate?.includes(formattedToday)) return false;
        }
      } else if (dateMode === 'custom' && selectedDate) {
        const orderDate = order.purchaseDate ? order.purchaseDate.split('T')[0] : '';
        if (orderDate !== selectedDate) {
          const formattedSelected = new Date(selectedDate).toLocaleDateString('hy-AM');
          if (!order.purchaseDate?.includes(selectedDate) && !order.purchaseDate?.includes(formattedSelected)) return false;
        }
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && order.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [orders, dateMode, selectedDate, todayStr, selectedStatus]);

  // 1. Delivery Orders Sheet Data (Առաքման Թերթիկ)
  const deliveryOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => 
      o.saleType === SaleType.DELIVERY || (o.address && o.address.trim().length > 0)
    );
  }, [dateFilteredOrders]);

  // 2. Pickup / In-Store Sheet Data (Մոտեցնել Խանութի Թերթիկ)
  const pickupOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => 
      o.saleType === SaleType.PICKUP || o.saleType === SaleType.ON_SITE
    );
  }, [dateFilteredOrders]);

  // 3. Supplier Required Items Manifest (Մատակարարման Ապրանքացանկ - Պատվերների Կոդեր)
  const supplierItemsManifest = useMemo(() => {
    const map = new Map<string, {
      code: string;
      artikul: string;
      name: string;
      totalQuantity: number;
      unitPrice: number;
      totalCost: number;
      orderIds: string[];
    }>();

    dateFilteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = (item.code || item.artikul || item.name || 'SKU-UNKNOWN').toUpperCase().trim();
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const existing = map.get(key);

        if (existing) {
          existing.totalQuantity += qty;
          existing.totalCost += (qty * price);
          if (!existing.orderIds.includes(order.id)) {
            existing.orderIds.push(order.id);
          }
        } else {
          map.set(key, {
            code: item.code || '---',
            artikul: item.artikul || item.code || '---',
            name: item.name || item.code || 'Անանուն ապրանք',
            totalQuantity: qty,
            unitPrice: price,
            totalCost: (qty * price),
            orderIds: [order.id]
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [dateFilteredOrders]);

  // Document Title by Tab
  const docTitle = useMemo(() => {
    const dateLabel = dateMode === 'today' ? `Այսօր (${todayStr})` : dateMode === 'custom' ? selectedDate : 'Բոլորը';
    if (activeTab === 'delivery') return `Առաքման_Թերթիկ_${dateLabel}`;
    if (activeTab === 'pickup') return `Մոտեցնել_Խանութի_Թերթիկ_${dateLabel}`;
    return `Մատակարարման_Ապրանքացանկ_${dateLabel}`;
  }, [activeTab, dateMode, selectedDate, todayStr]);

  // PDF Download Handler (Generates clean .pdf document file using jspdf + html2canvas)
  const handleDownloadPdf = async () => {
    const element = document.getElementById('report-document-sheet');
    if (!element) return;

    posAudio.playScanBeep();
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${docTitle}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('PDF ֆայլի ստեղծման սխալ։ Խնդրում ենք կրկին փորձել։');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Prepare Email Share Content
  const handleOpenEmailModal = () => {
    posAudio.playScanBeep();
    const dateLabel = dateMode === 'today' ? `Այսօր (${todayStr})` : dateMode === 'custom' ? selectedDate : 'Բոլորը';
    
    let subject = '';
    let body = '';

    if (activeTab === 'delivery') {
      subject = `🚚 Առաքման Թերթիկ — tab.am POS (${dateLabel})`;
      body = `Հարգելի գործընկեր/առաքիչ,\n\nԿից ներկայացնում ենք առաքման թերթիկը (${dateLabel})․\n- Ընդհանուր առաքումներ՝ ${deliveryOrders.length} պատվեր\n\n`;
      deliveryOrders.forEach((o, i) => {
        body += `${i + 1}. #${o.id} | ${o.customerName || 'Անհայտ'} | ${o.phoneNumber || ''} | ${o.address || ''} | ${o.totalAmount.toLocaleString()} ֏ | ${o.status}\n`;
      });
    } else if (activeTab === 'pickup') {
      subject = `🏪 Մոտեցնել Խանութի Թերթիկ — tab.am POS (${dateLabel})`;
      body = `Հարգելի աշխատակից,\n\nԿից ներկայացնում ենք խանութից վերցնելու/մոտեցնելու թերթիկը (${dateLabel})․\n- Ընդհանուր պատվերներ՝ ${pickupOrders.length}\n\n`;
      pickupOrders.forEach((o, i) => {
        body += `${i + 1}. #${o.id} | ${o.customerName || 'Անհայտ'} | ${o.phoneNumber || ''} | ${o.totalAmount.toLocaleString()} ֏ | ${o.status}\n`;
      });
    } else {
      subject = `📦 Մատակարարման Ապրանքացանկ (Պատվերների Կոդեր) — tab.am POS (${dateLabel})`;
      body = `Հարգելի մատակարար / Գնումների բաժին,\n\nԽնդրում ենք պատվիրել հետևյալ ապրանքները (${dateLabel})․\n\n`;
      supplierItemsManifest.forEach((item, i) => {
        body += `${i + 1}. [ԿՈԴ: ${item.code}] ${item.name} — Պահանջվող քանակ՝ ${item.totalQuantity} հատ (${item.totalCost.toLocaleString()} ֏)\n`;
      });
    }

    setEmailSubject(subject);
    setEmailBody(body);
    setEmailRecipient('');
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) return;

    // Trigger mailto link for direct client email sending
    const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;

    setEmailSentSuccess(true);
    setTimeout(() => {
      setEmailSentSuccess(false);
      setIsEmailModalOpen(false);
    }, 1500);
  };

  const handleCopySummaryText = () => {
    posAudio.playScanBeep();
    navigator.clipboard.writeText(`${emailSubject}\n\n${emailBody}`);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      
      {/* 1. TOP DEDICATED PAGE NAVBAR */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToOrders}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 text-xs font-bold cursor-pointer active:scale-95"
            >
              ← Ետ դեպի Պատվերներ
            </button>

            <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Էջ • Փաստաթղթերի և PDF Արտահանման Կենտրոն</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Ձևավորեք առաքման, խանութի և մատակարարման 3 տեսակի թերթիկները, ներբեռնեք PDF կամ ուղարկեք էլ․ փոստով
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEmailModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-950 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-indigo-200" />
              <span>✉️ Ուղարկել Էլ․ Փոստով (Email)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-950 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-emerald-100" />
              )}
              <span>📥 Ներբեռնել PDF Ֆայլը (.pdf)</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. THREE EXPORT TYPE SELECTION TABS & FILTER BAR */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Export Type Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Tab 1: Delivery Sheet */}
          <button
            onClick={() => {
              posAudio.playScanBeep();
              setActiveTab('delivery');
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'delivery'
                ? 'bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950 border-indigo-500 shadow-xl shadow-indigo-950/50 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2.5 rounded-xl ${activeTab === 'delivery' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {deliveryOrders.length} պատվեր
              </span>
            </div>
            <h3 className="text-sm font-black text-white">1․ Առաքման Թերթիկ</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Առաքիչների համար՝ հասցեներ, հեռախոսներ, գումարներ և նշումներ
            </p>
          </button>

          {/* Tab 2: Pickup Sheet */}
          <button
            onClick={() => {
              posAudio.playScanBeep();
              setActiveTab('pickup');
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'pickup'
                ? 'bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950 border-indigo-500 shadow-xl shadow-indigo-950/50 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2.5 rounded-xl ${activeTab === 'pickup' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {pickupOrders.length} պատվեր
              </span>
            </div>
            <h3 className="text-sm font-black text-white">2․ Մոտեցնել Խանութի Թերթիկ</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Խանութից վերցնելու / տեղում վաճառքների պատվերների ցանկ
            </p>
          </button>

          {/* Tab 3: Supplier SKU Manifest */}
          <button
            onClick={() => {
              posAudio.playScanBeep();
              setActiveTab('supplier');
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'supplier'
                ? 'bg-gradient-to-br from-emerald-900/80 via-slate-900 to-emerald-950 border-emerald-500 shadow-xl shadow-emerald-950/50 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2.5 rounded-xl ${activeTab === 'supplier' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                <Package className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {supplierItemsManifest.length} տեսակ
              </span>
            </div>
            <h3 className="text-sm font-black text-white">3․ Մատակարարման Ապրանքացանկ</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Ապրանքների կոդերն ու ընդհանուր քանակները՝ մատակարարներին պատվիրելու համար
            </p>
          </button>

        </div>

        {/* Filters Controls */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ամսաթիվ՝</span>
            </span>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setDateMode('today')}
                className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                  dateMode === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Այսօր ({todayStr})
              </button>
              <button
                onClick={() => setDateMode('custom')}
                className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                  dateMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ընտրել Ամսաթիվ
              </button>
              <button
                onClick={() => setDateMode('all')}
                className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                  dateMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Բոլոր Պատվերները ({orders.length})
              </button>
            </div>

            {dateMode === 'custom' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] font-bold">Կարգավիճակ՝</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Բոլոր Կարգավիճակները</option>
              {Object.values(OrderStatus).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

        </div>

        {/* 3. DOCUMENT PREVIEW / CANVAS FOR PDF GENERATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 overflow-x-auto">
          
          <div 
            id="report-document-sheet" 
            className="max-w-4xl mx-auto bg-white text-slate-900 p-6 sm:p-10 shadow-2xl rounded-2xl border border-slate-200"
          >
            
            {/* DOCUMENT HEADER */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest block mb-1">
                  tab.am POS System • Պաշտոնական Փաստաթուղթ
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {activeTab === 'delivery' && '🚚 ԱՌԱՔՄԱՆ ԹԵՐԹԻԿ (DELIVERY MANIFEST)'}
                  {activeTab === 'pickup' && '🏪 ՄՈՏԵՑՆԵԼ ԽԱՆՈՒԹԻ ԹԵՐԹԻԿ (STORE PICKUP MANIFEST)'}
                  {activeTab === 'supplier' && '📦 ՄԱՏԱԿԱՐԱՐՄԱՆ ԱՊՐԱՆՔԱՑԱՆԿ (SUPPLIER PURCHASE MANIFEST)'}
                </h2>
                <p className="text-xs text-slate-600 font-bold mt-1">
                  Ամսաթիվ՝ {dateMode === 'today' ? todayStr : dateMode === 'custom' ? selectedDate : 'Բոլոր ժամանակները'} • Կազմված է՝ {new Date().toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                  {activeTab === 'delivery' && `${deliveryOrders.length} ԱՌԱՔՈՒՄ`}
                  {activeTab === 'pickup' && `${pickupOrders.length} ՊԱՏՎԵՐ`}
                  {activeTab === 'supplier' && `${supplierItemsManifest.length} ՏԵՍԱԿ ԱՊՐԱՆՔ`}
                </span>
              </div>
            </div>

            {/* TAB 1: DELIVERY ORDERS SHEET */}
            {activeTab === 'delivery' && (
              <div className="space-y-4">
                {deliveryOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium italic border border-dashed border-slate-200 rounded-xl">
                    Ընտրված ժամանակահատվածում առաքման պատվերներ չկան:
                  </div>
                ) : (
                  deliveryOrders.map((order, idx) => (
                    <div key={order.id} className="border-2 border-slate-300 rounded-xl p-4 bg-white space-y-2 text-xs">
                      
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-black text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                            {order.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{order.customerName || 'Անհայտ հաճախորդ'}</span>
                          {order.phoneNumber && (
                            <span className="font-mono font-black text-slate-700">({order.phoneNumber})</span>
                          )}
                        </div>
                        <span className="font-black px-2.5 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                          {order.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-500">📍 Հասցե՝ </span>
                          <span className="font-bold text-slate-900">{order.address || 'Խանութից վերցնել'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500">💳 Վճարում՝ </span>
                          <span className="font-bold text-slate-900">{order.paymentMethod || 'Կանխիկ'} ({order.paymentStatus})</span>
                        </div>
                        {order.cashierNote && (
                          <div className="col-span-full bg-amber-50 border border-amber-200 p-1.5 rounded text-amber-900 font-bold">
                            💬 Նշում առաքչին՝ {order.cashierNote}
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-[9px] uppercase font-black text-slate-500">
                              <th className="pb-1">ԿՈԴ</th>
                              <th className="pb-1 font-sans">ԱՊՐԱՆՔ</th>
                              <th className="pb-1 text-center">ՔԱՆԱԿ</th>
                              <th className="pb-1 text-right">ԳԻՆ</th>
                              <th className="pb-1 text-right">ԳՈՒՄԱՐ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(order.items || []).map((it, iIdx) => (
                              <tr key={iIdx}>
                                <td className="py-1 font-bold text-indigo-700">{it.code || '---'}</td>
                                <td className="py-1 font-bold text-slate-800 font-sans">{it.name || it.code}</td>
                                <td className="py-1 text-center font-black">x{it.quantity}</td>
                                <td className="py-1 text-right text-slate-600">{it.price.toLocaleString()} ֏</td>
                                <td className="py-1 text-right font-black">{(it.quantity * it.price).toLocaleString()} ֏</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-1 font-bold">
                        <span className="text-slate-500 text-[10.5px]">Գանձվող գումար առաքչի կողմից՝</span>
                        <span className="font-mono font-black text-base text-emerald-700">
                          {(order.totalAmount || 0).toLocaleString()} AMD
                        </span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: PICKUP / STORE SHEET */}
            {activeTab === 'pickup' && (
              <div className="space-y-4">
                {pickupOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium italic border border-dashed border-slate-200 rounded-xl">
                    Ընտրված ժամանակահատվածում մոտեցնելու պատվերներ չկան:
                  </div>
                ) : (
                  pickupOrders.map((order, idx) => (
                    <div key={order.id} className="border-2 border-slate-300 rounded-xl p-4 bg-white space-y-2 text-xs">
                      
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-black text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                            {order.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{order.customerName || 'Անհայտ հաճախորդ'}</span>
                          {order.phoneNumber && (
                            <span className="font-mono font-black text-slate-700">({order.phoneNumber})</span>
                          )}
                        </div>
                        <span className="font-black px-2.5 py-0.5 rounded bg-slate-900 text-white text-[11px]">
                          {order.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <table className="w-full text-left font-mono text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-[9px] uppercase font-black text-slate-500">
                              <th className="pb-1">ԿՈԴ</th>
                              <th className="pb-1 font-sans">ԱՊՐԱՆՔ</th>
                              <th className="pb-1 text-center">ՔԱՆԱԿ</th>
                              <th className="pb-1 text-right">ԳԻՆ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(order.items || []).map((it, iIdx) => (
                              <tr key={iIdx}>
                                <td className="py-1 font-bold text-indigo-700">{it.code || '---'}</td>
                                <td className="py-1 font-bold text-slate-800 font-sans">{it.name || it.code}</td>
                                <td className="py-1 text-center font-black">x{it.quantity}</td>
                                <td className="py-1 text-right text-slate-600">{it.price.toLocaleString()} ֏</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-1 font-bold">
                        <span className="text-slate-500 text-[10.5px]">Ընդհանուր գումար խանութում՝</span>
                        <span className="font-mono font-black text-base text-slate-900">
                          {(order.totalAmount || 0).toLocaleString()} AMD
                        </span>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: SUPPLIER PURCHASE & CODES MANIFEST */}
            {activeTab === 'supplier' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950 font-bold mb-4">
                  💡 Այս ցանկը համախմբում է բոլոր ընտրված պատվերներում առկա ապրանքները ըստ SKU Կոդերի, որպեսզի կարողանաք ուղիղ պատվիրել մատակարարներից։
                </div>

                {supplierItemsManifest.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium italic border border-dashed border-slate-200 rounded-xl">
                    Ապրանքներ չկան:
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase font-black">
                        <th className="py-2.5 px-3">№</th>
                        <th className="py-2.5 px-3">ԱՊՐԱՆՔԻ ԿՈԴ / SKU</th>
                        <th className="py-2.5 px-3">ԱՆՎԱՆՈՒՄ</th>
                        <th className="py-2.5 px-3 text-center bg-amber-500 text-slate-950">ՊԱՀԱՆՋՎՈՂ ՔԱՆԱԿ</th>
                        <th className="py-2.5 px-3 text-right">ՄԻԱՎՈՐԻ ԳԻՆ</th>
                        <th className="py-2.5 px-3 text-right">ԸՆԴՀԱՆՈՒՐ ԳՈՒՄԱՐ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {supplierItemsManifest.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-black text-indigo-700">
                            <span className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
                              {item.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-base text-slate-950 bg-amber-50 border-x border-amber-200">
                            {item.totalQuantity} <span className="text-xs font-normal">հատ</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {item.unitPrice.toLocaleString()} ֏
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {item.totalCost.toLocaleString()} ֏
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-bold text-xs">
                        <td colSpan={3} className="py-3 px-3 text-right uppercase font-extrabold">
                          ԸՆԴՀԱՆՈՒՐ ՄԱՏԱԿԱՐԱՐՄԱՆ ԳՈՒՄԱՐ՝
                        </td>
                        <td className="py-3 px-3 text-center font-black text-amber-300 font-mono text-base">
                          {supplierItemsManifest.reduce((s, i) => s + i.totalQuantity, 0)} հատ
                        </td>
                        <td colSpan={2} className="py-3 px-3 text-right font-black text-emerald-400 font-mono text-base">
                          {supplierItemsManifest.reduce((s, i) => s + i.totalCost, 0).toLocaleString()} AMD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* DOCUMENT FOOTER */}
            <div className="border-t-2 border-slate-300 pt-4 mt-8 text-center text-[10px] text-slate-500 font-bold">
              tab.am Cloud POS System • Պաշտոնական Էլեկտրոնային Փաստաթուղթ
            </div>

          </div>

        </div>

      </main>

      {/* 4. EMAIL SENDING MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 space-y-5 text-slate-100 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ուղարկել Փաստաթուղթը Էլ․ Փոստով</h3>
                  <p className="text-[11px] text-slate-400">Ուղարկեք մատակարարին, առաքչին կամ ղեկավարին</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Ստացողի Էլ․ Փոստի Հասցեն (Email) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="օրինակ՝ supplier@company.com կամ delivery@tab.am"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Նամակի Վերնագիր (Subject)
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-bold">
                    Նամակի Տեքստ (Body)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopySummaryText}
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? 'Պատճենվեց' : 'Պատճենել Տեքստը'}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950"
                >
                  {emailSentSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Ուղարկված է․․․</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Ուղարկել Էլ․ Փոստով</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

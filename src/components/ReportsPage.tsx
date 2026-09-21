import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MODAL_BACKDROP, MODAL_SHELL } from '../lib/motionPresets';
import SelectField from './SelectField';
import { Order, OrderStatus, SaleType, PaymentStatus, PaymentMethod, OrderItem } from '../types';
import { 
  FileText, 
  Download, 
  Printer,
  Mail, 
  Calendar, 
  Truck, 
  ShoppingBag, 
  Package, 
  X, 
  Check, 
  Copy, 
  RefreshCw,
  Search,
  ArrowLeft,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { posAudio } from '../lib/posAudio';
import { parseDateSafe } from '../lib/storage';

interface ReportsPageProps {
  orders: Order[];
  onBackToOrders: () => void;
}

type ReportDocType = 'delivery' | 'pickup' | 'supplier' | 'financial' | 'invoice';
type DateFilterPreset = 'all' | 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom';

// Shared robust date parser lives in lib/storage.ts (parseDateSafe):
// handles YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY and ISO fallback in one place.

const formatDateArm = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

export default function ReportsPage({ orders, onBackToOrders }: ReportsPageProps) {
  // Document Type State
  const [activeDocType, setActiveDocType] = useState<ReportDocType>('delivery');

  // Filter States - Default to 'all' so all existing & active orders appear immediately
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Order for Single Invoice Mode
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState<string>('');

  // Document UI controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Company / POS Branding Details
  const companyInfo = {
    name: 'tab.am POS & Delivery Services',
    branch: 'Գլխավոր Մասնաճյուղ • Կենտրոն',
    address: 'ք․ Երևան, Հայաստան',
    phone: '+374 (10) 55-00-55 / +374 (99) 00-00-00',
    taxNumber: 'ՀՎՀՀ 02849102',
    operator: 'Գլխավոր Գանձապահ / Ադմինիստրատոր'
  };

  // Date Range Calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (datePreset === 'today') {
      return { start: startOfToday, end: endOfToday, label: `Այսօր (${formatDateArm(startOfToday)})` };
    }

    if (datePreset === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return { start: startOfYesterday, end: endOfYesterday, label: `Երեկ (${formatDateArm(startOfYesterday)})` };
    }

    if (datePreset === 'this-week') {
      const day = startOfToday.getDay();
      const diff = startOfToday.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      return { start: startOfWeek, end: endOfToday, label: `Այս Շաբաթ (${formatDateArm(startOfWeek)} - ${formatDateArm(endOfToday)})` };
    }

    if (datePreset === 'this-month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: startOfMonth, end: endOfToday, label: `Այս Ամիս (${formatDateArm(startOfMonth)} - ${formatDateArm(endOfToday)})` };
    }

    if (datePreset === 'custom') {
      const s = parseDateSafe(customStartDate) || startOfToday;
      s.setHours(0, 0, 0, 0);
      const e = parseDateSafe(customEndDate) || endOfToday;
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e, label: `${formatDateArm(s)} - ${formatDateArm(e)}` };
    }

    // Default 'all'
    return { start: null, end: null, label: `Բոլոր Ժամանակները (${orders.length} պատվեր)` };
  }, [datePreset, customStartDate, customEndDate, orders.length]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Date filter
      if (dateRangeBounds.start && dateRangeBounds.end) {
        const pDate = parseDateSafe(order.purchaseDate) || parseDateSafe(order.deliveryDate);
        if (pDate) {
          if (pDate < dateRangeBounds.start || pDate > dateRangeBounds.end) {
            return false;
          }
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // Sale Type filter
      if (saleTypeFilter !== 'ALL' && order.saleType !== saleTypeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (order.id || '').toLowerCase().includes(q);
        const matchName = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.phoneNumber || '').toLowerCase().includes(q);
        const matchAddress = (order.address || '').toLowerCase().includes(q);
        const matchItems = (order.items || []).some(
          it => (it.code || '').toLowerCase().includes(q) || 
                (it.artikul || '').toLowerCase().includes(q) || 
                (it.name || '').toLowerCase().includes(q)
        );

        if (!matchId && !matchName && !matchPhone && !matchAddress && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, dateRangeBounds, statusFilter, saleTypeFilter, searchQuery]);

  // Delivery-specific orders (or fallback to all filtered if none are strictly marked delivery)
  const deliveryOrders = useMemo(() => {
    return filteredOrders.filter(o => {
      const st = String(o.saleType || '').toLowerCase();
      return o.saleType === SaleType.DELIVERY || st.includes('առաք') || st.includes('delivery');
    });
  }, [filteredOrders]);

  // Pickup / Store orders
  const pickupOrders = useMemo(() => {
    return filteredOrders.filter(o => {
      const st = String(o.saleType || '').toLowerCase();
      return o.saleType === SaleType.PICKUP || o.saleType === SaleType.ON_SITE || st.includes('խանութ') || st.includes('տեղում') || st.includes('pickup');
    });
  }, [filteredOrders]);

  // Display orders for delivery sheet (if no delivery orders found, show all filtered so user never gets blank 0)
  const displayDeliveryOrders = useMemo(() => {
    if (deliveryOrders.length > 0) return deliveryOrders;
    return filteredOrders;
  }, [deliveryOrders, filteredOrders]);

  // Display orders for pickup sheet
  const displayPickupOrders = useMemo(() => {
    if (pickupOrders.length > 0) return pickupOrders;
    return filteredOrders;
  }, [pickupOrders, filteredOrders]);

  // Supplier SKU Grouped Manifest
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

    filteredOrders.forEach(order => {
      const itemsList = Array.isArray(order.items) && order.items.length > 0 
        ? order.items 
        : [{ id: '1', code: 'PROD-01', name: 'Ապրանք', quantity: 1, price: order.totalAmount || 0 }];

      itemsList.forEach((item: OrderItem) => {
        const key = (item.code || item.artikul || item.name || 'SKU-01').toUpperCase().trim();
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
            name: item.name || item.code || 'Ապրանք',
            totalQuantity: qty,
            unitPrice: price,
            totalCost: (qty * price),
            orderIds: [order.id]
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredOrders]);

  // Financial Breakdown Statistics
  const financialStats = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let idramTotal = 0;
    let transferTotal = 0;
    let totalDiscounts = 0;
    let totalItemsCount = 0;

    filteredOrders.forEach(o => {
      const amount = Number(o.totalAmount) || 0;
      totalRevenue += amount;
      totalDiscounts += Number(o.discount) || 0;

      const itemsList = Array.isArray(o.items) && o.items.length > 0 ? o.items : [1];
      itemsList.forEach((it: any) => {
        totalItemsCount += (Number(it.quantity) || 1);
      });

      if (o.paymentStatus === PaymentStatus.PAID) {
        totalPaid += amount;
      } else if (o.paymentStatus === PaymentStatus.PARTIAL) {
        const prepay = Math.min(amount, o.prepaymentAmount || 0);
        totalPaid += prepay;
        totalUnpaid += Math.max(0, amount - prepay);
      } else {
        totalUnpaid += amount;
      }

      const method = o.paymentMethod || PaymentMethod.CASH;
      if (method === PaymentMethod.CASH || method === 'Կանխիկ') {
        cashTotal += amount;
      } else if (method === PaymentMethod.CARD || method === 'Քարտով (POS)') {
        cardTotal += amount;
      } else if (method === PaymentMethod.IDRAM || method === 'Idram') {
        idramTotal += amount;
      } else {
        transferTotal += amount;
      }
    });

    const avgCheck = filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0;

    return {
      totalRevenue,
      totalPaid,
      totalUnpaid,
      cashTotal,
      cardTotal,
      idramTotal,
      transferTotal,
      totalDiscounts,
      totalItemsCount,
      avgCheck,
      ordersCount: filteredOrders.length
    };
  }, [filteredOrders]);

  // Selected Order for Invoice
  const invoiceOrder = useMemo(() => {
    if (selectedInvoiceOrderId) {
      return filteredOrders.find(o => o.id === selectedInvoiceOrderId) || filteredOrders[0] || orders[0];
    }
    return filteredOrders[0] || orders[0];
  }, [selectedInvoiceOrderId, filteredOrders, orders]);

  // Document Title by Tab
  const docTitle = useMemo(() => {
    const dLabel = dateRangeBounds.label.replace(/[^a-zA-Z0-9_\u0530-\u058F]/g, '_');
    if (activeDocType === 'delivery') return `Առաքման_Թերթիկ_${dLabel}`;
    if (activeDocType === 'pickup') return `Խանութի_Թերթիկ_${dLabel}`;
    if (activeDocType === 'supplier') return `Մատակարարման_Ապրանքացանկ_${dLabel}`;
    if (activeDocType === 'financial') return `Ֆինանսական_Ամփոփագիր_${dLabel}`;
    return `Հաշիվ_Ապրանքագիր_${invoiceOrder ? invoiceOrder.id : 'POS'}_${dLabel}`;
  }, [activeDocType, dateRangeBounds, invoiceOrder]);

  // 1. Direct Print Handler (Clean native @media print)
  const handleDirectPrint = () => {
    posAudio.playScanBeep();
    window.print();
  };

  // 2. High Resolution PDF Download
  const handleDownloadPdf = async () => {
    const element = document.getElementById('report-document-sheet');
    if (!element) return;

    posAudio.playScanBeep();
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${docTitle}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('PDF ֆայլի ստեղծման սխալ։ Խնդրում ենք կրկին փորձել կամ օգտվել «Տպել» կոճակից։');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 3. Export to Excel / CSV with UTF-8 BOM
  const handleExportCsv = () => {
    posAudio.playScanBeep();
    let csvContent = '\uFEFF';

    if (activeDocType === 'supplier') {
      csvContent += '№,Կոդ (SKU),Արտիկուլ,Անվանում,Պահանջվող Քանակ,Միավորի Գին (֏),Ընդհանուր Գումար (֏),Պատվերների ID-ներ\n';
      supplierItemsManifest.forEach((item, idx) => {
        csvContent += `"${idx + 1}","${item.code}","${item.artikul}","${item.name.replace(/"/g, '""')}","${item.totalQuantity}","${item.unitPrice}","${item.totalCost}","${item.orderIds.join(', ')}"\n`;
      });
    } else if (activeDocType === 'financial') {
      csvContent += 'Ցուցանիշ,Արժեք\n';
      csvContent += `"Ժամանակահատված","${dateRangeBounds.label}"\n`;
      csvContent += `"Ընդհանուր Պատվերների Քանակ","${financialStats.ordersCount}"\n`;
      csvContent += `"Վաճառված Ապրանքների Քանակ","${financialStats.totalItemsCount}"\n`;
      csvContent += `"Ընդհանուր Հասույթ (֏)","${financialStats.totalRevenue}"\n`;
      csvContent += `"Միջին Չեկ (֏)","${financialStats.avgCheck}"\n`;
      csvContent += `"Կանխիկ Վճարումներ (֏)","${financialStats.cashTotal}"\n`;
      csvContent += `"Քարտային Վճարումներ POS (֏)","${financialStats.cardTotal}"\n`;
      csvContent += `"Idram Վճարումներ (֏)","${financialStats.idramTotal}"\n`;
      csvContent += `"Քարտին Փոխանցումներ (֏)","${financialStats.transferTotal}"\n`;
      csvContent += `"Վճարված Գումար (֏)","${financialStats.totalPaid}"\n`;
      csvContent += `"Չվճարված Գումար (֏)","${financialStats.totalUnpaid}"\n`;
    } else {
      const ordersToExport = activeDocType === 'delivery' ? displayDeliveryOrders : activeDocType === 'pickup' ? displayPickupOrders : filteredOrders;
      csvContent += 'ID,Ամսաթիվ,Հաճախորդ,Հեռախոս,Հասցե,Վաճառքի Տիպ,Վճարման Եղանակ,Կարգավիճակ,Գումար (֏),Նշումներ\n';
      ordersToExport.forEach(o => {
        csvContent += `"${o.id}","${o.purchaseDate || ''}","${(o.customerName || '').replace(/"/g, '""')}","${o.phoneNumber || ''}","${(o.address || '').replace(/"/g, '""')}","${o.saleType}","${o.paymentMethod || ''}","${o.status}","${o.totalAmount}","${(o.cashierNote || o.notes || '').replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${docTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Copy Text for Instant Messenger Sharing (Viber / WhatsApp / Telegram)
  const handleCopyFormattedText = () => {
    posAudio.playScanBeep();
    let text = `📄 ${companyInfo.name}\n${docTitle.replace(/_/g, ' ')}\nԺամանակահատված՝ ${dateRangeBounds.label}\n\n`;

    if (activeDocType === 'delivery') {
      text += `🚚 ԱՌԱՔՄԱՆ ՑԱՆԿ (${displayDeliveryOrders.length} պատվեր)․\n`;
      displayDeliveryOrders.forEach((o, i) => {
        text += `${i + 1}. #${o.id} | ${o.customerName || 'Անհայտ'} | 📞 ${o.phoneNumber || '---'} | 📍 ${o.address || '---'} | 💰 ${(o.totalAmount || 0).toLocaleString()} ֏ | [${o.status}]\n`;
      });
    } else if (activeDocType === 'pickup') {
      text += `🏪 ԽԱՆՈՒԹԻ ՑԱՆԿ (${displayPickupOrders.length} պատվեր)․\n`;
      displayPickupOrders.forEach((o, i) => {
        text += `${i + 1}. #${o.id} | ${o.customerName || 'Անհայտ'} | 📞 ${o.phoneNumber || '---'} | 💰 ${(o.totalAmount || 0).toLocaleString()} ֏ | [${o.status}]\n`;
      });
    } else if (activeDocType === 'supplier') {
      text += `📦 ՄԱՏԱԿԱՐԱՐՄԱՆ ԱՊՐԱՆՔՆԵՐ (${supplierItemsManifest.length} տեսակ)․\n`;
      supplierItemsManifest.forEach((item, i) => {
        text += `${i + 1}. [${item.code}] ${item.name} — Քանակ՝ ${item.totalQuantity} հատ (${item.totalCost.toLocaleString()} ֏)\n`;
      });
      text += `\nԸնդհանուր մատակարարման արժեք՝ ${financialStats.totalRevenue.toLocaleString()} ֏\n`;
    } else if (activeDocType === 'financial') {
      text += `🧾 ՖԻՆԱՆՍԱԿԱՆ ԱՄՓՈՓՈՒՄ․\n`;
      text += `- Ընդհանուր Հասույթ՝ ${financialStats.totalRevenue.toLocaleString()} ֏\n`;
      text += `- Պատվերների Քանակ՝ ${financialStats.ordersCount}\n`;
      text += `- Կանխիկ՝ ${financialStats.cashTotal.toLocaleString()} ֏\n`;
      text += `- Քարտ (POS)՝ ${financialStats.cardTotal.toLocaleString()} ֏\n`;
      text += `- Idram / Փոխանցում՝ ${(financialStats.idramTotal + financialStats.transferTotal).toLocaleString()} ֏\n`;
    } else if (invoiceOrder) {
      text += `📄 ՀԱՇԻՎ-ԱՊՐԱՆՔԱԳԻՐ #${invoiceOrder.id}\n`;
      text += `Հաճախորդ՝ ${invoiceOrder.customerName || 'Անհայտ'} (📞 ${invoiceOrder.phoneNumber || ''})\n`;
      text += `Հասցե՝ ${invoiceOrder.address || '---'}\n`;
      text += `Գումար՝ ${(invoiceOrder.totalAmount || 0).toLocaleString()} ֏\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // 5. Open Email Modal
  const handleOpenEmailModal = () => {
    posAudio.playScanBeep();
    let subject = `📄 ${docTitle.replace(/_/g, ' ')} — ${companyInfo.name}`;
    let body = `Հարգելի գործընկեր,\n\nԿից ներկայացնում ենք «${companyInfo.name}» POS համակարգի փաստաթուղթը (${dateRangeBounds.label})․\n\n`;

    if (activeDocType === 'delivery') {
      body += `🚚 Առաքման պատվերներ՝ ${displayDeliveryOrders.length} հատ\nԸնդհանուր գումար՝ ${displayDeliveryOrders.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString()} ֏\n\n`;
      displayDeliveryOrders.forEach((o, i) => {
        body += `${i + 1}. #${o.id} | ${o.customerName || 'Անհայտ'} | ${o.phoneNumber || ''} | ${o.address || ''} | ${o.totalAmount.toLocaleString()} ֏\n`;
      });
    } else if (activeDocType === 'supplier') {
      body += `📦 Պահանջվող ապրանքներ մատակարարման համար՝\n\n`;
      supplierItemsManifest.forEach((item, i) => {
        body += `${i + 1}. [${item.code}] ${item.name} — ${item.totalQuantity} հատ (${item.totalCost.toLocaleString()} ֏)\n`;
      });
    } else {
      body += `Ընդհանուր պատվերներ՝ ${filteredOrders.length} հատ\nԸնդհանուր հասույթ՝ ${financialStats.totalRevenue.toLocaleString()} ֏\n`;
    }

    setEmailSubject(subject);
    setEmailBody(body);
    setEmailRecipient('');
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) return;
    const mailtoUrl = `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    setEmailSentSuccess(true);
    setTimeout(() => {
      setEmailSentSuccess(false);
      setIsEmailModalOpen(false);
    }, 1500);
  };

  // Reset all filters to show everything
  const handleResetFilters = () => {
    posAudio.playScanBeep();
    setDatePreset('all');
    setStatusFilter('ALL');
    setSaleTypeFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      
      {/* 1. TOP SYNCHRONOUS APP HEADER BANNER */}
      <div className="solid-card p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToOrders}
              className="btn btn-ghost"
              title="Վերադառնալ Պատվերներին"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Պատվերներ</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-primary-ink rounded-lg border border-indigo-100">
                  <FileText className="w-4 h-4" />
                </span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Փաստաթղթերի & PDF Հաշվետվությունների Կենտրոն
                </h1>
                <span className="badge badge-primary font-mono tabular-nums">
                  {filteredOrders.length} պատվեր
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Պաշտոնական առաքման թերթիկներ, մատակարարման ցանկեր, ֆինանսական ամփոփագրեր և հաշիվ-ապրանքագրեր
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="relative flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Honest indeterminate progress while html2canvas/jsPDF render */}
            {isGeneratingPdf && (
              <div className="absolute -bottom-1.5 left-0 right-0 pointer-events-none">
                <div className="preloader-bar" />
              </div>
            )}
            
            {/* Copy Messenger Text */}
            <button
              onClick={handleCopyFormattedText}
              className="btn btn-ghost"
              title="Պատճենել տեքստը Viber/WhatsApp/Telegram-ի համար"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span className="hidden sm:inline">{copiedToast ? 'Պատճենվեց' : 'Պատճենել'}</span>
            </button>

            {/* Email Share */}
            <button
              onClick={handleOpenEmailModal}
              className="btn btn-ghost"
              title="Ուղարկել Էլ․ Փոստով"
            >
              <Mail className="w-4 h-4 text-primary-ink" />
              <span className="hidden sm:inline">Email</span>
            </button>

            {/* Excel / CSV Export */}
            <button
              onClick={handleExportCsv}
              className="btn btn-md btn-soft-success"
              title="Արտահանել Excel / CSV ֆայլ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Excel (CSV)</span>
            </button>

            {/* Direct Print */}
            <button
              onClick={handleDirectPrint}
              className="btn btn-dark"
              title="Ուղիղ Տպել թղթի վրա (A4 / Կտրոն)"
            >
              <Printer className="w-4 h-4 text-white/85" aria-hidden="true" />
              <span>Տպել</span>
            </button>

            {/* PDF Download */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="btn btn-md btn-primary"
              title="Ներբեռնել PDF Ֆայլը"
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" aria-hidden="true" />
              )}
              <span>PDF Ներբեռնել</span>
            </button>

          </div>

        </div>
      </div>

      {/* 2. SYNCHRONIZED TOP METRIC KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Revenue */}
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all hover:-translate-y-px">
          <div className="flex items-center justify-between">
            <span className="section-title text-slate-500">Ընդհանուր Հասույթ</span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {financialStats.totalRevenue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">֏</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Միջին չեկ՝</span>
            <span className="font-mono font-bold text-slate-700">{financialStats.avgCheck.toLocaleString()} ֏</span>
          </div>
        </div>

        {/* Metric 2: Orders Count */}
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all hover:-translate-y-px">
          <div className="flex items-center justify-between">
            <span className="section-title text-slate-500">Պատվերների Քանակ</span>
            <span className="p-2 bg-indigo-50 text-primary-ink rounded-xl">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-primary-ink tracking-tight">
              {financialStats.ordersCount}
            </span>
            <span className="text-xs font-bold text-slate-500">հատ</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Առաքումներ՝</span>
            <span className="font-mono font-bold text-primary-ink">{deliveryOrders.length} առաքում</span>
          </div>
        </div>

        {/* Metric 3: SKU & Units Total */}
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all hover:-translate-y-px">
          <div className="flex items-center justify-between">
            <span className="section-title text-slate-500">Ապրանքների Քանակ</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-700 tracking-tight">
              {financialStats.totalItemsCount}
            </span>
            <span className="text-xs font-bold text-slate-500">հատ</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Տեսականի (SKU)՝</span>
            <span className="font-mono font-bold text-slate-700">{supplierItemsManifest.length} տեսակ</span>
          </div>
        </div>

        {/* Metric 4: Cash vs Card */}
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs transition-all hover:-translate-y-px">
          <div className="flex items-center justify-between">
            <span className="section-title text-slate-500">Վճարումներ</span>
            <span className="p-2 bg-sky-50 text-sky-700 rounded-xl">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {financialStats.totalPaid.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">֏ վճարված</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Կանխիկ / Քարտ՝</span>
            <span className="font-mono font-bold text-slate-700">
              {financialStats.cashTotal.toLocaleString()} / {financialStats.cardTotal.toLocaleString()} ֏
            </span>
          </div>
        </div>

      </div>

      {/* 3. FIVE PROFESSIONAL DOCUMENT TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* Tab 1: Delivery Sheet */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveDocType('delivery');
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer relative overflow-hidden ${
            activeDocType === 'delivery'
              ? 'bg-primary border-white/20 text-white shadow-md ring-2 ring-white/15'
              : 'bg-surface border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2 rounded-xl ${activeDocType === 'delivery' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-primary-ink'}`}>
              <Truck className="w-4 h-4" />
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              activeDocType === 'delivery' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {displayDeliveryOrders.length}
            </span>
          </div>
          <h3 className="text-xs font-bold">1․ Առաքման Թերթիկ</h3>
          <p className={`text-2xs mt-0.5 line-clamp-1 ${activeDocType === 'delivery' ? 'text-white/80' : 'text-slate-500'}`}>
            Առաքիչների երթուղի, հասցեներ, գումար
          </p>
        </button>

        {/* Tab 2: Pickup / Store Sheet */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveDocType('pickup');
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer relative overflow-hidden ${
            activeDocType === 'pickup'
              ? 'bg-primary border-white/20 text-white shadow-md ring-2 ring-white/15'
              : 'bg-surface border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2 rounded-xl ${activeDocType === 'pickup' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-primary-ink'}`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              activeDocType === 'pickup' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {displayPickupOrders.length}
            </span>
          </div>
          <h3 className="text-xs font-bold">2․ Խանութի Թերթիկ</h3>
          <p className={`text-2xs mt-0.5 line-clamp-1 ${activeDocType === 'pickup' ? 'text-white/80' : 'text-slate-500'}`}>
            Մոտեցնելու և տեղում պատվերներ
          </p>
        </button>

        {/* Tab 3: Supplier SKU Order Book */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveDocType('supplier');
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer relative overflow-hidden ${
            activeDocType === 'supplier'
              ? 'bg-primary border-white/20 text-white shadow-md ring-2 ring-white/15'
              : 'bg-surface border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2 rounded-xl ${activeDocType === 'supplier' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>
              <Package className="w-4 h-4" />
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              activeDocType === 'supplier' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {supplierItemsManifest.length} SKU
            </span>
          </div>
          <h3 className="text-xs font-bold">3․ Մատակարարման Ցանկ</h3>
          <p className={`text-2xs mt-0.5 line-clamp-1 ${activeDocType === 'supplier' ? 'text-white/80' : 'text-slate-500'}`}>
            Համախմբված SKU կոդեր և քանակներ
          </p>
        </button>

        {/* Tab 4: Financial Summary */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveDocType('financial');
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer relative overflow-hidden ${
            activeDocType === 'financial'
              ? 'bg-primary border-white/20 text-white shadow-md ring-2 ring-white/15'
              : 'bg-surface border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2 rounded-xl ${activeDocType === 'financial' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
              <Receipt className="w-4 h-4" />
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              activeDocType === 'financial' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              Z-Report
            </span>
          </div>
          <h3 className="text-xs font-bold">4․ Ֆինանսական Ամփոփագիր</h3>
          <p className={`text-2xs mt-0.5 line-clamp-1 ${activeDocType === 'financial' ? 'text-white/80' : 'text-slate-500'}`}>
            Դրամարկղ, կանխիկ, POS քարտեր
          </p>
        </button>

        {/* Tab 5: Commercial Invoice */}
        <button
          onClick={() => {
            posAudio.playScanBeep();
            setActiveDocType('invoice');
          }}
          className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border text-left transition-all hover:-translate-y-px active:scale-[0.99] cursor-pointer relative overflow-hidden ${
            activeDocType === 'invoice'
              ? 'bg-primary border-white/20 text-white shadow-md ring-2 ring-white/15'
              : 'bg-surface border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className={`p-2 rounded-xl ${activeDocType === 'invoice' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'}`}>
              <Building className="w-4 h-4" />
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
              activeDocType === 'invoice' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              Invoice
            </span>
          </div>
          <h3 className="text-xs font-bold">5․ Հաշիվ-Ապրանքագիր</h3>
          <p className={`text-2xs mt-0.5 line-clamp-1 ${activeDocType === 'invoice' ? 'text-white/80' : 'text-slate-500'}`}>
            Պաշտոնական հաշիվ-ապրանքագիր
          </p>
        </button>

      </div>

      {/* 4. SYNCHRONIZED FILTERS CONTROL BAR */}
      <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        
        {/* Row 1: Quick Date Presets & Custom Dates */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="section-title text-slate-500 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-primary-ink" />
              <span>Ամսաթիվ՝</span>
            </span>

            {[
              { id: 'all', label: `Բոլորը (${orders.length})` },
              { id: 'today', label: `Այսօր` },
              { id: 'yesterday', label: 'Երեկ' },
              { id: 'this-week', label: 'Այս Շաբաթ' },
              { id: 'this-month', label: 'Այս Ամիս' },
              { id: 'custom', label: 'Օրացույց' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  posAudio.playScanBeep();
                  setDatePreset(preset.id as DateFilterPreset);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-[0.97] cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-ink-inverse text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs animate-rise-in">
              <input
                type="date"
                value={customStartDate}
                aria-label="Սկզբի ամսաթիվ"
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-surface border border-slate-200 px-2 py-1 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-primary-ink focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-slate-500 font-bold">—</span>
              <input
                type="date"
                value={customEndDate}
                aria-label="Վերջի ամսաթիվ"
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-surface border border-slate-200 px-2 py-1 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-primary-ink focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          {/* Live Zoom Controls for Preview */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-2xs font-bold text-slate-500 px-1.5">Մասշտաբ՝</span>
            <button
              onClick={() => setZoomLevel(80)}
              className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-all active:scale-95 ${
                zoomLevel === 80 ? 'bg-surface shadow-edge text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80%
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-all active:scale-95 ${
                zoomLevel === 100 ? 'bg-surface shadow-edge text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              100%
            </button>
            <button
              onClick={() => setZoomLevel(120)}
              className={`px-2 py-0.5 rounded-lg font-bold cursor-pointer transition-all active:scale-95 ${
                zoomLevel === 120 ? 'bg-surface shadow-edge text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              120%
            </button>
          </div>

        </div>

        {/* Row 2: Secondary Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              aria-label="Փնտրել ըստ կոդի, հաճախորդի, հասցեի, հեռախոսի"
              type="text"
              placeholder="Փնտրել ըստ կոդի, հաճախորդի, հասցեի, հեռախոսի..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-primary-ink focus:ring-2 focus:ring-primary/40 focus:bg-surface"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-all duration-150 active:scale-90 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold text-xs">Կարգավիճակ՝</span>
            <SelectField
              aria-label="Կարգավիճակ"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              size="sm"
            >
              <option value="ALL">Բոլորը</option>
              {Object.values(OrderStatus).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </SelectField>
          </div>

          {/* Sale Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold text-xs">Տեսակ՝</span>
            <SelectField
              aria-label="Տեսակ"
              value={saleTypeFilter}
              onChange={(v) => setSaleTypeFilter(v)}
              size="sm"
            >
              <option value="ALL">Բոլոր Տիպերը</option>
              {Object.values(SaleType).map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </SelectField>
          </div>

          {/* If Invoice Mode, Picker for Order */}
          {activeDocType === 'invoice' && filteredOrders.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs animate-rise-in">
              <span className="text-primary-ink font-bold text-xs">Պատվեր՝</span>
              <SelectField
                aria-label="Պատվեր"
                value={selectedInvoiceOrderId || (filteredOrders[0] ? filteredOrders[0].id : '')}
                onChange={(v) => setSelectedInvoiceOrderId(v)}
                size="sm"
                className="font-mono"
              >
                {filteredOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{o.id} — {o.customerName || 'Անհայտ'} ({o.totalAmount.toLocaleString()} ֏)
                  </option>
                ))}
              </SelectField>
            </div>
          )}

          {/* Reset Filters button if any filter applied */}
          {(datePreset !== 'all' || statusFilter !== 'ALL' || saleTypeFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all active:scale-95 border border-rose-200 cursor-pointer"
            >
              Մաքրել ֆիլտրերը
            </button>
          )}

        </div>

      </div>

      {/* 5. A4 PAPER DOCUMENT CANVAS (ENTERPRISE PRESENTATION & PRINT PREVIEW) */}
      <div className="bg-slate-200/80 border border-slate-300/80 rounded-2xl p-3 sm:p-8 overflow-x-auto flex justify-center shadow-inner">
        
        <div 
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-200 ease-premium"
        >
          {/* THE PRINTABLE / PDF SHEET */}
          <div 
            id="report-document-sheet" 
            className="w-[210mm] min-h-[297mm] bg-surface text-slate-900 p-8 sm:p-12 shadow-raised rounded-sm border border-slate-200 text-xs leading-relaxed flex flex-col justify-between"
          >
            <div>
              
              {/* DOCUMENT CORPORATE HEADER */}
              <div className="border-b-2 border-slate-900 pb-5 mb-6">
                <div className="flex items-start justify-between">
                  
                  {/* Left: Branding info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-ink-inverse text-white font-black text-xs px-2 py-0.5 rounded tracking-wider font-mono uppercase">
                        tab.am POS
                      </span>
                      <span className="text-2xs font-bold text-slate-500 uppercase tracking-widest">
                        Պաշտոնական Հաշվետվական Փաստաթուղթ
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight mt-1.5">
                      {activeDocType === 'delivery' && 'ԱՌԱՔՄԱՆ ԹԵՐԹԻԿ (DELIVERY MANIFEST)'}
                      {activeDocType === 'pickup' && 'ԽԱՆՈՒԹԻ ԵՎ ՄՈՏԵՑՄԱՆ ԹԵՐԹԻԿ (STORE PICKUP MANIFEST)'}
                      {activeDocType === 'supplier' && 'ՄԱՏԱԿԱՐԱՐՄԱՆ ԱՊՐԱՆՔԱՑԱՆԿ (SUPPLIER PURCHASE MANIFEST)'}
                      {activeDocType === 'financial' && 'ՖԻՆԱՆՍԱԿԱՆ ԵՎ ԴՐԱՄԱՐԿՂԻ ԱՄՓՈՓԱԳԻՐ (Z-REPORT)'}
                      {activeDocType === 'invoice' && `📄 ՀԱՇԻՎ-ԱՊՐԱՆՔԱԳԻՐ #${invoiceOrder ? invoiceOrder.id : '---'}`}
                    </h2>

                    <div className="text-2xs text-slate-600 font-medium space-y-0.5 mt-1">
                      <p><span className="font-bold">Կազմակերպություն՝</span> {companyInfo.name} • {companyInfo.branch}</p>
                      <p><span className="font-bold">Հասցե / Հեռախոս՝</span> {companyInfo.address} • {companyInfo.phone}</p>
                      <p><span className="font-bold">ՀՎՀՀ՝</span> {companyInfo.taxNumber}</p>
                    </div>
                  </div>

                  {/* Right: Meta Badge & Date */}
                  <div className="text-right space-y-1 font-mono">
                    <div className="inline-block bg-ink-inverse text-white text-2xs font-black px-3 py-1 rounded">
                      {activeDocType === 'delivery' && `${displayDeliveryOrders.length} ՊԱՏՎԵՐ`}
                      {activeDocType === 'pickup' && `${displayPickupOrders.length} ՊԱՏՎԵՐ`}
                      {activeDocType === 'supplier' && `${supplierItemsManifest.length} SKU ԱՊՐԱՆՔ`}
                      {activeDocType === 'financial' && `ՀԱՍՈՒՅԹ՝ ${financialStats.totalRevenue.toLocaleString()} ֏`}
                      {activeDocType === 'invoice' && `ԳՈՒՄԱՐ՝ ${(invoiceOrder?.totalAmount || 0).toLocaleString()} ֏`}
                    </div>
                    <div className="text-2xs text-slate-600 space-y-0.5">
                      <p><span className="font-bold">Ամսաթիվ՝</span> {dateRangeBounds.label}</p>
                      <p><span className="font-bold">Տպման պահը՝</span> {new Date().toLocaleDateString('hy-AM')} {new Date().toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p><span className="font-bold">Կարգավիճակ՝</span> {statusFilter === 'ALL' ? 'Բոլորը' : statusFilter}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* EMPTY STATE IF 0 ORDERS IN FILTER */}
              {filteredOrders.length === 0 ? (
                <div className="state-card my-6">
                  <div className="state-icon bg-amber-50 border-amber-200 text-amber-700"><AlertCircle className="w-7 h-7" /></div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">Ընտրված ֆիլտրերով պատվերներ չեն գտնվել</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Համակարգում առկա է ընդհանուր <strong className="text-slate-800">{orders.length} պատվեր</strong>։ Սեղմեք ստորև կոճակը՝ բոլոր պատվերները PDF-ում ներառելու համար։
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="btn btn-md btn-primary"
                  >
                    Ցուցադրել Բոլոր Պատվերները ({orders.length} պատվեր)
                  </button>
                </div>
              ) : (
                <>
                  {/* DOCUMENT BODY ACCORDING TO ACTIVE TAB */}

                  {/* 1. DELIVERY MANIFEST TABLE */}
                  {activeDocType === 'delivery' && (
                    <div className="space-y-4">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-2xs font-black uppercase">
                            <th className="p-2 border-r border-slate-300 w-8 text-center">№</th>
                            <th className="p-2 border-r border-slate-300 w-24">ID / Ամսաթիվ</th>
                            <th className="p-2 border-r border-slate-300 w-44">Հաճախորդ & Հեռախոս</th>
                            <th className="p-2 border-r border-slate-300">Հասցե & Նշումներ</th>
                            <th className="p-2 border-r border-slate-300 w-48">Ապրանքներ (Կոդ / Քանակ)</th>
                            <th className="p-2 border-r border-slate-300 w-24 text-right">Գումար</th>
                            <th className="p-2 w-24 text-center">Ստորագրություն</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayDeliveryOrders.map((order, idx) => (
                            <tr key={order.id} className={idx % 2 === 0 ? 'bg-surface' : 'bg-slate-50/50'}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-mono">
                                <div className="font-bold text-slate-950">#{order.id}</div>
                                <div className="text-2xs text-slate-500">{order.purchaseDate || '---'}</div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-2xs font-bold mt-0.5 bg-slate-100 border border-slate-200 text-slate-700">
                                  {order.saleType}
                                </span>
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <div className="font-bold text-slate-900">{order.customerName || 'Անհայտ հաճախորդ'}</div>
                                <div className="font-mono text-slate-600 font-bold">{order.phoneNumber || '---'}</div>
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <div className="font-medium text-slate-800">{order.address || 'Հասցեն նշված չէ'}</div>
                                {(order.cashierNote || order.notes) && (
                                  <div className="text-2xs text-indigo-900 bg-indigo-50/60 p-1 rounded mt-1 border border-indigo-100 font-medium">
                                    💬 {order.cashierNote || order.notes}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <div className="space-y-0.5">
                                  {(order.items && order.items.length > 0 ? order.items : []).map((it, i) => (
                                    <div key={i} className="flex justify-between items-center text-2xs">
                                      <span className="font-mono font-bold text-slate-700 truncate max-w-[120px]">
                                        [{it.code || 'SKU'}] {it.name || ''}
                                      </span>
                                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-1 rounded">
                                        ×{it.quantity}
                                      </span>
                                    </div>
                                  ))}
                                  {(!order.items || order.items.length === 0) && (
                                    <span className="text-2xs text-slate-500">1 հատ (Ընդհանուր)</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono">
                                <div className="font-black text-slate-950 text-xs">{(order.totalAmount || 0).toLocaleString()} ֏</div>
                                <div className="text-2xs font-bold text-slate-500">{order.paymentMethod || 'Կանխիկ'}</div>
                                <div className={`text-2xs font-bold ${order.paymentStatus === PaymentStatus.PAID ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {order.paymentStatus}
                                </div>
                              </td>
                              <td className="p-2 text-center align-bottom pb-1">
                                <div className="w-full border-b border-slate-400 border-dashed mb-1 h-6"></div>
                                <span className="text-2xs text-slate-500">ստացա / ստորագր․</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-ink-inverse text-white font-black text-xs">
                            <td colSpan={5} className="p-2.5 text-right uppercase">ԸՆԴԱՄԵՆԸ ({displayDeliveryOrders.length} ՊԱՏՎԵՐ)․</td>
                            <td className="p-2.5 text-right font-mono font-black">
                              {displayDeliveryOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0).toLocaleString()} ֏
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* 2. STORE PICKUP & ON-SITE TABLE */}
                  {activeDocType === 'pickup' && (
                    <div className="space-y-4">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-2xs font-black uppercase">
                            <th className="p-2 border-r border-slate-300 w-8 text-center">№</th>
                            <th className="p-2 border-r border-slate-300 w-24">ID / Ամսաթիվ</th>
                            <th className="p-2 border-r border-slate-300 w-44">Հաճախորդ & Հեռախոս</th>
                            <th className="p-2 border-r border-slate-300 w-32">Մասնաճյուղ / Տեսակ</th>
                            <th className="p-2 border-r border-slate-300">Ապրանքներ (Կոդ / Քանակ)</th>
                            <th className="p-2 border-r border-slate-300 w-28 text-right">Գումար</th>
                            <th className="p-2 w-24 text-center">Կարգավիճակ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {displayPickupOrders.map((order, idx) => (
                            <tr key={order.id} className={idx % 2 === 0 ? 'bg-surface' : 'bg-slate-50/50'}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-mono">
                                <div className="font-bold text-slate-950">#{order.id}</div>
                                <div className="text-2xs text-slate-500">{order.purchaseDate || '---'}</div>
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <div className="font-bold text-slate-900">{order.customerName || 'Անհայտ հաճախորդ'}</div>
                                <div className="font-mono text-slate-600 font-bold">{order.phoneNumber || '---'}</div>
                              </td>
                              <td className="p-2 border-r border-slate-300 font-medium">
                                <div className="font-bold text-slate-800">{order.pickupBranch || 'Գլխավոր Սրահ'}</div>
                                <div className="text-2xs text-slate-500">{order.saleType}</div>
                              </td>
                              <td className="p-2 border-r border-slate-300">
                                <div className="space-y-0.5">
                                  {(order.items && order.items.length > 0 ? order.items : []).map((it, i) => (
                                    <div key={i} className="flex justify-between items-center text-2xs">
                                      <span className="font-mono font-bold text-slate-700 truncate max-w-[160px]">
                                        [{it.code || 'SKU'}] {it.name || ''}
                                      </span>
                                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-1 rounded">
                                        ×{it.quantity}
                                      </span>
                                    </div>
                                  ))}
                                  {(!order.items || order.items.length === 0) && (
                                    <span className="text-2xs text-slate-500">1 հատ</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono">
                                <div className="font-black text-slate-950 text-xs">{(order.totalAmount || 0).toLocaleString()} ֏</div>
                                <div className="text-2xs font-bold text-slate-500">{order.paymentMethod || 'Կանխիկ'}</div>
                              </td>
                              <td className="p-2 text-center font-bold text-2xs">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-ink-inverse text-white font-black text-xs">
                            <td colSpan={5} className="p-2.5 text-right uppercase">ԸՆԴԱՄԵՆԸ ({displayPickupOrders.length} ՊԱՏՎԵՐ)․</td>
                            <td className="p-2.5 text-right font-mono font-black">
                              {displayPickupOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0).toLocaleString()} ֏
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* 3. SUPPLIER SKU MANIFEST TABLE */}
                  {activeDocType === 'supplier' && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900 text-2xs font-medium flex items-center justify-between">
                        <span>Համախմբված ապրանքացանկ՝ ըստ SKU կոդերի, գործարանային արտիկուլների և պահանջվող քանակների․</span>
                        <span className="font-bold font-mono">{supplierItemsManifest.length} տեսակ SKU</span>
                      </div>

                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-2xs font-black uppercase">
                            <th className="p-2 border-r border-slate-300 w-8 text-center">№</th>
                            <th className="p-2 border-r border-slate-300 w-28">Կոդ (SKU)</th>
                            <th className="p-2 border-r border-slate-300 w-28">Արտիկուլ</th>
                            <th className="p-2 border-r border-slate-300">Ապրանքի Անվանում</th>
                            <th className="p-2 border-r border-slate-300 w-24 text-center bg-indigo-50/50 text-indigo-950 font-black">Քանակ</th>
                            <th className="p-2 border-r border-slate-300 w-24 text-right">Միավորի Գին</th>
                            <th className="p-2 border-r border-slate-300 w-28 text-right">Ընդհանուր</th>
                            <th className="p-2 w-32">Պատվերներ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {supplierItemsManifest.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-surface' : 'bg-slate-50/50'}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-mono font-black text-indigo-900">{item.code}</td>
                              <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-600">{item.artikul}</td>
                              <td className="p-2 border-r border-slate-300 font-medium text-slate-900">{item.name}</td>
                              <td className="p-2 border-r border-slate-300 text-center font-mono font-black text-sm bg-indigo-50/30 text-indigo-900">
                                {item.totalQuantity} հատ
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono font-bold text-slate-700">
                                {item.unitPrice.toLocaleString()} ֏
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono font-black text-slate-950">
                                {item.totalCost.toLocaleString()} ֏
                              </td>
                              <td className="p-2 font-mono text-2xs text-slate-500">
                                {item.orderIds.map(id => `#${id}`).join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-ink-inverse text-white font-black text-xs">
                            <td colSpan={4} className="p-2.5 text-right uppercase">ԸՆԴԱՄԵՆԸ ՄԱՏԱԿԱՐԱՐՄԱՆ ՀԱՄԱՐ․</td>
                            <td className="p-2.5 text-center font-mono font-black text-sm bg-ink-inverse">
                              {supplierItemsManifest.reduce((s, i) => s + i.totalQuantity, 0)} հատ
                            </td>
                            <td></td>
                            <td className="p-2.5 text-right font-mono font-black text-sm">
                              {supplierItemsManifest.reduce((s, i) => s + i.totalCost, 0).toLocaleString()} ֏
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* 4. FINANCIAL Z-REPORT AUDIT */}
                  {activeDocType === 'financial' && (
                    <div className="space-y-6">
                      
                      {/* Financial Metrics Cards inside A4 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="border border-slate-300 p-3 bg-slate-50 rounded">
                          <span className="text-2xs font-bold uppercase text-slate-500 block">Ընդհանուր Շրջանառություն</span>
                          <span className="text-base font-black font-mono text-slate-950">{financialStats.totalRevenue.toLocaleString()} ֏</span>
                          <span className="text-2xs text-slate-500 block mt-0.5">{financialStats.ordersCount} պատվեր / {financialStats.totalItemsCount} ապրանք</span>
                        </div>

                        <div className="border border-slate-300 p-3 bg-slate-50 rounded">
                          <span className="text-2xs font-bold uppercase text-slate-500 block">Կանխիկ Վճարումներ</span>
                          <span className="text-base font-black font-mono text-emerald-800">{financialStats.cashTotal.toLocaleString()} ֏</span>
                          <span className="text-2xs text-slate-500 block mt-0.5">Դրամարկղի կանխիկ մնացորդ</span>
                        </div>

                        <div className="border border-slate-300 p-3 bg-slate-50 rounded">
                          <span className="text-2xs font-bold uppercase text-slate-500 block">Անկանխիկ (POS Քարտ + Idram)</span>
                          <span className="text-base font-black font-mono text-sky-800">{(financialStats.cardTotal + financialStats.idramTotal + financialStats.transferTotal).toLocaleString()} ֏</span>
                          <span className="text-2xs text-slate-500 block mt-0.5">Բանկային հաշվեհամարներ</span>
                        </div>
                      </div>

                      {/* Orders Log for Audit */}
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-2xs font-black uppercase">
                            <th className="p-2 border-r border-slate-300 w-8 text-center">№</th>
                            <th className="p-2 border-r border-slate-300 w-24">ID</th>
                            <th className="p-2 border-r border-slate-300 w-28">Ամսաթիվ</th>
                            <th className="p-2 border-r border-slate-300">Հաճախորդ</th>
                            <th className="p-2 border-r border-slate-300 w-28">Վճարման Տեսակ</th>
                            <th className="p-2 border-r border-slate-300 w-24 text-center">Կարգավիճակ</th>
                            <th className="p-2 w-28 text-right">Գումար</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredOrders.map((order, idx) => (
                            <tr key={order.id} className={idx % 2 === 0 ? 'bg-surface' : 'bg-slate-50/50'}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-900">#{order.id}</td>
                              <td className="p-2 border-r border-slate-300 font-mono text-2xs text-slate-600">{order.purchaseDate || '---'}</td>
                              <td className="p-2 border-r border-slate-300 font-medium text-slate-900">{order.customerName || 'Անհայտ'}</td>
                              <td className="p-2 border-r border-slate-300 font-bold text-slate-700">{order.paymentMethod || 'Կանխիկ'}</td>
                              <td className="p-2 border-r border-slate-300 text-center font-bold text-2xs">
                                <span className={`px-2 py-0.5 rounded ${order.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {order.paymentStatus}
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono font-black text-slate-950">{(order.totalAmount || 0).toLocaleString()} ֏</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-ink-inverse text-white font-black text-xs">
                            <td colSpan={6} className="p-2.5 text-right uppercase">ԸՆԴԱՄԵՆԸ ՀԱՍՈՒՅԹ․</td>
                            <td className="p-2.5 text-right font-mono font-black text-sm">
                              {financialStats.totalRevenue.toLocaleString()} ֏
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* 5. COMMERCIAL INVOICE */}
                  {activeDocType === 'invoice' && invoiceOrder && (
                    <div className="space-y-6">
                      
                      {/* Customer & Order Metadata */}
                      <div className="grid grid-cols-2 gap-6 p-4 border border-slate-300 bg-slate-50 rounded">
                        <div>
                          <span className="text-2xs font-black uppercase text-slate-500 tracking-wider block mb-1">ԳՆՈՐԴ / ՀԱՃԱԽՈՐԴ</span>
                          <p className="text-sm font-black text-slate-900">{invoiceOrder.customerName || 'Անհայտ Հաճախորդ'}</p>
                          <p className="text-xs text-slate-700 font-mono font-bold mt-0.5"><Phone className="w-3 h-3 shrink-0 inline-block" aria-hidden="true" /> {invoiceOrder.phoneNumber || '---'}</p>
                          <p className="text-xs text-slate-600 mt-0.5"><MapPin className="w-3 h-3 shrink-0 inline-block" aria-hidden="true" /> {invoiceOrder.address || 'Հասցեն նշված չէ'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xs font-black uppercase text-slate-500 tracking-wider block mb-1">ՊԱՏՎԵՐԻ ՏՎՅԱԼՆԵՐ</span>
                          <p className="text-sm font-black font-mono text-slate-900">Համար՝ #{invoiceOrder.id}</p>
                          <p className="text-xs text-slate-700 mt-0.5">Ամսաթիվ՝ <span className="font-mono font-bold">{invoiceOrder.purchaseDate || todayStr}</span></p>
                          <p className="text-xs text-slate-600 mt-0.5">Տեսակ՝ <span className="font-bold">{invoiceOrder.saleType}</span></p>
                          <p className="text-xs text-slate-600 mt-0.5">Վճարում՝ <span className="font-bold">{invoiceOrder.paymentMethod || 'Կանխիկ'} ({invoiceOrder.paymentStatus})</span></p>
                        </div>
                      </div>

                      {/* Items Table */}
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 text-2xs font-black uppercase">
                            <th className="p-2 border-r border-slate-300 w-8 text-center">№</th>
                            <th className="p-2 border-r border-slate-300 w-28">Կոդ (SKU)</th>
                            <th className="p-2 border-r border-slate-300">Ապրանքի Նկարագրություն</th>
                            <th className="p-2 border-r border-slate-300 w-20 text-center">Քանակ</th>
                            <th className="p-2 border-r border-slate-300 w-24 text-right">Գին</th>
                            <th className="p-2 w-28 text-right">Գումար</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(invoiceOrder.items && invoiceOrder.items.length > 0 ? invoiceOrder.items : [
                            { id: '1', code: 'PROD-01', name: 'Ապրանք / Ծառայություն', quantity: 1, price: invoiceOrder.totalAmount }
                          ]).map((item: any, idx: number) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-surface' : 'bg-slate-50/50'}>
                              <td className="p-2 border-r border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-800">{item.code || '---'}</td>
                              <td className="p-2 border-r border-slate-300 font-medium text-slate-900">{item.name || 'Ապրանք'}</td>
                              <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{item.quantity || 1} հատ</td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono font-bold">{(item.price || 0).toLocaleString()} ֏</td>
                              <td className="p-2 text-right font-mono font-black text-slate-950">{((item.quantity || 1) * (item.price || 0)).toLocaleString()} ֏</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-ink-inverse text-white font-black text-xs">
                            <td colSpan={5} className="p-2.5 text-right uppercase">ԸՆԴԱՄԵՆԸ ՎՃԱՐՄԱՆ ԵՆԹԱԿԱ ԳՈՒՄԱՐ․</td>
                            <td className="p-2.5 text-right font-mono font-black text-sm">
                              {(invoiceOrder.totalAmount || 0).toLocaleString()} ֏
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {(invoiceOrder.cashierNote || invoiceOrder.notes) && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs">
                          <span className="font-bold">Հատուկ նշումներ՝ </span>
                          {invoiceOrder.cashierNote || invoiceOrder.notes}
                        </div>
                      )}

                    </div>
                  )}
                </>
              )}

            </div>

            {/* DOCUMENT FOOTER & OFFICIAL SIGNATURE BLOCKS */}
            <div className="mt-12 pt-6 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-6 text-2xs text-slate-700 font-medium">
                <div>
                  <span className="font-bold block mb-1">Հանձնեց (Գանձապահ/Օպերատոր)՝</span>
                  <div className="border-b border-slate-400 border-dashed h-6 mb-1"></div>
                  <span className="text-2xs text-slate-500">{companyInfo.operator}</span>
                </div>

                <div>
                  <span className="font-bold block mb-1">Առաքիչ / Փոխադրող՝</span>
                  <div className="border-b border-slate-400 border-dashed h-6 mb-1"></div>
                  <span className="text-2xs text-slate-500">ստորագրություն և ա․ա․հ․</span>
                </div>

                <div>
                  <span className="font-bold block mb-1">Ստացավ (Գնորդ / Պատասխանատու)՝</span>
                  <div className="border-b border-slate-400 border-dashed h-6 mb-1"></div>
                  <span className="text-2xs text-slate-500">ստորագրություն և ամսաթիվ</span>
                </div>
              </div>

              <div className="mt-4 text-center text-2xs text-slate-500 border-t border-slate-100 pt-2 font-mono">
                Փաստաթուղթը գեներացված է «tab.am Cloud POS System»-ի կողմից • ID: {docTitle} • Էջ 1 / 1
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 6. EMAIL MODAL */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <motion.div
            {...MODAL_BACKDROP}
            className="modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) setIsEmailModalOpen(false); }}
          >
            <motion.div
              {...MODAL_SHELL}
              role="dialog"
              aria-modal="true"
              className="modal-shell max-w-lg w-full p-6"
            >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary-ink" />
                <span>Ուղարկել Փաստաթուղթը Էլ․ Փոստով</span>
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="icon-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ստացողի Էլ․ Հասցե (Email)</label>
                <input
                  aria-label="Ստացողի Էլ․ Հասցե (Email)"
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Թեմա (Subject)</label>
                <input
                  aria-label="Թեմա (Subject)"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Նամակի Տեքստ</label>
                <textarea
                  aria-label="Նամակի Տեքստ"
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="input-field font-mono resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="btn btn-soft w-full sm:w-auto"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                >
                  {emailSentSuccess ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  <span>{emailSentSuccess ? 'Ուղարկվեց' : 'Ուղարկել'}</span>
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

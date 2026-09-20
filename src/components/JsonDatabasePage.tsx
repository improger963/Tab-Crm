import React, { useState, useRef } from 'react';
import { 
  FileJson, 
  Download, 
  Upload, 
  Database, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Copy, 
  Check, 
  Layers, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Order } from '../types';
import { downloadOrdersAsJsonFile, parseOrdersJson, getJsonStorageSizeInKB } from '../lib/jsonStorage';

interface JsonDatabasePageProps {
  orders: Order[];
  onImportOrders: (importedOrders: Order[], mode: 'replace' | 'merge') => void;
  onClearDatabase: () => void;
  onResetToDemo: () => void;
  onToast: (type: 'save' | 'delete' | 'warning' | 'info' | 'success', message: string) => void;
}

export const JsonDatabasePage: React.FC<JsonDatabasePageProps> = ({
  orders,
  onImportOrders,
  onClearDatabase,
  onResetToDemo,
  onToast,
}) => {
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [copied, setCopied] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const fileSizeKb = getJsonStorageSizeInKB(orders);

  // Download handler
  const handleDownload = () => {
    downloadOrdersAsJsonFile(orders);
    onToast('success', `Արտահանվել է ${orders.length} պատվեր JSON ֆայլով։`);
  };

  // Copy JSON handler
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(orders, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      onToast('info', 'JSON տվյալները պատճենվեցին clipboard-ում։');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      onToast('warning', 'Չհաջողվեց պատճենել տվյալները:');
    });
  };

  // File import processor
  const processJsonFile = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      onToast('warning', 'Խնդրում ենք ընտրել վավեր .json ֆայլ:');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        onToast('warning', 'Ֆայլը դատարկ է:');
        return;
      }

      const result = parseOrdersJson(content);
      if (!result.success) {
        onToast('warning', result.message || 'Անվավեր JSON ֆայլ:');
        return;
      }

      if (result.orders.length === 0) {
        onToast('warning', 'Ֆայլում պատվերներ չեն գտնվել:');
        return;
      }

      onImportOrders(result.orders, importMode);
      onToast(
        'success',
        importMode === 'replace'
          ? `Հաջողությամբ փոխարինվեց ${result.orders.length} պատվերով JSON ֆայլից:`
          : `Հաջողությամբ ավելացվեց ${result.orders.length} պատվեր JSON ֆայլից:`
      );
    };

    reader.onerror = () => {
      onToast('warning', 'Ֆայլի բացման սխալ:');
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processJsonFile(file);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Banner / System Status */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 text-indigo-600 h-14 w-14 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
            <FileJson className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Լոկալ JSON Տվյալների Բազա
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ակտիվ Է • Առանց Google-ի</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Բոլոր պատվերները պահպանվում են ձեր սարքի տեղական JSON պահոցում՝ 100% անվտանգ, արագ և առանց արգելափակումների։
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Արտահանել JSON (.json)</span>
        </button>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ընդհանուր Պատվերներ</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{orders.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">հատ</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ընդհանուր Շրջանառություն</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
              {totalRevenue.toLocaleString('hy-AM')}
            </span>
            <span className="text-[11px] font-bold text-slate-400">֏</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ֆայլի Ծավալը</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{fileSizeKb}</span>
            <span className="text-[11px] text-slate-400 font-medium">KB</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Պահպանման Տիպ</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-sm sm:text-base font-black text-slate-800">Local JSON DB</span>
          </div>
        </div>
      </div>

      {/* Main Operations: Export & Import */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EXPORT CARD */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Արտահանել Պահուստային Պատճեն (JSON Backup)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ներբեռնեք ձեր բոլոր պատվերները մեկ `.json` ֆայլի մեջ
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ինչո՞ւ է սա ավելի հարմար, քան Google-ը.</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] pl-1">
                <li>Չկա Authorization սխալ կամ ժամկետանց token-ներ</li>
                <li>Աշխատում է անգամ առանց ինտերնետ կապի (Offline)</li>
                <li>Հեշտությամբ կարող եք տեղափոխել ուրիշ համակարգիչ կամ հեռախոս</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-98 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ներբեռնել Պատվերների JSON Ֆայլը ({orders.length} հատ)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Պատճենված է' : 'Պատճենել JSON Տեքստը'}</span>
            </button>
          </div>
        </div>

        {/* IMPORT CARD */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Ներմուծել JSON Ֆայլ (Restore / Import)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Վերականգնեք կամ ավելացրեք պատվերներ նախկինում պահպանված ֆայլից
                </p>
              </div>
            </div>

            {/* Import Mode Radio Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔄 Փոխարինել Ամբողջը
              </button>
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ➕ Ավելացնել Առկային
              </button>
            </div>

            {/* Drag and drop area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-250 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center mx-auto text-indigo-600 mb-2">
                <FileJson className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Սեղմեք կամ քաշեք `.json` ֆայլն այստեղ
              </p>
              <p className="text-[10.5px] text-slate-400 font-medium mt-1">
                Կատարվում է ավտոմատ ստուգում և բեռնում
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center font-medium">
            {importMode === 'replace' ? (
              <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                ⚠️ Ուշադրություն. Ներկա բոլոր պատվերները կփոխարինվեն ֆայլի տվյալներով
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                ✨ Նոր պատվերները կավելացվեն գոյություն ունեցող պատվերներին
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Collapsible Live JSON Inspector */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowJsonPreview(!showJsonPreview)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">
                Դիտել Ընթացիկ Բազայի Ուղիղ JSON Կոդը
              </h4>
              <p className="text-[10.5px] text-slate-400 font-medium">
                {orders.length} պատվերի կառուցվածքը իրական ժամանակում
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
            {showJsonPreview ? 'Փակել Տեսքը ▲' : 'Բացել JSON Տեսքը ▼'}
          </span>
        </button>

        {showJsonPreview && (
          <div className="p-5 border-t border-slate-100 bg-slate-900 text-slate-100 font-mono text-[11px] relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[10px] text-slate-400">
              <span>Տեսք՝ JSON Array ({orders.length} items)</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Պատճենված' : 'Պատճենել'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto max-h-72 pt-3 text-emerald-400 leading-relaxed font-mono">
              {JSON.stringify(orders.slice(0, 5), null, 2)}
              {orders.length > 5 && `\n// ... և ևս ${orders.length - 5} պատվեր`}
            </pre>
          </div>
        )}
      </div>

      {/* Danger & Reset Zone */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-extrabold text-slate-800">
            Բազայի Գործիքներ & Մաքրում
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Կարող եք ամբողջությամբ մաքրել բազան կամ վերականգնել օրինակելի դեմո պատվերները
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onResetToDemo}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Օրինակելի Տվյալներ</span>
          </button>

          {!confirmClearOpen ? (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Մաքրել Բազան</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearDatabase();
                  setConfirmClearOpen(false);
                }}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer active:scale-95"
              >
                Հաստատել Ջնջելը
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Չեղարկել
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EASE_IN_FAST } from '../lib/motionPresets';
import { CheckCircle2, Save, Trash2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'save' | 'delete' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-6 right-6 z-[100] flex flex-col gap-3.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -18, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.16, ease: EASE_IN_FAST } }}
            transition={{ type: "spring", damping: 28, stiffness: 420, mass: 0.9 }}
            className="pointer-events-auto w-full"
          >
            <div className={`
              flex items-center gap-4 px-5 py-4 rounded-2xl border backdrop-blur-xl
              shadow-popover transition-all duration-300
              ${toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200/70 text-emerald-950' : ''}
              ${toast.type === 'save' ? 'bg-indigo-50/95 border-indigo-200/70 text-indigo-950' : ''}
              ${toast.type === 'delete' ? 'bg-rose-50/95 border-rose-200/70 text-rose-950' : ''}
              ${toast.type === 'warning' ? 'bg-amber-50/95 border-amber-200/80 text-amber-950' : ''}
            `}>
              <motion.div 
                initial={{ scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.05 }}
                className={`
                  h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
                  ${toast.type === 'success' ? 'bg-success text-white' : ''}
                  ${toast.type === 'save' ? 'bg-primary text-white' : ''}
                  ${toast.type === 'delete' ? 'bg-danger text-white' : ''}
                  ${toast.type === 'warning' ? 'bg-warning text-white' : ''}
                `}
              >
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />}
                {toast.type === 'save' && <Save className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />}
                {toast.type === 'delete' && <Trash2 className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />}
              </motion.div>
              
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold tracking-tight leading-snug">{toast.message}</p>
                <span className="text-2xs opacity-60 font-semibold block mt-0.5 uppercase tracking-wider">
                  {toast.type === 'success' ? 'Հաջողված' : toast.type === 'save' ? 'Պահպանված' : toast.type === 'warning' ? 'Զգուշացում' : 'Հեռացված'} • Համակարգ
                </span>
              </div>

              <button 
                type="button"
                onClick={() => onRemove(toast.id)}
                aria-label="Փակել հաղորդագրությունը"
                className="p-2 hover:bg-slate-900/10 active:scale-90 rounded-lg transition-all text-current opacity-50 hover:opacity-100 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, addToast, removeToast };
};

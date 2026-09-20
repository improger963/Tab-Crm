import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Check, 
  X as CloseIcon, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { InAppNotification } from '../App';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAllRead: () => void;
  onClearHistory: () => void;
  onSelectNotification: (notif: InAppNotification) => void;
  isAlertEnabled: boolean;
  onToggleAlert: () => void;
  onTestNotification: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearHistory,
  onSelectNotification,
  isAlertEnabled,
  onToggleAlert,
  onTestNotification,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop mask */}
          <div 
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 380 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-center-title"
            className="fixed inset-x-4 top-20 mx-auto max-w-sm sm:absolute sm:inset-auto sm:right-6 sm:top-18 sm:w-96 glass-card rounded-xl shadow-xl z-50 overflow-hidden flex flex-col text-left"
          >
            {/* Header */}
            <div className="p-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-primary-ink flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="notification-center-title" className="text-xs font-semibold text-slate-900 tracking-tight">Ծանուցումներ</h3>
                  <p className="text-2xs text-slate-400 font-medium">
                    {unreadCount > 0 ? `${unreadCount} չկարդացված` : 'Բոլորը կարդացված են'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-2xs font-medium text-primary-ink hover:underline underline-offset-2 cursor-pointer"
                  >
                    Նշել կարդացված
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Փակել ծանուցումները"
                  className="p-1.5 -mr-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                >
                  <CloseIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                    <BellOff className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Ծանուցումներ չկան</p>
                  <p className="text-2xs text-slate-400 mt-1 max-w-[220px]">
                    Կարգավիճակի և նոր պատվերների փոփոխությունները կհայտնվեն այստեղ:
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => onSelectNotification(notif)}
                      className={`w-full p-3.5 flex gap-3 transition-colors text-left relative cursor-pointer group select-none ${
                        notif.read ? 'bg-surface hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
                      }`}
                    >
                      {!notif.read && (
                        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                      )}

                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        notif.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        notif.type === 'warning' ? 'bg-rose-100 text-rose-700' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {notif.type === 'success' && <CheckCircle className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />}
                        {notif.type === 'warning' && <XCircle className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />}
                        {notif.type === 'info' && <Clock className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />}
                        {notif.type === 'error' && <Bell className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />}
                      </div>

                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="text-xs font-semibold text-slate-800 group-hover:text-primary-ink transition-colors leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-2xs font-medium text-slate-400 font-mono tabular-nums">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {notif.orderId && (
                            <span className="text-2xs font-semibold text-primary-ink bg-indigo-100/70 px-1.5 py-px rounded font-mono">
                              #{notif.orderId}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Settings */}
            <div className="bg-slate-50/80 p-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span id="alert-sound-label" className="text-xs font-medium text-slate-600">Ավարտված պատվերի ազդանշան</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAlertEnabled}
                  aria-labelledby="alert-sound-label"
                  onClick={onToggleAlert}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    isAlertEnabled ? 'bg-primary' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                    isAlertEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={onTestNotification}
                  className="text-2xs font-medium text-primary-ink hover:underline underline-offset-2 cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  Փորձարկել ձայնը
                </button>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-2xs font-medium text-rose-600 hover:text-rose-700 hover:underline underline-offset-2 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    Մաքրել
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

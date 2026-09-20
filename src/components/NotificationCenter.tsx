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
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-2xs" 
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', duration: 0.22 }}
            className="fixed inset-x-4 top-20 mx-auto max-w-sm sm:absolute sm:inset-auto sm:right-6 sm:top-18 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col text-left"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50/90 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">Ծանուցումներ</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {unreadCount > 0 ? `${unreadCount} չկարդացված` : 'Բոլորը կարդացված են'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Նշել կարդացված
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                    <BellOff className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Ծանուցումներ չկան</p>
                  <p className="text-[10.5px] text-slate-400 mt-1 max-w-[220px]">
                    Կարգավիճակի և նոր պատվերների փոփոխությունները կհայտնվեն այստեղ:
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  return (
                    <div
                      key={notif.id}
                      onClick={() => onSelectNotification(notif)}
                      className={`p-3.5 flex gap-3 transition-colors text-left relative cursor-pointer group select-none ${
                        notif.read ? 'bg-white hover:bg-slate-50/70' : 'bg-indigo-50/30 hover:bg-indigo-50/60'
                      }`}
                    >
                      {!notif.read && (
                        <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-600" />
                      )}

                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                        notif.type === 'warning' ? 'bg-rose-50 text-rose-600' :
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        {notif.type === 'success' && <CheckCircle className="w-4 h-4 stroke-[2.2]" />}
                        {notif.type === 'warning' && <XCircle className="w-4 h-4 stroke-[2.2]" />}
                        {notif.type === 'info' && <Clock className="w-4 h-4 stroke-[2.2]" />}
                        {notif.type === 'error' && <Bell className="w-4 h-4 stroke-[2.2]" />}
                      </div>

                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-wrap leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {notif.orderId && (
                            <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded font-mono">
                              #{notif.orderId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Settings */}
            <div className="bg-slate-50/90 p-3.5 border-t border-slate-150 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Ավարտված պատվերի ազդանշան</span>
                <button
                  type="button"
                  onClick={onToggleAlert}
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    isAlertEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    isAlertEnabled ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={onTestNotification}
                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Փորձարկել ձայնը
                </button>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
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

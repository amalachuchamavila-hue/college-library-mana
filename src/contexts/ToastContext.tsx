import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

let nextId = 1;

const CONFIG: Record<ToastType, { icon: typeof CircleCheck; bar: string; iconColor: string }> = {
  success: { icon: CircleCheck, bar: 'bg-emerald-500', iconColor: 'text-emerald-600' },
  error: { icon: CircleX, bar: 'bg-red-500', iconColor: 'text-red-600' },
  warning: { icon: CircleAlert, bar: 'bg-amber-500', iconColor: 'text-amber-600' },
  info: { icon: Info, bar: 'bg-blue-500', iconColor: 'text-blue-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-3), { id, type, message, title }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast,
    success: (message, title) => toast('success', message, title),
    error: (message, title) => toast('error', message, title),
    info: (message, title) => toast('info', message, title),
    warning: (message, title) => toast('warning', message, title),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const C = CONFIG[t.type];
            const Icon = C.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${C.bar}`} />
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${C.iconColor}`} />
                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-sm font-semibold text-slate-900">{t.title}</p>}
                  <p className="text-sm text-slate-600">{t.message}</p>
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

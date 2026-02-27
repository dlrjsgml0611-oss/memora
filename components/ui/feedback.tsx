'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type FeedbackVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  description: string;
  variant?: FeedbackVariant;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  notify: (options: ToastOptions) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ToastItem extends Required<Pick<ToastOptions, 'description'>> {
  id: number;
  title?: string;
  variant: FeedbackVariant;
}

interface ConfirmQueueItem {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface ActiveConfirm {
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function getVariantMeta(variant: FeedbackVariant) {
  switch (variant) {
    case 'success':
      return {
        icon: CheckCircle2,
        container: 'border-emerald-200 bg-emerald-50/95 text-emerald-900',
        iconColor: 'text-emerald-600',
      };
    case 'error':
      return {
        icon: XCircle,
        container: 'border-rose-200 bg-rose-50/95 text-rose-900',
        iconColor: 'text-rose-600',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        container: 'border-amber-200 bg-amber-50/95 text-amber-900',
        iconColor: 'text-amber-600',
      };
    default:
      return {
        icon: Info,
        container: 'border-sky-200 bg-sky-50/95 text-sky-900',
        iconColor: 'text-sky-600',
      };
  }
}

function toActiveConfirm(item: ConfirmQueueItem): ActiveConfirm {
  const { options, resolve } = item;
  return {
    title: options.title,
    description: options.description,
    confirmText: options.confirmText || '확인',
    cancelText: options.cancelText || '취소',
    destructive: options.destructive || false,
    resolve,
  };
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeConfirm, setActiveConfirm] = useState<ActiveConfirm | null>(null);
  const nextToastIdRef = useRef(1);
  const toastTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const confirmQueueRef = useRef<ConfirmQueueItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = toastTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
  }, []);

  const notify = useCallback(
    ({ title, description, variant = 'info', duration = 3600 }: ToastOptions) => {
      const id = nextToastIdRef.current++;
      const toast: ToastItem = {
        id,
        title,
        description,
        variant,
      };

      setToasts((prev) => [toast, ...prev].slice(0, 4));
      toastTimersRef.current[id] = setTimeout(() => removeToast(id), Math.max(1200, duration));
    },
    [removeToast]
  );

  const resolveConfirm = useCallback(
    (value: boolean) => {
      if (!activeConfirm) return;
      activeConfirm.resolve(value);

      const next = confirmQueueRef.current.shift();
      setActiveConfirm(next ? toActiveConfirm(next) : null);
    },
    [activeConfirm]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const queueItem: ConfirmQueueItem = { options, resolve };

      setActiveConfirm((current) => {
        if (current) {
          confirmQueueRef.current.push(queueItem);
          return current;
        }
        return toActiveConfirm(queueItem);
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!activeConfirm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resolveConfirm(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeConfirm, resolveConfirm]);

  const contextValue = useMemo<FeedbackContextValue>(
    () => ({
      notify,
      success: (description, title = '완료') => notify({ title, description, variant: 'success' }),
      error: (description, title = '오류') => notify({ title, description, variant: 'error', duration: 5000 }),
      info: (description, title = '안내') => notify({ title, description, variant: 'info' }),
      warning: (description, title = '확인 필요') => notify({ title, description, variant: 'warning' }),
      confirm,
    }),
    [notify, confirm]
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed inset-0 z-[120] flex items-start justify-end p-4">
        <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const meta = getVariantMeta(toast.variant);
            const Icon = meta.icon;

            return (
              <div
                key={toast.id}
                className={cn(
                  'rounded-2xl border px-4 py-3 shadow-lg backdrop-blur transition-all',
                  meta.container
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.iconColor)} />
                  <div className="min-w-0 flex-1">
                    {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                    <p className="text-sm leading-relaxed">{toast.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                    aria-label="닫기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{activeConfirm.title}</h3>
            {activeConfirm.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{activeConfirm.description}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => resolveConfirm(false)}>
                {activeConfirm.cancelText}
              </Button>
              <Button
                variant={activeConfirm.destructive ? 'destructive' : 'default'}
                onClick={() => resolveConfirm(true)}
              >
                {activeConfirm.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider');
  }
  return context;
}

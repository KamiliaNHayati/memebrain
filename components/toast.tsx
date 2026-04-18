'use client';

// components/toast.tsx
// Lightweight toast notification system — no external dependencies.
// Usage: import { toast } from '@/components/toast'; toast.success('Done!');

import { useState, useCallback, createContext, useContext } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 4s (start exit animation at 3.5s)
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, 3500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const value: ToastContextValue = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
    warning: (msg) => addToast('warning', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = {
    success: { icon: '✅', border: 'border-[#22c55e]/40', bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]' },
    error: { icon: '❌', border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-400' },
    info: { icon: 'ℹ️', border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    warning: { icon: '⚠️', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  };

  const c = config[toast.type];

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border ${c.border} ${c.bg} backdrop-blur-xl px-4 py-3 shadow-lg ${
        toast.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
    >
      <span className="text-base shrink-0">{c.icon}</span>
      <p className={`text-sm ${c.text} flex-1`}>{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-[#52525b] hover:text-white text-xs shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

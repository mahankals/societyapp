import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const showAlert = useCallback(({
    title = 'Notification',
    message = '',
    variant = 'info',
    confirmText = 'OK',
    onConfirm = null,
  }) => {
    return new Promise((resolve) => {
      setModalState({
        type: 'alert',
        title,
        message,
        variant,
        confirmText,
        onConfirm: () => {
          closeModal();
          if (onConfirm) onConfirm();
          resolve(true);
        },
      });
    });
  }, [closeModal]);

  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    variant = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    onConfirm = null,
    onCancel = null,
  }) => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        title,
        message,
        variant: danger ? 'danger' : variant,
        confirmText,
        cancelText,
        danger,
        onConfirm: () => {
          closeModal();
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          if (onCancel) onCancel();
          resolve(false);
        },
      });
    });
  }, [closeModal]);

  // Global bridge for legacy code & window.alert / window.confirm
  useEffect(() => {
    window.appAlert = (msg, title = 'Notice') => showAlert({ title, message: msg });
    window.appConfirm = (msg, callback, title = 'Confirmation Required') => {
      showConfirm({ title, message: msg }).then((confirmed) => {
        if (confirmed && typeof callback === 'function') {
          callback();
        }
      });
    };

    // Override native window.alert to prevent OS default alert dialogs
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert({ message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    };

    // Keyboard ESC listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalState) {
        if (modalState.type === 'confirm' && modalState.onCancel) {
          modalState.onCancel();
        } else if (modalState.onConfirm) {
          modalState.onConfirm();
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAlert, showConfirm, modalState, closeModal]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {/* Custom Theme-Aware Modal Dialog */}
      {modalState && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header Icon + Title */}
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                modalState.variant === 'danger'
                  ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : modalState.variant === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : modalState.variant === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
              }`}>
                {modalState.variant === 'danger' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : modalState.variant === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : modalState.variant === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base font-bold text-surface-900 dark:text-white leading-tight font-heading">
                  {modalState.title}
                </h3>
                <p className="text-xs text-surface-600 dark:text-surface-200/70 mt-1.5 leading-relaxed break-words whitespace-pre-line">
                  {modalState.message}
                </p>
              </div>

              <button
                type="button"
                onClick={modalState.type === 'confirm' ? modalState.onCancel : modalState.onConfirm}
                className="text-surface-400 hover:text-surface-600 dark:text-surface-200/50 dark:hover:text-white p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {modalState.type === 'confirm' && (
                <button
                  type="button"
                  onClick={modalState.onCancel}
                  className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 dark:border-transparent text-surface-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={modalState.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  modalState.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                    : modalState.variant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

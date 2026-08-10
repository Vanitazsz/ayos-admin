import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(({ title, description, type = 'info', duration = 4000 }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, description, type, duration }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title, description, duration) => addToast({ title, description, type: 'success', duration }), [addToast]);
  const error = useCallback((title, description, duration = Infinity) => addToast({ title, description, type: 'error', duration }), [addToast]);
  const info = useCallback((title, description, duration) => addToast({ title, description, type: 'info', duration }), [addToast]);
  const warning = useCallback((title, description, duration = Infinity) => addToast({ title, description, type: 'warning', duration }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  // Handle manual close with animation
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onRemove, 300); // Wait for exit animation
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-brand-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />
  };

  const bgColors = {
    success: 'bg-success/10 border-success/30',
    error: 'bg-destructive/10 border-destructive/30',
    info: 'bg-brand-500/10 border-brand-500/30',
    warning: 'bg-warning/10 border-warning/30'
  };

  return (
    <div 
      className={`pointer-events-auto flex items-start p-4 bg-card border shadow-lg rounded-xl min-w-[300px] max-w-sm transition-all duration-300 transform 
        ${isLeaving ? 'opacity-0 translate-x-full scale-95' : 'animate-slide-in-right opacity-100 translate-x-0 scale-100'}
      `}
    >
      <div className={`shrink-0 p-2 rounded-full ${bgColors[toast.type]} mr-3`}>
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 mr-2 pt-0.5">
        <p className="text-sm font-bold text-foreground truncate">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-foreground-lighter mt-0.5 break-words">{toast.description}</p>
        )}
      </div>
      <button 
        onClick={handleClose}
        className="shrink-0 p-1 text-foreground-muted hover:text-foreground-light hover:bg-surface-200 rounded-md transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

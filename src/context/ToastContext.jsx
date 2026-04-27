import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter glass rounded-lg px-4 py-3 text-sm font-medium max-w-xs shadow-lg pointer-events-auto"
          style={{
            borderLeft: `3px solid ${
              t.type === 'success' ? 'var(--success)'
              : t.type === 'error' ? 'var(--danger)'
              : t.type === 'warning' ? 'var(--warning)'
              : 'var(--primary)'
            }`,
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);


import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from '../components/icons/LucideIcons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-2xl shadow-2xl border-l-8 flex items-start gap-3 bg-white dark:bg-[#1a1f2e] backdrop-blur-md transition-all animate-fade-in
                            ${toast.type === 'success' ? 'border-green-500 text-green-700 dark:text-green-400' : ''}
                            ${toast.type === 'error' ? 'border-red-500 text-red-700 dark:text-red-400' : ''}
                            ${toast.type === 'warning' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' : ''}
                            ${toast.type === 'info' ? 'border-rr-orange text-rr-dark dark:text-white' : ''}
                        `}
                    >
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
                            {toast.type === 'error' && <XCircle size={20} className="text-red-500" />}
                            {toast.type === 'warning' && <AlertTriangle size={20} className="text-yellow-500" />}
                            {toast.type === 'info' && <Info size={20} className="text-rr-orange" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black uppercase tracking-tight leading-snug">{toast.message}</p>
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within a ToastProvider");
    return context;
};

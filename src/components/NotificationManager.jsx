import React from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationManager() {
    const { toasts, removeToast, confirmState } = useNotifications();

    return (
        <>
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none w-full max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-2xl border backdrop-blur-md transform transition-all duration-300 animate-slideInRight ${toast.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-600' :
                            toast.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-600' :
                                'border-primary-500/30 bg-primary-500/10 text-primary-600'
                            }`}
                    >
                        <div className="mr-3 text-xl">
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                        </div>
                        <div className="flex-1 font-medium text-sm">
                            {toast.message}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-4 text-gray-400 hover:text-gray-600 font-bold"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmState && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn bg-slate-950/60 backdrop-blur-md">
                    <div className="relative card w-full max-w-md p-0 overflow-hidden shadow-2xl animate-scaleIn border-white/10 ring-1 ring-white/5">
                        <div className="p-8">
                            <h3 className="text-2xl font-black mb-3 uppercase tracking-tight">
                                {confirmState.title || 'Confirm Action'}
                            </h3>
                            <p className="opacity-80 font-medium text-lg leading-relaxed">
                                {confirmState.message || 'Are you sure you want to proceed?'}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end space-x-3">
                            <button
                                onClick={() => confirmState.resolve(false)}
                                className="btn btn-secondary px-6"
                            >
                                {confirmState.cancelText || 'Cancel'}
                            </button>
                            <button
                                onClick={() => confirmState.resolve(true)}
                                className={`btn px-6 ${confirmState.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                            >
                                {confirmState.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slideInRight { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleIn { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </>
    );
}

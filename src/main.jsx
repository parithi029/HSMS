import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NotificationProvider>
                <ThemeProvider>
                    <LanguageProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </NotificationProvider>
        </BrowserRouter>
    </React.StrictMode>
);

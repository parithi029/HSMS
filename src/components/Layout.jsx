import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import FluidBackground from './FluidBackground';

export default function Layout() {
    const { user, profile, signOut, hasRole } = useAuth();
    const { theme, toggleTheme, showFluid, toggleFluid } = useTheme();
    const { lang, setLang, t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                navigate('/clients');
            }
            if (e.key.toLowerCase() === 'd' && e.altKey) {
                e.preventDefault();
                navigate('/dashboard');
            }
            if (e.key.toLowerCase() === 'b' && e.altKey && hasRole('volunteer')) {
                e.preventDefault();
                navigate('/bed-board');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, hasRole]);

    const handleRefresh = () => {
        setIsSpinning(true);
        setIsRefreshing(true);
        setRefreshKey(prev => prev + 1);
        setTimeout(() => {
            setIsSpinning(false);
            setTimeout(() => setIsRefreshing(false), 300);
        }, 800);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊', translationKey: 'dashboard' },
        { path: '/bed-board', label: 'Wards', icon: '🛏️', minRole: 'volunteer', translationKey: 'wards' },
        { path: '/clients', label: 'Clients', icon: '👥', minRole: 'volunteer', translationKey: 'clients' },
        { path: '/reports', label: 'Reports', icon: '📈', minRole: 'volunteer', translationKey: 'reports' },
        { path: '/settings', label: 'Settings', icon: '⚙️', minRole: 'admin', translationKey: 'settings' },
    ];

    const filteredNavItems = navItems.filter((item) => {
        if (!item.minRole) return true;
        return hasRole(item.minRole);
    });

    return (
        <div className="min-h-screen transition-colors duration-300 relative" style={{ backgroundColor: 'transparent', color: 'var(--app-text)' }}>
            <FluidBackground />

            <header className="text-white shadow-lg transition-colors duration-300 sticky top-0 z-50" style={{ backgroundColor: 'var(--header-bg)' }}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 logo-glow cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path fillRule="evenodd" clipRule="evenodd" d="M3 4C3 3.44772 2.55228 3 2 3C1.44772 3 1 3.44772 1 4V14V17V20C1 20.5523 1.44772 21 2 21C2.55228 21 3 20.5523 3 20V18H21V20C21 20.5523 21.4477 21 22 21C22.5523 21 23 20.5523 23 20V17V14V11C23 8.23858 20.7614 6 18 6H12C11.4477 6 11 6.44772 11 7V9.5C11 7.567 9.433 6 7.5 6C5.567 6 4 7.567 4 9.5C4 11.433 5.567 13 7.5 13H3V4ZM7.5 13C9.433 13 11 11.433 11 9.5V13H7.5ZM21 15V16H3V15H12H21ZM21 11V13H13V8H18C19.6569 8 21 9.34315 21 11ZM6 9.5C6 8.67157 6.67157 8 7.5 8C8.32843 8 9 8.67157 9 9.5C9 10.3284 8.32843 11 7.5 11C6.67157 11 6 10.3284 6 9.5Z" fill="currentColor" />
                            </svg>
                            <span className="text-xl md:text-2xl font-bold tracking-tight">SMS</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Desktop Actions */}
                        <div className="hidden lg:flex items-center space-x-3">
                            <button onClick={handleRefresh} className="flex items-center space-x-2 text-sm px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-sm hover:shadow-md">
                                <span className={isSpinning ? 'animate-spin' : ''}>🔄</span>
                                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                            <button onClick={toggleFluid} className={`flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all border hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${showFluid ? 'bg-primary-500/20 border-primary-500/30' : 'bg-white/10 border-white/10 opacity-50'}`}>
                                <span className={showFluid ? 'animate-pulse' : ''}>💧</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{showFluid ? 'Vivid' : 'Static'}</span>
                            </button>
                            <button onClick={toggleTheme} className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-sm hover:shadow-md">
                                <span>{theme === 'light' ? '☀️' : '🌙'}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{theme === 'light' ? 'Light' : 'Dark'}</span>
                            </button>
                            <div className="flex items-center bg-white/10 rounded-2xl px-1 border border-white/10">
                                <button onClick={() => setLang('en')} className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm scale-110' : 'text-white/70 hover:text-white'}`}>EN</button>
                                <button onClick={() => setLang('ta')} className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${lang === 'ta' ? 'bg-white text-slate-900 shadow-sm scale-110' : 'text-white/70 hover:text-white'}`}>TA</button>
                            </div>
                        </div>

                        {/* User Info & Dropdown (Desktop) */}
                        <div className="hidden md:flex items-center space-x-4 relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-3 p-1 rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                            >
                                <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary-500/20 uppercase">
                                    {user?.email?.charAt(0)}
                                </div>
                                <div className="text-left leading-tight hidden lg:block">
                                    <p className="text-xs font-black truncate max-w-[120px]">{user?.email}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{profile?.role}</p>
                                </div>
                                <span className={`text-[10px] transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-slideDown z-[60]">
                                    <div className="px-4 py-3 border-b border-white/5 lg:hidden">
                                        <p className="text-xs font-black text-white truncate">{user?.email}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{profile?.role}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center space-x-3"
                                    >
                                        <span>👤</span> <span>Edit Profile</span>
                                    </button>
                                    <div className="border-t border-white/5 mt-2 pt-2">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-3"
                                        >
                                            <span>🚪</span> <span>{t('signOut')}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Hamburger Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 rounded bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 animate-fadeIn shadow-2xl">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={handleRefresh} className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className={`text-2xl mb-1 ${isSpinning ? 'animate-spin' : ''}`}>🔄</span>
                                <span className="text-[10px] font-bold uppercase">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
                            </button>
                            <button onClick={toggleFluid} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${showFluid ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' : 'bg-white/5 border-white/10 opacity-70'}`}>
                                <span className={`text-2xl mb-1 ${showFluid ? 'animate-pulse' : ''}`}>💧</span>
                                <span className="text-[10px] font-bold uppercase">{showFluid ? 'Vivid' : 'Static'}</span>
                            </button>
                            <button onClick={toggleTheme} className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-2xl mb-1">{theme === 'light' ? '☀️' : '🌙'}</span>
                                <span className="text-[10px] font-bold uppercase">{theme === 'light' ? 'Light' : 'Dark'}</span>
                            </button>
                            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex space-x-2">
                                    <button onClick={() => setLang('en')} className={`px-3 py-1 text-xs font-bold rounded ${lang === 'en' ? 'bg-white text-slate-900' : 'text-white/50'}`}>EN</button>
                                    <button onClick={() => setLang('ta')} className={`px-3 py-1 text-xs font-bold rounded ${lang === 'ta' ? 'bg-white text-slate-900' : 'text-white/50'}`}>TA</button>
                                </div>
                                <span className="text-[10px] font-bold uppercase mt-2">Language</span>
                            </div>
                        </div>
                        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 font-bold border border-primary-500/30 uppercase">
                                    {user?.email?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold truncate max-w-[150px]">{user?.email}</p>
                                    <p className="text-[10px] text-slate-400 capitalize">{profile?.role}</p>
                                </div>
                            </div>
                            <button onClick={handleSignOut} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">
                                {t('signOut')}
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <div className="hidden md:flex min-h-[calc(100vh-64px)]">
                <aside className="sidebar">
                    <nav className="p-4 space-y-2">
                        {filteredNavItems.map((item) => (
                            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}>
                                <span className="text-xl">{item.icon}</span>
                                <span>{t(item.translationKey)}</span>
                            </Link>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 overflow-y-auto">
                    <div className={`max-w-7xl mx-auto p-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
                        <Outlet key={refreshKey} />
                    </div>
                </main>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden">
                <main className={`pb-20 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="p-4">
                        <Outlet key={refreshKey} />
                    </div>
                </main>

                {/* Mobile Bottom Navigation (Emoji Only) */}
                <nav className="bottom-nav !h-16">
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`bottom-nav-item flex items-center justify-center w-full h-full transition-all ${isActive(item.path) ? 'text-primary-500 border-t-2 border-primary-500 bg-primary-500/5' : 'text-slate-400'}`}
                        >
                            <span className={`text-2xl transition-transform ${isActive(item.path) ? 'scale-125' : ''}`}>{item.icon}</span>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}

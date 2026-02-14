import { useRealtimeBeds } from '../hooks/useRealtimeBeds';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import ClientDashboard from './ClientDashboard';
import { useDashboardActivity } from '../hooks/useDashboardActivity';
import QuickCheckInModal from '../components/QuickCheckInModal';
import { useState } from 'react';

export default function Dashboard() {
    const { t } = useLanguage();
    const { profile, loading: authLoading } = useAuth();
    const { beds, stats, loading: bedsLoading } = useRealtimeBeds();
    const { activities, loading: activityLoading } = useDashboardActivity();
    const [showQuickCheckIn, setShowQuickCheckIn] = useState(false);

    // Only block for authLoading, let bed data load in background
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                    <p className="mt-4 text-gray-600">{t('loading')}</p>
                    <p className="text-xs text-gray-400 mt-2">{t('refreshNotice')}</p>
                </div>
            </div>
        );
    }

    // Role-Based Redirect
    // Default to Client Dashboard unless explicitly Staff/Admin/Volunteer
    const staffRoles = ['staff', 'admin', 'volunteer'];
    const isStaff = profile?.role && staffRoles.includes(profile.role);

    if (!isStaff) {
        return <ClientDashboard />;
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black">{t('dashboard')}</h1>
                <p className="opacity-70 mt-1 font-medium">{t('realTimeOverview')}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Beds */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium opacity-70">{t('totalBeds')}</p>
                            <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🛏️</span>
                        </div>
                    </div>
                </div>

                {/* Available Beds */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('available')}</p>
                            <p className="text-3xl font-bold text-success-600 mt-1">{stats.available}</p>
                        </div>
                        <div className="w-12 h-12 bg-success-100 dark:bg-success-900/50 rounded-full flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                        </div>
                    </div>
                </div>

                {/* Occupied Beds */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('occupied')}</p>
                            <p className="text-3xl font-bold text-danger-600 mt-1">{stats.occupied}</p>
                        </div>
                        <div className="w-12 h-12 bg-danger-100 dark:bg-danger-900/50 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🔴</span>
                        </div>
                    </div>
                </div>

                {/* Occupancy Rate */}
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('occupancy')}</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">{stats.occupancyRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-primary-600 h-full transition-all duration-300"
                            style={{ width: `${stats.occupancyRate}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold mb-6">{t('quickActions')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        to="/bed-board"
                        className="btn btn-primary"
                    >
                        <span>🛏️</span>
                        <span>{t('manageWards')}</span>
                    </Link>
                    <Link
                        to="/clients"
                        className="btn btn-secondary"
                    >
                        <span>👥</span>
                        <span>{t('manageClients')}</span>
                    </Link>
                    <button
                        onClick={() => setShowQuickCheckIn(true)}
                        className="btn bg-success-600 text-white hover:bg-success-700 shadow-md"
                    >
                        <span>⚡</span>
                        <span>{t('quickCheckIn')}</span>
                    </button>
                </div>
            </div>

            {/* Capacity Alert */}
            {stats.available <= 5 && stats.available > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">⚠️</span>
                        <div>
                            <p className="font-medium text-yellow-800">{t('lowCapacity')}</p>
                            <p className="text-sm text-yellow-700">
                                {t('lowCapacityDetail').replace('{count}', stats.available)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Capacity Alert */}
            {stats.available === 0 && (
                <div className="bg-danger-50 border-l-4 border-danger-400 p-4 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-2xl mr-3">🚨</span>
                        <div>
                            <p className="font-medium text-danger-800">{t('fullCapacity')}</p>
                            <p className="text-sm text-danger-700">
                                {t('fullCapacityDetail')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Activity */}
            <div className="card">
                <h2 className="text-xl font-bold mb-6">{t('todayActivity')}</h2>
                <div className="space-y-6">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center text-xl">
                                <span>➕</span>
                            </div>
                            <div>
                                <p className="font-bold">{t('checkInsToday')}</p>
                                <p className="text-sm opacity-60">{t('newAdmissions')}</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-success-600">{activities.admissions.length}</span>
                    </div>

                    {/* Live Admissions List */}
                    {activities.admissions.length > 0 && (
                        <div className="ml-16 space-y-3 pb-4">
                            {activities.admissions.map(adm => (
                                <div key={adm.id} className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{adm.clients?.first_name} {adm.clients?.last_name}</span>
                                    <span className="opacity-60 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-xs font-bold">
                                        {adm.beds?.rooms?.name} • {adm.beds?.bed_number}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center text-xl">
                                <span>➖</span>
                            </div>
                            <div>
                                <p className="font-bold">{t('checkOutsToday')}</p>
                                <p className="text-sm opacity-60">{t('departures')}</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-danger-600">{activities.departures.length}</span>
                    </div>

                    {/* Live Departures List */}
                    {activities.departures.length > 0 && (
                        <div className="ml-16 space-y-3">
                            {activities.departures.map(dep => (
                                <div key={dep.id} className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{dep.clients?.first_name} {dep.clients?.last_name}</span>
                                    <span className="opacity-40 line-through text-xs italic">
                                        Was in {dep.beds?.rooms?.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Check-in Modal */}
            {showQuickCheckIn && (
                <QuickCheckInModal
                    onClose={() => setShowQuickCheckIn(false)}
                    onSuccess={() => {
                        // Success handled by realtime hooks
                    }}
                />
            )}
        </div>
    );
}

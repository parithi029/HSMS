import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useRealtimeBeds } from '../hooks/useRealtimeBeds';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
    const { user, profile } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { beds, loading: bedsLoading } = useRealtimeBeds();
    const [clientRecord, setClientRecord] = useState(null);
    const [loadingClient, setLoadingClient] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchClientRecord() {
            if (!user) return;
            try {
                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Client fetch timeout')), 10000)
                );

                const dataPromise = supabase
                    .from('clients')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                const { data, error } = await Promise.race([
                    dataPromise,
                    timeoutPromise
                ]);

                if (!mounted) return;

                if (error && error.code !== 'PGRST116') { // PGRST116 is 'Row not found'
                    console.error('Error fetching client record:', error);
                    // On error, maybe we should set clientRecord to null? default is null.
                }
                setClientRecord(data);
            } catch (err) {
                console.error('Client record fetch failed:', err);
            } finally {
                if (mounted) setLoadingClient(false);
            }
        }

        fetchClientRecord();

        return () => {
            mounted = false;
        };
    }, [user]);

    if (bedsLoading || loadingClient) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
                <p className="text-xs text-gray-400 mt-2">If this takes too long, please try logging in again.</p>
            </div>
        );
    }

    // Filter available beds for display
    const availableBeds = beds?.filter(bed => bed.status === 'available' && bed.is_active) || [];
    const availableCount = availableBeds.length;

    // Group available beds by Ward -> Room
    const availabilityMap = availableBeds.reduce((acc, bed) => {
        const wardName = bed.rooms?.wards?.name || 'General';
        const roomName = bed.rooms?.name || 'Unassigned';

        if (!acc[wardName]) acc[wardName] = {};
        if (!acc[wardName][roomName]) acc[wardName][roomName] = 0;
        acc[wardName][roomName]++;
        return acc;
    }, {});

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Welcome, {clientRecord ? clientRecord.first_name : (profile?.first_name || 'Friend')}
                </h1>
                <p className="text-slate-500 font-medium">Client Portal</p>
            </div>

            {/* STATUS BANNER */}
            {!clientRecord && (
                <div className="bg-primary-500/10 border-l-4 border-primary-500 p-6 rounded-r-2xl backdrop-blur-md">
                    <h3 className="text-lg font-black text-primary-700 dark:text-primary-400">Complete Your Profile</h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4 font-medium">Please provide your details to request shelter access.</p>
                    <Link to="/link-profile" className="btn btn-primary px-6 py-2.5 rounded-xl shadow-lg shadow-primary-500/20">
                        Create My Profile
                    </Link>
                </div>
            )}

            {clientRecord && clientRecord.approval_status === 'pending' && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-6 rounded-r-2xl backdrop-blur-md">
                    <h3 className="text-lg font-black text-amber-700 dark:text-amber-400">⏳ Profile Pending Approval</h3>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                        Your profile has been submitted and is awaiting staff review.
                        You can view bed availability below, but cannot make reservations yet.
                    </p>
                </div>
            )}

            {clientRecord && clientRecord.approval_status === 'approved' && (
                <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-6 rounded-r-2xl backdrop-blur-md">
                    <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-400">✅ Profile Active</h3>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">You are an approved client. Talk to staff to check-in.</p>
                </div>
            )}

            {/* INFO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. My Profile Card */}
                <div className="card group hover:shadow-xl hover:shadow-primary-500/5 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">My Profile</h2>
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                            👤
                        </div>
                    </div>
                    {clientRecord ? (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">FullName</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{clientRecord.first_name} {clientRecord.last_name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date of Birth</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{clientRecord.dob || 'Not set'}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                    ${clientRecord.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                        clientRecord.approval_status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                    {clientRecord.approval_status || 'pending'}
                                </span>
                            </div>
                            <div className="pt-4">
                                <Link to="/link-profile" className="btn btn-primary w-full text-center block rounded-xl py-2.5 font-bold shadow-md">Edit Profile</Link>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 font-medium italic">No profile linked yet.</p>
                    )}
                </div>

                {/* 2. Settings Card */}
                <div className="card group hover:shadow-xl hover:shadow-primary-500/5 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Settings</h2>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600">
                            ⚙️
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                            <div>
                                <p className="font-bold">Dark Mode</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Visual Theme</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ring-offset-2 focus:ring-2 focus:ring-primary-500 ${theme === 'dark' ? 'bg-primary-600' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                            More control panel features coming
                        </div>
                    </div>
                </div>

                {/* 3. Agency Info */}
                <div className="card group hover:shadow-xl hover:shadow-primary-500/5 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Agency Info</h2>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            ℹ️
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">SafeHaven Shelter</p>
                        <div className="space-y-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                            <p className="flex items-center gap-2">📍 123 Main Street, Cityville</p>
                            <p className="flex items-center gap-2">📞 (555) 123-4567</p>
                            <p className="flex items-center gap-2">🕒 Open 24/7</p>
                        </div>
                        <div className="pt-4 flex items-center justify-between border-t dark:border-white/5 mt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded">OPERATIONAL</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BED AVAILABILITY */}
            <div className="card">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Bed Availability</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Inventory Status</p>
                    </div>
                    <div className="bg-primary-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/20">
                        {availableCount} Available
                    </div>
                </div>

                {availableCount === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-3xl border dark:border-white/5">
                        <div className="text-4xl mb-4">🛏️</div>
                        <p className="text-xl font-black text-slate-800 dark:text-white">No beds currently available.</p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Please check back later or contact staff for referral options.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {Object.entries(availabilityMap).map(([ward, rooms]) => (
                            <div key={ward} className="bg-slate-50/50 dark:bg-white/5 rounded-2xl p-6 border-2 border-transparent hover:border-primary-500/30 transition-all group">
                                <h3 className="font-black text-primary-700 dark:text-primary-400 text-lg mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                                    {ward}
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(rooms).map(([room, count]) => (
                                        <div key={room} className="flex justify-between items-center bg-white dark:bg-slate-800/50 p-3 rounded-xl shadow-sm">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{room}</span>
                                            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-1 rounded-lg uppercase tracking-widest">{count} beds</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

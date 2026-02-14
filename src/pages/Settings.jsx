import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { showToast, confirm } = useNotifications();
    const [activeTab, setActiveTab] = useState('agency');
    const [loading, setLoading] = useState(false);

    // Agency State
    const [project, setProject] = useState(null);
    const [agencyForm, setAgencyForm] = useState({
        project_name: '',
        organization_name: '',
        project_type: 1
    });

    // Users State
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (activeTab === 'agency') fetchAgencyInfo();
        if (activeTab === 'staff') fetchUsers();
    }, [activeTab]);

    const fetchAgencyInfo = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setProject(data);
                setAgencyForm({
                    project_name: data.project_name,
                    organization_name: data.organization_name,
                    project_type: data.project_type
                });
            }
        } catch (error) {
            console.error('Error fetching agency info:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        console.log('Fetching staff directory...');
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error fetching users:', error);
                throw error;
            }

            console.log('Fetched users count:', data?.length || 0);
            setUsers(data || []);

            if (!data || data.length === 0) {
                showToast('No staff profiles found. Please check database permissions.', 'warning');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Failed to load staff directory: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAgency = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update(agencyForm)
                .eq('id', project.id);

            if (error) throw error;
            showToast('Agency info updated successfully!', 'success');
        } catch (error) {
            showToast('Update failed: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserRole = async (userId, newRole) => {
        const confirmed = await confirm({
            title: 'Change User Role',
            message: `Are you sure you want to change this user's role to ${newRole}?`,
            confirmText: 'Update Role',
            variant: 'warning'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            showToast('Role updated!', 'success');
            fetchUsers();
        } catch (error) {
            showToast('Failed to update role', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{t('settings')}</h1>
                    <p className="text-slate-500 font-medium">System configuration and administration</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('agency')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'agency' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    🏢 {t('agencyProfile')}
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    👥 {t('staffManagement')}
                </button>
                <button
                    onClick={() => setActiveTab('prefs')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'prefs' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    ⚙️ {t('language')} / {t('theme')}
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'agency' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card space-y-6">
                            <h2 className="text-xl font-black">{t('agencyProfile')}</h2>
                            <form onSubmit={handleUpdateAgency} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="label">Shelter / Project Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={agencyForm.project_name}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, project_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Organization Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={agencyForm.organization_name}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, organization_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Project Type</label>
                                        <select
                                            className="input"
                                            value={agencyForm.project_type}
                                            onChange={(e) => setAgencyForm({ ...agencyForm, project_type: parseInt(e.target.value) })}
                                        >
                                            <option value={1}>Emergency Shelter</option>
                                            <option value={2}>Transitional Housing</option>
                                            <option value={3}>Permanent Housing</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 border-t dark:border-white/5 flex justify-end">
                                    <button disabled={loading} className="btn btn-primary" type="submit">
                                        {loading ? 'Saving...' : 'Update Agency Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="space-y-6">
                            <div className="card bg-primary-500/5 border-primary-500/10">
                                <h3 className="font-bold text-primary-700 dark:text-primary-400 mb-2">Compliance Note</h3>
                                <p className="text-sm opacity-80 leading-relaxed">
                                    These details are used for HMIS data export and regional reporting. Ensure the organization name matches your official registration.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="card overflow-hidden p-0">
                        <div className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                            <h2 className="text-xl font-black">{t('staffDirectory')}</h2>
                            <span className="text-xs font-bold uppercase tracking-widest bg-primary-100 dark:bg-primary-900/20 text-primary-700 px-3 py-1 rounded-full">
                                {users.length} Active Staff
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Staff Member</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Joined</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-white/5">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                                    {user.first_name} {user.last_name}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                                                    user.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <select
                                                        className="text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded border-none focus:ring-1 focus:ring-primary-500"
                                                        value={user.role}
                                                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                                                    >
                                                        <option value="volunteer">Volunteer</option>
                                                        <option value="staff">Staff</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'prefs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card space-y-6">
                            <h2 className="text-xl font-black">{t('displayPreferences')}</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                    <div>
                                        <p className="font-bold">{t('theme')}</p>
                                        <p className="text-xs opacity-60">Adjust visual contrast strategy</p>
                                    </div>
                                    <button onClick={toggleTheme} className="btn bg-white dark:bg-slate-800 shadow-sm px-4 py-2 border dark:border-white/10">
                                        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                    <div>
                                        <p className="font-bold">{t('language')}</p>
                                        <p className="text-xs opacity-60">Set system-wide translation</p>
                                    </div>
                                    <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border dark:border-white/10">
                                        <button
                                            onClick={() => setLang('en')}
                                            className={`px-3 py-1 text-xs font-black rounded ${lang === 'en' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500'}`}
                                        >
                                            EN
                                        </button>
                                        <button
                                            onClick={() => setLang('ta')}
                                            className={`px-3 py-1 text-xs font-black rounded ${lang === 'ta' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500'}`}
                                        >
                                            TA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card space-y-6">
                            <h2 className="text-xl font-black">{t('systemInfo')}</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b dark:border-white/5">
                                    <span className="text-slate-500 font-medium">Core Version</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200">v2.4.0 (Operational Excellence)</span>
                                </div>
                                <div className="flex justify-between py-2 border-b dark:border-white/5">
                                    <span className="text-slate-500 font-medium">Database Latency</span>
                                    <span className="font-black text-success-600 italic">Optimized (Real-time)</span>
                                </div>
                                <div className="flex justify-between py-2 border-b dark:border-white/5">
                                    <span className="text-slate-500 font-medium">Compliance Env</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200">Indian Standards 2026</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

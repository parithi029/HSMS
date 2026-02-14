import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { exportHUDData } from '../lib/exportUtils';
import BedCheckOutModal from '../components/BedCheckOutModal';
import DischargeModal from '../components/DischargeModal';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';

export default function ClientList() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');
    const { showToast, confirm } = useNotifications();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('last_name'); // name, dob, status
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterType, setFilterType] = useState('all'); // all, assigned, unassigned, discharged, pending
    const [selectedBedForCheckout, setSelectedBedForCheckout] = useState(null);
    const [selectedClientForDischarge, setSelectedClientForDischarge] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setError(null);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('last_name');

            if (error) throw error;

            // Fetch current bed assignments
            const { data: assignments, error: aError } = await supabase
                .from('bed_assignments')
                .select(`
                    id,
                    client_id,
                    bed_id,
                    beds (
                        id,
                        unit_name,
                        bed_number
                    )
                `)
                .is('end_date', null);

            if (aError) throw aError;

            // Fetch active enrollments (or those that haven't been marked inactive)
            const { data: activeEnrollments, error: eError } = await supabase
                .from('enrollments')
                .select('id, client_id')
                .is('exit_date', null)
                .neq('is_active', false);

            if (eError) throw eError;

            const assignmentMap = {};
            assignments?.forEach(a => {
                assignmentMap[a.client_id] = a;
            });

            const enrollmentMap = {};
            activeEnrollments?.forEach(e => {
                enrollmentMap[e.client_id] = e;
            });

            const clientsWithStatus = data.map(client => ({
                ...client,
                is_assigned: !!assignmentMap[client.id],
                active_assignment: assignmentMap[client.id],
                active_enrollment: enrollmentMap[client.id]
            }));

            setClients(clientsWithStatus || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setError(error.message || 'Failed to fetch clients.');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignAll = async () => {
        setLoading(true);
        try {
            // 1. Find or create the General ward
            let generalWard = await supabase
                .from('wards')
                .select('id, name')
                .ilike('name', 'general')
                .single();

            if (!generalWard.data) {
                // Create general ward if it doesn't exist
                const { data: newWard, error: wardError } = await supabase
                    .from('wards')
                    .insert({
                        name: 'General',
                        ward_type: 'general',
                        gender_specific: 'any',
                        is_active: true
                    })
                    .select()
                    .single();

                if (wardError) throw wardError;
                generalWard = { data: newWard };
                showToast('Created "General" ward automatically.', 'info');
            }

            const wardId = generalWard.data.id;

            // 2. Find or create General Room in the General ward
            let generalRoom = await supabase
                .from('rooms')
                .select('id, name')
                .eq('ward_id', wardId)
                .ilike('name', 'general%')
                .single();

            if (!generalRoom.data) {
                // Create general room if it doesn't exist
                const { data: newRoom, error: roomError } = await supabase
                    .from('rooms')
                    .insert({
                        ward_id: wardId,
                        name: 'General Room',
                        gender_specific: 'any',
                        is_active: true
                    })
                    .select()
                    .single();

                if (roomError) throw roomError;
                generalRoom = { data: newRoom };
            }

            const roomId = generalRoom.data.id;

            // 3. Get available beds in the general ward
            const { data: availableBeds, error: bedsError } = await supabase
                .from('beds')
                .select('id, bed_number, room_id, rooms!inner(ward_id)')
                .eq('status', 'available')
                .eq('rooms.ward_id', wardId)
                .order('bed_number');

            if (bedsError) throw bedsError;

            // 4. Filter for unassigned clients who are still active
            const unassignedClients = clients.filter(c => !c.is_assigned && c.is_active !== false);

            if (unassignedClients.length === 0) {
                showToast('All clients in the system are already assigned to a bed.', 'info');
                return;
            }

            // 5. Check if we need to create more beds
            const bedsNeeded = unassignedClients.length - (availableBeds?.length || 0);

            if (bedsNeeded > 0) {
                const shouldCreate = await confirm({
                    title: 'Insufficient Beds in General Ward',
                    message: `You have ${unassignedClients.length} unassigned clients but only ${availableBeds?.length || 0} available beds in the General ward.\n\nWould you like to automatically add ${bedsNeeded} more bed(s) to the General Room?`,
                    confirmText: `Add ${bedsNeeded} Bed${bedsNeeded > 1 ? 's' : ''}`,
                    cancelText: 'Assign What\'s Possible'
                });

                if (shouldCreate) {
                    // Get highest bed number in the room to continue numbering
                    const { data: existingBeds } = await supabase
                        .from('beds')
                        .select('bed_number')
                        .eq('room_id', roomId)
                        .order('bed_number', { ascending: false })
                        .limit(1);

                    let nextBedNumber = 1;
                    if (existingBeds && existingBeds.length > 0) {
                        const lastBedNum = existingBeds[0].bed_number;
                        const match = lastBedNum.match(/(\d+)/);
                        if (match) {
                            nextBedNumber = parseInt(match[1]) + 1;
                        }
                    }

                    // Create the needed beds
                    const newBeds = [];
                    for (let i = 0; i < bedsNeeded; i++) {
                        newBeds.push({
                            ward_id: wardId,
                            room_id: roomId,
                            bed_number: `Bed ${nextBedNumber + i}`,
                            bed_type: 'emergency',
                            status: 'available',
                            is_active: true
                        });
                    }

                    const { data: createdBeds, error: createError } = await supabase
                        .from('beds')
                        .insert(newBeds)
                        .select();

                    if (createError) throw createError;

                    // Add created beds to available beds list
                    availableBeds.push(...createdBeds);
                    showToast(`Created ${bedsNeeded} new bed(s) in General Room.`, 'success');
                }
            }

            if (!availableBeds || availableBeds.length === 0) {
                showToast('No beds available for assignment.', 'error');
                return;
            }

            // 6. Get Main Project (for enrollments)
            const { data: project } = await supabase
                .from('projects')
                .select('id')
                .limit(1)
                .single();

            if (!project) throw new Error('No project found. Please set up a project first.');

            // 7. Start assigning
            const assignedCount = Math.min(availableBeds.length, unassignedClients.length);
            const clientsToAssign = unassignedClients.slice(0, assignedCount);

            for (let i = 0; i < assignedCount; i++) {
                const client = clientsToAssign[i];
                const bed = availableBeds[i];

                // Check for active enrollment
                const { data: activeEnrollment } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq('client_id', client.id)
                    .is('exit_date', null)
                    .neq('is_active', false)
                    .single();

                let enrollmentId;
                if (activeEnrollment) {
                    enrollmentId = activeEnrollment.id;
                } else {
                    const { data: newEnrollment, error: eError } = await supabase
                        .from('enrollments')
                        .insert({
                            client_id: client.id,
                            project_id: project.id,
                            entry_date: new Date().toISOString().split('T')[0],
                            is_active: true
                        })
                        .select()
                        .single();
                    if (eError) throw eError;
                    enrollmentId = newEnrollment.id;
                }

                // Create assignment
                const { error: aError } = await supabase
                    .from('bed_assignments')
                    .insert({
                        bed_id: bed.id,
                        client_id: client.id,
                        enrollment_id: enrollmentId,
                        start_date: new Date().toISOString().split('T')[0]
                    });
                if (aError) throw aError;

                // Update bed status (trigger should handle this, but let's be explicit)
                await supabase
                    .from('beds')
                    .update({ status: 'occupied' })
                    .eq('id', bed.id);
            }

            // 8. Report results
            const remainingCount = unassignedClients.length - assignedCount;
            if (remainingCount > 0) {
                showToast(`Assigned ${assignedCount} of ${unassignedClients.length} clients. ${remainingCount} still need beds.`, 'warning');
            } else {
                showToast(`Successfully assigned all ${assignedCount} clients to beds in the General ward!`, 'success');
            }

            fetchClients();
        } catch (error) {
            console.error('Bulk assignment error:', error);
            showToast('Bulk assignment failed: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAll = async () => {
        const pendingClients = clients.filter(c => c.approval_status === 'pending');
        if (pendingClients.length === 0) return;

        if (await confirm(`Are you sure you want to approve all ${pendingClients.length} pending clients?`, 'Approve All')) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('clients')
                    .update({ approval_status: 'approved' })
                    .eq('approval_status', 'pending');

                if (error) throw error;

                showToast(`Successfully approved ${pendingClients.length} clients!`, 'success');
                fetchClients();
            } catch (error) {
                console.error('Error approving all:', error);
                showToast('Failed to approve clients.', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredClients.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredClients.map(c => c.id));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        const count = selectedIds.length;

        if (await confirm(`Are you sure you want to approve ${count} selected clients?`, 'Bulk Approve')) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('clients')
                    .update({ approval_status: 'approved' })
                    .in('id', selectedIds);

                if (error) throw error;

                showToast(`Successfully approved ${count} clients!`, 'success');
                setSelectedIds([]);
                fetchClients();
            } catch (error) {
                console.error('Error in bulk approval:', error);
                showToast('Bulk approval failed.', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBulkArchive = async () => {
        if (selectedIds.length === 0) return;
        const count = selectedIds.length;

        if (await confirm(`Are you sure you want to archive/deactivate ${count} selected clients? This will effectively remove them from active lists.`, 'Bulk Archive')) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('clients')
                    .update({ is_active: false })
                    .in('id', selectedIds);

                if (error) throw error;

                showToast(`Successfully archived ${count} clients!`, 'success');
                setSelectedIds([]);
                fetchClients();
            } catch (error) {
                console.error('Error in bulk archive:', error);
                showToast('Bulk archive failed.', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBulkExport = () => {
        if (selectedIds.length === 0) return;
        const selectedClients = clients.filter(c => selectedIds.includes(c.id));
        exportHUDData(supabase, 'clients', showToast, selectedClients);
    };

    const filteredClients = clients
        .filter((client) => {
            const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
            const dobString = client.dob || '';
            const matchesSearch = fullName.includes(debouncedSearch.toLowerCase()) || dobString.includes(debouncedSearch);

            if (!matchesSearch) return false;

            const isActive = client.is_active !== false;

            if (filterType === 'discharged') {
                return !isActive;
            } else if (filterType === 'pending') {
                return client.approval_status === 'pending';
            } else {
                if (!isActive) return false;
                if (filterType !== 'all' && client.approval_status === 'pending') return false;
                if (filterType === 'assigned') return client.is_assigned;
                if (filterType === 'unassigned') return !client.is_assigned;
                return true;
            }
        })
        .sort((a, b) => {
            let valA, valB;
            if (sortBy === 'name') {
                valA = `${a.first_name} ${a.last_name}`.toLowerCase();
                valB = `${b.first_name} ${b.last_name}`.toLowerCase();
            } else if (sortBy === 'dob') {
                valA = a.dob || '9999-12-31';
                valB = b.dob || '9999-12-31';
            } else if (sortBy === 'status') {
                valA = a.approval_status || '';
                valB = b.approval_status || '';
            } else {
                valA = (a[sortBy] || '').toString().toLowerCase();
                valB = (b[sortBy] || '').toString().toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                    <p className="mt-4 text-gray-600">Loading clients...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card border-red-200 bg-red-50 p-8 text-center">
                <span className="text-4xl">⚠️</span>
                <h2 className="text-lg font-bold text-red-800 mt-4">Database Error</h2>
                <p className="text-red-600 mt-2">{error}</p>
                <button onClick={fetchClients} className="btn btn-primary mt-6 mx-auto">Retry Loading</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black">{t('clients')}</h1>
                    <p className="opacity-70 mt-1 font-medium italic">Manage records & enrollments</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {isAdmin && filterType === 'pending' && clients.filter(c => c.approval_status === 'pending').length > 0 && (
                        <button
                            onClick={handleApproveAll}
                            className="btn bg-green-600 hover:bg-green-700 text-white text-sm"
                            disabled={loading}
                        >
                            ✅ Approve All
                        </button>
                    )}
                    {filterType === 'unassigned' && (
                        <button
                            onClick={handleAssignAll}
                            className="btn bg-success-600 hover:bg-success-700 text-white text-sm"
                            disabled={loading}
                        >
                            ⚡ Assign All
                        </button>
                    )}
                    <button
                        onClick={() => exportHUDData(supabase, 'clients', showToast)}
                        className="btn btn-outline dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 text-sm"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="card space-y-4">
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input"
                />

                <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <button onClick={() => setFilterType('all')} className={`pb-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${filterType === 'all' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('allClients')}</button>
                    <button onClick={() => setFilterType('pending')} className={`pb-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${filterType === 'pending' ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('pendingApproval')} ({clients.filter(c => c.approval_status === 'pending').length})</button>
                    <button onClick={() => setFilterType('unassigned')} className={`pb-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${filterType === 'unassigned' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('needsBed')} ({clients.filter(c => c.is_active !== false && !c.is_assigned && c.approval_status !== 'pending').length})</button>
                    <button onClick={() => setFilterType('assigned')} className={`pb-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${filterType === 'assigned' ? 'border-success-600 text-success-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('assigned')} ({clients.filter(c => c.is_active !== false && c.is_assigned).length})</button>
                    {isAdmin && (
                        <button onClick={() => setFilterType('discharged')} className={`pb-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${filterType === 'discharged' ? 'border-gray-600 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t('discharged')} ({clients.filter(c => c.is_active === false).length})</button>
                    )}
                </div>

                <div className="flex items-center space-x-2 pt-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
                    <span>{t('sortBy')}:</span>
                    <button onClick={() => toggleSort('name')} className={`px-2 py-1 rounded transition-colors ${sortBy === 'name' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {t('name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button onClick={() => toggleSort('dob')} className={`px-2 py-1 rounded transition-colors ${sortBy === 'dob' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {t('dob')} {sortBy === 'dob' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                    <button onClick={() => toggleSort('status')} className={`px-2 py-1 rounded transition-colors ${sortBy === 'status' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {t('status')} {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>

                    <div className="flex-grow" />

                    {filteredClients.length > 0 && (
                        <label className="flex items-center space-x-2 cursor-pointer hover:text-primary-600 transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === filteredClients.length && filteredClients.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="font-bold">Select All</span>
                        </label>
                    )}
                </div>
            </div>

            {filteredClients.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl">👥</span>
                    <p className="mt-4 text-xl font-medium text-gray-700">{searchTerm ? 'No clients found' : 'No clients yet'}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredClients.map((client) => (
                        <div key={client.id} className={`card hover:shadow-md transition-all ${selectedIds.includes(client.id) ? 'ring-2 ring-primary-500 bg-primary-500/5' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center">
                                <div className="flex items-center mb-4 sm:mb-0 sm:pr-4 sm:mr-4 sm:border-r border-gray-100 dark:border-white/5">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(client.id)}
                                        onChange={() => toggleSelect(client.id)}
                                        className="w-6 h-6 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                    <div className="sm:hidden flex-grow px-4 flex items-center justify-between">
                                        <p className="font-black text-lg">{client.first_name} {client.last_name}</p>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-grow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <Link to={`/clients/${client.id}`} className="flex items-center space-x-4 flex-grow hover:opacity-75">
                                        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{client.first_name?.[0]}{client.last_name?.[0]}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="hidden sm:block font-bold text-lg truncate">{client.first_name} {client.last_name}</p>
                                            <p className="text-sm opacity-70">DOB: {client.dob ? new Date(client.dob).toLocaleDateString() : 'N/A'}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {client.aadhaar_encrypted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">🆔 Aadhaar</span>}
                                                {client.approval_status === 'pending'
                                                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-800 font-bold uppercase tracking-wider">⏳ Pending</span>
                                                    : client.is_assigned
                                                        ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 border border-success-100 dark:border-success-800 font-medium">🛏️ Assigned</span>
                                                        : <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800 font-medium whitespace-nowrap">⚠️ Needs Bed</span>
                                                }
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {isAdmin && client.approval_status === 'pending' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (await confirm('Approve this client for shelter access?', 'Approve Client')) {
                                                        await supabase.from('clients').update({ approval_status: 'approved' }).eq('id', client.id);
                                                        fetchClients();
                                                        showToast('Client approved!', 'success');
                                                    }
                                                }}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {client.is_assigned && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedBedForCheckout(client.active_assignment.beds); }}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
                                            >
                                                Check Out
                                            </button>
                                        )}
                                        {!client.is_assigned && client.is_active !== false && client.approval_status !== 'pending' && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedClientForDischarge(client); }}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 border border-success-100 dark:border-success-500/20 rounded-xl text-xs font-bold hover:bg-success-100 transition-all"
                                            >
                                                Exit
                                            </button>
                                        )}
                                        <svg className="hidden sm:block w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slideUp w-[max-content] max-w-[95vw]">
                    <div className="bg-black/90 backdrop-blur-md text-white px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl flex items-center space-x-3 md:space-x-6 border border-white/10">
                        <div className="border-r border-white/20 pr-3 md:pr-6">
                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-0.5">Selection</p>
                            <p className="text-lg md:text-xl font-black leading-none">{selectedIds.length}</p>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-3">
                            {isAdmin && (
                                <button
                                    onClick={handleBulkApprove}
                                    className="p-2 md:px-4 md:py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-sm font-bold transition-all flex items-center space-x-2"
                                    title="Approve All"
                                >
                                    <span>✅</span>
                                    <span className="hidden sm:inline">Approve</span>
                                </button>
                            )}
                            <button
                                onClick={handleBulkArchive}
                                className="p-2 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all flex items-center space-x-2"
                                title="Archive All"
                            >
                                <span>📦</span>
                                <span className="hidden sm:inline">Archive</span>
                            </button>
                            <button
                                onClick={handleBulkExport}
                                className="p-2 md:px-4 md:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-bold transition-all flex items-center space-x-2"
                                title="Export Data"
                            >
                                <span>📥</span>
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="p-2 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white"
                                title="Clear Selection"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedBedForCheckout && (
                <BedCheckOutModal
                    bed={selectedBedForCheckout}
                    onClose={() => setSelectedBedForCheckout(null)}
                    onSuccess={() => { setSelectedBedForCheckout(null); fetchClients(); }}
                />
            )}

            {selectedClientForDischarge && (
                <DischargeModal
                    client={selectedClientForDischarge}
                    enrollment={selectedClientForDischarge.active_enrollment}
                    onClose={() => setSelectedClientForDischarge(null)}
                    onSuccess={() => { setSelectedClientForDischarge(null); fetchClients(); }}
                />
            )}

            <button onClick={() => navigate('/clients/new')} className="fab" title="Add New Client">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function ReservationModal({ bed, onClose, onSuccess }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const { showToast } = useNotifications();

    // Search clients
    useEffect(() => {
        const searchClients = async () => {
            if (searchTerm.length < 2) {
                setClients([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, first_name, last_name, dob, aadhaar_encrypted')
                    .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
                    .limit(5);

                if (error) throw error;
                setClients(data || []);
            } catch (error) {
                console.error('Error searching clients:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchClients, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleReserve = async () => {
        if (!selectedClient || !bed) return;
        setLoading(true);

        try {
            // 1. Create bed assignment (as a reservation)
            // We'll mark the bed status as 'reserved'
            const { error: assignError } = await supabase
                .from('bed_assignments')
                .insert({
                    bed_id: bed.id,
                    client_id: selectedClient.id,
                    start_date: new Date().toISOString().split('T')[0]
                    // We might not have an enrollment yet for reservations, 
                    // or we can create one. Let's keep it simple for now.
                });

            if (assignError) throw assignError;

            // 2. Update bed status to 'reserved'
            const { error: bedError } = await supabase
                .from('beds')
                .update({ status: 'reserved' })
                .eq('id', bed.id);

            if (bedError) throw bedError;

            showToast(`Bed ${bed.bed_number} reserved for ${selectedClient.first_name}!`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error reserving bed:', error);
            showToast('Failed to reserve bed: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-primary-50 dark:bg-primary-900/10">
                    <div>
                        <h2 className="text-xl font-black text-primary-900 dark:text-primary-100 italic">Reserve Bed {bed.bed_number}</h2>
                        <p className="text-xs opacity-60">
                            Create a future reservation for a client
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <div className="p-6 space-y-6">
                    {!selectedClient ? (
                        <div>
                            <label className="label">Search Client to Reserve For</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Type name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            <div className="mt-2 space-y-2">
                                {isSearching && <p className="text-sm opacity-60">Searching...</p>}
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => setSelectedClient(client)}
                                        className="p-3 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-primary-500/5 cursor-pointer transition-colors"
                                    >
                                        <p className="font-bold">{client.first_name} {client.last_name}</p>
                                        <p className="text-xs opacity-60">
                                            DOB: {client.dob}
                                        </p>
                                    </div>
                                ))}
                                {searchTerm.length >= 2 && clients.length === 0 && !isSearching && (
                                    <p className="text-sm text-gray-500">No clients found.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-black text-primary-600">
                                        {selectedClient.first_name} {selectedClient.last_name}
                                    </p>
                                    <p className="text-xs opacity-60 font-medium italic">Reservation Holder</p>
                                </div>
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="text-xs font-bold text-danger-600 hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50/50 dark:bg-white/5 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary px-6"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleReserve}
                        disabled={!selectedClient || loading}
                        className={`btn bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center space-x-2 px-6 ${(!selectedClient || loading) ? 'opacity-50' : ''}`}
                    >
                        <span>🔵</span>
                        <span>{loading ? 'Reserving...' : 'Confirm Reservation'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

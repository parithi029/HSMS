import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DESTINATION_OPTIONS } from '../lib/shelterConstants';
import { useNotifications } from '../context/NotificationContext';

export default function DischargeModal({ client, enrollment, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [destination, setDestination] = useState('');
    const [reason, setReason] = useState('');
    const [housingStatus, setHousingStatus] = useState('');
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const { showToast } = useNotifications();

    const handleDischarge = async () => {
        if (!destination) return;
        setLoading(true);

        try {
            // 1. Update Enrollment - Close it if it exists
            if (enrollment) {
                const { error: enrollError } = await supabase
                    .from('enrollments')
                    .update({
                        exit_date: exitDate,
                        destination: parseInt(destination),
                        exit_reason: reason,
                        housing_status_at_exit: parseInt(housingStatus) || null,
                        is_active: false
                    })
                    .eq('id', enrollment.id);

                if (enrollError) throw enrollError;
            }

            // 2. Update Client - Archive them
            const { error: clientError } = await supabase
                .from('clients')
                .update({ is_active: false })
                .eq('id', client.id);

            if (clientError) throw clientError;

            showToast('Client successfully discharged and archived.', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error discharging client:', error);
            showToast('Failed to discharge: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Discharge from Program</h2>
                    <p className="text-xs opacity-60">
                        {client.first_name} {client.last_name}
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-orange-500/10 p-3 rounded-xl text-sm border border-orange-500/20 font-medium">
                        This will officially discharge the client from the program. This should be done only after the client has left the shelter.
                    </div>

                    <div>
                        <label className="label">Exit Date *</label>
                        <input
                            type="date"
                            className="input"
                            value={exitDate}
                            onChange={(e) => setExitDate(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Exit Destination (HUD) *</label>
                        <select
                            className="input"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            required
                        >
                            <option value="">Select Destination...</option>
                            {DESTINATION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Reason for Leaving</label>
                        <select
                            className="input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        >
                            <option value="">Select Reason...</option>
                            <option value="Completed Program">Completed Program</option>
                            <option value="Non-payment of Rent">Non-payment of Rent</option>
                            <option value="Non-compliance">Non-compliance</option>
                            <option value="Disagreement with Rules">Disagreement with Rules</option>
                            <option value="Left Voluntarily">Left Voluntarily</option>
                            <option value="Unknown/Vanished">Unknown/Vanished</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Housing Status at Exit</label>
                        <select
                            className="input"
                            value={housingStatus}
                            onChange={(e) => setHousingStatus(e.target.value)}
                        >
                            <option value="">Select Status...</option>
                            <option value="1">Category 1 - Homeless</option>
                            <option value="2">Category 2 - At imminent risk</option>
                            <option value="3">Category 3 - Homeless under other federal statutes</option>
                            <option value="4">Category 4 - Fleeing/attempting to flee DV</option>
                            <option value="0">At-risk of homelessness</option>
                            <option value="5">Stably housed</option>
                        </select>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50/50 dark:bg-white/5">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDischarge}
                        disabled={!destination || loading}
                        className="btn btn-success"
                    >
                        {loading ? 'Processing...' : 'Confirm Discharge'}
                    </button>
                </div>
            </div>
        </div>
    );
}

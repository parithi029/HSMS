import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function BedCheckOutModal({ bed, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const { showToast } = useNotifications();

    const handleCheckOut = async () => {
        setLoading(true);

        try {
            // 1. Get active assignment
            let assignment = bed.bed_assignments?.find(a => !a.end_date);

            if (!assignment) {
                const { data: fetchedAssignment, error: fetchErr } = await supabase
                    .from('bed_assignments')
                    .select('id, enrollment_id')
                    .eq('bed_id', bed.id)
                    .is('end_date', null)
                    .single();

                if (fetchErr) throw new Error('Could not find an active assignment for this bed. It may have already been checked out.');
                assignment = fetchedAssignment;
            }

            // 2. Update Bed Assignment (Ends the residential stay but keeps enrollment active)
            const { error: assignError } = await supabase
                .from('bed_assignments')
                .update({ end_date: exitDate })
                .eq('id', assignment.id);

            if (assignError) throw assignError;

            // 3. Update Bed Status
            await supabase
                .from('beds')
                .update({ status: 'available' })
                .eq('id', bed.id);

            showToast('Bed checked out successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error checking out:', error);
            showToast('Failed to check out: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Check Out / Free Bed</h2>
                    <p className="text-xs opacity-60">
                        Bed {bed.bed_number} - {bed.bed_assignments?.find(a => !a.end_date)?.clients ?
                            `${bed.bed_assignments.find(a => !a.end_date).clients.first_name} ${bed.bed_assignments.find(a => !a.end_date).clients.last_name}` :
                            'Current Occupant'}
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-primary-500/10 p-3 rounded-xl text-sm border border-primary-500/20 font-medium">
                        This will free up the bed for other clients. The client will remain enrolled in the program but will be unassigned from this bed.
                    </div>
                    <div>
                        <label className="label">Check Out Date *</label>
                        <input
                            type="date"
                            className="input"
                            value={exitDate}
                            onChange={(e) => setExitDate(e.target.value)}
                            required
                        />
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
                        onClick={handleCheckOut}
                        disabled={loading}
                        className="btn btn-danger"
                    >
                        {loading ? 'Processing...' : 'Confirm Check Out'}
                    </button>
                </div>
            </div>
        </div>
    );
}

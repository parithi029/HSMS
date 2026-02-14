import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function EditWardModal({ ward, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const { showToast, confirm } = useNotifications();
    const [formData, setFormData] = useState({
        name: ward?.name || '',
        ward_type: ward?.ward_type || 'general',
        gender_specific: ward?.gender_specific || 'any',
        capacity: ward?.capacity || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('wards')
                .update({
                    ...formData,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ward.id);

            if (error) throw error;

            showToast('Ward updated successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating ward:', error);
            showToast('Failed to update ward: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Delete Ward',
            message: `Are you sure you want to delete "${ward.name}"? This will ALSO delete all beds/mats associated with it.`,
            confirmText: 'Delete Everything',
            variant: 'danger'
        });

        if (!confirmed) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('wards')
                .delete()
                .eq('id', ward.id);

            if (error) throw error;

            showToast('Ward deleted successfully.', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting ward:', error);
            showToast('Failed to delete ward: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Edit Ward / Room</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="label">Ward / Room Name *</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Section Type</label>
                        <select
                            className="input"
                            value={formData.ward_type}
                            onChange={(e) => setFormData({ ...formData, ward_type: e.target.value })}
                        >
                            <option value="general">General Ward</option>
                            <option value="medical">Medical / Isolation</option>
                            <option value="family">Family Room</option>
                            <option value="emergency">Emergency / Overflow</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Gender Specificity</label>
                        <select
                            className="input"
                            value={formData.gender_specific}
                            onChange={(e) => setFormData({ ...formData, gender_specific: e.target.value })}
                        >
                            <option value="any">Any / Mixed</option>
                            <option value="male">Male Only</option>
                            <option value="female">Female Only</option>
                        </select>
                    </div>

                    <div>
                        <label className="label">Capacity (Optional)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex justify-between border-t bg-gray-50/50 dark:bg-white/5 p-6 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-800 text-sm font-bold flex items-center"
                        >
                            <span className="mr-1">🗑️</span> Delete Ward
                        </button>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary px-6">Cancel</button>
                            <button type="submit" disabled={loading} className="btn btn-primary px-6">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

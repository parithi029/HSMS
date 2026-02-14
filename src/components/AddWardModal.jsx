import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function AddWardModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const { showToast } = useNotifications();
    const [batchMode, setBatchMode] = useState(false);
    const [batchCount, setBatchCount] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        ward_type: 'general',
        gender_specific: 'any',
        capacity: ''
    });

    const handleBatchSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const wardsToInsert = [];
            for (let i = 1; i <= batchCount; i++) {
                wardsToInsert.push({
                    name: `${formData.name} ${i}`,
                    ward_type: formData.ward_type,
                    gender_specific: formData.gender_specific,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null
                });
            }

            const { error } = await supabase
                .from('wards')
                .insert(wardsToInsert);

            if (error) {
                if (error.code === '23505') {
                    throw new Error('One or more of these wards already exist. Try a different base name.');
                }
                throw error;
            }

            showToast(`Successfully added ${batchCount} wards!`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error batch adding wards:', error);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (batchMode) return handleBatchSubmit(e);

        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('wards')
                .insert([{
                    ...formData,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null
                }]);

            if (error) {
                if (error.code === '23505') {
                    throw new Error('A ward with this name already exists.');
                }
                throw error;
            }

            showToast('Ward added successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error adding ward:', error);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Add New Ward / Section</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <div className="p-4 bg-primary-500/10 border-b border-primary-500/20 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Mode</p>
                        <p className="text-sm font-bold">{batchMode ? 'Batch Creation (Quick)' : 'Single Ward'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setBatchMode(!batchMode)}
                        className="text-xs font-bold bg-white dark:bg-white/10 px-3 py-1.5 rounded-lg border border-primary-500/30 text-primary-600 hover:bg-primary-50 shadow-sm transition-all"
                    >
                        {batchMode ? 'Switch to Single' : 'Quick Batch Mode'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {batchMode && (
                        <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex items-center justify-between">
                            <label className="text-sm font-bold">How many wards?</label>
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setBatchCount(Math.max(1, batchCount - 1))}
                                    className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-orange-500/30 flex items-center justify-center font-bold text-orange-600 hover:bg-orange-100/50"
                                >
                                    -
                                </button>
                                <span className="text-lg font-black w-8 text-center">{batchCount}</span>
                                <button
                                    type="button"
                                    onClick={() => setBatchCount(Math.min(20, batchCount + 1))}
                                    className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-orange-500/30 flex items-center justify-center font-bold text-orange-600 hover:bg-orange-100/50"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="label">{batchMode ? 'Base Name (e.g. Room)' : 'Ward / Room Name *'}</label>
                        <input
                            type="text"
                            className="input"
                            placeholder={batchMode ? 'e.g. Room (will create Room 1, Room 2...)' : 'e.g. Ward A, Room 101'}
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Section Type</label>
                            <select
                                className="input"
                                value={formData.ward_type}
                                onChange={(e) => setFormData({ ...formData, ward_type: e.target.value })}
                            >
                                <option value="general">General</option>
                                <option value="medical">Medical</option>
                                <option value="family">Family</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Gender</label>
                            <select
                                className="input"
                                value={formData.gender_specific}
                                onChange={(e) => setFormData({ ...formData, gender_specific: e.target.value })}
                            >
                                <option value="any">Mixed</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Default Capacity (Optional)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="e.g. 20"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex justify-end space-x-3 border-t bg-gray-50/50 dark:bg-white/5 p-4 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Processing...' : batchMode ? `Add ${batchCount} Wards` : 'Create Ward'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

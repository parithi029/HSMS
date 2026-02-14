import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function EditRoomModal({ room, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { showToast, confirm } = useNotifications();
    const [formData, setFormData] = useState({
        // ... (rest of the code remains same, but using showToast instead of inline errors/alerts)
        name: room.name || '',
        room_type: room.room_type || 'general',
        gender_specific: room.gender_specific || 'any',
        capacity: room.capacity || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('rooms')
                .update({
                    name: formData.name,
                    room_type: formData.room_type,
                    gender_specific: formData.gender_specific,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', room.id);

            if (updateError) {
                if (updateError.code === '23505') {
                    throw new Error('A room with this name already exists in this ward.');
                }
                throw updateError;
            }

            setSuccess(true);
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Error updating room:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Delete Room',
            message: `Are you sure you want to delete room "${room.name}"? This will only work if there are no beds in this room.`,
            confirmText: 'Delete Room',
            variant: 'danger'
        });

        if (!confirmed) return;

        setLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('rooms')
                .delete()
                .eq('id', room.id);

            if (deleteError) {
                if (deleteError.code === '23503') {
                    throw new Error('Cannot delete room because it contains beds. Please remove or move the beds first.');
                }
                throw deleteError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error deleting room:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Room Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            <strong>⚠️ Error:</strong> {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg text-center font-bold">
                            ✅ Room updated successfully!
                        </div>
                    )}

                    <div>
                        <label className="label">Room Name / Number *</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Room Type</label>
                            <select
                                className="input"
                                value={formData.room_type}
                                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                            >
                                <option value="general">General</option>
                                <option value="medical">Medical</option>
                                <option value="family">Family</option>
                                <option value="isolation">Isolation</option>
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
                        <label className="label">Room Capacity (Optional)</label>
                        <input
                            type="number"
                            className="input"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex justify-between items-center border-t bg-gray-50/50 dark:bg-white/5 p-6 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-800 text-sm font-bold flex items-center"
                            disabled={loading}
                        >
                            <span>🗑️</span>
                            <span className="ml-1">Delete Room</span>
                        </button>
                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary px-6">Cancel</button>
                            <button type="submit" disabled={loading} className="btn btn-success text-white px-6">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useWards } from '../hooks/useWards';

export default function AddRoomModal({ onClose, onSuccess, initialWardId }) {
    const { wards, loading: wardsLoading } = useWards();
    const [loading, setLoading] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [batchCount, setBatchCount] = useState(1);
    const [formData, setFormData] = useState({
        ward_id: initialWardId || '',
        name: '',
        room_type: 'general',
        gender_specific: 'any',
        capacity: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleBatchSubmit = async (e) => {
        e.preventDefault();
        if (!formData.ward_id) {
            setError('Please select a ward.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const roomsToInsert = [];
            for (let i = 1; i <= batchCount; i++) {
                roomsToInsert.push({
                    ward_id: formData.ward_id,
                    name: batchCount === 1 ? formData.name : `${formData.name} ${i}`,
                    room_type: formData.room_type,
                    gender_specific: formData.gender_specific,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null
                });
            }

            const { error: insertError } = await supabase
                .from('rooms')
                .insert(roomsToInsert)
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('One or more of these rooms already exist in this ward.');
                }
                throw insertError;
            }

            setSuccess(true);
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Error batch adding rooms:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (batchMode) return handleBatchSubmit(e);

        e.preventDefault();
        if (!formData.ward_id) {
            setError('Please select a ward.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('rooms')
                .insert([{
                    ward_id: formData.ward_id,
                    name: formData.name,
                    room_type: formData.room_type,
                    gender_specific: formData.gender_specific,
                    capacity: formData.capacity ? parseInt(formData.capacity) : null
                }])
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('A room with this name already exists in this ward.');
                }
                throw insertError;
            }

            setSuccess(true);
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Error adding room:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const selectedWardName = wards.find(w => w.id === (initialWardId || formData.ward_id))?.name || 'this ward';

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Add New Room / Unit</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <div className="p-4 bg-success-500/10 border-b border-success-500/20 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-success-600 uppercase tracking-wider">Mode</p>
                        <p className="text-sm font-bold">{batchMode ? 'Batch Creation (Quick)' : 'Single Room'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setBatchMode(!batchMode)}
                        className="text-xs font-bold bg-white dark:bg-white/10 px-3 py-1.5 rounded-lg border border-success-500/30 text-success-600 hover:bg-success-50 shadow-sm transition-all"
                    >
                        {batchMode ? 'Switch to Single' : 'Quick Batch Mode'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg animate-shake">
                            <strong>⚠️ Error:</strong> {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg text-center font-bold animate-fadeIn">
                            ✅ Room(s) added successfully!
                        </div>
                    )}
                    {!initialWardId && (
                        <div>
                            <label className="label">Select Ward *</label>
                            <select
                                className="input"
                                required
                                value={formData.ward_id}
                                onChange={(e) => setFormData({ ...formData, ward_id: e.target.value })}
                                disabled={wardsLoading}
                            >
                                <option value="">Select Ward...</option>
                                {wards.map(ward => (
                                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {batchMode && (
                        <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex items-center justify-between">
                            <label className="text-sm font-bold">How many rooms?</label>
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
                        <label className="label">{batchMode ? 'Base Name (e.g. Room)' : 'Room Name / Number *'}</label>
                        <input
                            type="text"
                            className="input"
                            placeholder={batchMode ? 'e.g. Room (will create Room 1, Room 2...)' : 'e.g. Room 101, Unit A'}
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
                            placeholder="e.g. 4"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex justify-end space-x-3 border-t bg-gray-50/50 dark:bg-white/5 p-4 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-success text-white">
                            {loading ? 'Processing...' : batchMode ? `Add ${batchCount} Rooms` : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

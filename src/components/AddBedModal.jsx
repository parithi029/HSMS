import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useWards } from '../hooks/useWards';
import { useRooms } from '../hooks/useRooms';

export default function AddBedModal({ onClose, onSuccess, initialWardId, initialRoomId }) {
    const { wards, loading: wardsLoading } = useWards();
    const { rooms, loading: roomsLoading } = useRooms(initialWardId);
    const [loading, setLoading] = useState(false);
    const [quickAddSuccess, setQuickAddSuccess] = useState(null);
    const [batchCount, setBatchCount] = useState(1);
    const [formData, setFormData] = useState({
        ward_id: initialWardId || '',
        room_id: initialRoomId || '',
        bed_number: '',
        bed_type: 'emergency',
        status: 'available'
    });

    // Set default ward if available and not pre-provided
    useEffect(() => {
        if (!initialWardId && wards.length > 0 && !formData.ward_id) {
            setFormData(prev => ({ ...prev, ward_id: wards[0].id }));
        }
    }, [wards, initialWardId]);

    const [error, setError] = useState(null);

    const handleQuickAdd = async () => {
        const targetRoomId = initialRoomId || formData.room_id;

        if (!targetRoomId) {
            setError('Please select a room first.');
            return;
        }

        setLoading(true);
        setQuickAddSuccess(null);
        setError(null);
        try {
            // 1. Fetch current beds for this room
            const { data: roomBeds, error: fetchError } = await supabase
                .from('beds')
                .select('bed_number')
                .eq('room_id', targetRoomId);

            if (fetchError) throw fetchError;

            let localBedNumbers = (roomBeds || []).map(b => {
                const match = b.bed_number.match(/\d+/);
                return match ? parseInt(match[0]) : NaN;
            }).filter(n => !isNaN(n));

            const newBedsToInsert = [];
            let nextNum = localBedNumbers.length > 0 ? Math.max(...localBedNumbers) + 1 : 1;

            for (let i = 0; i < batchCount; i++) {
                newBedsToInsert.push({
                    room_id: targetRoomId,
                    ward_id: initialWardId || formData.ward_id, // Keep for compatibility
                    bed_number: nextNum.toString(),
                    bed_type: 'emergency',
                    status: 'available',
                    is_active: true
                });
                nextNum++;
            }

            const { error: insertError } = await supabase
                .from('beds')
                .insert(newBedsToInsert)
                .select();

            if (insertError) throw insertError;

            setQuickAddSuccess({ count: batchCount });
            if (onSuccess) onSuccess();

        } catch (err) {
            console.error('Quick add failed:', err);
            setError('Quick add failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.room_id) {
            setError('Please select a room.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('beds')
                .insert([{
                    ...formData,
                    is_active: true
                }])
                .select();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('A bed with this number already exists in this room.');
                }
                throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error adding bed:', err);
            setError(err.message);
            setLoading(false);
        }
    };


    const selectedWard = wards.find(w => w.id === (initialWardId || formData.ward_id));
    const selectedRoom = rooms.find(r => r.id === (initialRoomId || formData.room_id));
    const headerTitle = initialRoomId ? `Add to ${selectedRoom?.name}` : initialWardId ? `Add to ${selectedWard?.name}` : 'Add New Bed';

    const filteredRooms = rooms.filter(r => r.ward_id === (initialWardId || formData.ward_id));

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">{headerTitle}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg animate-shake">
                            <strong>⚠️ Error:</strong> {error}
                        </div>
                    )}
                    {quickAddSuccess ? (
                        <div className="bg-success-50 border border-success-200 p-4 rounded-lg text-center">
                            <span className="text-3xl">✅</span>
                            <h3 className="text-lg font-bold text-success-900 mt-2">
                                Added Successfully!
                            </h3>
                            <button
                                type="button"
                                onClick={() => setQuickAddSuccess(null)}
                                className="mt-4 text-sm text-success-700 hover:underline"
                            >
                                Add more
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-xl space-y-3 shadow-sm transition-colors">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase opacity-60">
                                        Quick Add {batchCount} {batchCount === 1 ? 'Bed' : 'Beds'}
                                    </label>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setBatchCount(Math.max(1, batchCount - 1))}
                                            className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-primary-500/30 flex items-center justify-center font-bold text-primary-600 hover:bg-white/20 transition-all"
                                        >
                                            -
                                        </button>
                                        <span className="text-lg font-black w-8 text-center">{batchCount}</span>
                                        <button
                                            type="button"
                                            onClick={() => setBatchCount(Math.min(50, batchCount + 1))}
                                            className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-primary-500/30 flex items-center justify-center font-bold text-primary-600 hover:bg-white/20 transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleQuickAdd}
                                    disabled={loading || wardsLoading || roomsLoading || (!initialRoomId && !formData.room_id)}
                                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <span>⚡</span>
                                    <span>{loading ? 'Processing...' : `Add ${batchCount} Beds to ${selectedRoom?.name || 'Selected Room'}`}</span>
                                </button>
                                {!initialRoomId && !formData.room_id && (
                                    <p className="text-[10px] text-primary-600 text-center">
                                        Please select a room below to use Quick Add.
                                    </p>
                                )}
                            </div>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-medium">Or manual entry</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!initialWardId && (
                                    <div>
                                        <label className="label">Select Ward *</label>
                                        <select
                                            className="input"
                                            required
                                            value={formData.ward_id}
                                            onChange={(e) => setFormData({ ...formData, ward_id: e.target.value, room_id: '' })}
                                            disabled={wardsLoading}
                                        >
                                            <option value="">Select Ward...</option>
                                            {wards.map(ward => (
                                                <option key={ward.id} value={ward.id}>{ward.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {!initialRoomId && (
                                    <div>
                                        <label className="label">Select Room * {formData.ward_id && `(${filteredRooms.length} available)`}</label>
                                        <select
                                            className="input"
                                            required
                                            disabled={!formData.ward_id || roomsLoading}
                                            value={formData.room_id}
                                            onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                                        >
                                            <option value="">Select Room...</option>
                                            {filteredRooms.map(room => (
                                                <option key={room.id} value={room.id}>{room.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="label">Bed / Mat Number *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. 01, B-12"
                                        required
                                        value={formData.bed_number}
                                        onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label">Type</label>
                                    <select
                                        className="input"
                                        value={formData.bed_type}
                                        onChange={(e) => setFormData({ ...formData, bed_type: e.target.value })}
                                    >
                                        <option value="emergency">Emergency Bed</option>
                                        <option value="mat">Floor Mat</option>
                                        <option value="overflow">Overflow</option>
                                        <option value="transitional">Transitional</option>
                                    </select>
                                </div>

                                <div className="pt-6 flex justify-end space-x-3 border-t bg-gray-50/50 dark:bg-white/5 p-4 rounded-b-2xl">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !formData.ward_id}
                                        className="btn btn-primary"
                                    >
                                        {loading ? 'Adding...' : 'Add Bed / Mat'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

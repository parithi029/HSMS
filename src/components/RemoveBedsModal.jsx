import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RemoveBedsModal({ room, onClose, onSuccess }) {
    const [count, setCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableBeds, setAvailableBeds] = useState([]);

    useEffect(() => {
        if (room && room.beds) {
            const available = room.beds.filter(b => b.status === 'available');
            setAvailableBeds(available);
            // Reset count if it exceeds available
            if (count > available.length) {
                setCount(Math.max(1, available.length));
            }
        }
    }, [room]);

    const maxBeds = availableBeds.length;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Sort by bed_number and take the last N beds (newest first)
            // Assumes numeric part in bed_number
            const bedsToRemove = [...availableBeds]
                .sort((a, b) => {
                    const numA = parseInt(a.bed_number.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.bed_number.match(/\d+/)?.[0] || 0);
                    return numB - numA; // Descending order (remove newest first)
                })
                .slice(0, count);

            const bedIds = bedsToRemove.map(b => b.id);

            const { error: deleteError } = await supabase
                .from('beds')
                .delete()
                .in('id', bedIds);

            if (deleteError) throw deleteError;

            onSuccess(count);
            onClose();
        } catch (err) {
            console.error('Error removing beds:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    if (!room) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in border-danger-500/30">
                <div className="p-4 border-b flex justify-between items-center bg-danger-500/10 dark:bg-danger-500/20">
                    <h2 className="text-xl font-black text-danger-600 flex items-center gap-2">
                        <span>🗑️</span> Remove Beds
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-danger-400 hover:text-danger-600 font-bold text-xl transition-colors"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-danger-500/10 p-4 rounded-xl border border-danger-500/20">
                        <p className="font-bold text-danger-600">
                            You are about to remove beds from {room.name}.
                        </p>
                        <p className="text-xs opacity-60 mt-1">
                            Only available beds can be removed. Occupied beds are safe.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg animate-shake">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-gray-700">
                                How many beds to remove?
                            </label>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {maxBeds} Available
                            </span>
                        </div>

                        <div className="flex items-center justify-center space-x-4">
                            <button
                                type="button"
                                onClick={() => setCount(Math.max(1, count - 1))}
                                className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                                disabled={count <= 1}
                            >
                                -
                            </button>

                            <div className="w-20 text-center">
                                <span className="text-4xl font-black text-gray-800">{count}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setCount(Math.min(maxBeds, count + 1))}
                                className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                                disabled={count >= maxBeds}
                            >
                                +
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-500">
                            Removing {count} bed{count !== 1 ? 's' : ''}
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn btn-danger w-full py-3 h-14 ${loading ? 'opacity-50' : ''}`}
                        >
                            {loading ? 'Processing...' : `Confirm Delete ${count} Bed${count !== 1 ? 's' : ''}`}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn btn-secondary w-full py-3 h-14"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

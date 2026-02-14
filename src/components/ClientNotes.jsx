import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function ClientNotes({ clientId }) {
    const { showToast } = useNotifications();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, [clientId]);

    const fetchNotes = async () => {
        try {
            // Fetch services of type 'Case Management' (1) or 'Other' (14) that have case_notes
            const { data, error } = await supabase
                .from('services')
                .select(`
                    id,
                    service_date,
                    case_notes,
                    created_at,
                    provided_by (
                        first_name,
                        last_name
                    )
                `)
                .eq('client_id', clientId)
                .neq('case_notes', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setSubmitting(true);
        try {
            // Insert as a "Case Management" service (Type 1)
            const { error } = await supabase
                .from('services')
                .insert({
                    client_id: clientId,
                    service_type: 1, // Case Management
                    case_notes: newNote,
                    service_date: new Date().toISOString().split('T')[0]
                });

            if (error) throw error;

            setNewNote('');
            fetchNotes(); // Refresh list
        } catch (error) {
            console.error('Error adding note:', error);
            showToast('Failed to add note: ' + error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Add Note Form */}
            <div className="card bg-gray-50 border-gray-200">
                <form onSubmit={handleAddNote}>
                    <label className="label">Add Case Note</label>
                    <textarea
                        className="input min-h-[100px]"
                        placeholder="Type case notes here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        required
                    ></textarea>
                    <div className="mt-3 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !newNote.trim()}
                            className="btn btn-primary"
                        >
                            {submitting ? 'Saving...' : 'Add Note'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Case History</h3>

                {loading ? (
                    <div className="text-center py-4">Loading notes...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No case notes recorded yet.
                    </div>
                ) : (
                    notes.map((note) => (
                        <div key={note.id} className="card hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">
                                        {note.provided_by?.first_name} {note.provided_by?.last_name || 'Staff'}
                                    </span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                        Case Management
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {new Date(note.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{note.case_notes}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

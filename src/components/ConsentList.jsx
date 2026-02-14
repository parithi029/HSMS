import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ConsentList({ clientId, onNewConsent }) {
    const [consents, setConsents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConsents();
    }, [clientId]);

    const fetchConsents = async () => {
        try {
            const { data, error } = await supabase
                .from('consents')
                .select('*')
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConsents(data || []);
        } catch (error) {
            console.error('Error fetching consents:', error);
        } finally {
            setLoading(false);
        }
    };

    // Export fetchConsents for parent to call
    useEffect(() => {
        // Expose to window for simpler callback if needed, or just rely on re-renders
    }, []);

    if (loading) return <div className="text-center py-4">Loading consents...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Signed Consents</h3>
                <button
                    onClick={onNewConsent}
                    className="btn btn-primary text-sm"
                >
                    + New Consent
                </button>
            </div>

            {consents.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-6xl">📄</span>
                    <p className="mt-4 text-xl font-medium text-gray-700">No Consents Found</p>
                    <p className="text-gray-500 mt-2">The client has not signed any digital consent forms yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consents.map((consent) => (
                        <div key={consent.id} className="card border-l-4 border-l-primary-500">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-gray-900">{consent.consent_type}</h4>
                                    <p className="text-xs text-gray-500">
                                        Signed: {new Date(consent.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${consent.consent_granted ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'
                                    }`}>
                                    {consent.consent_granted ? 'Granted' : 'Revoked'}
                                </span>
                            </div>

                            <div className="mt-4 bg-gray-50 p-2 rounded border border-gray-200">
                                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">Digital Signature</p>
                                <img
                                    src={consent.signature_data}
                                    alt="Client Signature"
                                    className="h-12 object-contain grayscale"
                                />
                            </div>

                            <div className="mt-3 text-xs text-gray-500 flex justify-between">
                                <span>Expires: {new Date(consent.expiration_date).toLocaleDateString()}</span>
                                <span className="text-primary-600 cursor-pointer hover:underline">View Policy</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

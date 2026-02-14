import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

export default function ConsentModal({ clientId, clientName, onClose, onSuccess }) {
    const { showToast } = useNotifications();
    const [loading, setLoading] = useState(false);
    const [consentType, setConsentType] = useState('ROI');
    const [granted, setGranted] = useState(true);
    const sigCanvas = useRef(null);

    const consentTypes = [
        { value: 'ROI', label: 'Release of Information (ROI)' },
        { value: 'Data Sharing', label: 'HMIS Data Sharing Consent' },
        { value: 'Photo Release', label: 'Photo/Media Release' },
        { value: 'Grievance', label: 'Grievance Policy Acknowledgement' }
    ];

    const clearSignature = () => {
        sigCanvas.current.clear();
    };

    const handleSave = async () => {
        if (sigCanvas.current.isEmpty()) {
            showToast('Please provide a signature.', 'error');
            return;
        }

        setLoading(true);
        try {
            const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

            const { error } = await supabase
                .from('consents')
                .insert({
                    client_id: clientId,
                    consent_type: consentType,
                    consent_granted: granted,
                    start_date: new Date().toISOString().split('T')[0],
                    expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // Default 1 year
                    signature_data: signatureBase64
                });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving consent:', error);
            showToast('Failed to save consent: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-lg shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-black">New Digital Consent</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-black text-xl">&times;</button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="label">Consent Type</label>
                            <select
                                className="input"
                                value={consentType}
                                onChange={(e) => setConsentType(e.target.value)}
                            >
                                {consentTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="granted"
                                className="w-4 h-4 text-primary-600 rounded"
                                checked={granted}
                                onChange={(e) => setGranted(e.target.checked)}
                            />
                            <label htmlFor="granted" className="text-sm font-medium text-gray-700">
                                Consent Granted by Client
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Client Signature</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl overflow-hidden bg-white/50 dark:bg-black/20">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="currentColor"
                                canvasProps={{
                                    className: "w-full h-48 cursor-crosshair",
                                    style: { width: '100%', height: '200px', color: 'var(--app-text)' }
                                }}
                            />
                        </div>
                        <div className="flex justify-start">
                            <button
                                onClick={clearSignature}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                                Clear Signature
                            </button>
                        </div>
                    </div>

                    <div className="bg-primary-500/10 p-4 rounded-xl text-xs font-medium border border-primary-500/20">
                        <p><strong>Legal Notice:</strong> This electronic signature is legally binding and carries the same weight as a handwritten signature under the ESIGN Act and UETA.</p>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? 'Saving...' : 'Sign & Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

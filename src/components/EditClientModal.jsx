import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';
import { encryptText, decryptText } from '../lib/encryption';
import {
    CATEGORY_OPTIONS,
    SEX_OPTIONS,
    EX_SERVICEMAN_OPTIONS
} from '../lib/shelterConstants';

export default function EditClientModal({ client, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const { showToast } = useNotifications();
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        defaultValues: {
            first_name: client.first_name,
            last_name: client.last_name,
            middle_name: client.middle_name,
            suffix: client.name_suffix,
            dob: client.dob,
            sex: client.sex,
            category: client.category,
            ex_serviceman: client.ex_serviceman,
            aadhaar: '' // Will be populated by decrypt
        }
    });

    // Decrypt Aadhaar on load
    useState(() => {
        async function loadAadhaar() {
            if (client.aadhaar_encrypted) {
                const key = import.meta.env.VITE_ENCRYPTION_KEY;
                const decryptedAadhaar = await decryptText(client.aadhaar_encrypted, key);
                if (decryptedAadhaar) {
                    setValue('aadhaar', decryptedAadhaar);
                }
            }
        }
        loadAadhaar();
    }, [client.aadhaar_encrypted, setValue]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // 1. Encrypt Aadhaar if provided
            let aadhaarEncrypted = client.aadhaar_encrypted;
            if (data.aadhaar) {
                const key = import.meta.env.VITE_ENCRYPTION_KEY;
                aadhaarEncrypted = await encryptText(data.aadhaar, key);
            } else if (data.aadhaar === '') {
                aadhaarEncrypted = null;
            }

            // 2. Prepare updates
            const { aadhaar, suffix, ex_serviceman, ...otherFields } = data;
            const updates = {
                ...otherFields,
                name_suffix: suffix || null,
                ex_serviceman: ex_serviceman === 'true' || ex_serviceman === true,
                aadhaar_encrypted: aadhaarEncrypted,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', client.id);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating client:', error);
            showToast('Failed to update client: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-2xl shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">Edit Client Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-black text-xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">First Name</label>
                            <input
                                className="input"
                                {...register('first_name', { required: 'Required' })}
                            />
                            {errors.first_name && <p className="text-red-500 text-xs">{errors.first_name.message}</p>}
                        </div>

                        <div>
                            <label className="label">Last Name</label>
                            <input
                                className="input"
                                {...register('last_name', { required: 'Required' })}
                            />
                            {errors.last_name && <p className="text-red-500 text-xs">{errors.last_name.message}</p>}
                        </div>

                        <div>
                            <label className="label">Date of Birth</label>
                            <input
                                type="date"
                                className="input"
                                {...register('dob', { required: 'Required' })}
                            />
                        </div>

                        <div>
                            <label className="label">Sex (FY 2026)</label>
                            <select className="input" {...register('sex')}>
                                <option value="">Select...</option>
                                {SEX_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Social Category</label>
                            <select className="input" {...register('category')}>
                                <option value="">Select Category...</option>
                                {CATEGORY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.label}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Ex-Serviceman</label>
                            <select className="input" {...register('ex_serviceman')}>
                                <option value="">Select Status...</option>
                                {EX_SERVICEMAN_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value === 1}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Aadhaar Number (12-digit)</label>
                            <input
                                className="input"
                                placeholder="e.g. 123456789012"
                                maxLength={12}
                                {...register('aadhaar', {
                                    pattern: { value: /^\d{12}$/, message: 'Must be 12 digits' }
                                })}
                            />
                            {errors.aadhaar && <p className="text-red-500 text-xs">{errors.aadhaar.message}</p>}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

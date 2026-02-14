import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';
import { encryptText } from '../lib/encryption';
import {
    CATEGORY_OPTIONS,
    SEX_OPTIONS,
    EX_SERVICEMAN_OPTIONS
} from '../lib/shelterConstants';

export default function NewClient() {
    const navigate = useNavigate();
    const { showToast } = useNotifications();
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors, isValid }, trigger, watch } = useForm({
        mode: 'onChange'
    });

    const steps = [
        { id: 'basic', title: 'Basic Info' },
        { id: 'demographics', title: 'Demographics' },
        { id: 'review', title: 'Review & Submit' }
    ];

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            // 1. Encrypt Aadhaar if provided
            let aadhaarEncrypted = null;
            if (data.aadhaar) {
                const key = import.meta.env.VITE_ENCRYPTION_KEY;
                aadhaarEncrypted = await encryptText(data.aadhaar, key);
            }

            // 2. Clean up data before submission
            // Mapping form 'suffix' to DB 'name_suffix' and converting ex_serviceman to boolean
            const { aadhaar, suffix, ex_serviceman, ...otherFields } = data;

            const payload = {
                ...otherFields,
                name_suffix: suffix || null,
                ex_serviceman: ex_serviceman === 'true' || ex_serviceman === true,
                aadhaar_encrypted: aadhaarEncrypted,
                dob: data.dob || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log('Submitting payload:', payload);

            const { data: newClient, error } = await supabase
                .from('clients')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            // 3. Automated Bed Assignment
            // Find first available bed
            const { data: availableBeds } = await supabase
                .from('beds')
                .select('id, bed_number, unit_name')
                .eq('status', 'available')
                .limit(1);

            if (availableBeds && availableBeds.length > 0) {
                const bed = availableBeds[0];

                // Get or create project (assuming first project is the main one)
                const { data: project } = await supabase.from('projects').select('id').limit(1).single();

                if (project) {
                    // Create enrollment
                    const { data: enrollment, error: enrollError } = await supabase
                        .from('enrollments')
                        .insert({
                            client_id: newClient.id,
                            project_id: project.id,
                            entry_date: new Date().toISOString().split('T')[0],
                            is_active: true
                        })
                        .select()
                        .single();

                    if (!enrollError && enrollment) {
                        // Create bed assignment
                        await supabase.from('bed_assignments').insert({
                            bed_id: bed.id,
                            client_id: newClient.id,
                            enrollment_id: enrollment.id,
                            start_date: new Date().toISOString().split('T')[0]
                        });

                        // Update bed status
                        await supabase.from('beds').update({ status: 'occupied' }).eq('id', bed.id);

                        showToast(`Client created and auto-assigned to ${bed.unit_name} - ${bed.bed_number}`, 'success');
                    }
                }
            }

            navigate(`/clients/${newClient.id}`);
        } catch (error) {
            console.error('Error creating client:', error);
            showToast('Failed to create client: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = async () => {
        let valid = false;
        if (activeStep === 0) {
            valid = await trigger(['first_name', 'last_name', 'dob']);
        } else if (activeStep === 1) {
            valid = await trigger(['category', 'sex']);
        } else {
            valid = true;
        }

        if (valid) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        setActiveStep((prev) => prev - 1);
    };

    // Watch values for review step
    const formData = watch();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/clients')}
                    className="text-gray-500 hover:text-gray-900"
                >
                    <span className="text-2xl">←</span>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">New Client Intake</h1>
                    <p className="text-gray-600">Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary-600 transition-all duration-300 ease-in-out"
                    style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                />
            </div>

            {/* Form Steps */}
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">

                {/* Step 1: Basic Info */}
                {activeStep === 0 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">First Name *</label>
                                <input
                                    type="text"
                                    className={`input ${errors.first_name ? 'border-red-500' : ''}`}
                                    placeholder="e.g. John"
                                    {...register('first_name', { required: 'First name is required' })}
                                />
                                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                            </div>

                            <div>
                                <label className="label">Last Name *</label>
                                <input
                                    type="text"
                                    className={`input ${errors.last_name ? 'border-red-500' : ''}`}
                                    placeholder="e.g. Doe"
                                    {...register('last_name', { required: 'Last name is required' })}
                                />
                                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                            </div>

                            <div>
                                <label className="label">Middle Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Optional"
                                    {...register('middle_name')}
                                />
                            </div>

                            <div>
                                <label className="label">Suffix</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Jr, Sr"
                                    {...register('suffix')}
                                />
                            </div>

                            <div>
                                <label className="label">Date of Birth *</label>
                                <input
                                    type="date"
                                    className={`input ${errors.dob ? 'border-red-500' : ''}`}
                                    {...register('dob', { required: 'Date of Birth is required' })}
                                />
                                {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
                            </div>

                            <div>
                                <label className="label">Aadhaar Number (12-digit)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. 123456789012"
                                    maxLength={12}
                                    {...register('aadhaar', {
                                        pattern: { value: /^\d{12}$/, message: 'Aadhaar must be exactly 12 digits' }
                                    })}
                                />
                                {errors.aadhaar && <p className="text-red-500 text-xs mt-1">{errors.aadhaar.message}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Demographics */}
                {activeStep === 1 && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Category (Social) *</label>
                                <select className="input" {...register('category', { required: true })}>
                                    <option value="">Select Category...</option>
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Gender *</label>
                                <select className="input" {...register('sex', { required: true })}>
                                    <option value="">Select Gender...</option>
                                    {SEX_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.label}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Ex-Serviceman Status</label>
                                <select className="input" {...register('ex_serviceman')}>
                                    <option value="">Select Status...</option>
                                    {EX_SERVICEMAN_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value === 1}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {activeStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">Client Summary</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Name:</span>
                                <span className="font-medium text-gray-900">{formData.first_name} {formData.middle_name || ''} {formData.last_name} {formData.suffix || ''}</span>

                                <span className="text-gray-500">DOB:</span>
                                <span className="font-medium text-gray-900">{formData.dob}</span>

                                <span className="text-gray-500">Aadhaar (Securely Masked):</span>
                                <span className="font-medium text-gray-900">{formData.aadhaar ? `XXXX-XXXX-${formData.aadhaar.slice(-4)}` : 'N/A'}</span>

                                <span className="text-gray-500">Social Category:</span>
                                <span className="font-medium text-gray-900">{formData.category || 'Not Specified'}</span>

                                <span className="text-gray-500">Ex-Serviceman:</span>
                                <span className="font-medium text-gray-900">{formData.ex_serviceman === 'true' || formData.ex_serviceman === true ? 'Yes' : 'No'}</span>
                            </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                            <div className="flex">
                                <span className="text-2xl mr-3">ℹ️</span>
                                <p className="text-sm text-orange-800">
                                    By clicking "Create Profile", you confirm that this information is accurate and complies with Indian Shelter Standards.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={prevStep}
                        className={`btn btn-secondary ${activeStep === 0 ? 'invisible' : ''}`}
                    >
                        Back
                    </button>

                    {activeStep < steps.length - 1 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="btn btn-primary"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-success flex items-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>Create Profile</span>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

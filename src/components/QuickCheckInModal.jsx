import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';

export default function QuickCheckInModal({ onClose, onSuccess }) {
    const { t } = useLanguage();
    const { showToast } = useNotifications();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [availableBeds, setAvailableBeds] = useState([]);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        sex: '',
        bed_id: ''
    });

    useEffect(() => {
        if (step === 2) {
            fetchBeds();
        }
    }, [step, formData.sex]);

    const fetchBeds = async () => {
        try {
            const { data, error } = await supabase
                .from('beds')
                .select(`
                    id, 
                    bed_number, 
                    rooms (
                        name, 
                        gender_specific
                    )
                `)
                .eq('status', 'available')
                .eq('is_active', true);

            if (error) throw error;

            // Simple gender filter
            const filtered = data.filter(bed => {
                const roomGender = bed.rooms?.gender_specific;
                if (!roomGender || roomGender === 'any') return true;
                return roomGender.toLowerCase() === formData.sex.toLowerCase();
            });

            setAvailableBeds(filtered);
        } catch (error) {
            console.error('Error fetching beds:', error);
        }
    };

    const handleNext = () => {
        if (!formData.first_name || !formData.last_name || !formData.sex) {
            showToast('Please fill required fields', 'warning');
            return;
        }
        setStep(2);
    };

    const handleCheckIn = async () => {
        if (!formData.bed_id) {
            showToast('Please select a bed', 'warning');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Client
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .insert([{
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    dob: formData.dob || null,
                    sex: formData.sex,
                    approval_status: 'approved' // Staff initiated
                }])
                .select()
                .single();

            if (clientError) throw clientError;

            // 2. Get Project
            const { data: project } = await supabase.from('projects').select('id').limit(1).single();
            if (!project) throw new Error('No project found');

            // 3. Create Enrollment
            const { data: enrollment, error: enrollError } = await supabase
                .from('enrollments')
                .insert([{
                    client_id: client.id,
                    project_id: project.id,
                    entry_date: new Date().toISOString().split('T')[0],
                    is_active: true
                }])
                .select()
                .single();

            if (enrollError) throw enrollError;

            // 4. Create Assignment
            const { error: assignError } = await supabase
                .from('bed_assignments')
                .insert([{
                    bed_id: formData.bed_id,
                    client_id: client.id,
                    enrollment_id: enrollment.id,
                    start_date: new Date().toISOString().split('T')[0]
                }]);

            if (assignError) throw assignError;

            // 5. Update Bed
            await supabase.from('beds').update({ status: 'occupied' }).eq('id', formData.bed_id);

            showToast('Quick Check-in Successful!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="card w-full max-w-md shadow-2xl p-0 !overflow-visible scale-in">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <h2 className="text-xl font-black">⚡ {t('quickCheckIn')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                </div>

                {step === 1 && (
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 mb-1 block">First Name *</label>
                            <input
                                className="input"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="John"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 mb-1 block">Last Name *</label>
                            <input
                                className="input"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                placeholder="Doe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase opacity-60 mb-1 block">Gender *</label>
                                <select
                                    className="input"
                                    value={formData.sex}
                                    onChange={e => setFormData({ ...formData, sex: e.target.value })}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase opacity-60 mb-1 block">DOB (Optional)</label>
                                <input
                                    type="date"
                                    className="input text-sm"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                        </div>
                        <button onClick={handleNext} className="btn btn-primary w-full mt-4">
                            Next: Select Bed →
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="p-6 space-y-6">
                        <p className="text-sm font-medium opacity-70">Registering: <span className="font-bold text-primary-600">{formData.first_name} {formData.last_name}</span></p>

                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 mb-1 block">Available Beds ({formData.sex})</label>
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {availableBeds.length === 0 && (
                                    <p className="text-sm text-danger-600 font-bold py-4 text-center">No available beds matching gender.</p>
                                )}
                                {availableBeds.map(bed => (
                                    <button
                                        key={bed.id}
                                        onClick={() => setFormData({ ...formData, bed_id: bed.id })}
                                        className={`p-3 text-left rounded-xl border-2 transition-all ${formData.bed_id === bed.id ? 'border-primary-500 bg-primary-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <p className="font-black">{bed.bed_number}</p>
                                        <p className="text-xs opacity-60">{bed.rooms?.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button onClick={() => setStep(1)} className="btn btn-secondary flex-1">Back</button>
                            <button
                                onClick={handleCheckIn}
                                disabled={loading || !formData.bed_id}
                                className="btn btn-primary flex-[2]"
                            >
                                {loading ? 'Processing...' : 'Complete Check-in'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

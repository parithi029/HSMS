import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

export default function ClientProfileForm() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        dob: '',
        sex: '',
        aadhaar_encrypted: '',
        category: '',
        ex_serviceman: false,
        contact_number: ''
    });

    useEffect(() => {
        // Check if profile already exists to pre-fill
        async function checkProfile() {
            if (!user) return;
            const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).single();
            if (data) {
                setFormData({
                    first_name: data.first_name || '',
                    middle_name: data.middle_name || '',
                    last_name: data.last_name || '',
                    dob: data.dob || '',
                    sex: data.sex || '',
                    aadhaar_encrypted: data.aadhaar_encrypted || '',
                    category: data.category || '',
                    ex_serviceman: data.ex_serviceman || false,
                    contact_number: ''
                });
            }
        }
        checkProfile();
    }, [user]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                user_id: user.id,
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                dob: formData.dob,
                sex: formData.sex,
                aadhaar_encrypted: formData.aadhaar_encrypted,
                category: formData.category,
                ex_serviceman: formData.ex_serviceman,
                approval_status: 'pending' // Always reset to pending on update? Or only on create? valid point.
                // For now, let's keep it simple. If they edit, it might need re-approval.
            };

            // Check if exists to determine Insert or Update
            const { data: existing } = await supabase.from('clients').select('id').eq('user_id', user.id).single();

            let result;
            if (existing) {
                result = await supabase.from('clients').update(payload).eq('user_id', user.id);
            } else {
                result = await supabase.from('clients').insert([payload]);
            }

            if (result.error) throw result.error;

            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card max-w-2xl mx-auto shadow-2xl mt-8 !overflow-visible">
            <h1 className="text-3xl font-black mb-6">Client Profile</h1>

            {error && (
                <div className="bg-danger-500/10 text-danger-600 p-4 rounded-xl mb-6 border border-danger-500/20 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="label">First Name *</label>
                        <input
                            type="text"
                            name="first_name"
                            required
                            value={formData.first_name}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Middle Name</label>
                        <input
                            type="text"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Last Name *</label>
                        <input
                            type="text"
                            name="last_name"
                            required
                            value={formData.last_name}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Date of Birth *</label>
                        <input
                            type="date"
                            name="dob"
                            required
                            value={formData.dob}
                            onChange={handleChange}
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Gender *</label>
                        <select
                            name="sex"
                            required
                            value={formData.sex}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Third Gender">Third Gender</option>
                        </select>
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Aadhaar Number</label>
                        <input
                            type="text"
                            name="aadhaar_encrypted"
                            value={formData.aadhaar_encrypted}
                            onChange={handleChange}
                            placeholder="XXXX-XXXX-XXXX"
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="label block text-sm font-medium mb-1">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Select Category</option>
                            <option value="General">General</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="flex items-center pt-6">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="ex_serviceman"
                                checked={formData.ex_serviceman}
                                onChange={handleChange}
                                className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="font-bold opacity-80 uppercase text-[10px] tracking-widest">Ex-Serviceman / Veteran</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-secondary mr-4"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl"
                    >
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}

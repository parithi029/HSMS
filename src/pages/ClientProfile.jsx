import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { decryptText } from '../lib/encryption';
import EditClientModal from '../components/EditClientModal';
import ClientNotes from '../components/ClientNotes';
import ConsentList from '../components/ConsentList';
import ConsentModal from '../components/ConsentModal';
import HouseholdManager from '../components/HouseholdManager';

export default function ClientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [consentListKey, setConsentListKey] = useState(0);
    const [decryptedAadhaar, setDecryptedAadhaar] = useState(null);

    useEffect(() => {
        fetchClient();
    }, [id]);

    const fetchClient = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setClient(data);

            // Decrypt Aadhaar if present
            if (data.aadhaar_encrypted) {
                const key = import.meta.env.VITE_ENCRYPTION_KEY;
                const decrypted = await decryptText(data.aadhaar_encrypted, key);
                setDecryptedAadhaar(decrypted);
            }
        } catch (error) {
            console.error('Error fetching client:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                    <p className="mt-4 text-gray-600">Loading client profile...</p>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="card text-center py-12">
                <span className="text-6xl">❌</span>
                <p className="mt-4 text-xl font-medium text-gray-700">Client Not Found</p>
                <button onClick={() => navigate('/clients')} className="btn btn-primary mt-4">
                    Back to Clients
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'info', label: 'Information', icon: 'ℹ️' },
        { id: 'enrollments', label: 'Enrollments', icon: '📋' },
        { id: 'services', label: 'Services', icon: '🤝' },
        { id: 'notes', label: 'Case Notes', icon: '📝' },
        { id: 'consents', label: 'Consents', icon: '📄' },
    ];

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/clients')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Clients</span>
            </button>

            {/* Client Header */}
            <div className="card">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary-600">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {client.first_name} {client.last_name}
                        </h1>
                        <p className="text-gray-600">
                            DOB: {client.dob ? new Date(client.dob).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="btn btn-secondary"
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <div className="flex space-x-4 min-w-max">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-primary-600 text-primary-600 font-medium'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
                <>
                    {!decryptedAadhaar && (
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mb-6 flex items-start space-x-4">
                            <div className="bg-orange-100 p-2 rounded-full text-xl">⚠️</div>
                            <div className="flex-1">
                                <h3 className="font-bold text-orange-900">Aadhaar Registration Incomplete</h3>
                                <p className="text-sm text-orange-800 mt-1">
                                    This client is missing a registered Aadhaar number. Complete registration to ensure compliance with shelter standards.
                                </p>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="mt-3 btn btn-sm bg-orange-600 hover:bg-orange-700 text-white border-none"
                                >
                                    Register Aadhaar Now
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">First Name</p>
                                <p className="font-medium text-gray-900">{client.first_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Last Name</p>
                                <p className="font-medium text-gray-900">{client.last_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Date of Birth</p>
                                <p className="font-medium text-gray-900">
                                    {client.dob ? new Date(client.dob).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Social Category</p>
                                <p className="font-medium text-gray-900">{client.category || 'Not collected'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Ex-Serviceman Status</p>
                                <p className="font-medium text-gray-900">{client.ex_serviceman !== null ? (client.ex_serviceman ? 'Yes' : 'No') : 'Not collected'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Client ID</p>
                                <p className="font-mono text-sm text-gray-700">{client.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Aadhaar Number</p>
                                <p className="font-medium text-gray-900">{decryptedAadhaar || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <HouseholdManager clientId={id} clientName={`${client.first_name} ${client.last_name}`} />
                </>
            )}

            {
                activeTab === 'enrollments' && (
                    <div className="card text-center py-12">
                        <span className="text-6xl">📋</span>
                        <p className="mt-4 text-xl font-medium text-gray-700">No Enrollments</p>
                        <p className="text-gray-500 mt-2">This client has no active or past enrollments</p>
                        <button className="btn btn-primary mt-4">New Enrollment</button>
                    </div>
                )
            }

            {
                activeTab === 'services' && (
                    <div className="card text-center py-12">
                        <span className="text-6xl">🤝</span>
                        <p className="mt-4 text-xl font-medium text-gray-700">No Services</p>
                        <p className="text-gray-500 mt-2">No services have been recorded for this client</p>
                        <button className="btn btn-primary mt-4">Record Service</button>
                    </div>
                )
            }

            {
                activeTab === 'notes' && (
                    <ClientNotes clientId={id} />
                )
            }

            {
                activeTab === 'consents' && (
                    <ConsentList
                        key={consentListKey}
                        clientId={id}
                        onNewConsent={() => setShowConsentModal(true)}
                    />
                )
            }

            {/* Edit Modal */}
            {
                showEditModal && (
                    <EditClientModal
                        client={client}
                        onClose={() => setShowEditModal(false)}
                        onSuccess={() => {
                            fetchClient();
                        }}
                    />
                )
            }

            {/* Consent Modal */}
            {
                showConsentModal && (
                    <ConsentModal
                        clientId={id}
                        onClose={() => setShowConsentModal(false)}
                        onSuccess={() => {
                            setConsentListKey(prev => prev + 1);
                        }}
                    />
                )
            }
        </div >
    );
}

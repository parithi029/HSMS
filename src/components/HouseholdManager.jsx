import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RELATIONSHIP_TO_HOH_OPTIONS } from '../lib/shelterConstants';
import { useNotifications } from '../context/NotificationContext';

export default function HouseholdManager({ clientId, onMembersChange }) {
    const [household, setHousehold] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [relationship, setRelationship] = useState('');
    const [saving, setSaving] = useState(false);
    const { showToast } = useNotifications();

    useEffect(() => {
        fetchHousehold();
    }, [clientId]);

    const fetchHousehold = async () => {
        try {
            // 1. Find if this client belongs to any household
            const { data: membership, error: memError } = await supabase
                .from('household_members')
                .select('household_id')
                .eq('client_id', clientId)
                .single();

            if (memError && memError.code !== 'PGRST116') throw memError;

            if (membership) {
                // 2. Fetch all members of this household
                const { data: allMembers, error: allMemError } = await supabase
                    .from('household_members')
                    .select(`
                        id,
                        relationship_to_hoh,
                        clients(
                            id,
                            first_name,
                            last_name,
                            dob
                        )
                    `)
                    .eq('household_id', membership.household_id);

                if (allMemError) throw allMemError;

                // 3. Get household details
                const { data: hhDetails } = await supabase
                    .from('households')
                    .select('*')
                    .eq('id', membership.household_id)
                    .single();

                setHousehold(hhDetails);
                setMembers(allMembers || []);
                if (onMembersChange) onMembersChange(allMembers || []);
            } else {
                setHousehold(null);
                setMembers([]);
                if (onMembersChange) onMembersChange([]);
            }
        } catch (error) {
            console.error('Error fetching household:', error);
        } finally {
            setLoading(false);
        }
    };

    const createHousehold = async () => {
        setSaving(true);
        try {
            // Generate a random 8-char ID for display
            const hhDisplayId = 'HH-' + Math.random().toString(36).substring(2, 10).toUpperCase();

            // 1. Create household
            const { data: newHH, error: hhError } = await supabase
                .from('households')
                .insert({
                    household_id: hhDisplayId,
                    head_of_household_id: clientId
                })
                .select()
                .single();

            if (hhError) throw hhError;

            // 2. Add this client as HoH (Self)
            const { error: memError } = await supabase
                .from('household_members')
                .insert({
                    household_id: newHH.id,
                    client_id: clientId,
                    relationship_to_hoh: 1 // Self
                });

            if (memError) throw memError;

            showToast('Household group created!', 'success');
            fetchHousehold();
        } catch (error) {
            console.error('Error creating household:', error);
            showToast('Failed to create household: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Search for clients to add
    useEffect(() => {
        const search = async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, first_name, last_name, dob')
                    .ilike('last_name', `%${searchTerm}%`)
                    .neq('id', clientId)
                    .limit(5);
                if (error) throw error;
                setSearchResults(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        };
        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const addMember = async () => {
        if (!selectedClient || !relationship) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('household_members')
                .insert({
                    household_id: household.id,
                    client_id: selectedClient.id,
                    relationship_to_hoh: parseInt(relationship)
                });

            if (error) throw error;

            showToast('Member added successfully!', 'success');
            setShowSearch(false);
            setSelectedClient(null);
            setRelationship('');
            setSearchTerm('');
            fetchHousehold();
        } catch (error) {
            console.error('Error adding member:', error);
            showToast('Failed to add member: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const getRelationshipLabel = (value) => {
        return RELATIONSHIP_TO_HOH_OPTIONS.find(opt => opt.value === value)?.label || 'Other';
    };

    if (loading) return <div>Loading household...</div>;

    return (
        <div className="card space-y-4">
            <div className="flex justify-between items-center border-b pb-2 dark:border-white/10">
                <h3 className="text-lg font-black uppercase tracking-wider opacity-60">Household Management</h3>
                {household && (
                    <span className="text-[10px] font-bold bg-primary-500/10 text-primary-600 px-2 py-1 rounded-lg border border-primary-500/20">
                        ID: {household.household_id}
                    </span>
                )}
            </div>

            {!household ? (
                <div className="text-center py-6 space-y-4">
                    <p className="text-sm text-gray-500 italic">This client is not currently associated with a household group.</p>
                    <button
                        onClick={createHousehold}
                        disabled={saving}
                        className="btn btn-secondary text-sm"
                    >
                        {saving ? 'Creating...' : 'Create Household Group'}
                    </button>
                    <p className="text-xs text-gray-400">Making this client the Head of Household.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        {members.map(member => (
                            <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                                <div>
                                    <p className="font-black">
                                        {member.clients.first_name} {member.clients.last_name}
                                        {member.clients.id === household.head_of_household_id && (
                                            <span className="ml-2 text-[10px] bg-primary-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">HoH</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] opacity-60 font-bold uppercase mt-0.5">
                                        DOB: {new Date(member.clients.dob).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="text-xs font-black text-primary-600 bg-primary-500/10 px-3 py-1 rounded-lg border border-primary-500/20">
                                    {getRelationshipLabel(member.relationship_to_hoh)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {!showSearch ? (
                        <button
                            onClick={() => setShowSearch(true)}
                            className="w-full btn btn-outline text-sm"
                        >
                            + Add Family/Household Member
                        </button>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 space-y-3">
                            <h4 className="text-sm font-bold">Add Member</h4>

                            {!selectedClient ? (
                                <div>
                                    <input
                                        type="text"
                                        className="input text-sm"
                                        placeholder="Search by last name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {isSearching && <p className="text-[10px] mt-1 text-gray-500">Searching...</p>}
                                    <div className="mt-2 space-y-1">
                                        {searchResults.map(res => (
                                            <div
                                                key={res.id}
                                                onClick={() => setSelectedClient(res)}
                                                className="p-2 text-xs bg-white border rounded hover:border-primary-500 cursor-pointer"
                                            >
                                                {res.last_name}, {res.first_name} ({res.dob})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                                        <span className="text-sm font-bold">{selectedClient.first_name} {selectedClient.last_name}</span>
                                        <button onClick={() => setSelectedClient(null)} className="text-[10px] text-red-500 hover:underline">Change</button>
                                    </div>

                                    <div>
                                        <label className="label text-xs">Relationship to HoH</label>
                                        <select
                                            className="input text-sm"
                                            value={relationship}
                                            onChange={(e) => setRelationship(e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            {RELATIONSHIP_TO_HOH_OPTIONS.filter(o => o.value !== 1).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={addMember}
                                            disabled={saving || !relationship}
                                            className="flex-1 btn btn-primary text-xs"
                                        >
                                            {saving ? 'Adding...' : 'Add Member'}
                                        </button>
                                        <button
                                            onClick={() => setShowSearch(false)}
                                            className="btn btn-secondary text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

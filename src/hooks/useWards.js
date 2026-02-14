import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useWards = () => {
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchWards = async () => {
        try {
            const { data, error } = await supabase
                .from('wards')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setWards(data || []);
        } catch (err) {
            console.error('Error fetching wards:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWards();

        const channel = supabase
            .channel('ward-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'wards' },
                () => fetchWards()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { wards, loading, error, refreshWards: fetchWards };
};

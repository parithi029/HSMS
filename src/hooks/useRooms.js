import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useRooms(wardId = null) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                let query = supabase
                    .from('rooms')
                    .select('*, wards(name)')
                    .eq('is_active', true)
                    .order('name');

                if (wardId) {
                    query = query.eq('ward_id', wardId);
                }

                const { data, error } = await query;
                if (error) throw error;
                setRooms(data || []);
            } catch (error) {
                console.error('Error fetching rooms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();

        const subscription = supabase
            .channel('rooms_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
                fetchRooms();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [wardId]);

    return { rooms, loading };
}

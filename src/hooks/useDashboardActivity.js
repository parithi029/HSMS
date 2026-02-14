import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useDashboardActivity = () => {
    const [activities, setActivities] = useState({ admissions: [], departures: [] });
    const [loading, setLoading] = useState(true);

    const fetchActivity = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch Admissions (start_date is today)
            const { data: admissions, error: aError } = await supabase
                .from('bed_assignments')
                .select(`
                    id,
                    start_date,
                    clients (id, first_name, last_name),
                    beds (bed_number, rooms (name))
                `)
                .eq('start_date', today);

            if (aError) throw aError;

            // 2. Fetch Departures (end_date is today)
            const { data: departures, error: dError } = await supabase
                .from('bed_assignments')
                .select(`
                    id,
                    end_date,
                    clients (id, first_name, last_name),
                    beds (bed_number, rooms (name))
                `)
                .eq('end_date', today);

            if (dError) throw dError;

            setActivities({
                admissions: admissions || [],
                departures: departures || []
            });
        } catch (error) {
            console.error('Error fetching dashboard activity:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();

        // Realtime subscription for assignments
        const channel = supabase
            .channel('activity-log')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bed_assignments' },
                () => fetchActivity()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    return { activities, loading, refresh: fetchActivity };
};

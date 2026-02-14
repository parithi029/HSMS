import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useRealtimeBeds = () => {
    const [beds, setBeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch initial bed data
        const fetchBeds = async () => {
            try {
                // Create a timeout promise (reduced to 10s to prevent UI blocking)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
                );

                const { data, error } = await Promise.race([
                    supabase
                        .from('beds')
                        .select(`
                            *,
                            rooms (
                                id,
                                name,
                                room_type,
                                gender_specific,
                                capacity,
                                ward_id,
                                wards (
                                    id,
                                    name,
                                    ward_type
                                )
                            ),
                            bed_assignments (
                              id,
                              client_id,
                              start_date,
                              end_date,
                              clients (
                                id,
                                first_name,
                                last_name
                              )
                            )
                          `)
                        // We filter for is_active on beds
                        .eq('is_active', true)
                        .order('bed_number'),
                    timeoutPromise
                ]);

                if (error) throw error;
                setBeds(data || []);
            } catch (err) {
                console.error('Realtime beds fetch error:', err.message);
                // Set empty array on error so UI shows empty state instead of infinite loading
                setBeds([]);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBeds();

        // Set up realtime subscription
        const channel = supabase
            .channel('bed-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'beds',
                },
                (payload) => {
                    console.log('Bed change detected:', payload);
                    // Refetch all beds when any change occurs
                    fetchBeds();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bed_assignments',
                },
                (payload) => {
                    console.log('Bed assignment change detected:', payload);
                    // Refetch all beds when bed assignments change
                    fetchBeds();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getAvailableBedsCount = () => {
        return beds.filter(bed => bed.status === 'available').length;
    };

    const getOccupiedBedsCount = () => {
        return beds.filter(bed => bed.status === 'occupied').length;
    };

    const getTotalBedsCount = () => {
        return beds.filter(bed => bed.status !== 'maintenance').length;
    };

    const getOccupancyRate = () => {
        const total = getTotalBedsCount();
        if (total === 0) return 0;
        return Math.round((getOccupiedBedsCount() / total) * 100);
    };

    return {
        beds,
        loading,
        error,
        stats: {
            available: getAvailableBedsCount(),
            occupied: getOccupiedBedsCount(),
            total: getTotalBedsCount(),
            occupancyRate: getOccupancyRate(),
        },
    };
};

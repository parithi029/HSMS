import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: false, // Security: Force login on every refresh
        detectSessionInUrl: true,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// Helper functions for common operations

// Get current user
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Get user profile with role
// Get user profile with role and timeout
export const getUserProfile = async (userId, timeout = 5000) => {
    try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), timeout)
        );

        // Race between the actual fetch and the timeout
        const { data, error } = await Promise.race([
            supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single(),
            timeoutPromise
        ]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null; // Fail gracefully
    }
};

// Check user role
export const hasRole = async (userId, requiredRole) => {
    const profile = await getUserProfile(userId);
    const roleHierarchy = { volunteer: 1, staff: 2, admin: 3 };
    return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
};

// Audit log helper
export const logAction = async (action, tableName, recordId, details = {}) => {
    try {
        const user = await getCurrentUser();
        await supabase.from('audit_log').insert({
            user_id: user?.id,
            action,
            table_name: tableName,
            record_id: recordId,
            details,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Failed to log action:', error);
    }
};

export default supabase;

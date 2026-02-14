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
export const getUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
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

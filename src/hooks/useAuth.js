import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, getUserProfile } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Check active session
        const getSession = async () => {
            try {
                // Create a timeout promise to prevent hanging
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
                );

                // Race between getSession and timeout
                const { data: { session }, error } = await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise
                ]);

                if (error) throw error;

                if (mounted) {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        // Pass a timeout to getUserProfile
                        const userProfile = await getUserProfile(session.user.id, 5000);
                        if (mounted) setProfile(userProfile);
                    }
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Log event for debugging
                console.log(`Auth event: ${event}`);

                if (!mounted) return;

                // Update user state immediately
                setUser(session?.user ?? null);

                // Handle profile updates based on event type
                if (session?.user) {
                    // Only fetch profile if it's a login or we don't have one
                    // For TOKEN_REFRESHED, we might already have the profile, so we can be optimistic
                    // But to be safe, we'll fetch it with a timeout and NOT block UI

                    // Don't set loading(true) here! That causes the flicker/infinite spinner.
                    try {
                        const userProfile = await getUserProfile(session.user.id, 5000);
                        if (mounted && userProfile) {
                            setProfile(userProfile);
                        }
                    } catch (err) {
                        console.error("Background profile update failed:", err);
                        // Do NOT clear profile here to keep the UI interactive with stale data
                    }
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setLoading(false); // Ensure loading is false explicitly on sign out
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const hasRole = (requiredRole) => {
        if (!profile) return false;
        const roleHierarchy = { volunteer: 1, staff: 2, admin: 3 };
        return roleHierarchy[profile.role] >= roleHierarchy[requiredRole];
    };

    const value = {
        user,
        profile,
        loading,
        signIn,
        signOut,
        hasRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

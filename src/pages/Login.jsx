import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import GlowBackground from '../components/GlowBackground';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isStaffLogin, setIsStaffLogin] = useState(false); // Default to Client mode
    const [isRegistering, setIsRegistering] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isRegistering && !isStaffLogin) {
                // Handle Registration
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) throw signUpError;

                // Create user profile for the new user
                if (data?.user) {
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .insert({
                            id: data.user.id,
                            email: email,
                            role: 'client', // Default role for new registrations
                            first_name: '', // Can be updated later
                            last_name: ''
                        });

                    if (profileError) {
                        console.error('Error creating profile:', profileError);
                        // Optional: Delete the auth user if profile creation fails?
                        // For now just warn, as they can likely still login but might have issues
                    }
                }

                if (data?.session) {
                    // Auto-login successful (Email confirmation disabled)
                    navigate('/dashboard');
                } else {
                    // Email confirmation enabled
                    setError('Registration successful! Please check your email to confirm your account.');
                }
            } else {
                // Handle Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Failed to authenticate');
        } finally {
            setLoading(false);
        }
    };

    // Reset registration when switching to staff
    if (isStaffLogin && isRegistering) setIsRegistering(false);

    // Dynamic styles and text based on mode
    const modeColors = isStaffLogin ? 'from-slate-800 to-gray-900' : 'from-indigo-500 to-purple-600';
    const containerClasses = isStaffLogin ? 'bg-gray-50' : 'bg-white';
    const buttonClasses = isStaffLogin ? 'bg-gray-800 hover:bg-gray-900 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white';

    let title = isStaffLogin ? 'Staff Portal' : 'Welcome Back';
    let subtitle = isStaffLogin ? 'Authorized Personnel Only' : 'Client Access';
    let buttonText = `Sign In as ${isStaffLogin ? 'Staff' : 'Client'}`;

    if (isRegistering) {
        title = 'Create Account';
        subtitle = 'Join the Community';
        buttonText = 'Register New Account';
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <GlowBackground />

            <div className="w-full max-w-md relative z-10">
                <div className="card backdrop-blur-3xl bg-white/10 dark:bg-slate-900/40 shadow-2xl p-8 border-white/20 scale-in !rounded-3xl shadow-indigo-500/10">

                    {/* Mode Toggle Checkbox Style */}
                    <div className="flex justify-end mb-4">
                        {!isRegistering && (
                            <button
                                onClick={() => setIsStaffLogin(!isStaffLogin)}
                                className={`text-xs font-black px-4 py-2 rounded-full border transition-all transform active:scale-95 shadow-sm ${isStaffLogin
                                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30 hover:bg-indigo-500/30'
                                    : 'bg-white/10 text-slate-100 border-white/10 hover:bg-white/20'
                                    }`}
                            >
                                {isStaffLogin ? '← Switch to Client Login' : 'Switch to Staff Login →'}
                            </button>
                        )}
                        {isRegistering && (
                            <button
                                onClick={() => setIsRegistering(false)}
                                className="text-xs font-black px-4 py-2 rounded-full border bg-white/10 text-slate-100 border-white/10 hover:bg-white/20 transition-all transform active:scale-95 shadow-sm"
                            >
                                ← Back to Login
                            </button>
                        )}
                    </div>

                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 shadow-xl ${isStaffLogin ? 'bg-indigo-500/20 text-indigo-300 shadow-indigo-500/10' : 'bg-indigo-500 text-white shadow-indigo-500/20'}`}>
                            <span className="text-4xl">{isStaffLogin ? '🛡️' : '🏠'}</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">{title}</h1>
                        <p className="text-slate-400 font-medium mt-3">{subtitle}</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className={`border px-4 py-3 rounded-lg text-sm flex items-start ${error.includes('successful') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <span className="mr-2">{error.includes('successful') ? '✅' : '⚠️'}</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {isStaffLogin ? 'Work Email' : 'Email / Mobile Number'}
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder={isStaffLogin ? "staff@shelter.org" : "you@example.com"}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            {isRegistering && (
                                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-4 h-14 !rounded-2xl shadow-xl shadow-indigo-500/30 text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? 'Processing...' : buttonText}
                        </button>
                    </form>

                    {/* Footer Note */}
                    <div className="mt-8 text-center text-sm">
                        {!isStaffLogin && !isRegistering && (
                            <p className="mb-2 text-slate-400">
                                New here? <button onClick={() => setIsRegistering(true)} className="text-indigo-400 font-black cursor-pointer hover:underline">Register New Account</button>
                            </p>
                        )}
                        {!isStaffLogin && isRegistering && (
                            <p className="mb-2 text-slate-400">
                                Already have an account? <button onClick={() => setIsRegistering(false)} className="text-indigo-400 font-black cursor-pointer hover:underline">Sign In</button>
                            </p>
                        )}
                        <p className="text-xs mt-6 opacity-40 text-slate-300 font-medium tracking-wide">
                            {isStaffLogin ? 'INTERNAL SYSTEM • AUTHORIZED USE ONLY' : 'PRIVACY • DIGNITY • RESPECT'}
                        </p>
                    </div>
                </div>

                {/* Dev Note */}
                <div className="mt-8 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-sm">
                    <p className="font-black text-white mb-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm">👋</span> First time setup:
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-xs text-slate-400 font-medium leading-relaxed">
                        <li>Create a Supabase account and project</li>
                        <li>Update <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">.env</code> file with credentials</li>
                        <li>Run the database schema setup script</li>
                        <li>Create your first user in Supabase Auth</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BedBoard from './pages/BedBoard';
import ClientList from './pages/ClientList';
import NewClient from './pages/NewClient';
import ClientProfile from './pages/ClientProfile';
import Reports from './pages/Reports';
import ClientProfileForm from './components/ClientProfileForm';
import Settings from './pages/Settings';

// Layout
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationManager from './components/NotificationManager';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, profile, loading, hasRole } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <NotificationManager />
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={user ? <Navigate to="/dashboard" replace /> : <Login />}
                />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="bed-board" element={
                        <ProtectedRoute requiredRole="volunteer">
                            <BedBoard />
                        </ProtectedRoute>
                    } />
                    <Route path="clients" element={
                        <ProtectedRoute requiredRole="volunteer">
                            <ClientList />
                        </ProtectedRoute>
                    } />
                    <Route path="clients/new" element={
                        <ProtectedRoute requiredRole="volunteer">
                            <NewClient />
                        </ProtectedRoute>
                    } />
                    <Route path="clients/:id" element={
                        <ProtectedRoute requiredRole="volunteer">
                            <ClientProfile />
                        </ProtectedRoute>
                    } />
                    <Route path="reports" element={
                        <ProtectedRoute requiredRole="volunteer">
                            <Reports />
                        </ProtectedRoute>
                    } />
                    <Route path="link-profile" element={<ClientProfileForm />} />
                    <Route
                        path="settings"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </>
    );
}

export default App;

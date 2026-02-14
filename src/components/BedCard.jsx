import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';

export default function BedCard({ bed, wardName, roomName, onAssign, onCheckOut, onReserve, onRemove }) {
    const [showDetails, setShowDetails] = useState(false);
    const { hasRole } = useAuth();
    const { confirm, showToast } = useNotifications();
    const { t } = useLanguage();
    const isOccupied = bed.status === 'occupied';
    const isReserved = bed.status === 'reserved';

    const handleRemove = async (e) => {
        e.stopPropagation();

        const confirmed = await confirm({
            title: 'Remove Bed / Mat',
            message: `Are you sure you want to remove Bed / Mat ${bed.bed_number} from ${wardName} > ${roomName}?`,
            confirmText: 'Remove',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('beds')
                .update({ is_active: false })
                .eq('id', bed.id);

            if (error) throw error;
            if (onRemove) onRemove();
            showToast('Bed removed successfully.', 'success');
        } catch (error) {
            console.error('Error deleting bed:', error);
            showToast('Failed to delete bed: ' + error.message, 'error');
        }
    };

    const handleReleaseReservation = async (e) => {
        e.stopPropagation();

        const confirmed = await confirm({
            title: 'Release Reservation',
            message: `Are you sure you want to cancel the reservation for Bed ${bed.bed_number}?`,
            confirmText: 'Release',
            variant: 'warning'
        });

        if (!confirmed) return;

        try {
            // 1. End the assignment
            await supabase
                .from('bed_assignments')
                .update({ end_date: new Date().toISOString().split('T')[0] })
                .eq('bed_id', bed.id)
                .is('end_date', null);

            // 2. Mark bed as available
            await supabase
                .from('beds')
                .update({ status: 'available' })
                .eq('id', bed.id);

            showToast('Reservation released.', 'success');
        } catch (error) {
            console.error('Error releasing reservation:', error);
            showToast('Failed to release reservation', 'error');
        }
    };

    const handleCheckInFromReservation = async (e) => {
        e.stopPropagation();

        try {
            await supabase
                .from('beds')
                .update({ status: 'occupied' })
                .eq('id', bed.id);

            showToast('Client checked in!', 'success');
        } catch (error) {
            console.error('Error checking in:', error);
            showToast('Failed to check in', 'error');
        }
    };

    const statusConfig = {
        available: {
            bgColor: 'bg-success-100 dark:bg-success-900/20',
            borderColor: 'border-success-400 dark:border-success-800',
            textColor: 'text-success-800 dark:text-success-300',
            icon: '✅',
            label: t('available'),
        },
        occupied: {
            bgColor: 'bg-danger-100 dark:bg-danger-900/20',
            borderColor: 'border-danger-400 dark:border-danger-800',
            textColor: 'text-danger-800 dark:text-danger-300',
            icon: '🔴',
            label: t('occupied'),
        },
        maintenance: {
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            borderColor: 'border-gray-400 dark:border-gray-600',
            textColor: 'text-gray-700 dark:text-gray-300',
            icon: '🔧',
            label: t('maintenance'),
        },
        reserved: {
            bgColor: 'bg-primary-100 dark:bg-primary-900/20',
            borderColor: 'border-primary-400 dark:border-primary-800',
            textColor: 'text-primary-800 dark:text-primary-300',
            icon: '🔵',
            label: t('reserved'),
        },
    };

    const config = statusConfig[bed.status] || statusConfig.available;

    // Get current assignment
    const currentAssignment = bed.bed_assignments?.find(
        (assignment) => !assignment.end_date
    );

    return (
        <div
            className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-4 transition-all hover:shadow-md cursor-pointer`}
            onClick={() => setShowDetails(!showDetails)}
        >
            {/* Bed Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className={`font-bold ${config.textColor}`}>
                        {bed.bed_type === 'mat' ? t('mat') : t('bed')} {bed.bed_number}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                    </span>
                    {hasRole('admin') && bed.status === 'available' && (
                        <button
                            onClick={handleRemove}
                            className="p-1 hover:bg-red-200 rounded text-red-600 transition-colors"
                            title="Delete Bed"
                        >
                            <span className="text-sm">🗑️</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Occupant Info */}
            {currentAssignment && currentAssignment.clients && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isReserved ? 'Reserved For' : t('occupant')}:
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {currentAssignment.clients.first_name} {currentAssignment.clients.last_name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {isReserved ? 'Reserved On' : t('since')}: {new Date(currentAssignment.start_date).toLocaleDateString()}
                    </p>
                </div>
            )}

            {/* Bed Type */}
            {showDetails && (
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                    <p>{t('type')}: {bed.bed_type || 'Emergency'}</p>
                    {bed.gender_specific && (
                        <p className="mt-1">Gender-specific: {bed.gender_specific}</p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 space-y-2">
                {bed.status === 'available' && (
                    <div className="flex space-x-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAssign(bed);
                            }}
                            className="flex-grow btn btn-success text-sm py-2"
                        >
                            {t('assignBed')}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onReserve(bed);
                            }}
                            className="btn btn-outline border-primary-500 text-primary-600 dark:text-primary-400 text-sm py-2 px-3"
                            title="Reserve Bed"
                        >
                            🔵
                        </button>
                    </div>
                )}

                {bed.status === 'occupied' && currentAssignment && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCheckOut(bed);
                        }}
                        className="w-full btn btn-danger text-sm py-2"
                    >
                        {t('checkOut')}
                    </button>
                )}

                {bed.status === 'reserved' && (
                    <div className="flex space-x-2">
                        <button
                            onClick={handleCheckInFromReservation}
                            className="flex-grow btn btn-primary text-sm py-2"
                        >
                            Check In
                        </button>
                        <button
                            onClick={handleReleaseReservation}
                            className="btn btn-outline border-orange-500 text-orange-600 text-sm py-2 px-3"
                            title="Release Reservation"
                        >
                            🔓
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

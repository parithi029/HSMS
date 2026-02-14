import { useState } from 'react';
import { useRealtimeBeds } from '../hooks/useRealtimeBeds';
import { useWards } from '../hooks/useWards';
import BedCard from '../components/BedCard';
import BedAssignmentModal from '../components/BedAssignmentModal';
import BedCheckOutModal from '../components/BedCheckOutModal';
import AddBedModal from '../components/AddBedModal';
import AddWardModal from '../components/AddWardModal';
import EditWardModal from '../components/EditWardModal';
import AddRoomModal from '../components/AddRoomModal';
import EditRoomModal from '../components/EditRoomModal';
import { useAuth } from '../hooks/useAuth';
import { useRooms } from '../hooks/useRooms';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import RemoveBedsModal from '../components/RemoveBedsModal';
import ReservationModal from '../components/ReservationModal';

export default function BedBoard() {
    const { beds, stats, loading: bedsLoading } = useRealtimeBeds();
    const { wards, loading: wardsLoading } = useWards();
    const { rooms, loading: roomsLoading } = useRooms();
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');
    const { showToast, confirm } = useNotifications();
    const { t } = useLanguage();

    const [filter, setFilter] = useState('all');
    const [selectedBed, setSelectedBed] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showCheckOutModal, setShowCheckOutModal] = useState(false);
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [showAddBedModal, setShowAddBedModal] = useState(false);
    const [showAddWardModal, setShowAddWardModal] = useState(false);
    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [showRemoveBedsModal, setShowRemoveBedsModal] = useState(false);
    const [selectedWardForEdit, setSelectedWardForEdit] = useState(null);
    const [selectedRoomForEdit, setSelectedRoomForEdit] = useState(null);
    const [selectedRoomForRemove, setSelectedRoomForRemove] = useState(null);
    const [activeWardForAdd, setActiveWardForAdd] = useState(null);
    const [activeRoomForAdd, setActiveRoomForAdd] = useState(null);

    const handleAssignClick = (bed) => {
        setSelectedBed(bed);
        setShowAssignModal(true);
    };

    const handleCheckOutClick = (bed) => {
        setSelectedBed(bed);
        setShowCheckOutModal(true);
    };

    const handleReserveClick = (bed) => {
        setSelectedBed(bed);
        setShowReservationModal(true);
    };

    const handleCheckOutAll = async (room) => {
        const occupiedBeds = room.beds.filter(b => b.status === 'occupied');
        if (occupiedBeds.length === 0) {
            showToast('No occupied beds in this room.', 'info');
            return;
        }

        const confirmed = await confirm({
            title: 'Check Out All Clients',
            message: `Are you sure you want to check out ALL ${occupiedBeds.length} clients from ${room.name}? This will mark all beds as available.`,
            confirmText: 'Check Out All',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            const bedIds = occupiedBeds.map(b => b.id);

            // 1. End all active assignments for these beds
            const { error: assignmentError } = await supabase
                .from('bed_assignments')
                .update({ end_date: new Date().toISOString().split('T')[0] })
                .in('bed_id', bedIds)
                .is('end_date', null);

            if (assignmentError) throw assignmentError;

            // 2. Mark all beds as available
            const { error: bedError } = await supabase
                .from('beds')
                .update({ status: 'available' })
                .in('id', bedIds);

            if (bedError) throw bedError;

            showToast(`Successfully checked out ${occupiedBeds.length} clients.`, 'success');
        } catch (err) {
            console.error('Error in bulk check-out:', err);
            showToast('Bulk check-out failed: ' + err.message, 'error');
        }
    };

    const handleRemoveBeds = (room) => {
        const availableBeds = room.beds.filter(b => b.status === 'available');

        if (availableBeds.length === 0) {
            showToast('No available beds to remove in this room.', 'info');
            return;
        }

        setSelectedRoomForRemove(room);
        setShowRemoveBedsModal(true);
    };


    const handleCloseModals = () => {
        setShowAssignModal(false);
        setShowCheckOutModal(false);
        setShowReservationModal(false);
        setShowAddBedModal(false);
        setShowAddRoomModal(false);
        setSelectedBed(null);
        setSelectedRoomForEdit(null);
        setSelectedWardForEdit(null);
        setActiveWardForAdd(null);
        setActiveRoomForAdd(null);
    };

    if (bedsLoading || wardsLoading || roomsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
                    <p className="mt-4 text-gray-600">Loading bed board...</p>
                </div>
            </div>
        );
    }

    const filteredBeds = beds.filter(bed => {
        if (filter === 'all') return true;
        return bed.status === filter;
    });

    // Group structure: Ward -> Room -> Beds
    const hierarchy = wards.map(ward => {
        const wardRooms = rooms.filter(r => r.ward_id === ward.id);
        const roomsWithBeds = wardRooms.map(room => {
            const roomBeds = filteredBeds.filter(b => b.room_id === room.id);
            return { ...room, beds: roomBeds };
        });
        return { ...ward, rooms: roomsWithBeds };
    });

    const unassignedBeds = filteredBeds.filter(b => !b.room_id);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black">{t('wards')}</h1>
                    <p className="opacity-70 mt-1 font-medium">Manage beds and shelter sections</p>
                </div>
                {isAdmin && (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowAddWardModal(true)}
                            className="btn btn-outline flex items-center space-x-2 text-sm"
                        >
                            <span>🏢</span>
                            <span>Add Ward</span>
                        </button>
                        <button
                            onClick={() => setShowAddBedModal(true)}
                            className="btn btn-primary flex items-center space-x-2 text-sm"
                        >
                            <span>🛏️</span>
                            <span>Add Bed / Mat</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card border-l-4 border-primary-600">
                    <p className="text-xs font-bold text-primary-600 uppercase tracking-wider">Total Inventory</p>
                    <p className="text-2xl font-black mt-1">{stats.total}</p>
                </div>
                <div className="card border-l-4 border-success-600">
                    <p className="text-xs font-bold text-success-600 uppercase tracking-wider">Available Now</p>
                    <p className="text-2xl font-black mt-1">{stats.available}</p>
                </div>
                <div className="card border-l-4 border-danger-600">
                    <p className="text-xs font-bold text-danger-600 uppercase tracking-wider">Occupied</p>
                    <p className="text-2xl font-black mt-1">{stats.occupied}</p>
                </div>
                <div className="card border-l-4 border-accent-600">
                    <p className="text-xs font-bold text-accent-600 uppercase tracking-wider">Occupancy Rate</p>
                    <p className="text-2xl font-black mt-1">{stats.occupancyRate}%</p>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('available')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'available' ? 'bg-white dark:bg-gray-700 shadow text-success-600 dark:text-success-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Available
                </button>
                <button
                    onClick={() => setFilter('occupied')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'occupied' ? 'bg-white dark:bg-gray-700 shadow text-danger-600 dark:text-danger-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Occupied
                </button>
            </div>

            {/* Ward Sections */}
            <div className="space-y-8">
                {wards.length === 0 && unassignedBeds.length === 0 && (
                    <div className="card text-center py-16">
                        <span className="text-6xl grayscale">🏨</span>
                        <p className="mt-4 text-xl font-bold text-gray-900">No wards or beds configured</p>
                        <p className="text-gray-500 mt-2">Start by adding your first ward.</p>
                        {isAdmin && (
                            <button onClick={() => setShowAddWardModal(true)} className="btn btn-primary mt-6">Create Ward</button>
                        )}
                    </div>
                )}

                {/* Iterate through formal wards */}
                {hierarchy.map((ward) => {
                    const wardBeds = ward.rooms.flatMap(r => r.beds);
                    const occupiedCount = wardBeds.filter(b => b.status === 'occupied').length;

                    return (
                        <div key={ward.id} className="space-y-6 animate-fadeIn pb-8 border-b border-gray-100 dark:border-white/5 last:border-0">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-gray-100 dark:border-white/5 pb-2 gap-4">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-black">{ward.name}</h2>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${ward.gender_specific === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' :
                                            ward.gender_specific === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {ward.gender_specific}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5 italic">
                                        {ward.ward_type.charAt(0).toUpperCase() + ward.ward_type.slice(1)} Ward • {occupiedCount} / {wardBeds.length} beds occupied
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setActiveWardForAdd(ward.id);
                                                    setShowAddRoomModal(true);
                                                }}
                                                className="flex-1 sm:flex-none text-xs font-bold text-success-600 hover:text-success-800 flex items-center justify-center bg-success-50 dark:bg-success-900/30 px-3 py-2 rounded-xl border border-success-100 dark:border-success-800 shadow-sm transition-all active:scale-95"
                                            >
                                                <span className="mr-2">➕</span> <span className="sm:hidden lg:inline">Add Room</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedWardForEdit(ward)}
                                                className="flex-1 sm:flex-none text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center justify-center bg-primary-50 dark:bg-primary-900/30 px-3 py-2 rounded-xl border border-primary-100 dark:border-primary-800 shadow-sm transition-all active:scale-95"
                                            >
                                                <span className="mr-2">⚙️</span> <span className="sm:hidden lg:inline">Settings</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {ward.rooms.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center bg-gray-50/50">
                                    <p className="text-sm text-gray-400 font-medium">No rooms defined in this ward yet.</p>
                                    {isAdmin && (
                                        <button
                                            onClick={() => {
                                                setActiveWardForAdd(ward.id);
                                                setShowAddRoomModal(true);
                                            }}
                                            className="text-xs font-bold text-success-600 hover:underline mt-2"
                                        >
                                            + Add Rooms
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {ward.rooms.map(room => (
                                        <div key={room.id} className="card !p-0 overflow-hidden">
                                            <div className="bg-gray-50/50 dark:bg-white/10 px-4 py-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center space-x-3">
                                                    <h3 className="font-bold">{room.name}</h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${room.gender_specific === 'female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' :
                                                        room.gender_specific === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                            'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}>
                                                        {room.gender_specific}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden sm:block">
                                                        {room.beds.filter(b => b.status === 'occupied').length} / {room.beds.length} beds occupied
                                                    </span>
                                                    {isAdmin && (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                onClick={() => handleCheckOutAll(room)}
                                                                title="Check out all from this room"
                                                                className="flex-1 sm:flex-none p-2 text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/50 transition-colors"
                                                            >
                                                                🧹 <span className="sm:hidden text-xs font-bold ml-1">Clear Room</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedRoomForEdit(room)}
                                                                title="Room Settings"
                                                                className="flex-1 sm:flex-none p-2 text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
                                                            >
                                                                ⚙️ <span className="sm:hidden text-xs font-bold ml-1">Settings</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setActiveWardForAdd(ward.id);
                                                                    setActiveRoomForAdd(room.id);
                                                                    setShowAddBedModal(true);
                                                                }}
                                                                className="flex-1 sm:flex-none text-[10px] font-bold text-primary-600 bg-white dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center"
                                                            >
                                                                ➕ Add Bed
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                {room.beds.length === 0 ? (
                                                    <p className="text-xs text-center text-gray-400 py-4 italic">No beds in this room.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {room.beds.map((bed) => (
                                                            <BedCard
                                                                key={bed.id}
                                                                bed={bed}
                                                                wardName={ward.name}
                                                                roomName={room.name}
                                                                onAssign={handleAssignClick}
                                                                onCheckOut={handleCheckOutClick}
                                                                onReserve={handleReserveClick}
                                                                onRemove={() => { }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Legacy/Unassigned Beds */}
                {unassignedBeds.length > 0 && (
                    <div className="mt-12 space-y-4">
                        <div className="flex items-end justify-between border-b-2 border-orange-100 pb-2">
                            <div>
                                <h2 className="text-xl font-black text-orange-900">Unassigned / Legacy Beds</h2>
                                <p className="text-sm text-orange-600 mt-0.5">
                                    Please move these to a formal Room • {unassignedBeds.filter(b => b.status === 'occupied').length} / {unassignedBeds.length} beds occupied
                                </p>
                            </div>
                            {isAdmin && unassignedBeds.filter(b => b.status === 'occupied').length > 0 && (
                                <button
                                    onClick={() => handleCheckOutAll({ name: 'Unassigned Beds', beds: unassignedBeds })}
                                    title="Check out all from unassigned beds"
                                    className="text-sm px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors font-bold flex items-center space-x-2"
                                >
                                    <span>🧹</span>
                                    <span>Check Out All</span>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {unassignedBeds.map((bed) => (
                                <BedCard
                                    key={bed.id}
                                    bed={bed}
                                    wardName="Legacy"
                                    roomName="Unassigned"
                                    onAssign={handleAssignClick}
                                    onCheckOut={handleCheckOutClick}
                                    onReserve={handleReserveClick}
                                    onRemove={() => { }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAssignModal && selectedBed && (
                <BedAssignmentModal bed={selectedBed} onClose={handleCloseModals} onSuccess={handleCloseModals} />
            )}

            {showCheckOutModal && selectedBed && (
                <BedCheckOutModal bed={selectedBed} onClose={handleCloseModals} onSuccess={handleCloseModals} />
            )}

            {showReservationModal && selectedBed && (
                <ReservationModal bed={selectedBed} onClose={handleCloseModals} onSuccess={handleCloseModals} />
            )}

            {showAddBedModal && (
                <AddBedModal
                    initialWardId={activeWardForAdd}
                    initialRoomId={activeRoomForAdd}
                    onClose={handleCloseModals}
                    onSuccess={handleCloseModals}
                />
            )}

            {showAddRoomModal && (
                <AddRoomModal
                    initialWardId={activeWardForAdd}
                    onClose={handleCloseModals}
                    onSuccess={handleCloseModals}
                />
            )}

            {selectedRoomForEdit && (
                <EditRoomModal
                    room={selectedRoomForEdit}
                    onClose={handleCloseModals}
                    onSuccess={handleCloseModals}
                />
            )}

            {showAddWardModal && (
                <AddWardModal onClose={() => setShowAddWardModal(false)} onSuccess={() => setShowAddWardModal(false)} />
            )}

            {selectedWardForEdit && (
                <EditWardModal
                    ward={selectedWardForEdit}
                    onClose={() => setSelectedWardForEdit(null)}
                    onSuccess={() => setSelectedWardForEdit(null)}
                />
            )}
            {showRemoveBedsModal && (
                <RemoveBedsModal
                    room={selectedRoomForRemove}
                    onClose={() => setShowRemoveBedsModal(false)}
                    onSuccess={(count) => {
                        showToast(`Successfully removed ${count} bed(s).`, 'success');
                        setShowRemoveBedsModal(false);
                    }}
                />
            )}
        </div >
    );
}

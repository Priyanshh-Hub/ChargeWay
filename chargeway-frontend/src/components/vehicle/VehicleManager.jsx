import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../../api/api';
import { CardSkeleton, EmptyState, Btn, Modal, Alert } from '../ui/index';
import Icon from '../ui/Icon';
import VehicleCard from './VehicleCard';
import AddVehicleModal from './AddVehicleModal';
import EditVehicleModal from './EditVehicleModal';

const VehicleManager = ({ onUserUpdated }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await api.get("/user/vehicles");
    if (res.ok) setVehicles(res.data.vehicles || []);
    else setError(res.error || "Failed to load vehicles.");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const applyResult = (data) => {
    setVehicles(data.vehicles || []);
    if (data.user && onUserUpdated) onUserUpdated(data.user);
  };

  const handleFavorite = async (id) => {
    setBusyId(id);
    const res = await api.put(`/user/vehicles/${id}/favorite`);
    if (res.ok) { applyResult(res.data); toast.success("Primary vehicle updated"); }
    else toast.error(res.error || "Failed to update");
    setBusyId(null);
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmDelete._id;
    setBusyId(id);
    const res = await api.delete(`/user/vehicles/${id}`);
    if (res.ok) { applyResult(res.data); toast.success("Vehicle removed"); }
    else toast.error(res.error || "Failed to remove vehicle");
    setBusyId(null);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black">My Vehicles</h1>
            <p className="text-slate-400 text-sm mt-1">Manage every EV linked to your account, and pick your primary vehicle.</p>
          </div>
          <Btn onClick={() => setAddOpen(true)}>+ Add Vehicle</Btn>
        </div>

        {error && <Alert message={error} />}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon="car"
            title="No vehicles yet"
            subtitle="Add your first EV to unlock bookings, charging history, and personalized recommendations."
            action={<Btn onClick={() => setAddOpen(true)}>+ Add Your First Vehicle</Btn>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {vehicles.map(v => (
                <VehicleCard key={v._id} vehicle={v} busy={busyId === v._id}
                  onFavorite={handleFavorite} onEdit={setEditing} onDelete={setConfirmDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={(data) => { applyResult(data); toast.success("Vehicle added"); }} />

      <EditVehicleModal vehicle={editing} onClose={() => setEditing(null)}
        onSaved={(data) => { applyResult(data); setEditing(null); toast.success("Vehicle updated"); }} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove this vehicle?">
        <p className="text-sm text-slate-400 mb-5">
          {confirmDelete?.nickname || `${confirmDelete?.brand} ${confirmDelete?.model}`} ({confirmDelete?.vehicleNumber}) will be removed from your account. This can't be undone.
        </p>
        <div className="flex gap-3">
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Btn>
          <Btn onClick={handleDeleteConfirmed} loading={busyId === confirmDelete?._id} variant="danger" className="flex-1">
            <Icon name="trash" className="w-4 h-4 inline mr-1.5" />Remove
          </Btn>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleManager;

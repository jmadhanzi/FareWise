import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

const STATUS_STYLES = {
  approved: 'badge-green', pending: 'badge-yellow',
  rejected: 'badge-red', suspended: 'badge-red'
};

export default function Drivers() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', statusFilter],
    queryFn: () => api.get('/admin/drivers', { params: { status: statusFilter, limit: 50 } }).then(r => r.data)
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action, notes }) => api.put(`/admin/drivers/${id}/approve`, { action, notes }),
    onSuccess: () => { qc.invalidateQueries(['drivers']); qc.invalidateQueries(['dashboard']); setSelectedDriver(null); }
  });

  const STATUS_TABS = ['pending', 'approved', 'rejected', 'suspended'];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drivers</h1>
          <p className="text-gray-400 text-sm mt-1">{data?.total || 0} drivers</p>
        </div>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : (
        <div className="space-y-3">
          {(data?.drivers || []).map(driver => (
            <div key={driver.id} className="card p-5 flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-lg">
                {(driver.user?.full_name || 'D')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{driver.user?.full_name || 'Unknown'}</p>
                  <span className={STATUS_STYLES[driver.approval_status]}>{driver.approval_status}</span>
                </div>
                <p className="text-gray-400 text-sm">{driver.user?.phone}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model} • {driver.vehicle_plate}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">{driver.user?.created_at ? format(new Date(driver.user.created_at), 'dd MMM yyyy') : '-'}</p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <span className="text-yellow-400 text-sm">★</span>
                  <span className="text-white text-sm font-semibold">{parseFloat(driver.average_rating || 0).toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">({driver.rating_count})</span>
                </div>
              </div>
              {driver.approval_status === 'pending' && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => approveMutation.mutate({ id: driver.id, action: 'approved' })}
                    className="bg-green-900/30 hover:bg-green-900/60 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedDriver(driver)}
                    className="bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {driver.approval_status === 'approved' && (
                <button
                  onClick={() => setSelectedDriver({ ...driver, actionType: 'suspended' })}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Suspend
                </button>
              )}
            </div>
          ))}
          {data?.drivers?.length === 0 && (
            <div className="text-center text-gray-500 py-16">No {statusFilter} drivers</div>
          )}
        </div>
      )}

      {selectedDriver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-bold text-lg">Reject Driver: {selectedDriver.user?.full_name}</h3>
            <textarea
              value={approvalNotes}
              onChange={e => setApprovalNotes(e.target.value)}
              placeholder="Reason for rejection (will be shown to driver)..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-brand-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setSelectedDriver(null)} className="flex-1 btn-secondary rounded-xl py-2.5">Cancel</button>
              <button
                onClick={() => approveMutation.mutate({ id: selectedDriver.id, action: 'rejected', notes: approvalNotes })}
                className="flex-1 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800 rounded-xl py-2.5 font-medium transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

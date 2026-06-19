import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

export default function Disputes() {
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['disputes', statusFilter],
    queryFn: () => api.get('/admin/disputes', { params: { status: statusFilter } }).then(r => r.data)
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }) => api.put(`/admin/disputes/${id}/resolve`, { resolution }),
    onSuccess: () => { qc.invalidateQueries(['disputes']); setSelected(null); setResolution(''); }
  });

  const TYPE_LABELS = {
    fare_dispute: 'Fare Dispute', safety_concern: 'Safety Concern',
    driver_conduct: 'Driver Conduct', rider_conduct: 'Rider Conduct',
    payment_issue: 'Payment Issue', other: 'Other'
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dispute Center</h1>
        <p className="text-gray-400 text-sm mt-1">Review and resolve rider/driver disputes</p>
      </div>

      <div className="flex gap-2">
        {['open', 'investigating', 'resolved', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-gray-200'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-center text-gray-400 py-16">Loading...</div> : (
        <div className="space-y-3">
          {(data?.disputes || []).map(dispute => (
            <div key={dispute.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-yellow">{TYPE_LABELS[dispute.type] || dispute.type}</span>
                    <span className={dispute.status === 'open' ? 'badge-red' : dispute.status === 'resolved' ? 'badge-green' : 'badge-blue'}>{dispute.status}</span>
                  </div>
                  <p className="text-gray-400 text-xs">Raised by: {dispute.raised_by_user?.full_name} ({dispute.raised_by_user?.phone})</p>
                  <p className="text-gray-500 text-xs mt-0.5">{format(new Date(dispute.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                {dispute.status === 'open' && (
                  <button
                    onClick={() => setSelected(dispute)}
                    className="btn-primary rounded-lg px-4 py-2 text-sm">
                    Resolve
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm">{dispute.description}</p>
              {dispute.ride && (
                <div className="bg-dark-card rounded-lg p-3">
                  <p className="text-gray-500 text-xs">📍 {dispute.ride.pickup_address} → {dispute.ride.destination_address}</p>
                  {dispute.ride.final_fare && <p className="text-brand-400 text-xs font-semibold mt-1">Fare: ${parseFloat(dispute.ride.final_fare).toFixed(2)}</p>}
                </div>
              )}
              {dispute.resolution && (
                <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-3">
                  <p className="text-green-400 text-xs font-semibold mb-1">Resolution</p>
                  <p className="text-gray-300 text-sm">{dispute.resolution}</p>
                </div>
              )}
            </div>
          ))}
          {data?.disputes?.length === 0 && <div className="text-center text-gray-500 py-16">No {statusFilter} disputes</div>}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-white font-bold text-lg">Resolve Dispute</h3>
            <p className="text-gray-400 text-sm">{selected.description}</p>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              placeholder="Describe the resolution action taken..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white text-sm resize-none h-28 focus:outline-none focus:border-brand-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 btn-secondary rounded-xl py-2.5">Cancel</button>
              <button
                onClick={() => resolveMutation.mutate({ id: selected.id, resolution })}
                disabled={!resolution.trim() || resolveMutation.isPending}
                className="flex-1 btn-primary rounded-xl py-2.5"
              >
                {resolveMutation.isPending ? 'Saving...' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

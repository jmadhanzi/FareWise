import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

const STATUS_STYLES = {
  completed: 'badge-green', cancelled: 'badge-red',
  in_progress: 'badge-blue', matching: 'badge-yellow',
  driver_assigned: 'badge-blue', no_driver_found: 'badge-gray'
};

export default function Rides() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['rides', page, statusFilter],
    queryFn: () => api.get('/admin/rides', { params: { page, limit: 20, status: statusFilter || undefined } }).then(r => r.data)
  });

  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rides</h1>
        <p className="text-gray-400 text-sm mt-1">{data?.total || 0} total rides</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'completed', 'cancelled', 'in_progress', 'matching', 'no_driver_found'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-card">
              <tr className="text-left border-b border-dark-border">
                {['Rider', 'Driver', 'Route', 'Fare', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {(data?.rides || []).map(ride => (
                <tr key={ride.id} className="hover:bg-dark-card/50 transition-colors">
                  <td className="px-4 py-3 text-gray-300">{ride.rider?.full_name || '-'}<br/><span className="text-gray-500 text-xs">{ride.rider?.phone}</span></td>
                  <td className="px-4 py-3 text-gray-300">{ride.driver?.user?.full_name || '-'}<br/><span className="text-gray-500 text-xs">{ride.driver?.vehicle_plate}</span></td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300 text-xs truncate max-w-[180px]">📍 {ride.pickup_address}</p>
                    <p className="text-gray-400 text-xs truncate max-w-[180px]">🎯 {ride.destination_address}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-brand-400">{ride.final_fare ? `$${parseFloat(ride.final_fare).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3"><span className={STATUS_STYLES[ride.status] || 'badge-gray'}>{ride.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(ride.requested_at), 'dd MMM HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.rides?.length === 0 && <div className="text-center text-gray-500 py-12">No rides found</div>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary rounded-lg px-4 py-2 text-sm">Previous</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary rounded-lg px-4 py-2 text-sm">Next</button>
        </div>
      )}
    </div>
  );
}

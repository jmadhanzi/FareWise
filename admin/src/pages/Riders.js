import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

export default function Riders() {
  const { data, isLoading } = useQuery({
    queryKey: ['riders'],
    queryFn: () => api.get('/admin/users', { params: { role: 'rider', limit: 50 } }).then(r => r.data).catch(() => ({ users: [], total: 0 }))
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Riders</h1>
        <p className="text-gray-400 text-sm mt-1">{data?.total || 0} registered riders</p>
      </div>
      {isLoading ? <div className="text-center text-gray-400 py-16">Loading...</div> : (
        <div className="card p-6 text-center text-gray-400">
          <p className="text-4xl mb-4">👤</p>
          <p className="font-medium text-gray-300">Rider management coming soon</p>
          <p className="text-sm mt-2">Connect the /admin/users endpoint to see riders here</p>
        </div>
      )}
    </div>
  );
}

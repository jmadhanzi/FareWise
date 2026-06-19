import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

export default function Subscriptions() {
  const [statusFilter, setStatusFilter] = useState('active');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', statusFilter],
    queryFn: () => api.get('/admin/subscriptions', { params: { status: statusFilter, limit: 50 } }).then(r => r.data)
  });

  const totalRevenue = (data?.subscriptions || []).filter(s => s.status === 'active').reduce((sum, s) => sum + parseFloat(s.amount_usd || 0), 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-gray-400 text-sm mt-1">Monthly recurring revenue from driver subscriptions</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[['Active Subs', data?.total || 0, 'text-brand-400'], ['Monthly Revenue', `$${totalRevenue.toFixed(2)}`, 'text-yellow-400'], ['Avg Revenue/Driver', `$${data?.total > 0 ? (totalRevenue / data.total).toFixed(2) : '0.00'}`, 'text-blue-400']].map(([label, val, cls]) => (
          <div key={label} className="card p-5">
            <p className="text-gray-400 text-sm">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${cls}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['active', 'expired', 'overdue', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-brand-500 text-white' : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-gray-200'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? <div className="text-center text-gray-400 py-16">Loading...</div> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-card">
              <tr className="text-left border-b border-dark-border">
                {['Driver', 'Plan', 'Amount', 'Payment', 'Period', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {(data?.subscriptions || []).map(sub => {
                const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
                return (
                  <tr key={sub.id} className="hover:bg-dark-card/50">
                    <td className="px-4 py-3">
                      <p className="text-gray-200 font-medium">{sub.driver?.user?.full_name || '-'}</p>
                      <p className="text-gray-500 text-xs">{sub.driver?.vehicle_plate}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={sub.plan_type === 'premium' ? 'badge-yellow' : 'badge-green'}>{sub.plan_type}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-400">${parseFloat(sub.amount_usd).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{sub.payment_method || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300 text-xs">{format(new Date(sub.start_date), 'dd MMM')} – {format(new Date(sub.end_date), 'dd MMM yyyy')}</p>
                      {sub.status === 'active' && daysLeft <= 7 && (
                        <p className="text-yellow-400 text-xs mt-0.5">{daysLeft}d remaining</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={sub.status === 'active' ? 'badge-green' : sub.status === 'expired' ? 'badge-gray' : 'badge-red'}>{sub.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data?.subscriptions?.length === 0 && <div className="text-center text-gray-500 py-12">No {statusFilter} subscriptions</div>}
        </div>
      )}
    </div>
  );
}

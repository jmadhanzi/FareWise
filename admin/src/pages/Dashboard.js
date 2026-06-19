import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { format } from 'date-fns';

const StatCard = ({ emoji, label, value, sub, color = 'green' }) => (
  <div className="card p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color === 'green' ? 'text-brand-400' : color === 'blue' ? 'text-blue-400' : color === 'yellow' ? 'text-yellow-400' : 'text-gray-200'}`}>{value}</p>
        {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
      </div>
      <span className="text-3xl">{emoji}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    refetchInterval: 30000
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')} • Harare, Zimbabwe</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard emoji="🚗" label="Active Drivers" value={data?.drivers?.approved || 0} sub={`${data?.drivers?.pending || 0} pending approval`} color="green" />
        <StatCard emoji="👤" label="Total Riders" value={data?.users?.riders || 0} color="blue" />
        <StatCard emoji="🚦" label="Total Rides" value={data?.rides?.total || 0} sub={`${data?.rides?.active || 0} active now`} color="white" />
        <StatCard emoji="💰" label="Monthly Revenue" value={`$${data?.subscriptions?.monthly_revenue || '0.00'}`} sub={`${data?.subscriptions?.active || 0} active subs`} color="yellow" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Rides by Status</p>
          <div className="space-y-2">
            {[['Completed', data?.rides?.completed, 'green'], ['Active', data?.rides?.active, 'blue'], ['Cancelled', data?.rides?.cancelled, 'red']].map(([label, val, color]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`text-sm font-bold text-${color}-400`}>{val || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Subscriptions</p>
          <div className="space-y-2">
            {[['Active', data?.subscriptions?.active, 'green'], ['Expired', data?.subscriptions?.expired, 'yellow']].map(([label, val, color]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`text-sm font-bold text-${color}-400`}>{val || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 col-span-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Key Metrics</p>
          <div className="grid grid-cols-2 gap-2">
            {[['Total Revenue', `$${data?.revenue?.total_usd || '0.00'}`], ['Break-even Drivers', '40-98'], ['CAGR 2024-29', '73.43%'], ['Target Market', '$84M by 2029']].map(([label, val]) => (
              <div key={label}>
                <p className="text-gray-500 text-xs">{label}</p>
                <p className="text-white text-sm font-bold mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-white font-semibold mb-4">🇿🇼 FareWise vs Competitors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-dark-border">
                {['Platform', 'Model', 'Driver Take-Home', 'Our Advantage'].map(h => (
                  <th key={h} className="pb-3 text-gray-400 font-medium pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {[
                ['FareWise', 'Flat $20/mo', '100%', '✅ US!'],
                ['Bolt', '20% commission', '~80%', '❌'],
                ['InDrive', 'Negotiated + fees', '~85%', '❌'],
                ['Vaya', 'Commission-based', '~78%', '❌']
              ].map(([platform, model, take, adv]) => (
                <tr key={platform} className={platform === 'FareWise' ? 'bg-brand-500/5' : ''}>
                  <td className={`py-3 pr-6 font-semibold ${platform === 'FareWise' ? 'text-brand-400' : 'text-gray-300'}`}>{platform}</td>
                  <td className="py-3 pr-6 text-gray-400">{model}</td>
                  <td className={`py-3 pr-6 font-bold ${platform === 'FareWise' ? 'text-brand-400' : 'text-gray-400'}`}>{take}</td>
                  <td className="py-3 text-gray-400">{adv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

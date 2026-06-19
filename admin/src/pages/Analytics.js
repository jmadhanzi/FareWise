import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const PROJECTION_DATA = [
  { month: 'Month 3', drivers: 50, revenue: 1000 },
  { month: 'Month 6', drivers: 150, revenue: 3000 },
  { month: 'Month 12', drivers: 400, revenue: 8000 },
  { month: 'Month 18', drivers: 800, revenue: 16000 },
  { month: 'Month 24', drivers: 1500, revenue: 30000 }
];

const MARKET_DATA = [
  { year: '2024', market: 5.36 }, { year: '2025', market: 9.29 },
  { year: '2026', market: 16.10 }, { year: '2027', market: 27.92 },
  { year: '2028', market: 48.41 }, { year: '2029', market: 84.09 }
];

const PIE_DATA = [
  { name: 'Subscriptions', value: 85, color: '#00a651' },
  { name: 'Onboarding Fees', value: 10, color: '#f5a623' },
  { name: 'Premium Tier', value: 5, color: '#58a6ff' }
];

export default function Analytics() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data)
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-3 text-sm">
          <p className="text-gray-300 font-medium">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{p.name}: {p.name.includes('Revenue') || p.name.includes('revenue') ? `$${p.value.toLocaleString()}` : p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Market projections and platform performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-white font-semibold mb-1">Zimbabwe Ride-Hailing Market</h3>
          <p className="text-gray-500 text-xs mb-4">Projected revenue ($M USD) • 73.43% CAGR</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MARKET_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="year" stroke="#8b949e" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8b949e" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="market" fill="#00a651" name="Market ($M)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-white font-semibold mb-1">FareWise Growth Projection</h3>
          <p className="text-gray-500 text-xs mb-4">Conservative driver count and monthly revenue</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PROJECTION_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="month" stroke="#8b949e" tick={{ fontSize: 10 }} />
              <YAxis stroke="#8b949e" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="drivers" stroke="#00a651" strokeWidth={2} dot={{ fill: '#00a651', r: 4 }} name="Drivers" />
              <Line type="monotone" dataKey="revenue" stroke="#f5a623" strokeWidth={2} dot={{ fill: '#f5a623', r: 4 }} name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-white font-semibold mb-1">Revenue Mix</h3>
          <p className="text-gray-500 text-xs mb-4">Subscription SaaS is the core</p>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {PIE_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400 text-sm">{d.name}</span>
                  <span className="text-white text-sm font-bold ml-auto">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-white font-semibold mb-4">Break-Even Analysis</h3>
          <div className="space-y-4">
            {[['Monthly Op Cost (low)', '$780'], ['Monthly Op Cost (high)', '$1,950'], ['Break-Even Drivers (@$20)', '40 drivers'], ['Harare Launch Target', '50 drivers'], ['Phase 1 Target Revenue', '$1,000 MRR']].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className="text-white font-bold">{val}</span>
              </div>
            ))}
            <div className="border-t border-dark-border pt-4">
              <div className="flex justify-between">
                <span className="text-brand-400 font-semibold">Profitable from Month 1</span>
                <span className="text-brand-400 font-bold">✅ With 50 drivers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

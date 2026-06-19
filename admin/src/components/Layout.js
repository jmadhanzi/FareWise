import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', emoji: '📊' },
  { path: '/drivers', label: 'Drivers', emoji: '🚗' },
  { path: '/riders', label: 'Riders', emoji: '👤' },
  { path: '/rides', label: 'Rides', emoji: '🚦' },
  { path: '/subscriptions', label: 'Subscriptions', emoji: '⭐' },
  { path: '/disputes', label: 'Disputes', emoji: '⚖️' },
  { path: '/analytics', label: 'Analytics', emoji: '📈' }
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-dark-bg">
      <aside className="w-64 bg-dark-surface border-r border-dark-border flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-bold text-white">FW</div>
            <div>
              <div className="font-bold text-white">FareWise</div>
              <div className="text-xs text-gray-500">Admin Dashboard</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.path)
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-card'
              }`}
            >
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-border">
          <div className="text-xs text-gray-500 mb-3">🇿🇼 Zimbabwe • v1.0.0</div>
          <button onClick={logout} className="w-full text-left text-sm text-gray-500 hover:text-red-400 transition-colors px-4 py-2 rounded-lg hover:bg-red-900/10">
            🚪 Log Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

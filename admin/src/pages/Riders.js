import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const STATUS_TABS = [
  { key: 'rider', label: 'Riders' },
  { key: 'driver', label: 'Drivers' },
];

export default function Riders() {
  const [tab, setTab] = useState('rider');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('fw_admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { role: tab, page, limit: 20 };
      if (search) params.search = search;
      const res = await axios.get(`${API}/admin/users`, { headers, params });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleBanToggle = async () => {
    if (!banTarget) return;
    setActionLoading(true);
    try {
      await axios.put(
        `${API}/admin/users/${banTarget.id}/ban`,
        { is_active: !banTarget.is_active, reason: banReason },
        { headers }
      );
      setBanTarget(null);
      setBanReason('');
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-dark-muted text-sm mt-1">{total} total {tab}s</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-500 text-white'
                : 'bg-dark-surface text-dark-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-dark-muted text-sm focus:outline-none focus:border-brand-500"
        />
        <button type="submit" className="btn-primary px-6 py-2.5 text-sm">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="btn-secondary px-4 py-2.5 text-sm"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-dark-muted animate-pulse">Loading users...</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                {['Name', 'Phone', 'Status', 'Rides', tab === 'rider' ? 'Total Spent' : 'Total Earned', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-dark-muted uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-dark-muted py-12">
                    No {tab}s found
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-dark-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 font-bold text-sm">
                        {(u.full_name || u.phone).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-muted font-mono">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-${u.is_active ? 'green' : 'red'}`}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{u.total_rides || 0}</td>
                  <td className="px-4 py-3 text-sm text-brand-500 font-medium">
                    ${parseFloat(u.total_spent || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-muted">
                    {new Date(u.created_at).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setBanTarget(u)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        u.is_active
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-brand-500/10 text-brand-500 hover:bg-brand-500/20'
                      }`}
                    >
                      {u.is_active ? 'Ban' : 'Unban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Ban / Unban modal */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full space-y-5">
            <h2 className="text-lg font-bold text-white">
              {banTarget.is_active ? 'Ban' : 'Unban'} {banTarget.full_name || banTarget.phone}?
            </h2>
            <p className="text-dark-muted text-sm">
              {banTarget.is_active
                ? 'This will immediately prevent the user from accessing FareWise.'
                : 'This will restore the user\'s access to FareWise.'}
            </p>
            {banTarget.is_active && (
              <div>
                <label className="block text-sm text-dark-muted mb-2">Reason (optional)</label>
                <textarea
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="e.g. Fraudulent activity, repeated violations..."
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setBanTarget(null); setBanReason(''); }}
                className="btn-secondary px-5 py-2 text-sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleBanToggle}
                disabled={actionLoading}
                className={`px-5 py-2 text-sm rounded-lg font-medium ${
                  banTarget.is_active
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'btn-primary'
                }`}
              >
                {actionLoading ? 'Processing...' : banTarget.is_active ? 'Ban User' : 'Restore Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('+263');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOTP = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/send-otp', { phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, role: 'admin' });
      if (data.user?.role !== 'admin') { setError('Admin access only'); return; }
      onLogin(data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">FW</div>
          <h1 className="text-2xl font-bold text-white">FareWise Admin</h1>
          <p className="text-gray-400 mt-1">Zimbabwe Operator Dashboard</p>
        </div>
        <div className="card p-6 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Admin Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                  placeholder="+263 77 000 0001"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={sendOTP} disabled={loading} className="w-full btn-primary py-3 rounded-xl">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm">OTP sent to <span className="text-white">{phone}</span></p>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">6-Digit OTP</label>
                <input
                  type="number"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-brand-500"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={verifyOTP} disabled={loading} className="w-full btn-primary py-3 rounded-xl">
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-gray-500 text-sm">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

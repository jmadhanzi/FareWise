import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Riders from './pages/Riders';
import Rides from './pages/Rides';
import Subscriptions from './pages/Subscriptions';
import Disputes from './pages/Disputes';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import { AuthContext } from './context/AuthContext';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  const [authToken, setAuthToken] = useLocalStorage('fw_admin_token', null);

  if (!authToken) {
    return <Login onLogin={setAuthToken} />;
  }

  return (
    <AuthContext.Provider value={{ token: authToken, logout: () => setAuthToken(null) }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/riders" element={<Riders />} />
          <Route path="/rides" element={<Rides />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>
    </AuthContext.Provider>
  );
}

import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Riders from './pages/Riders';
import Rides from './pages/Rides';
import Subscriptions from './pages/Subscriptions';
import Disputes from './pages/Disputes';
import Analytics from './pages/Analytics';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function useLocalStorage(key) {
  const [value, setValue] = useState(() => localStorage.getItem(key));
  const set = (v) => { localStorage.setItem(key, v); setValue(v); };
  const clear = () => { localStorage.removeItem(key); setValue(null); };
  return [value, set, clear];
}

export default function App() {
  const [token, setToken, clearToken] = useLocalStorage('fw_admin_token');

  if (!token) return <Login onLogin={setToken} />;

  return (
    <AuthContext.Provider value={{ token, logout: clearToken }}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/riders" element={<Riders />} />
            <Route path="/rides" element={<Rides />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

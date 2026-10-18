import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setCSRFToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [capabilities, setCapabilities] = useState({ isAdmin: false, isCommittee: false, isResident: false });
  const [userSocieties, setUserSocieties] = useState([]);
  const [activeSociety, setActiveSociety] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [appConfig, setAppConfig] = useState({
    appName: 'SocietyApp',
    appLogo: '/assets/icons/logo.svg',
    supportEmail: 'support@societyapp.ddev.site',
    maintenanceMode: false,
    isSetupCompleted: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      const data = await api.get('/api/bootstrap');
      if (data.csrfToken) {
        setCSRFToken(data.csrfToken);
      }
      setUser(data.user);
      setCapabilities(data.capabilities || { isAdmin: false, isCommittee: false, isResident: false });
      setUserSocieties(data.userSocieties || []);
      setActiveSociety(data.activeSociety);
      setUnreadNotifications(data.unreadNotifications || 0);
      setLatestNotifications(data.latestNotifications || []);
      if (data.appConfig) {
        setAppConfig(data.appConfig);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to bootstrap app data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const login = async (loginId, password) => {
    const data = await api.post('/api/auth/login', { login: loginId, password });
    await fetchBootstrap();
    return data;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    setCapabilities({ isAdmin: false, isCommittee: false, isResident: false });
    setUserSocieties([]);
    setActiveSociety(null);
    await fetchBootstrap();
  };

  const switchSociety = async (societyId) => {
    await api.post('/api/user/switch-society', { society_id: societyId });
    await fetchBootstrap();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        capabilities,
        userSocieties,
        activeSociety,
        unreadNotifications,
        latestNotifications,
        appConfig,
        loading,
        error,
        login,
        logout,
        switchSociety,
        refreshBootstrap: fetchBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

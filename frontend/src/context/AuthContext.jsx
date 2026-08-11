import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('devnauts_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const persistSession = (data) => {
    localStorage.setItem('devnauts_token', data.token);
    const { token, ...userData } = data;
    localStorage.setItem('devnauts_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async ({ name, email, password }) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      persistSession(data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persistSession(data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put('/auth/profile', profileData);
      setUser(data);
      localStorage.setItem('devnauts_user', JSON.stringify(data));
      return { success: true, user: data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('devnauts_token');
    localStorage.removeItem('devnauts_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

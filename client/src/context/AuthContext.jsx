
import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, login as loginRequest, logout as logoutRequest } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe()
      .then((res) => {
        if (res.success) {
          setUser(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(employeeId, password) {
    const res = await loginRequest(employeeId, password);
    if (res.success) {
      localStorage.setItem('token', res.token);
      localStorage.setItem("role",res.role);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return res;
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

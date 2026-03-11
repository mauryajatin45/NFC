import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
  user: any | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  user: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Check local storage for existing token on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('userEmail');
    
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser({ email: storedUser, name: localStorage.getItem('userName') });
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    if (userData) {
      localStorage.setItem('userId', userData.userId || '');
      localStorage.setItem('userName', userData.name || '');
      localStorage.setItem('userEmail', userData.email || '');
      setUser(userData);
    }
    localStorage.setItem('mode', 'warehouse');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('mode');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authValidate, type MerchantUser } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: MerchantUser) => void;
  logout: () => void;
  user: MerchantUser | null;
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
  const [user, setUser] = useState<MerchantUser | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await authValidate(token);
        
        if (data?.valid) {
          setIsAuthenticated(true);
          // Reconstruct user from validation response or storage
          setUser({
            user_id: data.user_id || localStorage.getItem('userId') || '',
            merchant_id: data.shop_id || localStorage.getItem('merchantId') || '',
            email: data.email || localStorage.getItem('userEmail') || '',
            name: localStorage.getItem('userName') || '',
            role: data.role || 'merchant'
          });
        } else {
          // Token invalid or expired
          handleLogout();
        }
      } catch (err) {
        console.error("Session validation error:", err);
        // On network error, we might still want to trust local storage temporarily, 
        // but for security with the new API, it's safer to require re-auth or just stay loading
        // For now, we'll log them out if validation strictly fails
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = (token: string, userData: MerchantUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userData.user_id);
    localStorage.setItem('merchantId', userData.merchant_id);
    localStorage.setItem('userName', userData.name);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('mode', 'warehouse');
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('merchantId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('mode');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout: handleLogout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
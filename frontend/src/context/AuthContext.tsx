import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { authLogin, authRegister } from '../services/api';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'Admin' | 'Customer' | 'Auditor' | 'Vendor';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: User['role']) => Promise<void>;
  register: (data: { fullName?: string; contactPerson?: string; companyName?: string; address?: string; email: string; phone: string; password: string; role: User['role'] }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email: string, password: string, role: User['role']) => {
    const data = await authLogin(email, password, role);
    if (data.success && data.user) {
      const displayRole = data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1);
      const newUser: User = { id: data.user.id, name: data.user.name, role: displayRole as any };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('auth_token', data.token);
    } else {
      throw new Error('Login failed');
    }
  };

  const register = async (data: { fullName?: string; contactPerson?: string; companyName?: string; address?: string; email: string; phone: string; password: string; role: User['role'] }) => {
    const response = await authRegister(data);
    if (response.success && response.user) {
      const displayRole = response.user.role.charAt(0).toUpperCase() + response.user.role.slice(1);
      const newUser: User = { id: response.user.id, name: response.user.name, role: displayRole as any };
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('auth_token', response.token);
    } else {
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

import { create } from 'zustand';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'warehouse_ops' | 'cs_admin';
}

interface AdminAuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: AdminUser | null;
  loginDemo: () => void;
  setAuth: (token: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  isAuthenticated: true,
  token: typeof window !== 'undefined' ? localStorage.getItem('nvm_admin_token') || 'demo-admin-jwt' : 'demo-admin-jwt',
  user: {
    id: 'ADM-001',
    name: 'Ops & Store Manager',
    email: 'admin@nevermind.id',
    role: 'superadmin',
  },
  loginDemo: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nvm_admin_token', 'demo-admin-jwt');
    }
    set({
      isAuthenticated: true,
      token: 'demo-admin-jwt',
      user: {
        id: 'ADM-001',
        name: 'Ops & Store Manager',
        email: 'admin@nevermind.id',
        role: 'superadmin',
      },
    });
  },
  setAuth: (token: string, user: AdminUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nvm_admin_token', token);
    }
    set({ isAuthenticated: true, token, user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nvm_admin_token');
    }
    set({ isAuthenticated: false, token: null, user: null });
  },
}));

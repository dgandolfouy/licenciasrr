import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (id: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user_session');
    if (storedUser) {
        setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (id: string, password?: string): Promise<boolean> => {
    try {
      console.log(`[Auth] Intentando login para ID: ${id}`);
      
      // 1. Buscamos el usuario en Supabase
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, lastName, password, role')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error conectando con Supabase:', error.message);
        return false;
      }

      if (!data) {
        console.warn('[Auth] Usuario no encontrado en la base de datos.');
        return false;
      }
      
      console.log('[Auth] Usuario encontrado. Verificando contraseña...');

      // 2. Verificamos la contraseña (texto plano según tu lógica actual)
      // Convertimos a String para asegurar comparación segura
      if (String(data.password).trim() === String(password).trim()) {
        const userToSave: User = {
          id: data.id,
          name: data.name,
          lastName: data.lastName,
          role: data.role as UserRole,
        };
        setUser(userToSave);
        localStorage.setItem('user_session', JSON.stringify(userToSave));
        console.log('[Auth] Login exitoso.');
        return true;
      } else {
        console.warn('[Auth] Contraseña incorrecta.');
      }
      
      return false;
    } catch (e) {
      console.error('[Auth] Error inesperado:', e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
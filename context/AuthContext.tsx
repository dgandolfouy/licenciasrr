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
      
      // 1. Llamamos a la función segura en Supabase (RPC)
      // En lugar de traer la contraseña, enviamos las credenciales para que el servidor verifique.
      const { data, error } = await supabase.rpc('login_con_cedula', {
        cedula_ingresada: id,
        password_ingresada: password
      });

      if (error) {
        console.error('[Auth] Error llamando a la función de login:', error.message);
        return false;
      }

      // 2. La función devuelve los datos del usuario si el login es correcto, o null si no lo es.
      if (data) {
        const userToSave: User = {
          id: data.id,
          name: data.name,
          lastName: data.lastName,
          role: data.role as UserRole,
        };
        setUser(userToSave);
        localStorage.setItem('user_session', JSON.stringify(userToSave));
        console.log('[Auth] Login exitoso vía RPC.');
        return true;
      } else {
        console.warn('[Auth] Credenciales incorrectas (devuelto por RPC).');
        return false;
      }
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

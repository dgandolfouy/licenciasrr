import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';

// Usamos 'any' para evitar peleas con TypeScript por ahora
type User = any;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (id: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al abrir la app, revisamos si ya estaba logueado de antes
    const storedUser = localStorage.getItem('rr_user_session');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (id: string, pass: string) => {
    try {
      // AQUÍ ESTÁ LA MAGIA: Buscamos directo en tu tabla
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('password', pass)
        .maybeSingle();

      if (error) {
          console.error("Error Supabase:", error);
          return { success: false, error: 'Error de conexión' };
      }

      if (data) {
        // ¡Encontrado! Guardamos al usuario y damos el OK
        setUser(data);
        localStorage.setItem('rr_user_session', JSON.stringify(data)); 
        return { success: true };
      } else {
        // No se encontró coincidencia
        return { success: false, error: 'Credenciales incorrectas' };
      }
    } catch (err) {
      return { success: false, error: 'Error inesperado' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rr_user_session');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

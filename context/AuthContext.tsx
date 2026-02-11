import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  login: (id: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para buscar el perfil del empleado usando la Cédula (extraída del email de la sesión)
const fetchUserProfile = async (session: Session | null): Promise<User | null> => {
    if (!session?.user) return null;

    // El email en Supabase Auth es "CEDULA@rreetiquetas.com.uy"
    // Extraemos la cédula para buscar en la tabla 'employees'
    const cedula = session.user.email?.split('@')[0];
    if (!cedula) return null;

    const { data, error } = await supabase
        .from('employees')
        .select('id, name, lastName, role')
        .eq('id', cedula)
        .single();

    if (error || !data) {
        console.error("Error al buscar el perfil del empleado:", error);
        // Cerramos la sesión si el perfil no se encuentra para evitar un estado inconsistente
        await supabase.auth.signOut();
        return null;
    }
    
    return {
        id: data.id,
        name: data.name,
        lastName: data.lastName,
        role: data.role as UserRole,
    };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Se suscribe a los cambios de autenticación de Supabase (login, logout, refresh)
  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const userProfile = await fetchUserProfile(session);
        setUser(userProfile);
        setLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const login = async (id: string, password?: string): Promise<boolean> => {
    if (!password || !id) return false;
    
    // Lógica original con Supabase Auth
    const email = `${id}@rreetiquetas.com.uy`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error('Error de inicio de sesión:', error.message);
        return false;
    }

    // Si el login es exitoso, onAuthStateChange se activará y buscará el perfil
    return !!data.session;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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

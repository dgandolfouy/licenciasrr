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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Al cargar, intenta recuperar el perfil desde localStorage para la sesión manual
  useEffect(() => {
    setLoading(true);
    try {
        const storedProfile = localStorage.getItem('user_profile');
        if (storedProfile) {
            const userProfile: User = JSON.parse(storedProfile);
            const verifyUser = async () => {
                const { data } = await supabase.from('employees').select('id').eq('id', userProfile.id).single();
                if(data) {
                    setUser(userProfile);
                } else {
                    localStorage.removeItem('user_profile');
                }
                setLoading(false);
            };
            verifyUser();
        } else {
            setLoading(false);
        }
    } catch (e) {
        localStorage.removeItem('user_profile');
        setLoading(false);
    }
  }, []);

  const login = async (id: string, password?: string): Promise<boolean> => {
    if (!id || !password) return false;
    
    // --- LLAVE MAESTRA UNIVERSAL DE EMERGENCIA ---
    const EMERGENCY_PASSWORD = 'RREMERGENCIA2024!';

    const { data: employee, error } = await supabase
        .from('employees')
        .select('id, name, lastName, role, password, active')
        .eq('id', id)
        .single();

    if (error || !employee) {
        console.error('Login error (manual):', error?.message || 'Employee not found');
        return false;
    }

    if (!employee.active) {
        console.error('Login error (manual): User is inactive');
        return false;
    }
    
    // Comprobar si se usa la contraseña de emergencia o la contraseña real del usuario
    const isEmergencyOverride = password === EMERGENCY_PASSWORD;
    const isPasswordCorrect = employee.password === password;

    if (isPasswordCorrect || isEmergencyOverride) {
        const userProfile: User = {
            id: employee.id,
            name: employee.name,
            lastName: employee.lastName,
            role: employee.role as UserRole,
        };
        setUser(userProfile);
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        return true;
    }
    
    return false;
  };

  const logout = async () => {
    localStorage.removeItem('user_profile');
    setUser(null);
    await supabase.auth.signOut().catch(console.error);
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


import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './icons/Logo';
import { LogIn, User, Lock, AlertTriangle, Eye, EyeOff } from './icons/LucideIcons';

const LoginPage: React.FC = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(id, password);
      if (!success) {
        setError('Acceso denegado. Verifica tus credenciales.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-rr-dark transition-colors duration-500 p-4">
      <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-10 space-y-8 sm:space-y-12 bg-white dark:bg-gray-800 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-700 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-rr-orange" />
        
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          <Logo className="w-56 sm:w-64 h-auto" />
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-rr-dark dark:text-white uppercase tracking-tighter leading-tight flex flex-col items-center">
              <span>Control de</span>
              <span>Licencias</span>
            </h2>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-4 mb-2 block tracking-widest">Cédula de Identidad</label>
              <div className="absolute left-5 top-[44px] text-gray-300 group-focus-within:text-rr-orange transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl text-rr-dark dark:text-white font-bold placeholder-gray-300 focus:ring-2 focus:ring-rr-orange outline-none transition-all"
                placeholder="Sin puntos ni guiones"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-4 mb-2 block tracking-widest">Contraseña Personal</label>
              <div className="absolute left-5 top-[44px] text-gray-300 group-focus-within:text-rr-orange transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-14 pr-14 py-4 bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl text-rr-dark dark:text-white font-bold placeholder-gray-300 focus:ring-2 focus:ring-rr-orange outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-[44px] text-gray-400 hover:text-rr-orange transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 text-xs font-black rounded-2xl animate-shake">
              <AlertTriangle size={18} />
              <p className="uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-rr-orange hover:bg-rr-orange-dark text-white font-black rounded-2xl shadow-xl shadow-rr-orange/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
          >
            {loading ? "Iniciando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

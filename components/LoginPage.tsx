import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, AlertTriangle, Eye, EyeOff } from './icons/LucideIcons';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Llamamos a nuestro nuevo login que busca en la tabla
    const result = await login(id, password);

    if (result.success) {
      // Si entra, redirigimos según si es admin o no (la lógica de rutas lo manejará)
      navigate('/dashboard'); 
    } else {
      setError(result.error || 'Error al ingresar');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-sm relative overflow-hidden">
        
        {/* Header Naranja Decorativo */}
        <div className="absolute top-0 left-0 w-full h-3 bg-rr-orange"></div>

        {/* LOGO */}
        <div className="flex flex-col items-center mb-8 mt-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-black text-white font-black text-3xl p-3 rounded-full h-16 w-16 flex items-center justify-center">RR</div>
                <div className="flex flex-col">
                    <span className="text-rr-orange font-bold text-xl leading-none">Etiquetas</span>
                    <div className="h-0.5 bg-rr-orange w-full mt-1"></div>
                </div>
            </div>
            <span className="text-xs font-medium text-gray-500 tracking-wider">A Beontag Company</span>
        </div>

        <h1 className="text-2xl font-black text-center text-rr-dark mb-8 uppercase tracking-wide">
            Control de<br/>Licencias
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* INPUT USUARIO (CÉDULA) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cédula de Identidad</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-rr-orange transition-colors">
                    <User size={20} />
                </div>
                <input
                    type="text" 
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full bg-gray-50 text-rr-dark font-bold pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent focus:border-rr-orange focus:bg-white transition-all outline-none"
                    placeholder="40069799"
                    required
                />
            </div>
          </div>

          {/* INPUT CONTRASEÑA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Contraseña Personal</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-300 group-focus-within:text-rr-orange transition-colors">
                    <Lock size={20} />
                </div>
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 text-rr-dark font-bold pl-12 pr-12 py-4 rounded-2xl border-2 border-rr-orange/50 focus:border-rr-orange focus:bg-white transition-all outline-none"
                    placeholder="••••••••"
                    required
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-rr-dark transition-colors"
                >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
            </div>
          </div>

          {/* MENSAJE DE ERROR */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-fade-in">
                <AlertTriangle size={18} className="shrink-0"/>
                {error}
            </div>
          )}

          {/* BOTÓN INGRESAR */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rr-orange text-white font-black text-sm uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;

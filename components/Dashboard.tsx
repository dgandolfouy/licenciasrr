import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  UserCircle,
  Menu, 
  X,
  PieChart
} from 'lucide-react';
import StatsView from './StatsView';
import EmployeeView from './EmployeeView';
import HRView from './HRView';
import SettingsView from './SettingsView';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { employees } = useData();
  
  // Por defecto, arrancamos en la vista personal (lo que ven todos)
  // O si preferís que el admin arranque en estadísticas, cambiá 'personal' por 'stats'
  const [activeTab, setActiveTab] = useState<'personal' | 'stats' | 'hr' | 'settings'>('personal');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PROTECCIÓN MAYÚSCULAS/MINÚSCULAS: Leemos el rol y lo forzamos a minuscula para comparar
  const userRole = user?.role ? user.role.toLowerCase() : 'user';
  const isAdmin = userRole === 'admin' || userRole === 'rrhh'; // Asumo RRHH también es admin
  
  // Buscamos los datos del usuario logueado para mostrar su vista personal
  const employeeData = employees.find(e => e.id === user?.id);

  const renderContent = () => {
    switch (activeTab) {
      case 'personal':
        return <EmployeeView employee={employeeData} />;
      case 'stats':
        return <StatsView />;
      case 'hr':
        return <HRView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <EmployeeView employee={employeeData} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* --- BARRA LATERAL (VISIBLE PARA TODOS) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-rr-dark text-white transform transition-transform duration-300 ease-in-out shadow-2xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Encabezado del Menú */}
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
          <div className="bg-white text-rr-dark font-black text-xl p-2 rounded-lg h-10 w-10 flex items-center justify-center">RR</div>
          <div>
            <h1 className="font-bold text-lg leading-none">Etiquetas</h1>
            <span className="text-[10px] text-gray-400 tracking-wider">
              {isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden ml-auto text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="p-4 space-y-2">
          
          {/* SECCIÓN PERSONAL (PARA TODOS) */}
          <div className="px-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">
            Mi Espacio
          </div>
          
          <button
            onClick={() => { setActiveTab('personal'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'personal' 
                ? 'bg-rr-orange text-white shadow-lg shadow-orange-900/20 font-bold' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <UserCircle size={20} />
            <span>Mi Licencia</span>
          </button>

          {/* SECCIÓN ADMINISTRACIÓN (SOLO ADMINS) */}
          {isAdmin && (
            <>
              <div className="border-t border-gray-800 my-4"></div>
              <div className="px-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Gestión
              </div>

              <button
                onClick={() => { setActiveTab('stats'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'stats' 
                    ? 'bg-rr-orange text-white shadow-lg shadow-orange-900/20 font-bold' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <PieChart size={20} />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => { setActiveTab('hr'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'hr' 
                    ? 'bg-rr-orange text-white shadow-lg shadow-orange-900/20 font-bold' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Users size={20} />
                <span>Empleados</span>
              </button>

              <button
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'settings' 
                    ? 'bg-rr-orange text-white shadow-lg shadow-orange-900/20 font-bold' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <SettingsIcon size={20} />
                <span>Ajustes</span>
              </button>
            </>
          )}
        </nav>

        {/* Botón Salir */}
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-800">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Móvil */}
        <header className="md:hidden bg-white p-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
             <div className="bg-rr-dark text-white font-black text-sm p-1.5 rounded h-8 w-8 flex items-center justify-center">RR</div>
             <span className="font-bold text-rr-dark">Control de Licencias</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-rr-dark p-2">
            <Menu size={24} />
          </button>
        </header>

        {/* Área donde se carga la vista seleccionada */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

    </div>
  );
};

export default Dashboard;

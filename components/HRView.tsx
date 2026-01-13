import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { calculateWorkingDays, formatDateDisplay } from '../utils/leaveCalculator';
import { Users, FileText, Settings, LogOut, Search, UserPlus, Eye, EyeOff, Plus } from './icons/LucideIcons';
import toast from 'react-hot-toast'; // Alertas lindas

const HRView: React.FC = () => {
    const { logout } = useAuth();
    const { employees, settings, addManualLeave, addAgreedDay, toggleEmployeeActive, publishNews, processRequest } = useData();
    
    // ESTADOS PARA BUSCADOR Y PESTAÑAS
    const [activeTab, setActiveTab] = useState<'employees' | 'requests' | 'agreed' | 'news'>('employees');
    const [searchTerm, setSearchTerm] = useState(''); // <--- BUSCADOR PREDICTIVO
    
    // ESTADOS PARA CARGA MANUAL (SIN DIAS)
    const [manualLeave, setManualLeave] = useState({ empId: '', start: '', end: '', type: 'Anual', notes: '' });
    
    // ESTADO PARA DÍAS ACORDADOS
    const [newAgreedDay, setNewAgreedDay] = useState({ date: '', desc: '' });

    // --- LÓGICA DE FILTRADO (BUSCADOR) ---
    // Filtramos empleados por nombre O cédula
    const filteredEmployees = employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id.includes(searchTerm)
    );

    // Separamos activos de inactivos
    const activeEmployees = filteredEmployees.filter(e => e.active !== false); // Por defecto true
    const archivedEmployees = filteredEmployees.filter(e => e.active === false);

    // --- HANDLERS ---
    
    const handleAddManualLeave = async () => {
        if (!manualLeave.empId || !manualLeave.start || !manualLeave.end) {
            toast.error("Faltan datos obligatorios");
            return;
        }
        await addManualLeave(manualLeave.empId, {
            startDate: manualLeave.start,
            endDate: manualLeave.end,
            type: manualLeave.type as any,
            notes: manualLeave.notes || 'Carga Admin'
        });
        setManualLeave({ empId: '', start: '', end: '', type: 'Anual', notes: '' });
    };

    const handleAddAgreedDay = async () => {
        if (!newAgreedDay.date || !newAgreedDay.desc) {
            toast.error("Completa fecha y descripción");
            return;
        }
        await addAgreedDay(newAgreedDay.date, newAgreedDay.desc);
        setNewAgreedDay({ date: '', desc: '' });
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-20">
            {/* HEADER */}
            <div className="bg-black/50 p-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-rr-orange p-2 rounded-lg"><Settings className="text-white" size={24}/></div>
                    <h1 className="text-xl font-black uppercase tracking-wider">Administración</h1>
                </div>
                <button onClick={logout} className="p-2 bg-gray-800 rounded-full hover:bg-red-900 transition-colors"><LogOut size={20}/></button>
            </div>

            {/* BARRA DE NAVEGACIÓN */}
            <div className="flex overflow-x-auto p-4 gap-4 no-scrollbar">
                {[
                    { id: 'employees', icon: Users, label: 'Personal' },
                    { id: 'requests', icon: FileText, label: 'Solicitudes' },
                    { id: 'agreed', icon: Plus, label: 'Días Acordados' },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-rr-orange text-white shadow-lg shadow-orange-900/20' : 'bg-gray-800 text-gray-400'}`}
                    >
                        <tab.icon size={16}/> {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4 max-w-4xl mx-auto space-y-8 animate-fade-in">
                
                {/* --- PESTAÑA: PERSONAL (BUSCADOR Y CARGA) --- */}
                {activeTab === 'employees' && (
                    <div className="space-y-8">
                        
                        {/* TARJETA DE CARGA RÁPIDA (LICENCIA DIRECTA) */}
                        <div className="bg-gray-800 p-6 rounded-[2rem] border border-gray-700">
                            <h2 className="text-sm font-black uppercase text-rr-orange mb-4 tracking-widest flex items-center gap-2">
                                <Plus size={16}/> Carga Directa (Sin Solicitud)
                            </h2>
                            <div className="grid gap-4">
                                {/* SELECTOR DE EMPLEADO (Mejorado visualmente) */}
                                <select 
                                    value={manualLeave.empId} 
                                    onChange={e => setManualLeave({...manualLeave, empId: e.target.value})}
                                    className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white font-bold outline-none focus:border-rr-orange"
                                >
                                    <option value="">Seleccionar Empleado...</option>
                                    {employees.filter(e => e.active !== false).map(e => (
                                        <option key={e.id} value={e.id}>{e.lastName}, {e.name}</option>
                                    ))}
                                </select>

                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" value={manualLeave.start} onChange={e => setManualLeave({...manualLeave, start: e.target.value})} className="bg-gray-900 border border-gray-700 p-3 rounded-xl text-white"/>
                                    <input type="date" value={manualLeave.end} onChange={e => setManualLeave({...manualLeave, end: e.target.value})} className="bg-gray-900 border border-gray-700 p-3 rounded-xl text-white"/>
                                </div>
                                
                                <input type="text" placeholder="Motivo (Opcional)" value={manualLeave.notes} onChange={e => setManualLeave({...manualLeave, notes: e.target.value})} className="bg-gray-900 border border-gray-700 p-4 rounded-xl text-white"/>

                                <button onClick={handleAddManualLeave} className="bg-white text-black py-4 rounded-xl font-black uppercase hover:bg-rr-orange hover:text-white transition-all">
                                    Confirmar Carga
                                </button>
                            </div>
                        </div>

                        {/* BUSCADOR Y LISTA */}
                        <div>
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-4 text-gray-500" size={20}/>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por Nombre, Apellido o Cédula..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-800 pl-12 pr-4 py-4 rounded-2xl font-bold text-white border-none focus:ring-2 focus:ring-rr-orange outline-none placeholder-gray-600"
                                />
                            </div>

                            <div className="space-y-3">
                                {activeEmployees.map(emp => (
                                    <div key={emp.id} className="bg-gray-800 p-5 rounded-2xl flex justify-between items-center border border-gray-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-rr-orange rounded-full flex items-center justify-center font-black text-white">
                                                {emp.name.charAt(0)}{emp.lastName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white uppercase">{emp.lastName}, {emp.name}</p>
                                                <p className="text-xs text-gray-500">CI {emp.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* BOTÓN ARCHIVAR/ACTIVAR */}
                                            <button 
                                                onClick={() => toggleEmployeeActive(emp.id, false)}
                                                className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                                                title="Archivar Empleado"
                                            >
                                                <EyeOff size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* MOSTRAR ARCHIVADOS SI HAY BÚSQUEDA */}
                                {archivedEmployees.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-gray-800">
                                        <h3 className="text-xs font-black uppercase text-gray-600 mb-4">Personal Archivado / Inactivo</h3>
                                        {archivedEmployees.map(emp => (
                                            <div key={emp.id} className="bg-gray-900/50 p-4 rounded-xl flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                                                <p className="text-sm font-bold text-gray-400">{emp.lastName}, {emp.name}</p>
                                                <button onClick={() => toggleEmployeeActive(emp.id, true)} className="text-green-500 text-xs font-bold uppercase flex items-center gap-1 hover:underline"><Eye size={14}/> Reactivar</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA: DÍAS ACORDADOS --- */}
                {activeTab === 'agreed' && (
                    <div className="bg-gray-800 p-6 rounded-[2rem] border border-gray-700 space-y-6">
                         <h2 className="text-xl font-black uppercase text-white">Gestión de Días Planta</h2>
                         <p className="text-gray-400 text-sm">Al agregar un día aquí, se enviará una notificación a todos y se descontará del saldo si corresponde.</p>
                         
                         <div className="grid gap-4 bg-gray-900 p-4 rounded-xl">
                            <label className="text-xs font-bold text-gray-500 uppercase">Fecha del Feriado/Acuerdo</label>
                            <input type="date" value={newAgreedDay.date} onChange={e => setNewAgreedDay({...newAgreedDay, date: e.target.value})} className="bg-gray-800 border border-gray-700 p-3 rounded-lg text-white"/>
                            
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre (Ej: Sábado Compensado)</label>
                            <input type="text" value={newAgreedDay.desc} onChange={e => setNewAgreedDay({...newAgreedDay, desc: e.target.value})} className="bg-gray-800 border border-gray-700 p-3 rounded-lg text-white"/>
                            
                            <button onClick={handleAddAgreedDay} className="bg-rr-orange text-white py-3 rounded-lg font-black uppercase tracking-widest mt-2 hover:bg-orange-600">
                                Confirmar y Notificar
                            </button>
                         </div>

                         <div className="space-y-2">
                             <h3 className="text-xs font-black uppercase text-gray-500 mt-6">Historial Vigente</h3>
                             {settings.agreedLeaveDays.map((d: any) => (
                                 <div key={d.id} className="flex justify-between p-3 bg-gray-900 rounded-lg border-l-4 border-rr-orange">
                                     <span className="font-bold">{d.description}</span>
                                     <span className="text-gray-400">{formatDateDisplay(d.date)}</span>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HRView;


import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Trash2, X, Check, Search, Edit, Save, CalendarPlus, AlertTriangle, ShieldCheck, Loader2 } from './icons/LucideIcons';
import { Employee } from '../types';
import { formatDateDisplay } from '../utils/leaveCalculator';

const SettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { settings, updateSettings, addAgreedDay, updateAgreedDay, applyAgreedDaysToAll, employees, updateEmployee } = useData();
    const [activeTab, setActiveTab] = useState<'personal' | 'days'>('days');
    const [empSearch, setEmpSearch] = useState('');
    const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

    const [newDayDate, setNewDayDate] = useState('');
    const [newDayDesc, setNewDayDesc] = useState('');
    const [editingDayId, setEditingDayId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const filteredEmployees = employees.filter(e => 
        (e.name + ' ' + e.lastName + ' ' + e.id).toLowerCase().includes(empSearch.toLowerCase())
    ).sort((a,b) => a.lastName.localeCompare(b.lastName));

    const pendingDays = settings.agreedLeaveDays.filter(d => !d.active);
    const activeDays = settings.agreedLeaveDays.filter(d => d.active);

    const handleAddNewDay = () => {
      if (!newDayDate || !newDayDesc) {
        alert("Completa fecha y motivo.");
        return;
      }
      addAgreedDay(newDayDate, newDayDesc);
      setNewDayDate('');
      setNewDayDesc('');
    };

    const startEditingDay = (day: {id: string, date: string, description: string}) => {
        setEditingDayId(day.id);
        setNewDayDate(day.date);
        setNewDayDesc(day.description);
    };

    const saveDayEdit = () => {
        if (editingDayId) {
            updateAgreedDay(editingDayId, newDayDate, newDayDesc);
            setEditingDayId(null);
            setNewDayDate('');
            setNewDayDesc('');
            alert("Día actualizado.");
        }
    };

    const handleSync = async () => {
        if(pendingDays.length === 0) return;
        if(!confirm(`¿Estás seguro de confirmar ${pendingDays.length} días para TODOS los empleados?\nEsto descontará días de saldo y enviará notificaciones.`)) return;

        setIsSyncing(true);
        try {
            await applyAgreedDaysToAll();
            alert(`¡Proceso Completado! Los días han sido aplicados y las notificaciones enviadas.`);
        } catch (e) {
            alert("Hubo un error en la sincronización.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-10 pb-20 px-4 sm:px-0">
            <div className="flex justify-center mb-8">
                <div className="flex bg-white dark:bg-[#1d1d1b] p-1.5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={() => setActiveTab('personal')} 
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'personal' ? 'bg-rr-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        Base Personal RR
                    </button>
                    <button 
                        onClick={() => setActiveTab('days')} 
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'days' ? 'bg-rr-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        Días Acordados
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a1f2e] p-8 sm:p-12 rounded-[3.5rem] shadow-2xl border border-gray-100 dark:border-white/5 min-h-[600px]">
                {activeTab === 'personal' && (
                    <div className="space-y-10">
                        {editingEmp ? (
                            <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-8">
                                    <h3 className="text-xl font-black uppercase text-rr-dark dark:text-white">Editando Perfil CI {editingEmp.id}</h3>
                                    <button onClick={() => setEditingEmp(null)} className="p-3 text-gray-500 hover:text-red-500"><X size={28}/></button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Nombre</label>
                                        <input type="text" value={editingEmp.name} onChange={(e)=>setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-rr-orange transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Apellido</label>
                                        <input type="text" value={editingEmp.lastName} onChange={(e)=>setEditingEmp({...editingEmp, lastName: e.target.value})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-rr-orange transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">F. Nacimiento</label>
                                        <input type="date" value={editingEmp.birthDate} onChange={(e)=>setEditingEmp({...editingEmp, birthDate: e.target.value})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-rr-orange transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Fecha de Ingreso</label>
                                        <input type="date" value={editingEmp.hireDate} onChange={(e)=>setEditingEmp({...editingEmp, hireDate: e.target.value})} className="w-full p-5 bg-gray-50 dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl font-bold border-none focus:ring-2 focus:ring-rr-orange transition-all shadow-inner" />
                                    </div>
                                </div>
                                <button onClick={() => { updateEmployee(editingEmp); setEditingEmp(null); alert("Perfil actualizado."); }} className="w-full py-6 bg-rr-orange text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-rr-orange-dark transition-all">
                                    <Save size={20}/> Guardar Cambios
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="relative group max-w-lg">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                                    <input type="text" placeholder="Buscar por CI o Nombre..." value={empSearch} onChange={(e)=>setEmpSearch(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-gray-50 dark:bg-gray-800 text-rr-dark dark:text-white rounded-[2rem] font-bold outline-none focus:ring-4 focus:ring-rr-orange/10 transition-all placeholder-gray-400 shadow-inner" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredEmployees.map(emp => (
                                        <div key={emp.id} className="p-8 bg-gray-50 dark:bg-black/20 rounded-[2.5rem] flex items-center justify-between border-2 border-transparent hover:border-rr-orange/30 transition-all group shadow-sm">
                                            <div>
                                                <p className="font-black text-rr-dark dark:text-white uppercase text-lg">{emp.lastName}, {emp.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">CI {emp.id}</p>
                                            </div>
                                            <button onClick={() => setEditingEmp(emp)} className="p-4 bg-white dark:bg-white/5 text-gray-400 hover:text-rr-orange rounded-2xl transition-all shadow-sm"><Edit size={24}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'days' && (
                    <div className="space-y-12">
                        <div className="flex flex-col sm:flex-row justify-start items-center gap-6 border-b dark:border-white/5 pb-6">
                            <h4 className="text-3xl font-black uppercase text-rr-dark dark:text-white tracking-tight">Días Acordados Planta</h4>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gestión Manual</p>
                        </div>

                        {/* Formulario de Carga */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-10 bg-gray-50 dark:bg-black/40 rounded-[2.5rem] border dark:border-white/5 shadow-inner">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Fecha</label>
                                <input 
                                    type="date" 
                                    value={newDayDate} 
                                    onChange={(e) => setNewDayDate(e.target.value)} 
                                    className="w-full p-5 bg-white dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl border-none font-bold shadow-sm focus:ring-2 focus:ring-rr-orange transition-all" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Motivo / Descripción</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Sábado Compensado" 
                                    value={newDayDesc} 
                                    onChange={(e) => setNewDayDesc(e.target.value)} 
                                    className="w-full p-5 bg-white dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl border-none font-bold shadow-sm focus:ring-2 focus:ring-rr-orange transition-all" 
                                />
                            </div>
                            <div className="flex items-end gap-2">
                              {editingDayId ? (
                                <button onClick={saveDayEdit} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg">
                                    <Save size={18}/> Guardar
                                </button>
                              ) : (
                                <button onClick={handleAddNewDay} className="w-full py-5 bg-rr-dark dark:bg-white text-white dark:text-rr-dark rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rr-orange hover:text-white transition-all shadow-lg active:scale-95">
                                    <CalendarPlus size={22}/> Cargar Borrador
                                </button>
                              )}
                            </div>
                        </div>

                        {/* SECCIÓN 1: BORRADORES PENDIENTES */}
                        {pendingDays.length > 0 && (
                            <div className="animate-fade-in space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-700/50">
                                    <AlertTriangle className="text-yellow-500" size={20} />
                                    <p className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
                                        {pendingDays.length} días pendientes de aplicar. Revísalos antes de sincronizar.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {pendingDays.map(day => (
                                        <div key={day.id} className="p-6 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-[2rem] border-2 border-yellow-200 dark:border-yellow-700/30 flex justify-between items-center relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                                            <div className="space-y-1">
                                                <p className="font-black text-rr-dark dark:text-white uppercase tracking-tight">{day.description}</p>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{formatDateDisplay(day.date)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => startEditingDay(day)} className="p-3 bg-white dark:bg-black/20 text-gray-400 hover:text-rr-orange rounded-xl"><Edit size={18}/></button>
                                                <button onClick={() => updateSettings({...settings, agreedLeaveDays: settings.agreedLeaveDays.filter(d=>d.id!==day.id)})} className="p-3 bg-white dark:bg-black/20 text-gray-400 hover:text-red-500 rounded-xl"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className={`w-full py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse'}`}
                                >
                                    {isSyncing ? <Loader2 className="animate-spin" size={24}/> : <Check size={24}/>}
                                    {isSyncing ? "Sincronizando..." : "Confirmar y Notificar a Planta"}
                                </button>
                            </div>
                        )}
                        
                        {/* SECCIÓN 2: DÍAS ACTIVOS */}
                        <div className="space-y-4">
                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 border-b dark:border-white/5 pb-2">Historial Confirmado (Vigente)</h5>
                            {activeDays.length === 0 ? (
                                <p className="text-center text-gray-300 text-xs font-bold uppercase py-10">No hay días sincronizados aún.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeDays
                                    .sort((a,b) => b.date.localeCompare(a.date))
                                    .map(day => (
                                        <div key={day.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={14} className="text-green-500"/>
                                                    <p className="font-black text-rr-dark dark:text-white uppercase text-sm tracking-tight">{day.description}</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-6">{formatDateDisplay(day.date)}</p>
                                            </div>
                                            <button onClick={() => updateSettings({...settings, agreedLeaveDays: settings.agreedLeaveDays.filter(d=>d.id!==day.id)})} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;

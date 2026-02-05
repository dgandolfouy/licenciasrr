
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, X, Check, Search, Edit, Save, CalendarPlus, AlertTriangle, ShieldCheck, Loader2, UserPlus, FileDown, Archive, History, ArrowLeft, Filter, Sparkles, CheckCircle2, Lock, ShieldAlert, KeyRound, PlusCircle, User as UserIcon, AlertCircle as AlertCircleIcon } from './icons/LucideIcons';
import { Employee, LeaveRecord, UserRole, User } from '../types';
import { formatDateDisplay, getUnifiedHistory, formatLeaveLabel, calculateWorkingDays, getLeaveDaysSummary } from '../utils/leaveCalculator';
import { generateEmployeeReport, generateGeneralReport } from '../services/pdfService';
import { useToast } from '../context/ToastContext';

// Subcomponente: Formulario de Empleado (Crear/Editar)
const EmployeeForm: React.FC<{ 
    initialData?: Employee | null, 
    summary: any,
    onSave: (data: any, adjustment: any) => Promise<void>, 
    onCancel: () => void,
    isSaving: boolean 
}> = ({ initialData, summary, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        lastName: initialData?.lastName || '',
        id: initialData?.id || '',
        hireDate: initialData?.hireDate || '',
        type: initialData?.type || 'Mensual',
        password: initialData?.password || ''
    });
    const [adjustment, setAdjustment] = useState({ days: '', reason: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adjustment.days && !adjustment.reason) {
            alert("Por favor, ingresa un motivo para el ajuste de saldo.");
            return;
        }
        await onSave(formData, adjustment);
    };

    return (
        <div className="bg-white dark:bg-black/20 p-8 rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                <h3 className="text-xl font-black uppercase text-rr-dark dark:text-white">
                    {initialData ? `Editar: ${initialData.lastName}` : 'Nuevo Colaborador'}
                </h3>
                {initialData && (
                    <div className="bg-rr-orange/10 text-rr-orange px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                        Saldo Actual: {summary.remainingDays} Días
                    </div>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Nombre</label>
                        <input required type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Apellido</label>
                        <input required type="text" value={formData.lastName} onChange={(e)=>setFormData({...formData, lastName: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Cédula (ID)</label>
                        <input required type="text" value={formData.id} onChange={(e)=>setFormData({...formData, id: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Fecha Ingreso</label>
                        <input required type="date" value={formData.hireDate} onChange={(e)=>setFormData({...formData, hireDate: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Tipo Contrato</label>
                        <select value={formData.type} onChange={(e)=>setFormData({...formData, type: e.target.value as any})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none">
                            <option value="Mensual">Mensual</option>
                            <option value="Jornalero">Jornalero</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Contraseña Inicial</label>
                        <input type="text" value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold border-none" placeholder="Opcional" />
                    </div>
                </div>

                {initialData && (
                    <div className="pt-6 border-t dark:border-white/10 mt-6">
                        <h4 className="text-sm font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
                           <PlusCircle size={16}/> Ajuste de Saldo Manual
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-gray-50 dark:bg-black/20 rounded-3xl">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Días a +/-</label>
                                <input 
                                    type="number" 
                                    step="1"
                                    value={adjustment.days} 
                                    onChange={(e)=>setAdjustment({...adjustment, days: e.target.value})} 
                                    className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl font-bold border-none" 
                                    placeholder="Ej: 5 o -2"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-4">Motivo del Ajuste</label>
                                <input 
                                    type="text" 
                                    value={adjustment.reason} 
                                    onChange={(e)=>setAdjustment({...adjustment, reason: e.target.value})} 
                                    className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl font-bold border-none" 
                                    placeholder="Saldo año anterior, compensación, etc."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 pt-8">
                    <button type="button" onClick={onCancel} className="flex-1 py-4 bg-gray-200 dark:bg-gray-700 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-rr-orange text-white rounded-2xl font-black uppercase text-xs flex justify-center items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

// Subcomponente: Detalle del Empleado (Historial + Reportes)
const EmployeeDetail: React.FC<{
    employee: Employee,
    summary: any,
    onBack: () => void,
    onEdit: () => void,
    onToggleActive: () => void,
    settings: any,
    user: User | null
}> = ({ employee, summary, onBack, onEdit, onToggleActive, settings, user }) => {
    const { deleteLeaveRecord, updateLeaveRecord, addManualLeave, isSaving } = useData();
    const { showToast } = useToast();
    const currentYear = new Date().getFullYear();
    const [dateRange, setDateRange] = useState({
        start: `${currentYear}-01-01`,
        end: `${currentYear}-12-31`
    });

    // Estado para los modales
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<any | null>(null);
    const [isAddingLeave, setIsAddingLeave] = useState(false);
    
    // Datos para los formularios de modales
    const [editData, setEditData] = useState({ start: '', end: '', type: 'Anual', notes: '', days: 0 });
    const [manualData, setManualData] = useState({ start: '', end: '', type: 'Anual' as any, notes: '', days: 0 });
    const [manualError, setManualError] = useState<string | null>(null);

    const history = useMemo(() => {
        let list = getUnifiedHistory(employee, settings.agreedLeaveDays);
        if (dateRange.start && dateRange.end) {
            list = list.filter(r => r.startDate >= dateRange.start && r.startDate <= dateRange.end);
        }
        return list;
    }, [employee, settings.agreedLeaveDays, dateRange]);

    useEffect(() => {
        if (editingRecord) {
            setEditData({
                start: editingRecord.startDate,
                end: editingRecord.endDate,
                type: editingRecord.type === 'Acordado' ? 'Anual' : editingRecord.type,
                notes: editingRecord.notes || '',
                days: editingRecord.days
            });
        }
    }, [editingRecord]);
    
    useEffect(() => {
        if (manualData.start && manualData.end) {
            setManualData(prev => ({ ...prev, days: calculateWorkingDays(manualData.start, manualData.end, []) }));
        }
    }, [manualData.start, manualData.end]);

    useEffect(() => {
        if (editData.start && editData.end) {
            setEditData(prev => ({ ...prev, days: calculateWorkingDays(editData.start, editData.end, []) }));
        }
    }, [editData.start, editData.end]);


    const handleConfirmDelete = async () => {
        if (deletingRecord) {
            await deleteLeaveRecord(employee.id, deletingRecord.id);
            setDeletingRecord(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        await updateLeaveRecord(employee.id, editingRecord.id, {
            startDate: editData.start,
            endDate: editData.end,
            type: editData.type as any,
            notes: editData.notes,
            days: editData.days
        });
        setEditingRecord(null);
    };

    const handleManualSubmit = async () => {
        setManualError(null);
        if (!manualData.start || !manualData.end || !manualData.notes.trim()) {
            setManualError("⚠️ Completa todos los campos: Fechas y Motivo."); return;
        }
        if (manualData.end < manualData.start) {
            setManualError("⚠️ La fecha de fin es anterior al inicio."); return;
        }
        if (manualData.days <= 0) {
            setManualError("⚠️ El rango seleccionado no contiene días laborables."); return;
        }

        if (manualData.type === 'Anual' && manualData.days > summary.remainingDays) {
            if (!confirm(`⚠️ ALERTA: El saldo es ${summary.remainingDays} y estás cargando ${manualData.days} días. El saldo quedará negativo. ¿Continuar?`)) return;
        }
        
        await addManualLeave(employee.id, {
            startDate: manualData.start,
            endDate: manualData.end,
            days: manualData.days,
            type: manualData.type,
            notes: manualData.notes,
            year: new Date(manualData.start + 'T00:00:00').getFullYear()
        });
        
        setIsAddingLeave(false);
        setManualData({ start: '', end: '', type: 'Anual', notes: '', days: 0 });
    };

    return (
        <div className="space-y-8 animate-slide-in relative">
            <div className="flex items-center gap-4 flex-wrap">
                <button onClick={onBack} className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200"><ArrowLeft size={20}/></button>
                <h3 className="text-2xl font-black uppercase text-rr-dark dark:text-white">{employee.lastName}, {employee.name}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${employee.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {employee.active ? 'Activo' : 'Archivado'}
                </span>
                <span className="bg-rr-orange/10 text-rr-orange px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    {summary.remainingDays} Días Disponibles
                </span>
            </div>

            {/* MODAL DE CARGA MANUAL */}
            {isAddingLeave && (
                <div className="fixed inset-0 bg-black/90 z-[120] backdrop-blur-md flex items-center justify-center p-6 animate-scale-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative border-4 border-gray-100 dark:border-gray-700">
                        <button onClick={() => setIsAddingLeave(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><X size={24}/></button>
                        <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase mb-8">Cargar Licencia Directa</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Inicio</label>
                                    <input type="date" value={manualData.start} onChange={e => setManualData({...manualData, start: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Fin</label>
                                    <input type="date" value={manualData.end} onChange={e => setManualData({...manualData, end: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Tipo</label>
                                    <select value={manualData.type} onChange={e => setManualData({...manualData, type: e.target.value as any})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none">
                                        <option value="Anual">Anual</option>
                                        <option value="Especial">Especial</option>
                                        <option value="Sin Goce">Sin Goce</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Días</label>
                                    <div className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl font-black text-center border-none">{manualData.days}</div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Motivo</label>
                                <input type="text" value={manualData.notes} onChange={e => setManualData({...manualData, notes: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" placeholder="Motivo o detalle" />
                            </div>
                            {manualError && <p className="text-xs text-red-500 font-bold text-center">{manualError}</p>}
                            <button onClick={handleManualSubmit} disabled={isSaving} className="w-full py-5 bg-rr-orange text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange-dark transition-all flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Confirmar Carga
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* MODAL DE EDICIÓN */}
            {editingRecord && (
                <div className="fixed inset-0 bg-black/90 z-[120] backdrop-blur-md flex items-center justify-center p-6 animate-scale-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative border-4 border-gray-100 dark:border-gray-700">
                        <button onClick={() => setEditingRecord(null)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><X size={24}/></button>
                        <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase mb-8">Editar Registro</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Inicio</label>
                                    <input type="date" value={editData.start} onChange={e => setEditData({...editData, start: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Fin</label>
                                    <input type="date" value={editData.end} onChange={e => setEditData({...editData, end: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Tipo</label>
                                    <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none">
                                        <option value="Anual">Anual</option>
                                        <option value="Especial">Especial</option>
                                        <option value="Sin Goce">Sin Goce</option>
                                        <option value="Adelantada">Adelantada</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Días</label>
                                    <div className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl font-black text-center border-none">
                                        {editData.days}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase ml-2 text-gray-400">Motivo</label>
                                <input type="text" value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" placeholder="Motivo o detalle" />
                            </div>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="w-full py-5 bg-rr-orange text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange-dark transition-all flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ELIMINACIÓN */}
            {deletingRecord && (
                <div className="fixed inset-0 bg-black/90 z-[120] backdrop-blur-md flex items-center justify-center p-6 animate-scale-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border-4 border-red-100 dark:border-red-900/30 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} className="text-red-600"/>
                        </div>
                        <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase mb-2">¿Eliminar Registro?</h3>
                        <p className="text-xs font-medium text-gray-500 mb-8 leading-relaxed">
                            Estás a punto de borrar una licencia del historial. Esta acción restaurará los días al saldo disponible del empleado.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setDeletingRecord(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmDelete} disabled={isSaving} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin"/> : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white dark:bg-black/20 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <h4 className="font-black uppercase flex items-center gap-2"><History size={20} className="text-rr-orange"/> Historial de Licencias</h4>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs font-bold w-24 outline-none" />
                            <span className="text-gray-400">-</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs font-bold w-24 outline-none" />
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {history.length === 0 ? (
                            <p className="text-center text-gray-400 text-xs py-10 uppercase">No hay registros en este rango</p>
                        ) : (
                            history.map(rec => {
                                const isAdjustment = rec.type === 'AjusteSaldo';
                                const adjustmentColor = rec.days > 0 ? 'text-green-500' : 'text-red-500';

                                return (
                                    <div key={rec.id} className={`p-4 rounded-2xl flex justify-between items-center group border transition-all ${rec.type === 'Acordado' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30' : 'bg-gray-50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10'}`}>
                                        <div>
                                            <p className="font-bold text-xs uppercase">{formatLeaveLabel(rec.type, rec.notes)}</p>
                                            <p className="text-[10px] text-gray-400">{isAdjustment ? `Registrado: ${formatDateDisplay(rec.startDate)}` : `${formatDateDisplay(rec.startDate)} - ${formatDateDisplay(rec.endDate)}`}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right mr-2">
                                                <span className={`font-black text-lg ${isAdjustment ? adjustmentColor : ''}`}>{isAdjustment && rec.days > 0 ? `+${rec.days}` : rec.days}d</span>
                                                <p className={`text-[9px] font-black uppercase ${rec.status === 'Aprobado' ? 'text-green-500' : 'text-yellow-500'}`}>{rec.status}</p>
                                            </div>
                                            
                                            {!isAdjustment && user?.id === '40069799' && (
                                                <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingRecord(rec); }} 
                                                    disabled={isSaving}
                                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/10 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm border border-gray-100 dark:border-white/5"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>

                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeletingRecord(rec); }} 
                                                    disabled={isSaving}
                                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/10 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all shadow-sm border border-gray-100 dark:border-white/5"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white dark:bg-black/20 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
                        <h4 className="font-black uppercase text-xs mb-4 text-gray-400">Acciones Rápidas</h4>
                        <div className="space-y-3">
                             <button onClick={() => setIsAddingLeave(true)} className="w-full py-4 bg-rr-orange text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-rr-orange-dark transition-colors">
                                <CalendarPlus size={16}/> Cargar Licencia
                            </button>
                            <button onClick={() => generateEmployeeReport(employee, settings.agreedLeaveDays, dateRange)} className="w-full py-4 bg-rr-dark text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors">
                                <FileDown size={16}/> Descargar PDF (Vista Actual)
                            </button>
                            <button onClick={onEdit} className="w-full py-4 bg-gray-100 dark:bg-white/10 text-rr-dark dark:text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-gray-200">
                                <Edit size={16}/> Editar Datos
                            </button>
                            <button onClick={onToggleActive} className={`w-full py-4 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 ${employee.active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}>
                                <Archive size={16}/> {employee.active ? 'Archivar Empleado' : 'Reactivar Empleado'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// VISTA PRINCIPAL
const SettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { user } = useAuth();
    const { settings, updateSettings, addAgreedDay, updateAgreedDay, applyAgreedDaysToAll, employees, addEmployee, updateEmployee, toggleEmployeeStatus, isSaving, initializeYearlyAgreedDays, resetDatabase } = useData();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'personal' | 'days'>('personal');
    const currentYear = new Date().getFullYear();
    
    // Estados para "Personal"
    const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
    const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'Jornalero' | 'Mensual'>('ALL');
    const [showArchived, setShowArchived] = useState(false);
    
    // Selección masiva
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDateRange, setBulkDateRange] = useState({ start: `${currentYear}-01-01`, end: `${currentYear}-12-31` });

    // Estados para "Days"
    const [newDayDate, setNewDayDate] = useState('');
    const [newDayDesc, setNewDayDesc] = useState('');
    const [editingDayId, setEditingDayId] = useState<string | null>(null);
    const [confirmSync, setConfirmSync] = useState(false);

    // --- ESTADOS DE SEGURIDAD (MODAL) ---
    const ADMIN_ID = '40069799';
    const [securityStep, setSecurityStep] = useState<'idle' | 'check_pin' | 'denied'>('idle');
    const [securityPin, setSecurityPin] = useState('');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Verificar si ya hay días inicializados para el año actual
    const isYearInitialized = useMemo(() => {
        return settings.agreedLeaveDays.some(d => d.date.startsWith(currentYear.toString()));
    }, [settings.agreedLeaveDays, currentYear]);

    // -- LÓGICA PERSONAL --
    
    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            const matchesSearch = (e.name + ' ' + e.lastName + ' ' + e.id).toLowerCase().includes(search.toLowerCase());
            const matchesType = filterType === 'ALL' || e.type === filterType;
            const matchesStatus = showArchived ? !e.active : e.active; 
            
            return matchesSearch && matchesType && matchesStatus;
        }).sort((a,b) => a.lastName.localeCompare(b.lastName));
    }, [employees, search, filterType, showArchived]);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredEmployees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmployees.map(e => e.id));
        }
    };

    const handleBulkPDF = () => {
        if (selectedIds.length === 0) {
            showToast("Selecciona al menos un empleado.", 'warning');
            return;
        }
        const selectedEmps = employees.filter(e => selectedIds.includes(e.id));
        generateGeneralReport(selectedEmps, bulkDateRange, settings.agreedLeaveDays);
    };

    const handleSaveEmployee = async (formData: any, adjustmentData: any) => {
        let updatedEmployeeData = { ...formData };
        
        if (viewMode === 'edit' && selectedEmpId) {
            const originalEmployee = employees.find(e => e.id === selectedEmpId);
            if (!originalEmployee) return;

            updatedEmployeeData = { ...originalEmployee, ...formData };
        
            if (adjustmentData.days && adjustmentData.reason) {
                const newAdjustmentRecord: LeaveRecord = {
                    id: `ADJ_${Date.now()}`,
                    type: 'AjusteSaldo',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    days: parseInt(adjustmentData.days, 10),
                    notes: adjustmentData.reason,
                    year: new Date().getFullYear(),
                };
                
                updatedEmployeeData.leaveRecords = [...(updatedEmployeeData.leaveRecords || []), newAdjustmentRecord];
                showToast(`Ajuste de ${adjustmentData.days} días registrado.`, 'success');
            }
        }
        
        if (viewMode === 'create') {
            await addEmployee(updatedEmployeeData);
        } else {
            await updateEmployee(updatedEmployeeData, selectedEmpId || undefined);
        }
        
        setViewMode('detail');
    };

    // -- LÓGICA DAYS --
    const pendingDays = settings.agreedLeaveDays.filter(d => !d.active);
    const activeDays = settings.agreedLeaveDays.filter(d => d.active);

    const handleAddNewDay = () => {
        if (!newDayDate || !newDayDesc.trim()) {
            showToast("Completa fecha y motivo.", 'warning');
            return;
        }
        addAgreedDay(newDayDate, newDayDesc);
        setNewDayDate(''); setNewDayDesc('');
    };

    const handleSync = async () => {
        if (!confirmSync) { setConfirmSync(true); setTimeout(() => setConfirmSync(false), 3000); return; }
        await applyAgreedDaysToAll();
        setConfirmSync(false);
    };

    const startEditingDay = (day: any) => { setEditingDayId(day.id); setNewDayDate(day.date); setNewDayDesc(day.description); };
    const saveDayEdit = () => {
        if (editingDayId) { updateAgreedDay(editingDayId, newDayDate, newDayDesc); setEditingDayId(null); setNewDayDate(''); setNewDayDesc(''); }
    };

    // --- MANEJO DE SEGURIDAD VISUAL ---

    const initiateRestrictedAction = (action: () => void) => {
        if (user?.id !== ADMIN_ID) {
            setSecurityStep('denied');
        } else {
            setPendingAction(() => action);
            setSecurityStep('check_pin');
            setSecurityPin('');
        }
    };

    const verifyPin = () => {
        if (securityPin === ADMIN_ID) {
            if (pendingAction) pendingAction();
            setSecurityStep('idle');
            setPendingAction(null);
        } else {
            showToast("PIN Incorrecto", 'error');
            setSecurityPin('');
        }
    };

    const handleResetHistory = () => {
        initiateRestrictedAction(() => {
            resetDatabase('history_only');
        });
    };

    const handleFullReset = () => {
        initiateRestrictedAction(() => {
            resetDatabase('full_reset');
        });
    };

    const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);
    const summary = useMemo(() => selectedEmployee ? getLeaveDaysSummary(selectedEmployee, currentYear, settings.agreedLeaveDays) : null, [selectedEmployee, currentYear, settings.agreedLeaveDays]);


    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-10 pb-20 px-4 sm:px-0 relative">
            
            {/* MODAL DE SEGURIDAD */}
            {securityStep !== 'idle' && (
                <div className="fixed inset-0 bg-black/90 z-[200] backdrop-blur-md flex items-center justify-center p-6 animate-scale-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative text-center border-4 border-gray-100 dark:border-gray-700">
                        <button onClick={() => setSecurityStep('idle')} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><X size={24}/></button>
                        
                        {securityStep === 'denied' && (
                            <div className="space-y-6">
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldAlert size={40} className="text-red-600"/>
                                </div>
                                <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase">Acceso Denegado</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                    Esta acción está restringida únicamente al Administrador Principal. Su intento ha sido registrado.
                                </p>
                                <button onClick={() => setSecurityStep('idle')} className="w-full py-4 bg-gray-200 dark:bg-gray-700 rounded-xl font-black uppercase text-xs">Entendido</button>
                            </div>
                        )}

                        {securityStep === 'check_pin' && (
                            <div className="space-y-6">
                                <div className="w-20 h-20 bg-rr-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <KeyRound size={40} className="text-rr-orange"/>
                                </div>
                                <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase">Verificar Identidad</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Ingrese su Cédula para confirmar</p>
                                
                                <input 
                                    type="password" 
                                    autoFocus
                                    value={securityPin} 
                                    onChange={(e) => setSecurityPin(e.target.value)} 
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl border-2 border-transparent focus:border-rr-orange outline-none transition-all"
                                    placeholder="••••••••"
                                />

                                <button 
                                    onClick={verifyPin} 
                                    disabled={!securityPin}
                                    className="w-full py-5 bg-rr-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange transition-all disabled:opacity-50"
                                >
                                    Confirmar Acceso
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-center mb-8">
                <div className="flex bg-white dark:bg-[#1d1d1b] p-1.5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
                    <button onClick={() => setActiveTab('personal')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'personal' ? 'bg-rr-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Base Personal RR</button>
                    <button onClick={() => setActiveTab('days')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'days' ? 'bg-rr-orange text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>Días Acordados</button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a1f2e] p-8 sm:p-12 rounded-[3.5rem] shadow-2xl border border-gray-100 dark:border-white/5 min-h-[600px]">
                
                {/* --- PESTAÑA PERSONAL --- */}
                {activeTab === 'personal' && (
                    <>
                        {viewMode === 'list' && (
                            <div className="space-y-6">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b dark:border-white/5 pb-6">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase text-rr-dark dark:text-white">Gestión de Personal</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{filteredEmployees.length} registros encontrados</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setViewMode('create')} className="px-6 py-3 bg-rr-dark text-white rounded-xl font-bold uppercase text-xs flex items-center gap-2 hover:bg-rr-orange transition-colors shadow-lg">
                                            <UserPlus size={16}/> Nuevo Empleado
                                        </button>
                                    </div>
                                </div>

                                {/* Barra de Herramientas y Filtros */}
                                <div className="flex flex-col xl:flex-row gap-4 bg-gray-50 dark:bg-black/20 p-4 rounded-[2rem]">
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl flex-1 shadow-sm">
                                        <Search className="text-gray-400" size={20}/>
                                        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent outline-none w-full text-sm font-bold text-rr-dark dark:text-white" />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
                                            {['ALL', 'Jornalero', 'Mensual'].map((t) => (
                                                <button key={t} onClick={() => setFilterType(t as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-colors ${filterType === t ? 'bg-rr-orange text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    {t === 'ALL' ? 'Todos' : t}
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowArchived(!showArchived)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-colors border ${showArchived ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-transparent text-gray-400'}`}>
                                            <Archive size={14}/> {showArchived ? 'Viendo Archivados' : 'Ver Archivados'}
                                        </button>
                                    </div>
                                </div>

                                {/* Acciones Masivas */}
                                {selectedIds.length > 0 && (
                                    <div className="flex items-center justify-between bg-rr-dark p-4 rounded-2xl text-white animate-fade-in">
                                        <span className="text-xs font-bold uppercase ml-2">{selectedIds.length} seleccionados</span>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                                                <span className="text-[9px] uppercase font-bold text-gray-400">Rango Reporte:</span>
                                                <input type="date" value={bulkDateRange.start} onChange={e => setBulkDateRange({...bulkDateRange, start: e.target.value})} className="bg-transparent text-[10px] font-bold outline-none w-20" />
                                                <input type="date" value={bulkDateRange.end} onChange={e => setBulkDateRange({...bulkDateRange, end: e.target.value})} className="bg-transparent text-[10px] font-bold outline-none w-20" />
                                            </div>
                                            <button onClick={handleBulkPDF} className="px-4 py-2 bg-rr-orange rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-white hover:text-rr-orange transition-colors">
                                                <FileDown size={14}/> PDF Masivo
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Listado */}
                                <div className="space-y-2">
                                    <div className="flex items-center px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <div className="w-10"><input type="checkbox" checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0} onChange={toggleSelectAll} className="rounded text-rr-orange focus:ring-0"/></div>
                                        <div className="flex-1">Nombre</div>
                                        <div className="w-32 hidden sm:block">Documento</div>
                                        <div className="w-32 hidden sm:block">Tipo</div>
                                        <div className="w-10"></div>
                                    </div>
                                    {filteredEmployees.map(emp => (
                                        <div key={emp.id} className={`group flex items-center p-4 rounded-2xl border transition-all ${selectedIds.includes(emp.id) ? 'bg-rr-orange/5 border-rr-orange' : 'bg-gray-50 dark:bg-black/20 border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                            <div className="w-10 flex justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(emp.id)} 
                                                    onChange={() => setSelectedIds(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}
                                                    className="rounded text-rr-orange focus:ring-0"
                                                />
                                            </div>
                                            <div className="flex-1 cursor-pointer" onClick={() => { setSelectedEmpId(emp.id); setViewMode('detail'); }}>
                                                <p className="font-bold text-rr-dark dark:text-white">{emp.lastName}, {emp.name}</p>
                                            </div>
                                            <div className="w-32 hidden sm:block text-xs font-medium text-gray-500">{emp.id}</div>
                                            <div className="w-32 hidden sm:block">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${emp.type === 'Jornalero' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{emp.type}</span>
                                            </div>
                                            <div className="w-10 flex justify-end">
                                                <button onClick={() => { setSelectedEmpId(emp.id); setViewMode('detail'); }} className="p-2 text-gray-400 hover:text-rr-orange"><Edit size={16}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {viewMode === 'create' && (
                            <EmployeeForm 
                                onSave={handleSaveEmployee} 
                                onCancel={() => setViewMode('list')} 
                                isSaving={isSaving}
                                summary={null}
                            />
                        )}

                        {viewMode === 'detail' && selectedEmployee && summary && (
                            <EmployeeDetail 
                                employee={selectedEmployee}
                                summary={summary}
                                onBack={() => { setViewMode('list'); setSelectedEmpId(null); }}
                                onEdit={() => setViewMode('edit')}
                                onToggleActive={() => toggleEmployeeStatus(selectedEmpId!, !selectedEmployee.active)}
                                settings={settings}
                                user={user}
                            />
                        )}

                        {viewMode === 'edit' && selectedEmployee && summary && (
                            <EmployeeForm 
                                initialData={selectedEmployee}
                                summary={summary}
                                onSave={handleSaveEmployee}
                                onCancel={() => setViewMode('detail')}
                                isSaving={isSaving}
                            />
                        )}
                    </>
                )}

                {/* --- PESTAÑA DIAS ACORDADOS --- */}
                {activeTab === 'days' && (
                    <div className="space-y-12">
                         <div className="flex flex-col sm:flex-row justify-start items-center gap-6 border-b dark:border-white/5 pb-6">
                            <h4 className="text-3xl font-black uppercase text-rr-dark dark:text-white tracking-tight">Días Acordados Planta</h4>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gestión Manual</p>
                        </div>

                        {/* Botón de Inicialización Automática */}
                        <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${isYearInitialized ? 'bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full text-white ${isYearInitialized ? 'bg-green-500' : 'bg-blue-500'}`}>
                                    {isYearInitialized ? <CheckCircle2 size={20}/> : <Sparkles size={20}/>}
                                </div>
                                <div>
                                    <p className={`font-black text-sm uppercase ${isYearInitialized ? 'text-green-700 dark:text-green-400' : 'text-blue-900 dark:text-blue-100'}`}>
                                        {isYearInitialized ? `Año ${currentYear} Inicializado` : 'Inicializar Año Estándar'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {isYearInitialized ? 'Los feriados estándar ya están cargados.' : 'Genera: 2 Sábados (Ene), 2 Carnaval, 2 Turismo.'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => !isYearInitialized && initializeYearlyAgreedDays(currentYear)} 
                                disabled={isSaving || isYearInitialized}
                                className={`px-6 py-3 rounded-xl font-bold uppercase text-[10px] transition-colors shadow-lg flex items-center gap-2 ${isYearInitialized ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-white/10' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : isYearInitialized ? 'Completado' : `Generar ${currentYear}`}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-10 bg-gray-50 dark:bg-black/40 rounded-[2.5rem] border dark:border-white/5 shadow-inner">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Fecha</label>
                                <input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} className="w-full p-5 bg-white dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl border-none font-bold shadow-sm focus:ring-2 focus:ring-rr-orange transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Motivo</label>
                                <input type="text" placeholder="Ej: Sábado Compensado" value={newDayDesc} onChange={(e) => setNewDayDesc(e.target.value)} className="w-full p-5 bg-white dark:bg-gray-800 text-rr-dark dark:text-white rounded-2xl border-none font-bold shadow-sm focus:ring-2 focus:ring-rr-orange transition-all" />
                            </div>
                            <div className="flex items-end gap-2">
                              {editingDayId ? (
                                <button onClick={saveDayEdit} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg"><Save size={18}/> Guardar</button>
                              ) : (
                                <button onClick={handleAddNewDay} className="w-full py-5 bg-rr-dark dark:bg-white text-white dark:text-rr-dark rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-rr-orange hover:text-white transition-all shadow-lg active:scale-95"><CalendarPlus size={22}/> Cargar</button>
                              )}
                            </div>
                        </div>
                        {/* Lista Pendientes */}
                        {pendingDays.length > 0 && (
                            <div className="animate-fade-in space-y-4">
                                <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-700/50">
                                    <AlertTriangle className="text-yellow-500" size={20} />
                                    <p className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">{pendingDays.length} días pendientes.</p>
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
                                <button onClick={handleSync} disabled={isSaving} className={`w-full py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : confirmSync ? 'bg-red-600 text-white animate-pulse' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}>
                                    {isSaving ? <Loader2 className="animate-spin" size={24}/> : confirmSync ? <AlertTriangle size={24}/> : <Check size={24}/>}
                                    {isSaving ? "Sincronizando..." : confirmSync ? "¿ESTÁS SEGURO? CLIC PARA CONFIRMAR" : "Confirmar y Notificar"}
                                </button>
                            </div>
                        )}
                        {/* Lista Activos */}
                        <div className="space-y-4">
                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 border-b dark:border-white/5 pb-2">Historial Confirmado</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeDays.sort((a,b) => b.date.localeCompare(a.date)).map(day => (
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
                        </div>
                    </div>
                )}

                {/* ZONA DE PELIGRO (RESET TOOLS) */}
                <div className="mt-20 border-t border-red-200 dark:border-red-900/30 pt-10">
                    <h4 className="text-sm font-black uppercase text-red-500 tracking-widest mb-6 flex items-center gap-2"><Lock size={16}/> Zona de Riesgo (Acceso Restringido)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onClick={handleResetHistory} disabled={isSaving} className="p-6 bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-3xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all text-left group">
                            <p className="font-black text-red-600 dark:text-red-400 uppercase text-xs mb-2">Limpiar Historial</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">Elimina todas las licencias y solicitudes de este año, pero <span className="font-bold">mantiene a los empleados</span>. Útil para reiniciar el año fiscal.</p>
                        </button>
                        <button onClick={handleFullReset} disabled={isSaving} className="p-6 bg-red-600 text-white rounded-3xl hover:bg-red-700 transition-all text-left shadow-lg active:scale-95">
                            <p className="font-black uppercase text-xs mb-2 flex items-center gap-2"><Trash2 size={14}/> Factory Reset</p>
                            <p className="text-[10px] text-red-100 leading-relaxed">Borra <span className="font-bold underline">ABSOLUTAMENTE TODO</span>: Empleados, historial y configuraciones. El sistema quedará vacío como el día 1.</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;

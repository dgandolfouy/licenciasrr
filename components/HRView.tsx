
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateDisplay, formatLeaveLabel, calculateWorkingDays } from '../utils/leaveCalculator';
import { CheckCircle2, Send, XCircle, Check, Loader2, Calendar, ChevronLeft, ChevronRight, AlertCircle, Mail, MessageSquare, Plus, Search, Save, X, PlusCircle } from './icons/LucideIcons';
import { useToast } from '../context/ToastContext';

// Subcomponente Heatmap para RRHH
const HRHeatmap: React.FC = () => {
    const { employees, settings } = useData();
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [viewDate]);

    const getIntensityColor = (day: Date) => {
        const isoDate = day.toISOString().split('T')[0];
        const isGlobalAgreed = settings.agreedLeaveDays.some(d => d.active && d.date === isoDate);

        if (isGlobalAgreed) {
            return 'bg-purple-600 text-white ring-2 ring-purple-300'; 
        }

        let count = 0;
        employees.forEach(emp => {
            (emp.leaveRecords || []).forEach(lic => {
                const start = lic.startDate;
                const end = lic.endDate;
                if (isoDate >= start && isoDate <= end) {
                    count++;
                }
            });
        });

        if (count === 0) return 'bg-gray-50 dark:bg-white/5 text-gray-400';
        if (count <= 2) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-black'; 
        if (count <= 4) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-black'; 
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-black'; 
    };

    const monthName = viewDate.toLocaleString('es-UY', { month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <Calendar className="text-rr-orange" size={20}/>
                    <h3 className="text-sm font-black uppercase text-rr-dark dark:text-white tracking-tighter">Saturación</h3>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl">
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"><ChevronLeft size={14}/></button>
                    <span className="text-[10px] font-black uppercase tracking-widest w-24 text-center">{monthName}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"><ChevronRight size={14}/></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-center text-[8px] font-black text-gray-300 uppercase py-1">{d}</div>)}
                {Array(daysInMonth[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => (
                    <div key={day.toISOString()} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[9px] transition-all cursor-default ${getIntensityColor(day)}`}>
                        {day.getDate()}
                    </div>
                ))}
            </div>
            <div className="flex gap-4 justify-center mt-3 pt-3 border-t dark:border-gray-700">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><span className="text-[8px] text-gray-400 uppercase">Baja</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div><span className="text-[8px] text-gray-400 uppercase">Media</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div><span className="text-[8px] text-gray-400 uppercase">Alta</span></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div><span className="text-[8px] text-gray-400 uppercase">Planta Cerrada</span></div>
            </div>
        </div>
    );
};

const HRView: React.FC = () => {
    const { employees, processRequest, publishNews, certifyLeaveRecord, addManualLeave, isSaving } = useData();
    const [newsContent, setNewsContent] = useState('');
    
    // Manual Entry State
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualSearch, setManualSearch] = useState('');
    const [manualForm, setManualForm] = useState({
        empId: '',
        start: '',
        end: '',
        type: 'Anual',
        notes: ''
    });

    // 1. Pending Requests
    const pendingRequests = useMemo(() => {
        const list: any[] = [];
        employees.forEach(emp => {
            (emp.requests || []).forEach(req => {
                if (req.status === 'Pendiente') {
                    list.push({ ...req, employeeName: `${emp.lastName}, ${emp.name}`, employeeId: emp.id });
                }
            });
        });
        return list;
    }, [employees]);

    // 2. Pending Certifications
    const pendingCertifications = useMemo(() => {
        const list: any[] = [];
        employees.forEach(emp => {
            (emp.leaveRecords || []).forEach(rec => {
                if (rec.type === 'Especial' && rec.justified === false) {
                     list.push({ ...rec, employeeName: `${emp.lastName}, ${emp.name}`, employeeId: emp.id });
                }
            });
        });
        return list;
    }, [employees]);

    const handleProcess = async (empId: string, reqId: string, status: 'Aprobado' | 'Rechazado') => {
        await processRequest(empId, reqId, status, status === 'Rechazado' ? 'Rechazado por RRHH' : undefined);
    };

    const handleCertify = async (empId: string, recId: string) => {
        await certifyLeaveRecord(empId, recId);
    };

    const handlePostNews = async () => {
        if (!newsContent.trim()) return;
        await publishNews(newsContent, 'RRHH', 'Comunicado');
        setNewsContent('');
    };

    const handleManualSubmit = async () => {
        if (!manualForm.empId || !manualForm.start || !manualForm.end) return;
        
        const days = calculateWorkingDays(manualForm.start, manualForm.end, []);
        const year = new Date(manualForm.start + 'T00:00:00').getFullYear();

        await addManualLeave(manualForm.empId, {
            startDate: manualForm.start,
            endDate: manualForm.end,
            type: manualForm.type as any,
            notes: manualForm.notes,
            days,
            year
        });
        
        setShowManualModal(false);
        setManualForm({ empId: '', start: '', end: '', type: 'Anual', notes: '' });
        setManualSearch('');
    };

    const filteredEmployees = employees.filter(e => 
        (e.name.toLowerCase() + ' ' + e.lastName.toLowerCase() + ' ' + e.id).includes(manualSearch.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-rr-dark p-4 rounded-2xl text-white shadow-xl">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-rr-dark dark:text-white uppercase tracking-tighter">Panel de Control</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gestión Operativa</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowManualModal(true)}
                    className="w-20 h-20 bg-rr-orange text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-rr-orange-dark hover:scale-110 transition-all active:scale-95"
                    title="Ingresar Licencia Manual"
                >
                    <Plus size={40} strokeWidth={3} />
                </button>
            </div>

            {/* MODAL DE INGRESO MANUAL */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative border-4 border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => setShowManualModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><X size={24}/></button>
                        
                        <h3 className="text-2xl font-black text-rr-dark dark:text-white uppercase mb-8 flex items-center gap-3">
                            <PlusCircle size={28} className="text-rr-orange"/>
                            Ingreso Manual
                        </h3>

                        <div className="space-y-6">
                            {/* Employee Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Buscar Colaborador</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-4 text-gray-300" size={18} />
                                    <input 
                                        type="text" 
                                        value={manualSearch}
                                        onChange={e => setManualSearch(e.target.value)}
                                        placeholder="Nombre, Apellido o Documento..."
                                        className="w-full pl-12 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-rr-orange text-rr-dark dark:text-white"
                                    />
                                </div>
                                {manualSearch && !manualForm.empId && (
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600 shadow-xl mt-2">
                                        {filteredEmployees.map(emp => (
                                            <button 
                                                key={emp.id}
                                                onClick={() => { setManualForm({...manualForm, empId: emp.id}); setManualSearch(`${emp.lastName}, ${emp.name}`); }}
                                                className="w-full text-left p-3 hover:bg-rr-orange/10 hover:text-rr-orange transition-colors text-xs font-bold uppercase flex justify-between"
                                            >
                                                <span>{emp.lastName}, {emp.name}</span>
                                                <span className="opacity-50">{emp.id}</span>
                                            </button>
                                        ))}
                                        {filteredEmployees.length === 0 && <p className="p-3 text-xs text-gray-400 text-center">No encontrado</p>}
                                    </div>
                                )}
                                {manualForm.empId && (
                                    <div className="flex items-center justify-between p-4 bg-rr-orange/10 rounded-2xl border border-rr-orange/20">
                                        <span className="font-black text-rr-orange uppercase text-xs">
                                            Seleccionado: {employees.find(e => e.id === manualForm.empId)?.lastName}, {employees.find(e => e.id === manualForm.empId)?.name}
                                        </span>
                                        <button onClick={() => { setManualForm({...manualForm, empId: ''}); setManualSearch(''); }} className="text-rr-orange hover:text-red-500"><X size={16}/></button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Desde</label>
                                    <input type="date" value={manualForm.start} onChange={e => setManualForm({...manualForm, start: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl font-bold border-none text-rr-dark dark:text-white" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Hasta</label>
                                    <input type="date" value={manualForm.end} onChange={e => setManualForm({...manualForm, end: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl font-bold border-none text-rr-dark dark:text-white" />
                                </div>
                            </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Tipo de Licencia</label>
                                <select value={manualForm.type} onChange={e => setManualForm({...manualForm, type: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl font-bold border-none text-rr-dark dark:text-white outline-none">
                                    <option value="Anual">Anual (Descuenta Saldo)</option>
                                    <option value="Especial">Especial (Estudio, Duelo, etc)</option>
                                    <option value="Sin Goce">Sin Goce de Sueldo</option>
                                    <option value="Adelantada">Adelantada</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Observaciones</label>
                                <input type="text" value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} placeholder="Motivo..." className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl font-bold border-none text-rr-dark dark:text-white" />
                            </div>

                            <button 
                                onClick={handleManualSubmit}
                                disabled={isSaving || !manualForm.empId || !manualForm.start || !manualForm.end}
                                className="w-full py-5 bg-rr-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} Registrar Licencia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. BANDEJA DE ENTRADA (Solicitudes) */}
            <div className="space-y-6">
                <h3 className="text-xl font-black uppercase text-rr-dark dark:text-white flex items-center gap-3">
                    <Mail className="text-rr-orange" /> Bandeja de Entrada
                    {pendingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">{pendingRequests.length}</span>}
                </h3>
                
                {pendingRequests.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <CheckCircle2 className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No hay solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rr-orange/10 rounded-full flex items-center justify-center text-rr-orange font-black text-lg">
                                        {req.days}d
                                    </div>
                                    <div>
                                        <p className="font-black text-rr-dark dark:text-white uppercase">{req.employeeName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {formatDateDisplay(req.startDate)} - {formatDateDisplay(req.endDate)} • {req.type}
                                        </p>
                                        <p className="text-sm text-gray-500 italic mt-1">"{req.reason}"</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={() => handleProcess(req.employeeId, req.id, 'Rechazado')}
                                        disabled={isSaving}
                                        className="flex-1 md:flex-none py-3 px-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-black uppercase text-[10px] hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={16}/> Rechazar
                                    </button>
                                    <button 
                                        onClick={() => handleProcess(req.employeeId, req.id, 'Aprobado')}
                                        disabled={isSaving}
                                        className="flex-1 md:flex-none py-3 px-6 bg-green-500 text-white rounded-xl font-black uppercase text-[10px] hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Check size={16}/> Aprobar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. CALENDARIO (Saturación) */}
            <div className="space-y-6">
                <HRHeatmap />
            </div>

            {/* 3. CERTIFICACIONES PENDIENTES */}
            <div className="space-y-6">
                 <h3 className="text-xl font-black uppercase text-rr-dark dark:text-white flex items-center gap-3">
                    <AlertCircle className="text-rr-orange" /> Certificaciones Pendientes
                    {pendingCertifications.length > 0 && <span className="bg-yellow-500 text-white text-[10px] px-2 py-1 rounded-full">{pendingCertifications.length}</span>}
                </h3>

                {pendingCertifications.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] p-10 text-center border border-gray-100 dark:border-gray-700">
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No hay comprobantes pendientes de validar</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingCertifications.map(rec => (
                            <div key={rec.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-l-4 border-l-yellow-400 border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="font-black text-rr-dark dark:text-white uppercase">{rec.employeeName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {formatDateDisplay(rec.startDate)} - {formatDateDisplay(rec.endDate)} • {formatLeaveLabel(rec.type, rec.notes)}
                                    </p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 font-bold flex items-center gap-1">
                                        <AlertCircle size={12}/> Pendiente de comprobante
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleCertify(rec.employeeId, rec.id)}
                                    disabled={isSaving}
                                    className="py-3 px-6 bg-rr-dark text-white rounded-xl font-black uppercase text-[10px] hover:bg-rr-orange transition-colors flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Certificar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. NOTICIAS DE PLANTA */}
            <div className="space-y-6">
                <h3 className="text-xl font-black uppercase text-rr-dark dark:text-white flex items-center gap-3">
                    <MessageSquare className="text-rr-orange" /> Noticias de Planta
                </h3>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-[2.5rem] relative group focus-within:ring-2 ring-rr-orange transition-all">
                    <textarea 
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        placeholder="Escribe un anuncio para toda la planta..."
                        className="w-full bg-transparent border-none outline-none text-rr-dark dark:text-white font-medium resize-none h-24 placeholder-gray-400"
                    />
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Se enviará a todos los colaboradores</span>
                        <button 
                            onClick={handlePostNews}
                            disabled={!newsContent.trim() || isSaving}
                            className="bg-rr-orange text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rr-orange-dark transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Publicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRView;

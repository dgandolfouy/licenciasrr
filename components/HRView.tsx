
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateDisplay, calculateWorkingDays, getLeaveDaysSummary, formatLeaveLabel } from '../utils/leaveCalculator';
import { Plus, X, CheckCircle2, Send, XCircle, Check, Loader2, Calendar, ChevronLeft, ChevronRight, Search, User, AlertCircle, Award } from './icons/LucideIcons';

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

    const monthName = viewDate.toLocaleString('es-UY', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700 mb-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="text-rr-orange" size={24}/>
                    <h3 className="text-lg font-black uppercase text-rr-dark dark:text-white tracking-tighter">Saturación Mensual</h3>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl">
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"><ChevronLeft size={16}/></button>
                    <span className="text-xs font-black uppercase tracking-widest w-32 text-center">{monthName}</span>
                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all"><ChevronRight size={16}/></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
                {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase py-2">{d}</div>)}
                {Array(daysInMonth[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => (
                    <div key={day.toISOString()} className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[10px] transition-all cursor-default ${getIntensityColor(day)}`}>
                        {day.getDate()}
                    </div>
                ))}
            </div>
            <div className="flex gap-4 justify-center mt-4 pt-4 border-t dark:border-gray-700">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[9px] text-gray-400 uppercase">Baja</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div><span className="text-[9px] text-gray-400 uppercase">Media</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[9px] text-gray-400 uppercase">Alta</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] text-gray-400 uppercase">Planta Cerrada</span></div>
            </div>
        </div>
    );
};

const HRView: React.FC = () => {
    const { user } = useAuth();
    const { employees, processRequest, publishNews, addManualLeave, isSaving, settings, certifyLeaveRecord } = useData();
    
    const [selectedRequestId, setSelectedRequestId] = useState<{empId: string, reqId: string} | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [newsText, setNewsText] = useState('');
    
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [manualData, setManualData] = useState({ empId: '', start: '', end: '', type: 'Anual' as any, notes: '', days: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [manualError, setManualError] = useState<string | null>(null);

    useEffect(() => {
        if (manualData.start && manualData.end) {
            const days = calculateWorkingDays(manualData.start, manualData.end, []);
            setManualData(prev => ({ ...prev, days }));
        }
        if (manualError) setManualError(null);
    }, [manualData.start, manualData.end, manualData.empId, manualData.notes]);

    useEffect(() => {
        if (selectedRequestId) {
            setAdminComment('');
        }
    }, [selectedRequestId]);

    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return employees.filter(e => 
            e.name.toLowerCase().includes(lower) || 
            e.lastName.toLowerCase().includes(lower) || 
            e.id.includes(lower)
        ).slice(0, 5);
    }, [searchTerm, employees]);

    const pendingRequests = useMemo(() => {
        return employees.flatMap(emp => 
            (emp.requests || [])
                .filter(r => r.status === 'Pendiente')
                .map(r => ({ ...r, employeeName: `${emp.lastName}, ${emp.name}`, employeeId: emp.id }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [employees]);

    // Licencias especiales que necesitan certificado (justified === false)
    const pendingCertifications = useMemo(() => {
        return employees.flatMap(emp => 
            (emp.leaveRecords || [])
                .filter(r => r.type === 'Especial' && r.justified === false)
                .map(r => ({ ...r, employeeName: `${emp.lastName}, ${emp.name}`, employeeId: emp.id }))
        ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [employees]);

    const selectedRequestData = useMemo(() => {
        if (!selectedRequestId) return null;
        const emp = employees.find(e => e.id === selectedRequestId.empId);
        const req = emp?.requests.find(r => r.id === selectedRequestId.reqId);
        return { emp, req };
    }, [selectedRequestId, employees]);

    const handleProcess = async (status: 'Aprobado' | 'Rechazado') => {
        if (!selectedRequestId) return;
        
        if (status === 'Rechazado' && !adminComment.trim()) {
            alert("⚠️ MOTIVO OBLIGATORIO: Debes escribir por qué rechazas la solicitud.");
            return;
        }

        await processRequest(selectedRequestId.empId, selectedRequestId.reqId, status, adminComment);
        setSelectedRequestId(null);
        setAdminComment('');
    };

    const handleManualSubmit = async () => {
        setManualError(null);

        if (!manualData.empId || !manualData.start || !manualData.end || !manualData.notes.trim()) {
            setManualError("⚠️ DATOS INCOMPLETOS: Selecciona empleado, fechas y escribe el motivo.");
            return;
        }
        if (manualData.end < manualData.start) {
            setManualError("⚠️ ERROR FECHAS: La fecha de fin es anterior al inicio.");
            return;
        }
        if (manualData.days <= 0) {
            setManualError("⚠️ RANGO INVÁLIDO: El cálculo resultó en 0 días.");
            return;
        }

        const targetEmployee = employees.find(e => e.id === manualData.empId);
        if (targetEmployee && manualData.type === 'Anual') {
            const summary = getLeaveDaysSummary(targetEmployee, new Date().getFullYear(), settings.agreedLeaveDays);
            if (manualData.days > summary.remainingDays) {
                const confirmMsg = `⚠️ ADVERTENCIA DE SALDO:\n\nEl colaborador ${targetEmployee.lastName} tiene ${summary.remainingDays} días disponibles.\nEstás intentando cargar ${manualData.days} días.\n\nEsto dejará el saldo en NEGATIVO (${summary.remainingDays - manualData.days}).\n\n¿Deseas continuar de todas formas?`;
                if (!confirm(confirmMsg)) return;
            }
        }
        
        await addManualLeave(manualData.empId, {
            startDate: manualData.start,
            endDate: manualData.end,
            days: manualData.days,
            type: manualData.type,
            notes: manualData.notes,
            year: new Date(manualData.start + 'T00:00:00').getFullYear()
        });
        
        setIsManualOpen(false);
        setManualData({ empId: '', start: '', end: '', type: 'Anual', notes: '', days: 0 });
        setSearchTerm('');
    };

    const selectEmployee = (emp: any) => {
        setManualData({ ...manualData, empId: emp.id });
        setSearchTerm(`${emp.lastName}, ${emp.name}`);
        setShowDropdown(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-24 relative">
            <button 
                onClick={() => { setIsManualOpen(true); setSearchTerm(''); setManualData({ empId: '', start: '', end: '', type: 'Anual', notes: '', days: 0 }); setManualError(null); }} 
                className="fixed bottom-10 right-10 w-20 h-20 bg-rr-dark text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[70] border-4 border-rr-orange"
            >
                <Plus size={40} />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-rr-dark p-10 rounded-[3.5rem] shadow-2xl relative border border-white/5">
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Noticias de Planta</h3>
                            <textarea 
                                value={newsText} 
                                onChange={(e) => setNewsText(e.target.value)} 
                                placeholder="Escribe el anuncio para toda la planta..." 
                                className="w-full p-8 bg-white/5 text-white rounded-[2rem] border-none outline-none font-bold min-h-[140px] text-lg transition-all focus:bg-white/10" 
                            />
                            <button 
                                disabled={isSaving}
                                onClick={async () => { 
                                    if(!newsText.trim()) return; 
                                    await publishNews(newsText, user?.name || 'RRHH'); 
                                    setNewsText(''); 
                                }} 
                                className="flex items-center gap-4 bg-rr-orange text-white px-10 py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange-dark transition-all shadow-xl disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Send size={24} />} Lanzar Comunicado
                            </button>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <HRHeatmap />
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase text-rr-dark dark:text-white px-6">Bandeja de Entrada</h3>
                {pendingRequests.length === 0 ? (
                    <div className="p-20 text-center bg-white dark:bg-gray-800/50 rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                        <CheckCircle2 size={64} className="mx-auto text-gray-200 mb-6" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No hay solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-xl border-2 border-transparent hover:border-rr-orange/20 transition-all">
                                <p className="text-xl font-black text-rr-dark dark:text-white uppercase mb-1">{req.employeeName}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{formatDateDisplay(req.startDate)} al {formatDateDisplay(req.endDate)} ({req.days} d.)</p>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl mb-6">
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 italic">"{req.reason}"</p>
                                </div>
                                <button 
                                    onClick={() => { setSelectedRequestId({empId: req.employeeId, reqId: req.id}); }} 
                                    className="w-full py-5 bg-rr-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rr-orange transition-all"
                                >
                                    Resolver Solicitud
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECCIÓN DE CERTIFICACIONES PENDIENTES */}
            <div className="space-y-6">
                <h3 className="text-2xl font-black uppercase text-rr-dark dark:text-white px-6">Certificaciones Pendientes</h3>
                {pendingCertifications.length === 0 ? (
                    <div className="p-10 text-center bg-white dark:bg-gray-800/30 rounded-[3rem]">
                        <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No hay comprobantes pendientes de validar</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                        {pendingCertifications.map(rec => (
                            <div key={rec.id} className="flex flex-col md:flex-row items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 last:border-0 gap-4">
                                <div>
                                    <p className="font-black text-rr-dark dark:text-white uppercase">{rec.employeeName}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{formatLeaveLabel(rec.type, rec.notes)} • {formatDateDisplay(rec.startDate)}</p>
                                    <p className="text-[10px] text-yellow-600 dark:text-yellow-500 font-bold mt-1 bg-yellow-50 dark:bg-yellow-900/20 inline-block px-2 py-1 rounded-lg">⚠ Descontando {rec.days} días de saldo</p>
                                </div>
                                <button 
                                    onClick={() => certifyLeaveRecord(rec.employeeId, rec.id)}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-green-600 transition-all shadow-md active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Award size={16}/>} Certificar (Restaurar Saldo)
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isManualOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative animate-scale-in">
                        <button onClick={() => setIsManualOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500"><X size={32}/></button>
                        <h2 className="text-3xl font-black uppercase text-rr-dark dark:text-white mb-8">Cargar Licencia Directa</h2>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 gap-3 focus-within:ring-2 ring-rr-orange transition-all">
                                    <Search className="text-gray-400" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar empleado (Nombre o CI)..." 
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="bg-transparent border-none outline-none w-full font-bold text-rr-dark dark:text-white placeholder-gray-400"
                                    />
                                </div>
                                {showDropdown && filteredEmployees.length > 0 && (
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden border dark:border-gray-600">
                                        {filteredEmployees.map(emp => (
                                            <button 
                                                key={emp.id} 
                                                onClick={() => selectEmployee(emp)}
                                                className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-600 last:border-0"
                                            >
                                                <div className="bg-rr-orange/10 p-2 rounded-full text-rr-orange"><User size={16}/></div>
                                                <div>
                                                    <p className="font-bold text-rr-dark dark:text-white text-sm">{emp.lastName}, {emp.name}</p>
                                                    <p className="text-[10px] text-gray-400">{emp.id}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

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
                            
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                     <select value={manualData.type} onChange={e => setManualData({...manualData, type: e.target.value as any})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none">
                                        <option value="Anual">Anual</option>
                                        <option value="Especial">Especial</option>
                                        <option value="Sin Goce">Sin Goce</option>
                                    </select>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-900 px-6 py-4 rounded-2xl font-black text-rr-dark dark:text-white flex flex-col items-center justify-center min-w-[100px]">
                                    <span className="text-2xl">{manualData.days}</span>
                                    <span className="text-[9px] text-gray-400 uppercase">Días Calc.</span>
                                </div>
                            </div>

                            <input type="text" value={manualData.notes} onChange={e => setManualData({...manualData, notes: e.target.value})} placeholder="Motivo / Detalle" className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                            
                            {manualError && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 animate-shake">
                                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{manualError}</p>
                                </div>
                            )}

                            <button 
                                onClick={handleManualSubmit} 
                                disabled={isSaving || !manualData.empId} 
                                className="w-full py-6 bg-rr-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : "Confirmar Carga Directa"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedRequestId && selectedRequestData.req && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative animate-scale-in">
                        <button onClick={() => setSelectedRequestId(null)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500"><X size={32}/></button>
                        <h2 className="text-2xl font-black uppercase text-rr-dark dark:text-white mb-2">Procesar: {selectedRequestData.emp?.lastName}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Solicitud {formatDateDisplay(selectedRequestData.req.startDate)}</p>
                        <textarea 
                            value={adminComment} 
                            onChange={(e) => setAdminComment(e.target.value)} 
                            placeholder="Escribe aquí el motivo del rechazo o un comentario..." 
                            className="w-full p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl font-bold min-h-[140px] mb-6 border focus:ring-2 focus:ring-rr-orange outline-none text-rr-dark dark:text-white" 
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleProcess('Rechazado')} 
                                disabled={isSaving} 
                                className="flex items-center justify-center gap-3 py-6 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all active:scale-95"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : <XCircle size={20}/>} Rechazar
                            </button>
                            <button 
                                onClick={() => handleProcess('Aprobado')} 
                                disabled={isSaving} 
                                className="flex items-center justify-center gap-3 py-6 bg-rr-orange text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange-dark transition-all active:scale-95"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : <Check size={20}/>} Aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRView;

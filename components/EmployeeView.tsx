
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLeaveDaysSummary, formatDateDisplay, calculateWorkingDays, getUnifiedHistory, formatLeaveLabel } from '../utils/leaveCalculator';
import { FileDown, Plus, X, Mail, Calendar, Loader2, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, Send } from './icons/LucideIcons';
import { generateEmployeeReport } from '../services/pdfService';
import { useToast } from '../context/ToastContext';

const DonutChart: React.FC<{ value: number; total: number }> = ({ value, total }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const size = isMobile ? 220 : 260;
    const strokeWidth = isMobile ? 16 : 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(value / (total || 1), 0.01), 1);
    const offset = circumference - (progress * circumference);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle className="text-gray-100 dark:text-gray-700" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} fill="transparent" stroke="currentColor" />
                <circle cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} fill="transparent" stroke={value < 0 ? "#ef4444" : "#ef7d00"} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="relative text-center">
                <span className={`${isMobile ? 'text-5xl' : 'text-7xl'} font-black text-rr-dark dark:text-white`}>{value}</span>
                <p className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest">Disponibles</p>
            </div>
        </div>
    );
};

const EmployeeView: React.FC = () => {
    const { user } = useAuth();
    const { getEmployeeById, settings, createRequest, markNewsAsRead, isSaving, employees } = useData(); // Agregamos 'employees' para calcular saturación
    const { showToast } = useToast();
    const employee = getEmployeeById(user?.id || '');
    
    const [isRequesting, setIsRequesting] = useState(false);
    const [openYears, setOpenYears] = useState<number[]>([new Date().getFullYear()]);
    
    const [range, setRange] = useState({start: '', end: ''});
    const [requestReason, setRequestReason] = useState('Licencia');
    const [requestType, setRequestType] = useState<'Anual' | 'Especial' | 'Sin Goce'>('Anual');
    
    const [formError, setFormError] = useState<string | null>(null);

    // --- CONFIGURACIÓN WHATSAPP GERENCIA ---
    const MANAGER_PHONE = '59899000000'; // REEMPLAZAR CON EL NUMERO REAL (formato internacional sin +)

    const daysRequested = useMemo(() => {
        if (!range.start || !range.end) return 0;
        return calculateWorkingDays(range.start, range.end, []);
    }, [range.start, range.end]);

    const unreadNews = useMemo(() => {
        if (!employee) return [];
        const readIds = employee.readNewsIds || [];
        return settings.newsHistory.filter(n => {
            const isForMe = !n.targetId || n.targetId === employee.id;
            const notRead = !readIds.includes(n.id);
            return isForMe && notRead;
        }).reverse();
    }, [employee, settings.newsHistory]);

    useEffect(() => {
        if(formError) setFormError(null);
    }, [range.start, range.end, isRequesting]);

    if (!employee) return null;
    const summary = getLeaveDaysSummary(employee, new Date().getFullYear(), settings.agreedLeaveDays);
    const activeNews = unreadNews[0];

    const groupedHistory = useMemo(() => {
        const unifiedList = getUnifiedHistory(employee, settings.agreedLeaveDays);
        const groups: Record<number, any[]> = {};
        unifiedList.forEach(item => {
            const y = item.year;
            if (!groups[y]) groups[y] = [];
            groups[y].push(item);
        });
        return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
    }, [employee, settings.agreedLeaveDays]);

    const toggleYear = (year: number) => {
        setOpenYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
    };

    const calculatePlantSaturation = (startDate: string, endDate: string) => {
        let maxAbsence = 0;
        let totalAbsenceDays = 0;
        
        const start = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        const current = new Date(start);

        while (current <= end) {
            const isoDate = current.toISOString().split('T')[0];
            const isWeekend = current.getDay() === 0 || current.getDay() === 6;
            
            if (!isWeekend) {
                let dailyCount = 0;
                // Verificar días acordados globales
                const isGlobal = settings.agreedLeaveDays.some(d => d.active && d.date === isoDate);
                
                if (isGlobal) {
                    dailyCount = employees.filter(e => e.type === 'Jornalero').length; // Asumimos toda la planta jornalera
                } else {
                    // Contar licencias individuales de Jornaleros
                    employees.filter(e => e.type === 'Jornalero').forEach(emp => {
                        (emp.leaveRecords || []).forEach(rec => {
                            if (isoDate >= rec.startDate && isoDate <= rec.endDate) dailyCount++;
                        });
                    });
                }
                
                if (dailyCount > maxAbsence) maxAbsence = dailyCount;
                totalAbsenceDays += dailyCount;
            }
            current.setDate(current.getDate() + 1);
        }

        return { maxAbsence, riskLevel: maxAbsence >= 5 ? 'CRÍTICO 🔴' : maxAbsence >= 3 ? 'ALTO 🟠' : 'BAJO 🟢' };
    };

    const submitRequest = async () => {
        try {
            setFormError(null);
            
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayLocal = `${year}-${month}-${day}`;

            if (!range.start || !range.end) {
                setFormError("⚠️ Debes seleccionar fecha de inicio y fin.");
                return;
            }
            if (range.end < range.start) {
                setFormError("⚠️ ERROR: La fecha de HASTA no puede ser anterior a la fecha DESDE.");
                return;
            }
            if (range.start < todayLocal) {
                setFormError("⚠️ NO PERMITIDO: No puedes solicitar días pasados.");
                return;
            }
            
            const calcDays = calculateWorkingDays(range.start, range.end, []);
            if (calcDays === 0) {
                 setFormError("⚠️ Rango inválido: 0 días laborales seleccionados.");
                 return;
            }

            const error = await createRequest(employee.id, { 
                startDate: range.start, 
                endDate: range.end, 
                days: 0, 
                reason: requestReason, 
                type: requestType 
            });
            
            if (error) {
                setFormError(`⚠️ ${error}`);
            } else {
                // --- LÓGICA DE NOTIFICACIÓN WHATSAPP JORNALERO ---
                if (employee.type === 'Jornalero') {
                    const saturation = calculatePlantSaturation(range.start, range.end);
                    const formatDate = (d: string) => d.split('-').reverse().join('/');
                    
                    const message = `*SOLICITUD DE LICENCIA - PLANTA* 🏭\n\n` +
                        `👤 *Colaborador:* ${employee.lastName}, ${employee.name}\n` +
                        `📅 *Fechas:* ${formatDate(range.start)} al ${formatDate(range.end)}\n` +
                        `⏳ *Días:* ${calcDays}\n` +
                        `📝 *Motivo:* ${requestReason}\n\n` +
                        `📊 *ANÁLISIS DE PLANTA EN ESTAS FECHAS:*\n` +
                        `Nivel de Ausentismo Previsto: *${saturation.riskLevel}*\n` +
                        `(Se detectaron hasta ${saturation.maxAbsence} jornaleros ausentes simultáneamente en este rango)\n\n` +
                        `-----------------------------------\n` +
                        `✅ *SI AUTORIZA:* Por favor reenvíe este mensaje al contacto de RRHH para su procesamiento.\n` +
                        `❌ *SI NO AUTORIZA:* Responda indicando el motivo para informarlo en el sistema.`;

                    const whatsappUrl = `https://wa.me/${MANAGER_PHONE}?text=${encodeURIComponent(message)}`;
                    
                    // Abrir WhatsApp en nueva pestaña
                    window.open(whatsappUrl, '_blank');
                    showToast("Solicitud creada. Se ha abierto WhatsApp para notificar a Gerencia.", 'success');
                } else {
                    showToast("Solicitud enviada a RRHH", 'success');
                }

                setIsRequesting(false);
                setRange({start: '', end: ''});
                setRequestReason('Licencia');
            }
        } catch (e: any) {
            showToast("Error inesperado: " + e.message, 'error');
        }
    };

    const handleReadCurrentNews = () => { if (activeNews) markNewsAsRead(employee.id, activeNews.id); };

    const projectedBalance = summary.remainingDays - daysRequested;
    const showBalanceWarning = requestType === 'Anual' && projectedBalance < 0 && daysRequested > 0;

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in relative pb-32">
            {activeNews && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative border-4 border-rr-orange animate-scale-in">
                        <div className="flex justify-center mb-6">
                             <div className="bg-rr-orange/10 p-5 rounded-full text-rr-orange animate-pulse">
                                <Mail size={40} />
                             </div>
                        </div>
                        <div className="space-y-4 text-center">
                            <h2 className="text-3xl font-black uppercase text-rr-dark dark:text-white tracking-tight">Nuevo Mensaje</h2>
                            <p className="text-xs font-bold text-rr-orange uppercase tracking-widest bg-rr-orange/5 inline-block px-3 py-1 rounded-lg">De: {activeNews.author}</p>
                            
                            <div className="p-8 bg-gray-50 dark:bg-black/20 rounded-[2rem] border border-gray-100 dark:border-white/5 mt-4">
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200 italic leading-relaxed">
                                    "{activeNews.content}"
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleReadCurrentNews} 
                            className="w-full mt-8 py-6 bg-rr-dark text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rr-orange transition-all active:scale-95 shadow-xl"
                        >
                            Marcar como Leído
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-rr-dark p-10 rounded-[3rem] text-white shadow-2xl">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-rr-orange mb-2">Colaborador</h4>
                <p className="text-3xl font-black uppercase">{employee.lastName}, {employee.name}</p>
                <p className="text-xs opacity-60">CI {employee.id} • Ingreso {formatDateDisplay(employee.hireDate)}</p>
            </div>

            <div className="flex flex-col items-center gap-10">
                <div className="bg-white dark:bg-gray-800 p-12 rounded-[4rem] shadow-xl border relative flex flex-col items-center w-full max-w-md">
                    <div className="absolute top-[-20px] bg-rr-dark text-white px-6 py-2 rounded-full z-10 font-black uppercase text-[10px] tracking-widest shadow-lg border-2 border-white dark:border-gray-800">
                        Saldo Período Actual
                    </div>
                    <DonutChart value={summary.remainingDays} total={summary.availablePool} />
                </div>

                <button 
                    onClick={() => generateEmployeeReport(employee, settings.agreedLeaveDays)} 
                    className="bg-rr-dark text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rr-orange transition-all active:scale-95 flex items-center gap-2"
                >
                    <FileDown size={20}/> Historial PDF
                </button>
            </div>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase px-4 tracking-widest">Movimientos del Legajo</h3>
                {groupedHistory.map(([year, records]) => {
                    const isOpen = openYears.includes(Number(year));
                    return (
                        <div key={year} className={`bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-lg overflow-hidden border-2 transition-all duration-300 ${isOpen ? 'border-rr-orange/30' : 'border-transparent'}`}>
                            <button onClick={() => toggleYear(Number(year))} className="w-full p-8 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <Calendar size={24} className={`text-gray-200 transition-colors ${isOpen ? 'text-rr-orange' : ''}`} />
                                    <span className="font-black text-2xl uppercase tracking-tighter">Período {year}</span>
                                </div>
                                <div className={`text-gray-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={24} />
                                </div>
                            </button>
                            
                            <div className={`transition-[max-height] duration-500 ease-in-out ${isOpen ? 'max-h-[600px] overflow-y-auto custom-scrollbar' : 'max-h-0 overflow-hidden'}`}>
                                <div className="p-8 pt-0 space-y-4">
                                    {records.map(r => {
                                        const isAgreed = r.type === 'Acordado';
                                        const isSaturday = isAgreed && r.notes?.toLowerCase().includes('sábado');
                                        let bgClass = 'bg-gray-50 border-transparent dark:bg-black/20';
                                        
                                        if (r.status === 'Rechazado') {
                                            bgClass = 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800';
                                        } else if (isAgreed) {
                                            // ESTILO MÁS CLARO PARA DÍAS ACORDADOS
                                            bgClass = 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800';
                                        }

                                        return (
                                        <div key={r.id} className={`p-6 rounded-2xl flex flex-col border transition-all ${bgClass}`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className={`font-black uppercase text-sm tracking-tight ${r.status === 'Rechazado' ? 'text-red-600' : isAgreed ? 'text-indigo-700 dark:text-indigo-300' : 'text-rr-dark dark:text-white'}`}>
                                                        {formatLeaveLabel(r.type, r.notes)}
                                                        {isSaturday && <span className="text-rr-orange ml-1">*</span>}
                                                        {r.status === 'Pendiente' ? ' (PENDIENTE)' : r.status === 'Rechazado' ? ' (RECHAZADA)' : ''}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                        {formatDateDisplay(r.startDate)} {r.startDate !== r.endDate && ` al ${formatDateDisplay(r.endDate)}`}
                                                    </p>
                                                    
                                                    {/* Indicador de Certificado */}
                                                    {r.type === 'Especial' && r.status === 'Aprobado' && (
                                                        <p className={`text-[10px] font-black uppercase mt-1 ${r.justified ? 'text-green-500' : 'text-yellow-600'}`}>
                                                            {r.justified ? '✓ Justificado (No Descuenta)' : '⚠ Falta Certificado (Descuenta Saldo)'}
                                                        </p>
                                                    )}

                                                    {r.type !== 'Acordado' && r.notes && (
                                                        <p className="text-[10px] text-gray-500 italic mt-1">"{r.notes}"</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-2xl font-black ${isAgreed ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>{r.days}</span>
                                                    <span className="text-[10px] font-black text-gray-400 ml-1">d.</span>
                                                </div>
                                            </div>
                                            {r.adminComment && (
                                                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/30 text-[11px] font-bold text-red-700 dark:text-red-400 italic">
                                                    Respuesta RRHH: {r.adminComment}
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                        <span className="text-rr-orange font-black text-lg mr-1">*</span>
                        <span className="font-bold uppercase text-gray-500">Sobre el descuento de Sábados:</span> Trabajamos bajo un régimen de semana inglesa donde los sábados se computan como laborables. El descuento de estos días específicos corresponde a los sábados que caerían dentro de tu licencia si la tomaras de forma corrida. Esta modalidad fraccionada permite mayor flexibilidad y resulta más beneficiosa para organizar tus descansos.
                    </p>
                </div>
            </div>

            <button onClick={() => setIsRequesting(true)} className="fixed bottom-10 right-10 w-20 h-20 bg-rr-orange text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"><Plus size={40} /></button>

            {isRequesting && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative animate-scale-in">
                        <button onClick={() => setIsRequesting(false)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500"><X size={32}/></button>
                        <h2 className="text-3xl font-black uppercase mb-10 text-rr-dark dark:text-white">Nueva Solicitud</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Desde</label>
                                    <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hasta</label>
                                    <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Tipo de Licencia</label>
                                <select value={requestType} onChange={(e) => setRequestType(e.target.value as any)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none">
                                    <option value="Anual">Anual (Descuenta saldo)</option>
                                    <option value="Especial">Especial (Estudio, Duelo, etc)</option>
                                    <option value="Sin Goce">Sin Goce de Sueldo</option>
                                </select>
                            </div>

                            {requestType === 'Especial' && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl flex gap-3 items-start animate-fade-in">
                                    <AlertTriangle className="text-yellow-600 dark:text-yellow-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-xs font-black text-yellow-700 dark:text-yellow-400 uppercase mb-1">Requiere Comprobante</p>
                                        <p className="text-[10px] text-yellow-600 dark:text-yellow-300 font-medium leading-relaxed">
                                            Recuerda presentar el certificado correspondiente a RRHH. Mientras no sea justificada, 
                                            esta licencia <span className="font-black">se descontará de tus días anuales</span>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <input type="text" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Motivo (Ej: Donación de sangre, Examen)" className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none" />
                            
                            {showBalanceWarning && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Saldo Insuficiente</p>
                                        <p className="text-[10px] text-red-500 mt-1">
                                            Estás solicitando {daysRequested} días. Quedarás con saldo {projectedBalance}. 
                                            Puedes enviarla igual para evaluación.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {formError && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 animate-shake">
                                    <AlertCircle className="text-red-500 shrink-0" size={20} />
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{formError}</p>
                                </div>
                            )}

                            <button 
                                onClick={submitRequest} 
                                disabled={isSaving} 
                                className="w-full py-6 bg-rr-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : employee.type === 'Jornalero' ? "Solicitar y Notificar a Gerencia" : "Enviar a RRHH"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeView;

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLeaveDaysSummary, formatDateDisplay } from '../utils/leaveCalculator';
import { FileDown, Plus, X, Mail, Loader2 } from './icons/LucideIcons';
import { generateEmployeeReport } from '../services/pdfService';

// --- COMPONENTE DE NOTIFICACIÓN PROPIO (TOAST) ---
// Esto reemplaza a las alertas feas del navegador sin instalar nada extra
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-slide-up border-2 ${type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-900 border-gray-800 text-white'}`} style={{ minWidth: '300px' }}>
        <div className={`w-3 h-3 rounded-full ${type === 'error' ? 'bg-red-500' : 'bg-green-400'}`}></div>
        <p className="font-bold text-sm flex-1">{message}</p>
        <button onClick={onClose} className="opacity-50 hover:opacity-100"><X size={16}/></button>
    </div>
);

const DonutChart: React.FC<{ value: number; total: number }> = ({ value, total }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const size = isMobile ? 200 : 240;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(value / (total || 1), 0.01), 1);
    const offset = circumference - (progress * circumference);
    const strokeColor = value < 0 ? "#ef4444" : "#ef7d00"; // Rojo si debe, Naranja si tiene saldo

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle className="text-gray-100 dark:text-gray-700" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} fill="transparent" stroke="currentColor" />
                <circle cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} fill="transparent" stroke={strokeColor} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="relative text-center">
                <span className={`block ${isMobile ? 'text-6xl' : 'text-7xl'} font-black text-rr-dark dark:text-white`}>{value}</span>
                <p className="text-[10px] font-black uppercase text-gray-400 mt-1 tracking-widest">Días Disp.</p>
            </div>
        </div>
    );
};

const EmployeeView: React.FC = () => {
    const { user } = useAuth();
    const { getEmployeeById, settings, createRequest, markNewsAsRead } = useData();
    const employee = getEmployeeById(user?.id || '');
    
    // Estados visuales
    const [isRequesting, setIsRequesting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    
    // Estado de la notificación (Toast)
    const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' });

    // Estado del formulario
    const [range, setRange] = useState({start: '', end: ''});
    const [requestReason, setRequestReason] = useState('');
    
    // Auto-cierre de notificaciones
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    const showToast = (msg: string, type: 'success' | 'error') => setToast({ show: true, msg, type });

    const unreadNews = useMemo(() => {
        if (!employee) return [];
        const readIds = employee.readNewsIds || [];
        return settings.newsHistory.filter(n => !readIds.includes(n.id)).reverse();
    }, [employee, settings.newsHistory]);

    const activeNews = unreadNews.length > 0 ? unreadNews[0] : null;

    if (!employee) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-rr-orange" size={40}/></div>;

    const summary = getLeaveDaysSummary(employee, selectedYear, settings.agreedLeaveDays);

    // Agrupación de historial (Ordenado y limpio)
    const groupedHistory = useMemo(() => {
        const groups: Record<number, any[]> = {};
        
        settings.agreedLeaveDays.filter(d => d.active).forEach(d => {
            const y = parseInt(d.date.split('-')[0]);
            if (!groups[y]) groups[y] = [];
            groups[y].push({ id: d.id, type: 'Feriado', startDate: d.date, endDate: d.date, days: 1, notes: d.description, status: 'Aprobado', isAgreed: true });
        });

        (employee.leaveRecords || []).forEach(r => {
            const y = r.year || new Date(r.startDate).getFullYear();
            if (!groups[y]) groups[y] = [];
            groups[y].push({ ...r, status: 'Aprobado' });
        });

        (employee.requests || []).forEach(req => {
            if (req.status === 'Aprobado') return;
            const y = new Date(req.startDate).getFullYear();
            if (!groups[y]) groups[y] = [];
            groups[y].push({ ...req, status: req.status });
        });

        return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
    }, [employee, settings.agreedLeaveDays]);

    const submitRequest = async () => {
        if (!range.start || !range.end) {
            showToast("⚠️ Selecciona fecha de inicio y fin", "error");
            return;
        }
        setIsSubmitting(true);
        const error = await createRequest(employee.id, { 
            startDate: range.start, 
            endDate: range.end, 
            days: 0, 
            reason: requestReason || "Licencia Anual", 
            type: 'Anual' 
        });
        
        setIsSubmitting(false);
        if (error) {
            showToast(error, "error");
        } else {
            showToast("✅ Solicitud enviada a RRHH", "success");
            setIsRequesting(false);
            setRange({start: '', end: ''});
            setRequestReason('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative pb-32 px-4">
            
            {/* NOTIFICACIÓN FLOTANTE */}
            {toast.show && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(prev => ({...prev, show: false}))} />}

            {/* MODAL NOTICIAS */}
            {activeNews && (
                <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 relative text-center space-y-6 border-t-8 border-rr-orange">
                        <Mail className="text-rr-orange mx-auto" size={48} />
                        <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-white">Comunicado</h2>
                        <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-xl">
                            <p className="text-lg font-bold text-gray-700 dark:text-gray-200 italic">"{activeNews.content}"</p>
                        </div>
                        <button onClick={() => markNewsAsRead(employee.id, activeNews.id)} className="w-full py-4 bg-rr-dark text-white rounded-xl font-black uppercase tracking-widest">Entendido</button>
                    </div>
                </div>
            )}

            {/* HEADER COLABORADOR */}
            <div className="bg-rr-dark p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden mt-4">
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rr-orange mb-1">Colaborador</h4>
                    <p className="text-2xl font-black uppercase">{employee.lastName}, {employee.name}</p>
                    <p className="text-xs text-gray-400 mt-1">CI {employee.id}</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10 text-white">
                    <Plus size={150} />
                </div>
            </div>

            {/* CHART SALDO */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Saldo {selectedYear}</h3>
                <DonutChart value={summary.remainingDays} total={summary.availablePool} />
                <button onClick={() => generateEmployeeReport(employee)} className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
                    <FileDown size={14}/> Descargar PDF
                </button>
            </div>

            {/* LISTA HISTORIAL */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase ml-2">Movimientos</h3>
                {groupedHistory.map(([year, records]) => (
                    <div key={year} className="space-y-3">
                        {selectedYear !== Number(year) && <div className="text-center py-2"><span className="text-xs font-bold text-gray-300 bg-gray-50 px-3 py-1 rounded-full">Año {year}</span></div>}
                        
                        {records.map((r, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <p className={`text-xs font-black uppercase mb-1 ${
                                        r.status === 'Rechazado' ? 'text-red-500' : 
                                        r.status === 'Pendiente' ? 'text-yellow-500' : 
                                        'text-gray-800 dark:text-white'
                                    }`}>
                                        {r.notes || r.type} <span className="opacity-50">({r.status})</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400">
                                        {formatDateDisplay(r.startDate)} {r.startDate !== r.endDate && ` al ${formatDateDisplay(r.endDate)}`}
                                    </p>
                                    {r.adminComment && <p className="text-[10px] text-red-400 mt-1 italic">Nota: {r.adminComment}</p>}
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-rr-dark dark:text-white block">{r.days}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Días</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* BOTÓN FLOTANTE */}
            <button onClick={() => setIsRequesting(true)} className="fixed bottom-8 right-6 w-14 h-14 bg-rr-orange text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 border-4 border-white dark:border-gray-800">
                <Plus size={28} strokeWidth={3} />
            </button>

            {/* MODAL NUEVA SOLICITUD */}
            {isRequesting && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-8 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase text-gray-800 dark:text-white">Nueva Solicitud</h2>
                            <button onClick={() => setIsRequesting(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Desde</label>
                                    <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Hasta</label>
                                    <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Motivo</label>
                                <input type="text" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Ej: Vacaciones" className="w-full bg-gray-50 dark:bg-gray-900" />
                            </div>

                            <button onClick={submitRequest} disabled={isSubmitting} className="w-full py-4 bg-rr-dark text-white rounded-xl font-black uppercase tracking-widest mt-4 flex justify-center items-center gap-2">
                                {isSubmitting ? <Loader2 className="animate-spin"/> : "Enviar Solicitud"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeView;


import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLeaveDaysSummary, formatDateDisplay } from '../utils/leaveCalculator';
import { FileDown, Plus, X, Mail, ShieldCheck, Calendar, Loader2, AlertCircle } from './icons/LucideIcons';
import { generateEmployeeReport } from '../services/pdfService';

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
    const { getEmployeeById, settings, createRequest, markNewsAsRead } = useData();
    const employee = getEmployeeById(user?.id || '');
    
    const [isRequesting, setIsRequesting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [expandedYear, setExpandedYear] = useState<number | null>(new Date().getFullYear());
    
    const [range, setRange] = useState({start: '', end: ''});
    const [requestReason, setRequestReason] = useState('Licencia');
    const [requestType, setRequestType] = useState<'Anual' | 'Especial' | 'Sin Goce'>('Anual');

    const unreadNews = useMemo(() => {
        if (!employee) return [];
        const readIds = employee.readNewsIds || [];
        return settings.newsHistory.filter(n => !readIds.includes(n.id)).reverse();
    }, [employee, settings.newsHistory]);

    if (!employee) return null;
    const summary = getLeaveDaysSummary(employee, selectedYear, settings.agreedLeaveDays);
    const activeNews = unreadNews[0];

    const groupedHistory = useMemo(() => {
        const groups: Record<number, any[]> = {};
        settings.agreedLeaveDays.filter(d => d.active).forEach(d => {
            const y = parseInt(d.date.split('-')[0]);
            if (!groups[y]) groups[y] = [];
            groups[y].push({ id: d.id, type: 'Acordado', startDate: d.date, endDate: d.date, days: 1, notes: d.description, status: 'Aprobado' });
        });
        (employee.leaveRecords || []).forEach(r => {
            const y = r.year || new Date(r.startDate + 'T00:00:00').getFullYear();
            if (!groups[y]) groups[y] = [];
            groups[y].push({ ...r, status: 'Aprobado' });
        });
        (employee.requests || []).forEach(req => {
            if (req.status === 'Aprobado') return;
            const y = new Date(req.startDate + 'T00:00:00').getFullYear();
            if (!groups[y]) groups[y] = [];
            groups[y].push({ ...req, status: req.status });
        });
        return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
    }, [employee.leaveRecords, employee.requests, settings.agreedLeaveDays]);

    const submitRequest = async () => {
        if (!range.start || !range.end) {
            alert("⚠️ Selecciona el rango de fechas.");
            return;
        }
        setIsSubmitting(true);
        const error = await createRequest(employee.id, { startDate: range.start, endDate: range.end, days: 0, reason: requestReason, type: requestType });
        setIsSubmitting(false);
        if (error) {
            alert(`⚠️ ERROR: ${error}`);
        } else {
            alert("✅ SOLICITUD ENVIADA: RRHH la analizará y te confirmaremos vía este sistema.");
            setIsRequesting(false);
            setRange({start: '', end: ''});
        }
    };

    const handleReadCurrentNews = () => { if (activeNews) markNewsAsRead(employee.id, activeNews.id); };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in relative pb-32">
            {activeNews && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border-4 border-rr-orange/20 text-center space-y-8 animate-scale-in">
                        <Mail className="text-rr-orange mx-auto" size={40} />
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black uppercase text-rr-dark dark:text-white">Comunicado</h2>
                            <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem]"><p className="text-lg font-bold text-gray-700 dark:text-gray-200 italic">"{activeNews.content}"</p></div>
                        </div>
                        <button onClick={handleReadCurrentNews} className="w-full py-6 bg-rr-dark text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rr-orange transition-all">Leído</button>
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
                    <div className="absolute top-[-20px] bg-rr-dark text-white px-6 py-2 rounded-full z-10 font-black uppercase text-[10px] tracking-widest shadow-lg">Saldo Período {selectedYear}</div>
                    <DonutChart value={summary.remainingDays} total={summary.availablePool} />
                </div>
                <button onClick={() => generateEmployeeReport(employee)} className="bg-rr-dark text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rr-orange transition-all"><FileDown className="inline mr-2" size={20}/> Historial PDF</button>
            </div>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase px-4">Movimientos del Legajo</h3>
                {groupedHistory.map(([year, records]) => (
                    <div key={year} className={`bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-lg overflow-hidden border-2 transition-all ${selectedYear === Number(year) ? 'border-rr-orange/30' : 'border-transparent'}`}>
                        <button onClick={() => setSelectedYear(Number(year))} className="w-full p-8 flex items-center justify-between"><span className="font-black text-2xl uppercase">Período {year}</span></button>
                        <div className="p-8 pt-0 space-y-4">
                            {records.map(r => (
                                <div key={r.id} className={`p-6 rounded-2xl flex flex-col border ${r.status === 'Rechazado' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-transparent'}`}>
                                    <div className="flex justify-between items-center">
                                        <div><p className={`font-black uppercase text-xs ${r.status === 'Rechazado' ? 'text-red-600' : ''}`}>{r.notes || r.type} ({r.status})</p><p className="text-[9px] text-gray-400">{formatDateDisplay(r.startDate)}</p></div>
                                        <div className="text-right"><span className="text-2xl font-black">{r.days}</span><span className="text-[10px] font-black text-gray-400 ml-1">d.</span></div>
                                    </div>
                                    {r.adminComment && <div className="mt-2 pt-2 border-t text-[11px] font-bold text-red-700 italic">RRHH: {r.adminComment}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={() => setIsRequesting(true)} className="fixed bottom-10 right-10 w-20 h-20 bg-rr-orange text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white"><Plus size={40} /></button>

            {isRequesting && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative animate-scale-in">
                        <button onClick={() => setIsRequesting(false)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500"><X size={32}/></button>
                        <h2 className="text-3xl font-black uppercase mb-10">Nueva Solicitud</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="p-4 bg-gray-50 rounded-2xl font-bold border" />
                                <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="p-4 bg-gray-50 rounded-2xl font-bold border" />
                            </div>
                            <input type="text" value={requestReason} onChange={(e) => setRequestReason(e.target.value)} placeholder="Motivo" className="w-full p-4 bg-gray-50 rounded-2xl font-bold border" />
                            <button onClick={submitRequest} disabled={isSubmitting} className="w-full py-6 bg-rr-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                                {isSubmitting ? <Loader2 className="animate-spin"/> : "Enviar a RRHH"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeView;

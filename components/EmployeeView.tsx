import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLeaveDaysSummary, formatDateDisplay } from '../utils/leaveCalculator';
import { FileDown, Plus, X, Mail, Loader2, Calendar } from './icons/LucideIcons';
import { generateEmployeeReport } from '../services/pdfService';
import toast from 'react-hot-toast';

// ... (Acá iría el componente DonutChart igual que antes) ...
// Para ahorrar espacio, usá el mismo DonutChart que ya tenés en tu archivo actual

const EmployeeView: React.FC = () => {
    const { user } = useAuth();
    const { employees, settings, createRequest } = useData();
    const employee = employees.find(e => e.id === user?.id);
    
    const [isRequesting, setIsRequesting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [range, setRange] = useState({start: '', end: ''});
    const [requestReason, setRequestReason] = useState('');
    const [requestType, setRequestType] = useState<'Anual' | 'Especial' | 'Sin Goce'>('Anual');

    // Validación de seguridad
    if (!employee) return <div className="p-10 text-center">Cargando tu perfil...</div>;

    const summary = getLeaveDaysSummary(employee, new Date().getFullYear(), settings.agreedLeaveDays);

    const submitRequest = async () => {
        if (!range.start || !range.end) {
            toast.error("Por favor selecciona cuándo sales y cuándo vuelves.");
            return;
        }

        setIsSubmitting(true);
        
        // Enviamos la solicitud (El cálculo de días lo hace el Context ahora)
        const success = await createRequest(employee.id, { 
            startDate: range.start, 
            endDate: range.end, 
            reason: requestReason || "Licencia Anual", 
            type: requestType 
        });
        
        setIsSubmitting(false);
        
        if (success) {
            toast.success("¡Listo! Solicitud enviada a RRHH.");
            setIsRequesting(false);
            setRange({start: '', end: ''});
            setRequestReason('');
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-32 px-4 space-y-6 animate-fade-in">
            {/* Header Cálido */}
            <div className="mt-6">
                <h1 className="text-3xl font-black uppercase text-rr-dark dark:text-white">
                    Hola, <span className="text-rr-orange">{employee.name}</span>
                </h1>
                <p className="text-gray-400 font-bold text-sm">Panel de autogestión</p>
            </div>

            {/* Tarjeta de Saldo */}
             <div className="bg-rr-dark p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-rr-orange mb-1">Días Disponibles</p>
                        <p className="text-6xl font-black">{summary.remainingDays}</p>
                    </div>
                    <button onClick={() => generateEmployeeReport(employee)} className="bg-white/10 p-4 rounded-xl hover:bg-white/20 transition-all">
                        <FileDown size={24} />
                    </button>
                </div>
            </div>

            {/* Botón Flotante para Pedir Licencia */}
            <button onClick={() => setIsRequesting(true)} className="fixed bottom-6 right-6 bg-rr-orange text-white px-6 py-4 rounded-full shadow-xl font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all z-50">
                <Plus size={20} /> Nueva Solicitud
            </button>

            {/* MODAL DE SOLICITUD (Mejorado) */}
            {isRequesting && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center animate-fade-in p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2rem] p-8 animate-slide-up space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black uppercase text-rr-dark dark:text-white">Pedir Licencia</h2>
                            <button onClick={() => setIsRequesting(false)}><X size={24} className="text-gray-400"/></button>
                        </div>

                        {/* Selector de Tipo */}
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                            {['Anual', 'Especial', 'Sin Goce'].map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setRequestType(type as any)}
                                    className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${requestType === type ? 'bg-white shadow-sm text-rr-orange' : 'text-gray-400'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Desde</label>
                                <input type="date" value={range.start} onChange={e => setRange({...range, start: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Hasta (inclusive)</label>
                                <input type="date" value={range.end} onChange={e => setRange({...range, end: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Motivo / Comentarios</label>
                            <input 
                                type="text" 
                                placeholder={requestType === 'Especial' ? "Ej: Estudio / Duelo / Matrimonio" : "Opcional..."}
                                value={requestReason} 
                                onChange={e => setRequestReason(e.target.value)} 
                                className="w-full bg-gray-50 dark:bg-gray-900 border-none p-4 rounded-xl font-bold" 
                            />
                        </div>

                        <button 
                            onClick={submitRequest} 
                            disabled={isSubmitting}
                            className="w-full bg-rr-dark text-white py-5 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Confirmar Solicitud"}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Aquí abajo iría el historial (podes usar el código del historial que ya tenías) */}
        </div>
    );
};

export default EmployeeView;

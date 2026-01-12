
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDateDisplay } from '../utils/leaveCalculator';
import { Plus, X, CheckCircle2, Send, XCircle, Check, Loader2 } from './icons/LucideIcons';

const HRView: React.FC = () => {
    const { user } = useAuth();
    const { employees, processRequest, publishNews, addManualLeave } = useData();
    
    const [selectedRequestId, setSelectedRequestId] = useState<{empId: string, reqId: string} | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [newsText, setNewsText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [manualData, setManualData] = useState({ empId: '', start: '', end: '', type: 'Anual' as any, notes: '', days: 1 });

    const pendingRequests = useMemo(() => {
        return employees.flatMap(emp => 
            (emp.requests || [])
                .filter(r => r.status === 'Pendiente')
                .map(r => ({ ...r, employeeName: `${emp.lastName}, ${emp.name}`, employeeId: emp.id }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
            alert("⚠️ MOTIVO OBLIGATORIO: Para rechazar debes escribir el porqué en el cuadro de texto.");
            return;
        }
        if (!confirm(`¿Estás seguro de ${status === 'Aprobado' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) return;

        setIsProcessing(true);
        try {
            await processRequest(selectedRequestId.empId, selectedRequestId.reqId, status, adminComment);
            alert(`✅ Movimiento registrado: Solicitud ${status}.`);
            setSelectedRequestId(null);
            setAdminComment('');
        } catch (e) {
            alert("Error al procesar. Intenta nuevamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualData.empId || !manualData.start || !manualData.end) {
            alert("⚠️ ERROR: Completa todos los campos antes de confirmar.");
            return;
        }
        setIsProcessing(true);
        try {
            await addManualLeave(manualData.empId, {
                startDate: manualData.start,
                endDate: manualData.end,
                days: manualData.days,
                type: manualData.type,
                notes: manualData.notes,
                year: new Date(manualData.start + 'T00:00:00').getFullYear()
            });
            alert("✅ ÉXITO: Licencia cargada directamente en el legajo.");
            setIsManualOpen(false);
            setManualData({ empId: '', start: '', end: '', type: 'Anual', notes: '', days: 1 });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-24 relative">
            <button onClick={() => setIsManualOpen(true)} className="fixed bottom-10 right-10 w-20 h-20 bg-rr-dark text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[70] border-4 border-rr-orange">
                <Plus size={40} />
            </button>

            <div className="bg-rr-dark p-10 rounded-[3.5rem] shadow-2xl relative border border-white/5">
                <div className="flex flex-col md:flex-row gap-10">
                    <div className="flex-1 space-y-4">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Noticias de Planta</h3>
                        <textarea value={newsText} onChange={(e) => setNewsText(e.target.value)} placeholder="Escribe el anuncio para toda la planta..." className="w-full p-8 bg-white/5 text-white rounded-[2rem] border-none outline-none font-bold min-h-[140px] text-lg transition-all focus:bg-white/10" />
                        <button onClick={async () => { if(!newsText) return; await publishNews(newsText, user?.name || 'RRHH'); setNewsText(''); alert("✅ NOTICIA PUBLICADA: Todos los empleados recibirán el aviso."); }} className="flex items-center gap-4 bg-rr-orange text-white px-10 py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rr-orange-dark transition-all shadow-xl">
                            <Send size={24} /> Lanzar Comunicado
                        </button>
                    </div>
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
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl mb-6"><p className="text-xs font-bold text-gray-600 dark:text-gray-300 italic">"{req.reason}"</p></div>
                                <button onClick={() => setSelectedRequestId({empId: req.employeeId, reqId: req.id})} className="w-full py-5 bg-rr-dark text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rr-orange transition-all">Resolver Solicitud</button>
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
                            <select value={manualData.empId} onChange={e => setManualData({...manualData, empId: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border-none text-rr-dark dark:text-white">
                                <option value="">Selecciona legajo...</option>
                                {employees.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(e => (
                                    <option key={e.id} value={e.id}>{e.lastName}, {e.name} ({e.id})</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={manualData.start} onChange={e => setManualData({...manualData, start: e.target.value})} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border" />
                                <input type="date" value={manualData.end} onChange={e => setManualData({...manualData, end: e.target.value})} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select value={manualData.type} onChange={e => setManualData({...manualData, type: e.target.value as any})} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold"><option value="Anual">Anual</option><option value="Especial">Especial</option></select>
                                <input type="number" value={manualData.days} onChange={e => setManualData({...manualData, days: parseInt(e.target.value)})} placeholder="Días" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border" />
                            </div>
                            <input type="text" value={manualData.notes} onChange={e => setManualData({...manualData, notes: e.target.value})} placeholder="Notas (Motivo)" className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl font-bold border" />
                            <button onClick={handleManualSubmit} disabled={isProcessing} className="w-full py-6 bg-rr-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                                {isProcessing ? <Loader2 className="animate-spin"/> : "Confirmar Carga Directa"}
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
                        <textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Escribe aquí el motivo del rechazo o un comentario..." className="w-full p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl font-bold min-h-[140px] mb-6 border focus:ring-2 focus:ring-rr-orange outline-none" />
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleProcess('Rechazado')} disabled={isProcessing} className="flex items-center justify-center gap-3 py-6 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest">
                                {isProcessing ? <Loader2 className="animate-spin"/> : <XCircle size={20}/>} Rechazar
                            </button>
                            <button onClick={() => handleProcess('Aprobado')} disabled={isProcessing} className="flex items-center justify-center gap-3 py-6 bg-rr-orange text-white rounded-2xl font-black uppercase text-xs tracking-widest">
                                {isProcessing ? <Loader2 className="animate-spin"/> : <Check size={20}/>} Aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRView;

import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { getLeaveDaysSummary } from '../utils/leaveCalculator';
import { Award, CalendarDays, TrendingUp, Users, ChevronLeft, ChevronRight, Filter } from './icons/LucideIcons';

type HeatmapFilter = 'Jornalero' | 'Mensual' | 'ALL';

const Heatmap: React.FC = () => {
    const { employees, settings } = useData();
    const [filter, setFilter] = useState<HeatmapFilter>('ALL');
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
        const filteredEmployees = employees.filter(emp => {
            if (filter === 'ALL') return true;
            return emp.type === filter;
        });

        const isoDate = day.toISOString().split('T')[0];
        
        // 1. Ver si es un Día Acordado Global Activo
        const isGlobalAgreed = settings.agreedLeaveDays.some(d => d.active && d.date === isoDate);

        let count = 0;

        if (isGlobalAgreed) {
            // Si es global acordado, TODA la planta (filtrada) está de licencia
            count = filteredEmployees.length;
        } else {
            // Sino, sumamos licencias individuales
            filteredEmployees.forEach(emp => {
                (emp.leaveRecords || []).forEach(lic => {
                    const start = lic.startDate;
                    const end = lic.endDate;
                    if (isoDate >= start && isoDate <= end) {
                        count++;
                    }
                });
            });
        }

        if (count === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
        if (count === 1) return 'bg-green-500 text-white'; 
        if (count === 2) return 'bg-lime-500 text-white'; 
        if (count === 3) return 'bg-yellow-400 text-rr-dark'; 
        if (count === 4) return 'bg-amber-500 text-white'; 
        if (count === 5) return 'bg-orange-500 text-white'; 
        if (count >= 6) return 'bg-red-600 text-white'; 
        return 'bg-gray-100';
    };

    const monthName = viewDate.toLocaleString('es-UY', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <CalendarDays className="text-rr-orange" size={28} />
                    <h3 className="text-xl font-black uppercase tracking-tight text-rr-dark dark:text-white">Mapa de Saturación</h3>
                </div>
                <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border dark:border-gray-700">
                    <button onClick={() => setFilter('Jornalero')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'Jornalero' ? 'bg-rr-orange text-white shadow-md' : 'text-gray-400'}`}>Jornaleros</button>
                    <button onClick={() => setFilter('Mensual')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'Mensual' ? 'bg-rr-orange text-white shadow-md' : 'text-gray-400'}`}>Mensuales</button>
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'ALL' ? 'bg-rr-orange text-white shadow-md' : 'text-gray-400'}`}>Todos</button>
                </div>
            </div>

            <div className="flex items-center justify-between px-4">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400"><ChevronLeft/></button>
                <span className="font-black uppercase tracking-widest text-sm text-rr-dark dark:text-white">{monthName}</span>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-400"><ChevronRight/></button>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {['D','L','M','X','J','V','S'].map(d => <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase py-2">{d}</div>)}
                {Array(daysInMonth[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {daysInMonth.map(day => (
                    <div key={day.toISOString()} className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-[10px] font-bold shadow-sm transition-all hover:scale-105 cursor-default ${getIntensityColor(day)}`}>
                        {day.getDate()}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-4 justify-center border-t dark:border-gray-800">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">1 Pers.</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-lime-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">2 Pers.</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">3 Pers.</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">4 Pers.</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">5 Pers.</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded-full"></div><span className="text-[8px] font-black uppercase text-gray-400">6+ Pers.</span></div>
            </div>
        </div>
    );
};

const StatsView: React.FC = () => {
    const { employees, settings } = useData();
    const currentYear = new Date().getFullYear();

    const stats = useMemo(() => {
        let totalGenerated = 0;
        let totalTaken = 0;
        let typeDistribution: Record<string, number> = { 'Anual': 0, 'Especial': 0, 'Adelantada': 0 };
        let monthlyDistribution = Array(12).fill(0);

        employees.forEach(emp => {
            const summary = getLeaveDaysSummary(emp, currentYear, settings.agreedLeaveDays);
            totalGenerated += summary.availablePool;
            totalTaken += (summary.takenDays + summary.fixedDeductions); // Sumamos ambos como días "no disponibles"

            // Licencias pedidas
            (emp.leaveRecords || []).forEach(r => {
                const date = new Date(r.startDate + 'T00:00:00');
                if (date.getFullYear() === currentYear) {
                    typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
                    monthlyDistribution[date.getMonth()] += r.days;
                }
            });

            // Días acordados también impactan en la distribución mensual
            settings.agreedLeaveDays.filter(d => d.active && d.date.startsWith(currentYear.toString())).forEach(d => {
                const date = new Date(d.date + 'T00:00:00');
                monthlyDistribution[date.getMonth()] += 1;
            });
        });

        const avgTaken = totalTaken / (employees.length || 1);
        return { totalGenerated, totalTaken, typeDistribution, monthlyDistribution, avgTaken };
    }, [employees, currentYear, settings.agreedLeaveDays]);

    const totalTypeDistribution = useMemo(() => 
        Object.values(stats.typeDistribution).reduce((acc: number, val: number) => acc + val, 0),
        [stats.typeDistribution]
    );

    return (
        <div className="space-y-12 pb-12 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-rr-dark dark:text-white uppercase tracking-tighter flex items-center gap-4">
                    <TrendingUp className="text-rr-orange" size={32} />
                    Insights Operativos
                </h2>
                <span className="px-6 py-2 bg-rr-orange text-white rounded-full font-black uppercase text-xs shadow-lg">Año Fiscal {currentYear}</span>
            </div>

            <Heatmap />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Días Empresa</p>
                    <p className="text-4xl font-black text-rr-dark dark:text-white">{stats.totalGenerated}</p>
                    <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-rr-orange w-full"></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Días Gozados / Acordados</p>
                    <p className="text-4xl font-black text-green-500">{stats.totalTaken}</p>
                    <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${(stats.totalTaken / (stats.totalGenerated || 1)) * 100}%` }}></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Promedio p/ Colaborador</p>
                    <p className="text-4xl font-black text-rr-dark dark:text-white">{stats.avgTaken.toFixed(1)}<span className="text-sm"> d</span></p>
                    <Users className="mt-4 text-gray-200" size={24} />
                </div>
                <div className="bg-rr-dark text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Saldo Global Pendiente</p>
                    <p className="text-4xl font-black text-rr-orange">{stats.totalGenerated - stats.totalTaken}</p>
                    <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-rr-orange" style={{ width: `${((stats.totalGenerated - stats.totalTaken) / (stats.totalGenerated || 1)) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-rr-dark dark:text-white uppercase mb-10 flex items-center gap-3">
                        <CalendarDays className="text-rr-orange" />
                        Picos de Licencia Mensual
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-2">
                        {stats.monthlyDistribution.map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl relative overflow-hidden h-full flex flex-col justify-end">
                                    <div 
                                        className={`w-full bg-rr-orange transition-all duration-1000 group-hover:bg-rr-orange-dark`}
                                        style={{ height: `${Math.max(5, (v / Math.max(...stats.monthlyDistribution, 1)) * 100)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[9px] font-black text-gray-400 uppercase">{['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-black text-rr-dark dark:text-white uppercase mb-10 flex items-center gap-3">
                        <Award className="text-rr-orange" />
                        Categorización de Licencias
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(stats.typeDistribution).map(([type, count]) => (
                            <div key={type} className="space-y-2">
                                <div className="flex justify-between text-xs font-black uppercase">
                                    <span className="text-gray-500">{type}</span>
                                    <span className="text-rr-dark dark:text-white">{count} registros</span>
                                </div>
                                <div className="h-3 bg-gray-50 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${type === 'Anual' ? 'bg-rr-orange' : type === 'Especial' ? 'bg-blue-500' : 'bg-red-500'}`}
                                        style={{ width: `${totalTypeDistribution > 0 ? ((count as number) / totalTypeDistribution) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsView;
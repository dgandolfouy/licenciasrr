
import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogOut, Settings, Sun, Moon, TrendingUp, Home, User, ShieldCheck, FileText, X, Mail, Clock, FolderOpen } from './icons/LucideIcons';
import { Logo } from './icons/Logo';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

// --- LAZY LOADING ---
const EmployeeView = lazy(() => import('./EmployeeView'));
const HRView = lazy(() => import('./HRView'));
const StatsView = lazy(() => import('./StatsView'));
const SettingsView = lazy(() => import('./SettingsView'));

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-rr-orange"></div>
    </div>
);

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { settings, clearUnreadNews, getEmployeeById } = useData();
    
    const [view, setView] = useState<'home' | 'stats' | 'settings' | 'doc-view' | 'notifications'>('home');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [selectedMode, setSelectedMode] = useState<'COLABORADOR' | 'ADMINISTRADOR' | null>(null);

    useEffect(() => {
        if (user) {
            if (user.role === UserRole.OPERARIO) {
                setSelectedMode('COLABORADOR');
            }
        }
    }, [user]);

    // Filtrar noticias: Mostrar solo si es Global (no targetId) o si es para MÍ (targetId == user.id)
    const myNotifications = useMemo(() => {
        if (!user) return [];
        return settings.newsHistory.filter(n => !n.targetId || n.targetId === user.id);
    }, [settings.newsHistory, user]);

    if (!user) return null;

    const employee = getEmployeeById(user.id);
    const hasUnread = employee?.hasUnreadNews;

    const capitalize = (str: string) => {
        if (!str) return 'Usuario';
        return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const renderDocReader = () => {
        const doc = settings.qualityDocs.find(d => d.id === selectedDocId);
        if (!doc) return null;
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-10 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-[3rem] shadow-2xl relative border dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <FileText className="text-rr-orange" size={24}/>
                            <h2 className="text-lg font-black uppercase tracking-tight text-rr-dark dark:text-white">{doc.title}</h2>
                        </div>
                        <button onClick={() => setView('home')} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-10 sm:p-14 overflow-y-auto custom-scrollbar font-medium leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                        {doc.content}
                    </div>
                </div>
            </div>
        );
    };

    const renderNotifications = () => {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-10 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-2xl relative border dark:border-gray-700 flex flex-col max-h-[80vh] overflow-hidden">
                    <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Mail className="text-rr-orange" size={24}/>
                            <h2 className="text-lg font-black uppercase tracking-tight text-rr-dark dark:text-white">Comunicados</h2>
                        </div>
                        <button onClick={() => { setView('home'); if (user.id) clearUnreadNews(user.id); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-8 overflow-y-auto space-y-4">
                        {myNotifications.length === 0 ? (
                            <p className="text-center text-gray-400 py-10">No hay mensajes anteriores</p>
                        ) : (
                            myNotifications.map(news => (
                                <div key={news.id} className="p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-rr-orange uppercase tracking-widest">{news.author}</span>
                                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10}/> {new Date(news.date).toLocaleDateString('es-UY')}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 font-bold italic">"{news.content}"</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRoleSelection = () => (
        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in text-center space-y-12">
            <Logo className="w-64 h-auto" />
            <div className="space-y-3">
                <h2 className="text-4xl sm:text-6xl font-black text-rr-dark dark:text-white tracking-tighter">
                    ¡Hola, <span className="text-rr-orange">{capitalize(user.name?.split(' ')[0] || 'Usuario')}</span>!
                </h2>
                <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-[10px] opacity-70">Selecciona el área de trabajo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-4">
                <button onClick={() => setSelectedMode('COLABORADOR')} className="group bg-white dark:bg-gray-800 p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-700 hover:border-rr-orange transition-all flex flex-col items-center gap-6">
                    <User size={56} className="text-gray-200 group-hover:text-rr-orange transition-colors" />
                    <h3 className="text-lg font-black uppercase text-rr-dark dark:text-white tracking-widest">Portal Personal</h3>
                </button>
                {(user.role === UserRole.ADMIN || user.role === UserRole.RRHH) && (
                    <button onClick={() => setSelectedMode('ADMINISTRADOR')} className="group bg-rr-dark p-12 rounded-[3rem] shadow-xl border border-transparent hover:border-rr-orange transition-all flex flex-col items-center gap-6 text-white">
                        <ShieldCheck size={56} className="text-gray-600 group-hover:text-rr-orange transition-colors" />
                        <h3 className="text-lg font-black uppercase tracking-widest">Administración</h3>
                    </button>
                )}
            </div>
        </div>
    );

    const renderMainView = () => {
        if (view === 'doc-view') return renderDocReader();
        if (view === 'notifications') return renderNotifications();
        if (view === 'stats') return <StatsView />;
        if (view === 'settings') return <SettingsView onBack={() => setView('home')} />;
        if (selectedMode === 'COLABORADOR') return <EmployeeView />;
        if (selectedMode === 'ADMINISTRADOR') return <HRView />;
        return renderRoleSelection();
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#111] transition-colors duration-300">
            <header className="bg-white/90 dark:bg-[#111]/90 backdrop-blur-lg shadow-sm sticky top-0 z-[60] border-b dark:border-gray-800">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('home'); if(user.role !== UserRole.OPERARIO) setSelectedMode(null); }}>
                        <Logo className="h-10 w-auto" />
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedMode && (
                            <>
                              <button onClick={() => setView('home')} className={`p-3 rounded-xl ${view === 'home' ? 'bg-rr-orange text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><Home size={20} /></button>
                              <button onClick={() => setView('notifications')} className={`p-3 rounded-xl relative ${view === 'notifications' ? 'bg-rr-orange text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <Mail size={20} />
                                {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                              </button>
                            </>
                        )}
                        {selectedMode === 'ADMINISTRADOR' && (
                            <>
                                <button onClick={() => setView('stats')} className={`p-3 rounded-xl ${view === 'stats' ? 'bg-rr-orange text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><TrendingUp size={20} /></button>
                                <button onClick={() => setView('settings')} className={`p-3 rounded-xl ${view === 'settings' ? 'bg-rr-orange text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><Settings size={20} /></button>
                            </>
                        )}
                        <button onClick={toggleTheme} className="p-3 text-gray-400 hover:text-rr-orange">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
                        <button onClick={logout} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><LogOut size={20} /></button>
                    </div>
                </div>
            </header>
            <main className="flex-grow container mx-auto px-6 py-10">
                <Suspense fallback={<LoadingSpinner />}>
                    {renderMainView()}
                </Suspense>
            </main>
            <footer className="bg-rr-dark py-12 relative overflow-hidden">
                <div className="container mx-auto px-6 flex flex-col items-center gap-6 relative z-10">
                    <a 
                        href="https://drive.google.com/drive/folders/1w-1-avC7Fw1qmDmL4ipulw6SvRr32qnP?usp=drive_link" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-4 rounded-2xl transition-all group border border-white/5 hover:border-rr-orange/50"
                    >
                        <div className="p-2 bg-rr-orange rounded-lg text-white group-hover:scale-110 transition-transform">
                            <FolderOpen size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-rr-orange transition-colors">Documentación Importante</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reglas de RRHH</p>
                        </div>
                    </a>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] text-center mt-4">RR Etiquetas Uruguay • 2026</p>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;

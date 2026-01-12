import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Employee, LeaveRecord, LeaveSettings, LeaveRequest } from '../types'; // Asegurate que types.ts tenga los nombres en inglés
import { INITIAL_QUALITY_DOCS } from '../constants';
import { calculateWorkingDays } from '../utils/leaveCalculator';
import { supabase } from '../services/supabaseClient';

interface DataContextType {
  employees: Employee[];
  settings: LeaveSettings;
  loading: boolean;
  getEmployeeById: (id: string) => Employee | undefined;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addManualLeave: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>;
  updateSettings: (settings: Partial<LeaveSettings>) => Promise<void>;
  processRequest: (employeeId: string, requestId: string, status: 'Aprobado' | 'Rechazado', comment?: string) => Promise<void>;
  createRequest: (employeeId: string, request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => Promise<string | null>;
  publishNews: (content: string, author: string, type?: 'Comunicado' | 'Sistema', targetId?: string) => Promise<void>;
  markNewsAsRead: (employeeId: string, newsId: string) => Promise<void>;
  clearUnreadNews: (employeeId: string) => Promise<void>;
  // Funciones placeholder para mantener compatibilidad si las usás en otro lado
  addLeaveRecord: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>;
  addAgreedDay: (date: string, description: string) => Promise<void>;
  updateAgreedDay: (id: string, date: string, description: string) => Promise<void>;
  applyAgreedDaysToAll: () => Promise<void>;
  initializeYearlyAgreedDays: (year: number) => Promise<void>;
  markRequestAsNotified: (employeeId: string, requestId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Configuración por defecto por si falla la carga inicial
const defaultSettings: LeaveSettings = { 
    agreedLeaveDays: [], 
    newsContent: '', 
    newsHistory: [], 
    qualityDocs: INITIAL_QUALITY_DOCS 
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<LeaveSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  // Usamos una referencia para saber si estamos escribiendo y evitar sobrescribir con el polling
  const isWriting = useRef(false);

  // 1. CARGA DE DATOS (Lectura desde Supabase)
  const fetchData = async () => {
    // Si el usuario está editando algo, pausamos la actualización automática un momento
    if (isWriting.current) return; 

    try {
      // Pedimos empleados
      const { data: eData, error: eError } = await supabase
          .from('employees')
          .select('*')
          .order('lastName', { ascending: true });

      // Pedimos configuración (Asumimos que la fila tiene id=1)
      const { data: sData, error: sError } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

      if (eError) console.error('Error fetching employees:', eError);
      
      if (eData) {
          // Mapeo simple: Supabase nos da los objetos JSON parseados automáticamente
          const mappedEmployees = eData.map((emp: any) => ({
              ...emp,
              // Aseguramos que los arrays existan para evitar errores de "map of undefined"
              leaveRecords: emp.leaveRecords || [],
              requests: emp.requests || [],
              readNewsIds: emp.readNewsIds || []
          }));
          setEmployees(mappedEmployees);
      }

      if (sData) {
          setSettings({
              ...defaultSettings,
              ...sData, // Sobrescribe defaults con lo que venga de la DB
              agreedLeaveDays: sData.agreedLeaveDays || [],
              newsHistory: sData.newsHistory || [],
              qualityDocs: sData.qualityDocs || INITIAL_QUALITY_DOCS
          });
      } else if (!sData && !loading) {
          // Si no existe la configuración en la DB, la creamos la primera vez
          console.log("Creando configuración inicial en Supabase...");
          await supabase.from('settings').insert([{ id: 1, ...defaultSettings }]);
      }

    } catch (e) { 
        console.error("Error crítico en fetchData:", e); 
    } finally { 
        setLoading(false); 
    }
  };

  // Efecto para polling (actualizar datos cada 5 segundos)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5 segundos
    return () => clearInterval(interval);
  }, []);


  // 2. FUNCIONES DE ESCRITURA (Enviar a Supabase)

  const updateEmployee: DataContextType['updateEmployee'] = async (updated) => {
    isWriting.current = true;
    // Actualización optimista (pantalla)
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    
    try {
        const { error } = await supabase
            .from('employees')
            .update({
                name: updated.name,
                lastName: updated.lastName,
                hireDate: updated.hireDate,
                birthDate: updated.birthDate,
                role: updated.role,
                leaveRecords: updated.leaveRecords, // JSONB
                requests: updated.requests,         // JSONB
                readNewsIds: updated.readNewsIds,   // JSONB
                hasUnreadNews: updated.hasUnreadNews
            })
            .eq('id', updated.id);

        if (error) throw error;
    } catch (error) {
        console.error("Error actualizando empleado:", error);
        // Aquí podrías revertir el estado si falla
    } finally {
        setTimeout(() => { isWriting.current = false; }, 1000);
    }
  };

  const createRequest: DataContextType['createRequest'] = async (employeeId, request) => {
    isWriting.current = true;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return "Legajo inválido";

    const workingDays = calculateWorkingDays(request.startDate, request.endDate, []);
    
    // Validación local
    const hasOverlap = (employee.requests || []).some(r => 
        r.status !== 'Rechazado' && 
        ((request.startDate >= r.startDate && request.startDate <= r.endDate) || 
         (request.endDate >= r.startDate && request.endDate <= r.endDate))
    );
    if (hasOverlap) return "Ya existe una solicitud para esas fechas.";

    const newReq: LeaveRequest = { 
        ...request, 
        id: `REQ_${Date.now()}`, 
        status: 'Pendiente', 
        days: workingDays, 
        createdAt: new Date().toISOString() 
    };

    const updatedRequests = [...(employee.requests || []), newReq];
    const updatedEmployee = { ...employee, requests: updatedRequests };

    // Actualizamos estado local
    setEmployees(prev => prev.map(e => e.id === employeeId ? updatedEmployee : e));

    try {
        // Actualizamos JSONB en Supabase
        const { error } = await supabase
            .from('employees')
            .update({ requests: updatedRequests })
            .eq('id', employeeId);
        
        if (error) throw error;
        return null; // Null significa éxito (sin error)
    } catch (err) {
        console.error(err);
        return "Error de conexión al guardar solicitud";
    } finally {
        setTimeout(() => { isWriting.current = false; }, 2000);
    }
  };

  const processRequest: DataContextType['processRequest'] = async (employeeId, requestId, status, comment) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    // Encontrar la solicitud
    const reqIndex = (employee.requests || []).findIndex(r => r.id === requestId);
    if (reqIndex === -1) return;

    const request = employee.requests[reqIndex];
    const updatedRequests = [...employee.requests];
    updatedRequests[reqIndex] = { ...request, status, adminComment: comment };

    let updatedRecords = [...(employee.leaveRecords || [])];
    
    // Si se aprueba, agregamos al historial oficial
    if (status === 'Aprobado') {
        const year = new Date(request.startDate).getFullYear();
        updatedRecords.push({ 
            id: `APP_${request.id}`, 
            type: request.type as any, 
            startDate: request.startDate, 
            endDate: request.endDate, 
            days: request.days, 
            notes: request.reason, 
            year: year 
        });
        await publishNews(`Solicitud APROBADA`, 'RRHH', 'Sistema', employeeId);
    } else {
        await publishNews(`Solicitud RECHAZADA: ${comment}`, 'RRHH', 'Sistema', employeeId);
    }

    const finalEmployee = { 
        ...employee, 
        requests: updatedRequests, 
        leaveRecords: updatedRecords,
        hasUnreadNews: true 
    };

    await updateEmployee(finalEmployee);
  };

  // --- Funciones auxiliares de configuración y noticias ---

  const publishNews = async (content: string, author: string, type = 'Comunicado', targetId?: string) => {
      const newItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author, type: type as any };
      const newHistory = [newItem, ...settings.newsHistory].slice(0, 50); // Mantenemos solo las ultimas 50
      
      const newSettings = { ...settings, newsHistory: newHistory };
      setSettings(newSettings);
      await supabase.from('settings').update({ newsHistory: newHistory }).eq('id', 1);

      if (targetId) {
          const emp = employees.find(e => e.id === targetId);
          if (emp) await updateEmployee({ ...emp, hasUnreadNews: true });
      }
  };

  const markNewsAsRead = async (empId: string, nId: string) => {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
          const reads = [...(emp.readNewsIds || [])];
          if (!reads.includes(nId)) {
              reads.push(nId);
              await updateEmployee({ ...emp, readNewsIds: reads });
          }
      }
  };

  const clearUnreadNews = async (id: string) => {
      const emp = employees.find(e => e.id === id);
      if (emp) await updateEmployee({ ...emp, hasUnreadNews: false });
  };

  const addManualLeave = async (employeeId: string, record: Omit<LeaveRecord, 'id'>) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    const newRecord = { ...record, id: `MAN_${Date.now()}` };
    const updatedRecords = [...(employee.leaveRecords || []), newRecord];
    await updateEmployee({ ...employee, leaveRecords: updatedRecords });
  };

  const updateSettings = async (s: Partial<LeaveSettings>) => {
      const merged = { ...settings, ...s };
      setSettings(merged);
      await supabase.from('settings').update(s).eq('id', 1);
  };

  // Funciones simplificadas o "placeholders" funcionales
  const getEmployeeById = (id: string) => employees.find(e => e.id === id);
  const deleteEmployee = async (id: string) => { 
      await supabase.from('employees').delete().eq('id', id); 
      fetchData(); 
  };
  
  // Implementaciones básicas para cumplir la interfaz
  const addLeaveRecord = async () => {}; 
  const addAgreedDay = async (date: string, description: string) => {
      const newDay = { id: `AG_${Date.now()}`, date, description, active: false };
      const updated = [newDay, ...settings.agreedLeaveDays];
      await updateSettings({ agreedLeaveDays: updated });
  };
  const updateAgreedDay = async (id: string, date: string, description: string) => {
      const updated = settings.agreedLeaveDays.map(d => d.id === id ? { ...d, date, description } : d);
      await updateSettings({ agreedLeaveDays: updated });
  };
  const applyAgreedDaysToAll = async () => {
    // Implementar si necesitás lógica masiva
  };
  const initializeYearlyAgreedDays = async (year: number) => {};
  const markRequestAsNotified = async () => {};

  return (
    <DataContext.Provider value={{ 
        employees, settings, loading, 
        getEmployeeById, updateEmployee, deleteEmployee, 
        addLeaveRecord, addManualLeave, updateSettings, 
        addAgreedDay, updateAgreedDay, applyAgreedDaysToAll, initializeYearlyAgreedDays, 
        processRequest, createRequest, markRequestAsNotified, 
        publishNews, markNewsAsRead, clearUnreadNews 
    }}>
      {loading ? <LoadingSpinner/> : children}
    </DataContext.Provider>
  );
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-rr-dark">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-rr-orange"></div>
    </div>
);

export const useData = () => { 
    const c = useContext(DataContext); 
    if (!c) throw new Error("useData must be used within DataProvider"); 
    return c; 
};

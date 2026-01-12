import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Employee, LeaveRecord, LeaveSettings, LeaveRequest, AgreedDay } from '../types';
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
  addAgreedDay: (date: string, description: string) => Promise<void>;
  updateAgreedDay: (id: string, date: string, description: string) => Promise<void>;
  applyAgreedDaysToAll: () => Promise<void>;
  initializeYearlyAgreedDays: (year: number) => Promise<void>;
  processRequest: (employeeId: string, requestId: string, status: 'Aprobado' | 'Rechazado', comment?: string) => Promise<void>;
  createRequest: (employeeId: string, request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => Promise<string | null>;
  markRequestAsNotified: (employeeId: string, requestId: string) => Promise<void>;
  publishNews: (content: string, author: string, type?: 'Comunicado' | 'Sistema', targetId?: string) => Promise<void>;
  markNewsAsRead: (employeeId: string, newsId: string) => Promise<void>;
  clearUnreadNews: (employeeId: string) => Promise<void>;
  addLeaveRecord: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>; // Agregado para compatibilidad
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Configuración segura por defecto (Evita que el diseño se rompa)
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
  const isWriting = useRef(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    if (isWriting.current) return;

    try {
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('*');
      
      const { data: settingsData, error: setError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (empError) console.error("Error empleados:", empError);
      
      if (employeesData) {
        // Formateo seguro: Si algo viene null, poneme un array vacío
        const safeEmployees = employeesData.map((e: any) => ({
            ...e,
            requests: e.requests || [],
            leaveRecords: e.leaveRecords || [],
            readNewsIds: e.readNewsIds || []
        }));
        setEmployees(safeEmployees);
      }

      if (settingsData) {
        setSettings({
            ...defaultSettings, // Mantiene defaults si faltan campos
            ...settingsData,
            agreedLeaveDays: settingsData.agreedLeaveDays || [],
            newsHistory: settingsData.newsHistory || []
        });
      } else if (!settingsData && !loading) {
         // Si no existe settings en la DB, lo creamos para la próxima
         await supabase.from('settings').insert([{ id: 1, ...defaultSettings }]);
      }

    } catch (error) {
      console.error("Error general:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Aumentamos el tiempo a 10s para dar respiro a la UI
    const interval = setInterval(fetchData, 10000); 
    return () => clearInterval(interval);
  }, []);

  // --- FUNCIONES (Logica Híbrida: Actualiza UI rapido + Guarda en DB) ---

  const updateEmployee = async (updated: Employee) => {
    isWriting.current = true;
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e)); // UI instantánea
    
    try {
        await supabase.from('employees').update({
            name: updated.name,
            lastName: updated.lastName,
            role: updated.role,
            hireDate: updated.hireDate,
            birthDate: updated.birthDate,
            leaveRecords: updated.leaveRecords,
            requests: updated.requests,
            readNewsIds: updated.readNewsIds,
            hasUnreadNews: updated.hasUnreadNews
        }).eq('id', updated.id);
    } catch (e) {
        console.error("Error guardando empleado:", e);
    } finally {
        setTimeout(() => isWriting.current = false, 2000);
    }
  };

  const createRequest = async (employeeId: string, request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => {
    isWriting.current = true;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return "Empleado no encontrado";

    const workingDays = calculateWorkingDays(request.startDate, request.endDate, settings.agreedLeaveDays || []); // Usamos los días acordados correctos

    // Validación duplicados
    const hasOverlap = (employee.requests || []).some(r => 
        r.status !== 'Rechazado' && 
        ((request.startDate >= r.startDate && request.startDate <= r.endDate) || 
         (request.endDate >= r.startDate && request.endDate <= r.endDate))
    );
    if (hasOverlap) return "Ya existe solicitud en estas fechas";

    const newReq: LeaveRequest = { 
        ...request, 
        id: `REQ_${Date.now()}`, 
        status: 'Pendiente', 
        days: workingDays, 
        createdAt: new Date().toISOString() 
    };

    const updatedRequests = [...(employee.requests || []), newReq];
    const updatedEmployee = { ...employee, requests: updatedRequests };

    // 1. UI update
    setEmployees(prev => prev.map(e => e.id === employeeId ? updatedEmployee : e));

    // 2. DB update
    try {
        await supabase.from('employees').update({ requests: updatedRequests }).eq('id', employeeId);
        return null;
    } catch (e) {
        return "Error de conexión";
    } finally {
        setTimeout(() => isWriting.current = false, 2000);
    }
  };

  const markNewsAsRead = async (empId: string, nId: string) => {
    isWriting.current = true;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const currentReads = emp.readNewsIds || [];
    if (currentReads.includes(nId)) return; // Ya estaba leída, no hacer nada

    const newReads = [...currentReads, nId];
    const updatedEmp = { ...emp, readNewsIds: newReads };

    setEmployees(prev => prev.map(e => e.id === empId ? updatedEmp : e));
    
    // Forzamos la escritura en Supabase
    await supabase.from('employees').update({ readNewsIds: newReads }).eq('id', empId);
    
    setTimeout(() => isWriting.current = false, 1000);
  };

  // --- RESTO DE FUNCIONES (Simplificadas para funcionar) ---

  const getEmployeeById = (id: string) => employees.find(e => e.id === id);
  
  const updateSettings = async (newSettings: Partial<LeaveSettings>) => {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      await supabase.from('settings').update(newSettings).eq('id', 1);
  };

  const addAgreedDay = async (date: string, description: string) => {
      const newDay: AgreedDay = { id: `AG_${Date.now()}`, date, description, active: true };
      const updatedDays = [newDay, ...(settings.agreedLeaveDays || [])];
      await updateSettings({ agreedLeaveDays: updatedDays });
  };

  // Funciones placeholder (No críticas por ahora)
  const deleteEmployee = async (id: string) => {}; 
  const addManualLeave = async () => {};
  const updateAgreedDay = async () => {};
  const applyAgreedDaysToAll = async () => {};
  const initializeYearlyAgreedDays = async () => {};
  const markRequestAsNotified = async () => {};
  const clearUnreadNews = async () => {};
  const addLeaveRecord = async () => {};
  const processRequest = async (employeeId: string, requestId: string, status: string, comment?: string) => {
      // Implementación básica si sos Admin y necesitás aprobar
      const emp = employees.find(e => e.id === employeeId);
      if(!emp) return;
      const updatedReqs = emp.requests.map(r => r.id === requestId ? {...r, status: status as any, adminComment: comment} : r);
      await updateEmployee({...emp, requests: updatedReqs});
  };

  const publishNews = async (content: string, author: string, type = 'Comunicado', targetId?: string) => {
     // Implementación básica para crear noticia
     const newItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author, type: type as any };
     const newHistory = [newItem, ...(settings.newsHistory || [])];
     await updateSettings({ newsHistory: newHistory });
  };

  return (
    <DataContext.Provider value={{ 
        employees, settings, loading, 
        getEmployeeById, updateEmployee, deleteEmployee, 
        addManualLeave, updateSettings, addAgreedDay, updateAgreedDay, 
        applyAgreedDaysToAll, initializeYearlyAgreedDays, processRequest, 
        createRequest, markRequestAsNotified, publishNews, markNewsAsRead, 
        clearUnreadNews, addLeaveRecord 
    }}>
      {loading ? (
          <div className="flex items-center justify-center h-screen text-xl">Cargando datos...</div>
      ) : children}
    </DataContext.Provider>
  );
};

export const useData = () => { 
    const c = useContext(DataContext); 
    if (!c) throw new Error("useData must be used within DataProvider"); 
    return c; 
};

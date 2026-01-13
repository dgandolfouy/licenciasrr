import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { calculateWorkingDays } from '../utils/leaveCalculator';
import toast from 'react-hot-toast'; // Usamos las notificaciones lindas

// Definimos tipos básicos acá para evitar errores si no están en types.ts
export interface Employee {
  id: string;
  name: string;
  lastName: string;
  hireDate: string;
  active: boolean; // NUEVO CAMPO
  leaveRecords: any[];
  requests: any[];
  readNewsIds: string[];
  role: 'admin' | 'user';
}

interface DataContextType {
  employees: Employee[];
  settings: any;
  loading: boolean;
  refreshData: () => Promise<void>; // Para forzar actualización
  updateEmployee: (emp: Employee) => Promise<void>;
  createRequest: (empId: string, request: any) => Promise<boolean>;
  processRequest: (empId: string, reqId: string, status: 'Aprobado' | 'Rechazado', comment: string) => Promise<void>;
  addManualLeave: (empId: string, leaveData: any) => Promise<void>;
  toggleEmployeeActive: (empId: string, isActive: boolean) => Promise<void>;
  addNewEmployee: (empData: any) => Promise<void>;
  publishNews: (content: string) => Promise<void>;
  updateSettings: (newSettings: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<any>({ agreedLeaveDays: [], newsHistory: [] });
  const [loading, setLoading] = useState(true);

  // FUNCIÓN MAESTRA DE CARGA
  const refreshData = async () => {
    try {
      const { data: eData } = await supabase.from('employees').select('*').order('lastName');
      const { data: sData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

      if (eData) setEmployees(eData);
      if (sData) setSettings(sData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Auto-refresco cada 10 segundos por seguridad
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. CREAR SOLICITUD (Empleado)
  const createRequest = async (empId: string, request: any) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return false;

    // Calculamos días automáticamente
    const days = calculateWorkingDays(request.startDate, request.endDate, settings.agreedLeaveDays);
    
    const newReq = {
      ...request,
      id: `REQ_${Date.now()}`,
      days: days, // Días calculados por el sistema
      status: 'Pendiente',
      createdAt: new Date().toISOString()
    };

    const updatedRequests = [...(emp.requests || []), newReq];

    try {
      const { error } = await supabase
        .from('employees')
        .update({ requests: updatedRequests })
        .eq('id', empId);

      if (error) throw error;
      
      // Actualizamos localmente rápido
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, requests: updatedRequests } : e));
      return true;
    } catch (e) {
      toast.error("Error de conexión");
      return false;
    }
  };

  // 2. PROCESAR SOLICITUD (Admin: Aprobar/Rechazar)
  const processRequest = async (empId: string, reqId: string, status: 'Aprobado' | 'Rechazado', comment: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    // Buscamos la solicitud
    const updatedRequests = (emp.requests || []).map(r => 
      r.id === reqId ? { ...r, status, adminComment: comment } : r
    );

    // Si se aprueba, la movemos al historial oficial (leaveRecords)
    let updatedRecords = [...(emp.leaveRecords || [])];
    if (status === 'Aprobado') {
      const req = emp.requests.find(r => r.id === reqId);
      if (req) {
        updatedRecords.push({
          id: `APP_${req.id}`,
          type: req.type,
          startDate: req.startDate,
          endDate: req.endDate,
          days: req.days,
          notes: req.reason,
          year: new Date(req.startDate).getFullYear()
        });
      }
    }

    try {
      await supabase
        .from('employees')
        .update({ requests: updatedRequests, leaveRecords: updatedRecords })
        .eq('id', empId);
      
      toast.success(`Solicitud ${status} correctamente`);
      refreshData(); // Recargamos para asegurar sincronización
    } catch (e) {
      toast.error("Error al guardar decisión");
    }
  };

  // 3. CARGA MANUAL (Admin)
  const addManualLeave = async (empId: string, leaveData: any) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    // Calculamos días automáticos si no vienen
    const days = leaveData.days || calculateWorkingDays(leaveData.startDate, leaveData.endDate, settings.agreedLeaveDays);

    const newRecord = {
      id: `MAN_${Date.now()}`,
      ...leaveData,
      days: days,
      year: new Date(leaveData.startDate).getFullYear()
    };

    const updatedRecords = [...(emp.leaveRecords || []), newRecord];

    try {
      await supabase.from('employees').update({ leaveRecords: updatedRecords }).eq('id', empId);
      toast.success("Licencia cargada al legajo");
      refreshData();
    } catch (e) {
      toast.error("Error al cargar licencia");
    }
  };

  // 4. GESTIÓN EMPLEADOS (Alta/Baja)
  const toggleEmployeeActive = async (empId: string, isActive: boolean) => {
    await supabase.from('employees').update({ active: isActive }).eq('id', empId);
    toast.success(isActive ? "Empleado reactivado" : "Empleado archivado");
    refreshData();
  };

  const addNewEmployee = async (empData: any) => {
    const { error } = await supabase.from('employees').insert([{ ...empData, active: true }]);
    if (error) {
      toast.error("Error: Puede que la cédula ya exista");
    } else {
      toast.success("Colaborador agregado al equipo");
      refreshData();
    }
  };

  // 5. NOTICIAS Y SETTINGS
  const publishNews = async (content: string) => {
    const newItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author: 'RRHH' };
    const newHistory = [newItem, ...(settings.newsHistory || [])];
    
    await supabase.from('settings').update({ newsHistory: newHistory }).eq('id', 1);
    
    // Marcar como no leída para todos
    await supabase.from('employees').update({ hasUnreadNews: true });
    
    setSettings({ ...settings, newsHistory: newHistory });
    toast.success("Comunicado enviado a planta");
  };

  const updateSettings = async (newSettings: any) => {
     await supabase.from('settings').update(newSettings).eq('id', 1);
     setSettings({ ...settings, ...newSettings });
     toast.success("Configuración guardada");
  };
  
  // Helpers
  const updateEmployee = async (e: Employee) => { /* Implementar si se necesita edición directa */ };

  return (
    <DataContext.Provider value={{
      employees, settings, loading, refreshData,
      createRequest, processRequest, addManualLeave,
      toggleEmployeeActive, addNewEmployee, publishNews, updateSettings,
      updateEmployee
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

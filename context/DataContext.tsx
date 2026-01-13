import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { calculateWorkingDays } from '../utils/leaveCalculator';
import toast from 'react-hot-toast';

export interface Employee {
  id: string;
  name: string;
  lastName: string;
  hireDate: string;
  active: boolean;
  leaveRecords: any[];
  requests: any[];
  readNewsIds: string[];
  role: 'admin' | 'user';
  birthDate?: string; 
  type?: string;
}

interface DataContextType {
  employees: Employee[];
  settings: any;
  loading: boolean;
  refreshData: () => Promise<void>;
  updateEmployee: (emp: Employee) => Promise<void>;
  createRequest: (empId: string, request: any) => Promise<boolean>;
  processRequest: (empId: string, reqId: string, status: 'Aprobado' | 'Rechazado', comment: string) => Promise<void>;
  addManualLeave: (empId: string, leaveData: any) => Promise<void>;
  addAgreedDay: (date: string, description: string) => Promise<void>;
  toggleEmployeeActive: (empId: string, isActive: boolean) => Promise<void>;
  publishNews: (content: string) => Promise<void>;
  updateSettings: (newSettings: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<any>({ agreedLeaveDays: [], newsHistory: [] });
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const { data: eData } = await supabase.from('employees').select('*').order('lastName');
      const { data: sData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (eData) setEmployees(eData);
      if (sData) setSettings(sData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  const toggleEmployeeActive = async (empId: string, isActive: boolean) => {
    const { error } = await supabase.from('employees').update({ active: isActive }).eq('id', empId);
    if (!error) {
        toast.success(isActive ? "Empleado reactivado" : "Empleado archivado correctamente");
        refreshData();
    } else {
        toast.error("Error al actualizar estado");
    }
  };

  const createRequest = async (empId: string, request: any) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return false;
    const days = calculateWorkingDays(request.startDate, request.endDate, settings.agreedLeaveDays);
    const newReq = { ...request, id: `REQ_${Date.now()}`, days, status: 'Pendiente', createdAt: new Date().toISOString() };
    const updatedRequests = [...(emp.requests || []), newReq];
    
    const { error } = await supabase.from('employees').update({ requests: updatedRequests }).eq('id', empId);
    if (!error) {
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, requests: updatedRequests } : e));
        return true;
    }
    return false;
  };

  const addAgreedDay = async (date: string, description: string) => {
      const newDay = { id: `AG_${Date.now()}`, date, description, active: true };
      const updatedDays = [newDay, ...(settings.agreedLeaveDays || [])];
      await supabase.from('settings').update({ agreedLeaveDays: updatedDays }).eq('id', 1);
      await publishNews(`📅 Nuevo día acordado: ${description} (${date}).`);
      setSettings({ ...settings, agreedLeaveDays: updatedDays });
      toast.success("Día acordado agregado");
  };

  const addManualLeave = async (empId: string, leaveData: any) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const days = calculateWorkingDays(leaveData.startDate, leaveData.endDate, settings.agreedLeaveDays);
    const newRecord = { id: `MAN_${Date.now()}`, ...leaveData, days, year: new Date(leaveData.startDate).getFullYear() };
    const updatedRecords = [...(emp.leaveRecords || []), newRecord];
    await supabase.from('employees').update({ leaveRecords: updatedRecords }).eq('id', empId);
    toast.success(`Licencia cargada (${days} días)`);
    refreshData();
  };

  const processRequest = async (empId: string, reqId: string, status: string, comment: string) => {
      const emp = employees.find(e => e.id === empId);
      if(!emp) return;
      const updatedReqs = emp.requests.map(r => r.id === reqId ? {...r, status, adminComment: comment} : r);
      let updatedRecords = emp.leaveRecords || [];
      if(status === 'Aprobado'){
          const req = emp.requests.find(r => r.id === reqId);
          if(req) updatedRecords.push({id: `APP_${req.id}`, type: req.type, startDate: req.startDate, endDate: req.endDate, days: req.days, notes: req.reason, year: new Date(req.startDate).getFullYear()});
      }
      await supabase.from('employees').update({requests: updatedReqs, leaveRecords: updatedRecords}).eq('id', empId);
      toast.success(`Solicitud ${status}`);
      refreshData();
  };

  const publishNews = async (content: string) => {
    const newItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author: 'RRHH' };
    const newHistory = [newItem, ...(settings.newsHistory || [])];
    await supabase.from('settings').update({ newsHistory: newHistory }).eq('id', 1);
    await supabase.from('employees').update({ hasUnreadNews: true });
    setSettings({ ...settings, newsHistory: newHistory });
  };
  
  const updateSettings = async (s: any) => {/*...*/};
  const updateEmployee = async (e: any) => {/*...*/};

  return (
    <DataContext.Provider value={{ employees, settings, loading, refreshData, createRequest, processRequest, addManualLeave, addAgreedDay, toggleEmployeeActive, publishNews, updateSettings, updateEmployee }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};

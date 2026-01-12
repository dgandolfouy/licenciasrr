
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Employee, LeaveRecord, LeaveSettings, LeaveRequest, AgreedDay, NewsItem } from '../types';
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
  addLeaveRecord: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const smartMerge = <T extends { id: string }>(serverItems: T[], localItems: T[]): T[] => {
    const mergedMap = new Map<string, T>();
    serverItems.forEach(item => mergedMap.set(item.id, item));
    localItems.forEach(item => mergedMap.set(item.id, item));
    return Array.from(mergedMap.values());
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<LeaveSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const isWriting = useRef(false);

  const employeesRef = useRef(employees);
  const settingsRef = useRef(settings);

  useEffect(() => { employeesRef.current = employees; }, [employees]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const fetchData = async () => {
    if (isWriting.current) return;
    try {
      const { data: eData } = await supabase.from('employees').select('*');
      const { data: sData } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

      if (eData) {
          const merged = eData.map(sEmp => {
              const lEmp = employeesRef.current.find(e => e.id === sEmp.id);
              if (!lEmp) return sEmp;
              return {
                  ...sEmp,
                  requests: smartMerge(sEmp.requests || [], lEmp.requests || []),
                  leaveRecords: smartMerge(sEmp.leaveRecords || [], lEmp.leaveRecords || []),
                  readNewsIds: Array.from(new Set([...(sEmp.readNewsIds || []), ...(lEmp.readNewsIds || [])]))
              };
          });
          setEmployees(merged);
      }
      if (sData) {
          setSettings({
              agreedLeaveDays: smartMerge(sData.agreedLeaveDays || [], settingsRef.current.agreedLeaveDays),
              newsHistory: smartMerge(sData.newsHistory || [], settingsRef.current.newsHistory),
              newsContent: sData.newsContent || '',
              qualityDocs: sData.qualityDocs || INITIAL_QUALITY_DOCS
          });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateEmployee: DataContextType['updateEmployee'] = async (updated) => {
    isWriting.current = true;
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    try {
        await supabase.from('employees').update(updated).eq('id', updated.id);
    } finally {
        setTimeout(() => { isWriting.current = false; }, 1500);
    }
  };

  const addManualLeave: DataContextType['addManualLeave'] = async (employeeId, record) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    const newRecord = { ...record, id: `MAN_${Date.now()}` };
    const updatedRecords = [...(employee.leaveRecords || []), newRecord];
    await updateEmployee({ ...employee, leaveRecords: updatedRecords, hasUnreadNews: true });
    await publishNews(`RRHH cargó licencia directa: ${record.days} d.`, 'RRHH', 'Sistema', employeeId);
  };

  const applyAgreedDaysToAll: DataContextType['applyAgreedDaysToAll'] = async () => {
      isWriting.current = true;
      const updatedDays = settingsRef.current.agreedLeaveDays.map(d => ({ ...d, active: true }));
      const newSettings = { ...settingsRef.current, agreedLeaveDays: updatedDays };
      setSettings(newSettings);
      try {
          await supabase.from('settings').update({ agreedLeaveDays: updatedDays }).eq('id', 1);
          await publishNews(`Agenda confirmada para planta.`, 'RRHH', 'Sistema');
      } finally {
          setTimeout(() => { isWriting.current = false; }, 2000);
      }
  };

  const createRequest: DataContextType['createRequest'] = async (employeeId, request) => {
    isWriting.current = true;
    const workingDays = calculateWorkingDays(request.startDate, request.endDate, []);
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return "Legajo inválido";

    // Validación de solapamiento
    const hasOverlap = (employee.requests || []).some(r => 
        r.status !== 'Rechazado' && 
        ((request.startDate >= r.startDate && request.startDate <= r.endDate) || 
         (request.endDate >= r.startDate && request.endDate <= r.endDate))
    );
    if (hasOverlap) return "Ya existe una solicitud para esas fechas.";

    const newReq: LeaveRequest = { ...request, id: `REQ_${Date.now()}`, status: 'Pendiente', days: workingDays, createdAt: new Date().toISOString() };
    const updated = [...(employee.requests || []), newReq];
    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, requests: updated } : e));
    
    try {
        await supabase.from('employees').update({ requests: updated }).eq('id', employeeId);
        return null;
    } finally {
        setTimeout(() => { isWriting.current = false; }, 2000);
    }
  };

  const processRequest: DataContextType['processRequest'] = async (employeeId, requestId, status, comment) => {
    isWriting.current = true;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    const req = employee.requests.find(r => r.id === requestId);
    if (!req) return;

    const updatedRequests = employee.requests.map(r => r.id === requestId ? { ...r, status, adminComment: comment } : r);
    let updatedRecords = [...(employee.leaveRecords || [])];
    
    if (status === 'Aprobado') {
        updatedRecords.push({ id: `APP_${req.id}`, type: req.type as any, startDate: req.startDate, endDate: req.endDate, days: req.days, notes: req.reason, year: new Date(req.startDate + 'T00:00:00').getFullYear() });
        await publishNews(`Solicitud APROBADA.`, 'RRHH', 'Sistema', employeeId);
    } else {
        await publishNews(`Solicitud RECHAZADA: ${comment}`, 'RRHH', 'Sistema', employeeId);
    }

    try {
        await updateEmployee({ ...employee, requests: updatedRequests, leaveRecords: updatedRecords, hasUnreadNews: true });
    } finally {
        setTimeout(() => { isWriting.current = false; }, 1500);
    }
  };

  const publishNews: DataContextType['publishNews'] = async (content, author, type = 'Comunicado', targetId) => {
    const newItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author, type };
    const newHistory = [newItem, ...settingsRef.current.newsHistory].slice(0, 50);
    setSettings(prev => ({ ...prev, newsHistory: newHistory }));
    await supabase.from('settings').update({ newsHistory: newHistory }).eq('id', 1);
    if (targetId) {
        const emp = employees.find(e => e.id === targetId);
        if (emp) await updateEmployee({ ...emp, hasUnreadNews: true });
    } else {
        employees.forEach(emp => { supabase.from('employees').update({ hasUnreadNews: true }).eq('id', emp.id).then(); });
    }
  };

  const updateSettings = async (s: any) => {
      const merged = { ...settings, ...s };
      setSettings(merged);
      await supabase.from('settings').update(s).eq('id', 1);
  };
  const addAgreedDay = async (date: string, desc: string) => {
      const newDay = { id: `AG_${Date.now()}`, date, description: desc, active: false };
      const updated = [newDay, ...settings.agreedLeaveDays];
      await updateSettings({ agreedLeaveDays: updated });
  };
  const updateAgreedDay = async (id: string, date: string, desc: string) => {
      const updated = settings.agreedLeaveDays.map(d => d.id === id ? { ...d, date, description: desc } : d);
      await updateSettings({ agreedLeaveDays: updated });
  };
  const markNewsAsRead = async (empId: string, nId: string) => {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
          const reads = [...(emp.readNewsIds || []), nId];
          await updateEmployee({ ...emp, readNewsIds: reads });
      }
  };
  const clearUnreadNews = async (id: string) => {
      const emp = employees.find(e => e.id === id);
      if (emp) await updateEmployee({ ...emp, hasUnreadNews: false });
  };
  const getEmployeeById = (id: string) => employees.find(e => e.id === id);
  const deleteEmployee = async (id: string) => { await supabase.from('employees').delete().eq('id', id); fetchData(); };
  const addLeaveRecord = async () => {};
  const initializeYearlyAgreedDays = async () => {};
  const markRequestAsNotified = async () => {};

  return <DataContext.Provider value={{ employees, settings, loading, getEmployeeById, updateEmployee, deleteEmployee, addLeaveRecord, addManualLeave, updateSettings, addAgreedDay, updateAgreedDay, applyAgreedDaysToAll, initializeYearlyAgreedDays, processRequest, createRequest, markRequestAsNotified, publishNews, markNewsAsRead, clearUnreadNews }}>{loading ? <LoadingSpinner/> : children}</DataContext.Provider>;
};

const LoadingSpinner = () => <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-rr-dark"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-rr-orange"></div></div>;
const defaultSettings: LeaveSettings = { agreedLeaveDays: [], newsContent: '', newsHistory: [], qualityDocs: INITIAL_QUALITY_DOCS };
export const useData = () => { const c = useContext(DataContext); if (!c) throw new Error(); return c; };

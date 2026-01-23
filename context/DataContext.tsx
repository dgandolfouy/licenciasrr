
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Employee, LeaveRecord, LeaveSettings, LeaveRequest, AgreedDay, NewsItem } from '../types';
import { INITIAL_QUALITY_DOCS } from '../constants';
import { calculateWorkingDays } from '../utils/leaveCalculator';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContext';

interface DataContextType {
  employees: Employee[];
  settings: LeaveSettings;
  loading: boolean;
  isSaving: boolean;
  getEmployeeById: (id: string) => Employee | undefined;
  addEmployee: (employee: Omit<Employee, 'leaveRecords' | 'requests'>) => Promise<void>;
  updateEmployee: (employee: Employee, oldId?: string) => Promise<void>; 
  toggleEmployeeStatus: (id: string, active: boolean) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>; 
  addLeaveRecord: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>;
  addManualLeave: (employeeId: string, record: Omit<LeaveRecord, 'id'>) => Promise<void>;
  deleteLeaveRecord: (employeeId: string, recordId: string) => Promise<void>;
  updateLeaveRecord: (employeeId: string, recordId: string, data: Partial<LeaveRecord>) => Promise<void>;
  certifyLeaveRecord: (employeeId: string, recordId: string) => Promise<void>;
  resetDatabase: (mode: 'history_only' | 'full_reset') => Promise<void>; 
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

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<LeaveSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const isSavingRef = useRef(false);
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const fetchData = async (force = false) => {
    if (!force && isSavingRef.current) return;

    try {
      const { data: eData, error: eError } = await supabase.from('employees').select('*');
      const { data: sData, error: sError } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();

      if (eError) throw eError;
      if (sError) throw sError;

      if (eData) {
          const sanitizedEmployees = eData.map((e: any) => ({
              ...e,
              active: e.active !== undefined ? e.active : true, 
              type: e.type || 'Mensual' 
          }));
          setEmployees(sanitizedEmployees);
      }
      if (sData) {
        setSettings({
          agreedLeaveDays: sData.agreedLeaveDays || [],
          newsHistory: sData.newsHistory || [],
          newsContent: sData.newsContent || '',
          qualityDocs: sData.qualityDocs || INITIAL_QUALITY_DOCS
        });
      }
    } catch (e: any) {
      let msg = '';
      if (e instanceof Error) {
        msg = e.message;
      } else if (typeof e === 'object' && e !== null) {
        try {
            msg = JSON.stringify(e);
        } catch {
            msg = 'Error desconocido';
        }
      } else {
        msg = String(e);
      }
      
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          // Log silencioso
      } else {
          console.error("Error en polling:", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!isSavingRef.current) fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const addEmployee: DataContextType['addEmployee'] = async (newEmp) => {
    setIsSaving(true);
    try {
        const employeeData: Employee = {
            ...newEmp,
            active: true,
            leaveRecords: [],
            requests: [],
        };
        const { error } = await supabase.from('employees').insert([employeeData]);
        if(error) throw error;
        showToast("Empleado creado exitosamente.", 'success');
        await fetchData(true);
    } catch (e: any) {
        showToast("Error al crear empleado: " + e.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const updateEmployee: DataContextType['updateEmployee'] = async (updated, oldId) => {
    setIsSaving(true);
    try {
      const targetId = oldId || updated.id;

      if (oldId && oldId !== updated.id) {
          const { data } = await supabase.from('employees').select('id').eq('id', updated.id).maybeSingle();
          if (data) throw new Error(`El nuevo ID ${updated.id} ya existe en el sistema.`);
      }

      const { error } = await supabase.from('employees').update(updated).eq('id', targetId);
      if (error) throw error;
      
      setEmployees(prev => prev.map(e => e.id === targetId ? updated : e));
      
      if(oldId && oldId !== updated.id) {
          showToast(`Cédula actualizada: ${oldId} -> ${updated.id}`, 'success');
      } else {
          showToast("Datos actualizados correctamente.", 'success');
      }
      
    } catch (e: any) {
      showToast("Error al actualizar: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmployeeStatus = async (id: string, active: boolean) => {
      setIsSaving(true);
      try {
          const { error } = await supabase.from('employees').update({ active }).eq('id', id);
          if (error) throw error;
          const status = active ? "Reactivado" : "Archivado";
          showToast(`Legajo ${status}.`, 'info');
          await fetchData(true);
      } catch (e: any) {
          showToast("Error cambiando estado: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const addManualLeave: DataContextType['addManualLeave'] = async (employeeId, record) => {
    setIsSaving(true);
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Empleado no encontrado");

      const justified = record.type === 'Especial' ? false : undefined;

      const newRecord = { ...record, id: `MAN_${Date.now()}`, justified };
      const updatedRecords = [...(employee.leaveRecords || []), newRecord];
      
      const { error } = await supabase.from('employees').update({ 
        leaveRecords: updatedRecords, 
        hasUnreadNews: true 
      }).eq('id', employeeId);
      
      if (error) throw error;

      const formatDate = (d: string) => d.split('-').reverse().join('/');
      const message = `Se ha cargado una licencia ${record.type} del ${formatDate(record.startDate)} al ${formatDate(record.endDate)}. Motivo: ${record.notes}`;

      await publishNews(message, 'RRHH', 'Sistema', employeeId);
      showToast("Licencia cargada directamente en el legajo.", 'success');
      await fetchData(true);
    } catch (e: any) {
      showToast("Error en carga directa: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLeaveRecord: DataContextType['deleteLeaveRecord'] = async (employeeId, recordId) => {
      setIsSaving(true);
      try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) throw new Error("Empleado no encontrado");

          const isPersonalRecord = (employee.leaveRecords || []).some(r => r.id === recordId);
          let updatedRecords: LeaveRecord[] = [];

          if (isPersonalRecord) {
              updatedRecords = (employee.leaveRecords || []).filter(r => r.id !== recordId);
          } else {
              const agreedDay = settings.agreedLeaveDays.find(d => d.id === recordId);
              if (agreedDay) {
                  const exceptionRecord: LeaveRecord = {
                      id: `EX_${Date.now()}`,
                      type: 'Excepcion',
                      startDate: agreedDay.date,
                      endDate: agreedDay.date,
                      days: 0,
                      year: parseInt(agreedDay.date.split('-')[0]),
                      agreedDayId: agreedDay.id,
                      notes: 'Excepción a día acordado global'
                  };
                  updatedRecords = [...(employee.leaveRecords || []), exceptionRecord];
              } else {
                  throw new Error("Registro no encontrado para eliminar.");
              }
          }

          const { error } = await supabase.from('employees').update({
              leaveRecords: updatedRecords
          }).eq('id', employeeId);

          if (error) throw error;

          showToast("Registro eliminado/anulado. El saldo se ha recalculado.", 'info');
          await fetchData(true);
      } catch (e: any) {
          showToast("Error al eliminar registro: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const updateLeaveRecord: DataContextType['updateLeaveRecord'] = async (employeeId, recordId, updatedData) => {
      setIsSaving(true);
      try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) throw new Error("Empleado no encontrado");

          let updatedRecords = [...(employee.leaveRecords || [])];
          const isPersonal = updatedRecords.some(r => r.id === recordId);

          if (isPersonal) {
              // Actualizar registro personal existente
              updatedRecords = updatedRecords.map(r =>
                  r.id === recordId ? { ...r, ...updatedData } : r
              );
          } else {
              // Es un Día Acordado Global que se está modificando
              const agreedDay = settings.agreedLeaveDays.find(d => d.id === recordId);
              if (!agreedDay) throw new Error("Registro original no encontrado");

              // 1. Crear excepción para el día global original
              const exceptionRecord: LeaveRecord = {
                  id: `EX_${Date.now()}`,
                  type: 'Excepcion',
                  startDate: agreedDay.date,
                  endDate: agreedDay.date,
                  days: 0,
                  year: parseInt(agreedDay.date.split('-')[0]),
                  agreedDayId: agreedDay.id,
                  notes: 'Modificación de día acordado'
              };

              // 2. Crear el nuevo registro con los datos modificados
              const newRecord: LeaveRecord = {
                  id: `MOD_${Date.now()}`, 
                  type: updatedData.type || 'Anual',
                  startDate: updatedData.startDate || agreedDay.date,
                  endDate: updatedData.endDate || agreedDay.date,
                  days: updatedData.days || 1,
                  notes: updatedData.notes || agreedDay.description,
                  year: new Date((updatedData.startDate || agreedDay.date) + 'T00:00:00').getFullYear(),
                  justified: true,
                  isFixed: false
              };

              updatedRecords.push(exceptionRecord);
              updatedRecords.push(newRecord);
          }

          const { error } = await supabase.from('employees').update({
              leaveRecords: updatedRecords,
              hasUnreadNews: true
          }).eq('id', employeeId);

          if (error) throw error;

          await publishNews("Se ha realizado una corrección en tu historial de licencias.", "RRHH", "Sistema", employeeId);
          showToast("Registro modificado correctamente.", 'success');
          await fetchData(true);

      } catch (e: any) {
          showToast("Error al modificar: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const certifyLeaveRecord: DataContextType['certifyLeaveRecord'] = async (employeeId, recordId) => {
      setIsSaving(true);
      try {
          const employee = employees.find(e => e.id === employeeId);
          if (!employee) throw new Error("Empleado no encontrado");

          const updatedRecords = (employee.leaveRecords || []).map(r => 
              r.id === recordId ? { ...r, justified: true } : r
          );

          const { error } = await supabase.from('employees').update({
              leaveRecords: updatedRecords,
              hasUnreadNews: true
          }).eq('id', employeeId);

          if (error) throw error;

          await publishNews("Tu licencia especial ha sido CERTIFICADA y acreditada en tu saldo.", "RRHH", "Sistema", employeeId);
          showToast("Licencia certificada. Saldo restablecido.", 'success');
          await fetchData(true);
      } catch (e: any) {
          showToast("Error al certificar: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const resetDatabase: DataContextType['resetDatabase'] = async (mode) => {
      setIsSaving(true);
      try {
          if (mode === 'history_only') {
              const { error: empError } = await supabase.from('employees').update({
                  leaveRecords: [],
                  requests: [],
                  hasUnreadNews: false,
                  readNewsIds: []
              }).neq('id', 'placeholder');
              if (empError) throw empError;

              const { error: settError } = await supabase.from('settings').update({
                  agreedLeaveDays: [],
                  newsHistory: []
              }).eq('id', 1);
              if (settError) throw settError;

              showToast("Historial limpiado. Empleados mantenidos.", 'warning');
          } else if (mode === 'full_reset') {
              const { error: delError } = await supabase.from('employees').delete().neq('id', '0');
              if (delError) throw delError;

              const { error: settError } = await supabase.from('settings').update({
                  agreedLeaveDays: [],
                  newsHistory: []
              }).eq('id', 1);
              if (settError) throw settError;

              showToast("Sistema reiniciado de fábrica.", 'warning');
          }
          await fetchData(true);
      } catch (e: any) {
          showToast("Error en reset: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const applyAgreedDaysToAll: DataContextType['applyAgreedDaysToAll'] = async () => {
    setIsSaving(true);
    try {
      const updatedDays = settings.agreedLeaveDays.map(d => ({ ...d, active: true }));
      const { error } = await supabase.from('settings').update({ agreedLeaveDays: updatedDays }).eq('id', 1);
      if (error) throw error;
      
      await publishNews(`Agenda de planta confirmada y sincronizada.`, 'RRHH', 'Sistema');
      showToast("Agenda sincronizada.", 'success');
      await fetchData(true);
    } catch (e: any) {
      showToast("Error sync: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const initializeYearlyAgreedDays = async (year: number) => {
      setIsSaving(true);
      try {
          const saturdays = [];
          const date = new Date(year, 0, 1); 
          while (saturdays.length < 2 && date.getMonth() === 0) {
              if (date.getDay() === 6) {
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  saturdays.push(`${y}-${m}-${d}`);
              }
              date.setDate(date.getDate() + 1);
          }

          const newDefaults = [
              { id: `AG_${Date.now()}_1`, date: saturdays[0] || `${year}-01-02`, description: 'Sábado Enero 1', active: false },
              { id: `AG_${Date.now()}_2`, date: saturdays[1] || `${year}-01-09`, description: 'Sábado Enero 2', active: false },
              { id: `AG_${Date.now()}_3`, date: `${year}-02-24`, description: 'Feriado Carnaval 1', active: false },
              { id: `AG_${Date.now()}_4`, date: `${year}-02-25`, description: 'Feriado Carnaval 2', active: false },
              { id: `AG_${Date.now()}_5`, date: `${year}-04-10`, description: 'Semana Turismo 1', active: false },
              { id: `AG_${Date.now()}_6`, date: `${year}-04-11`, description: 'Semana Turismo 2', active: false },
          ];

          const existingDates = new Set(settings.agreedLeaveDays.map(d => d.date));
          const uniqueDefaults = newDefaults.filter(d => !existingDates.has(d.date));

          if (uniqueDefaults.length === 0) {
              showToast("No hay días nuevos para agregar. Ya existen.", 'info');
              return;
          }

          const updated = [...uniqueDefaults, ...settings.agreedLeaveDays];
          
          const { error } = await supabase.from('settings').update({ agreedLeaveDays: updated }).eq('id', 1);
          if(error) throw error;
          
          showToast(`Generados ${uniqueDefaults.length} nuevos días para ${year}.`, 'success');
          await fetchData(true);

      } catch (e: any) {
          showToast("Error: " + e.message, 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const createRequest: DataContextType['createRequest'] = async (employeeId, request) => {
    setIsSaving(true);
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Legajo inválido");

      const hasOverlap = (employee.requests || []).some(r => {
          if (r.status === 'Rechazado') return false; 
          return (request.startDate <= r.endDate && request.endDate >= r.startDate);
      });

      if (hasOverlap) throw new Error("Ya tienes una solicitud PENDIENTE o APROBADA que coincide con estas fechas.");

      const workingDays = calculateWorkingDays(request.startDate, request.endDate, []);
      const newReq: LeaveRequest = { 
        ...request, 
        id: `REQ_${Date.now()}`, 
        status: 'Pendiente', 
        days: workingDays, 
        createdAt: new Date().toISOString() 
      };
      
      const updatedRequests = [...(employee.requests || []), newReq];
      const { error } = await supabase.from('employees').update({ requests: updatedRequests }).eq('id', employeeId);
      
      if (error) throw error;
      
      await fetchData(true);
      return null;
    } catch (e: any) {
      return e.message;
    } finally {
      setIsSaving(false);
    }
  };

  const processRequest: DataContextType['processRequest'] = async (employeeId, requestId, status, comment) => {
    setIsSaving(true);
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Empleado no encontrado");

      const req = employee.requests.find(r => r.id === requestId);
      if (!req) throw new Error("Solicitud no encontrada");

      const updatedRequests = employee.requests.map(r => r.id === requestId ? { ...r, status, adminComment: comment } : r);
      let updatedRecords = [...(employee.leaveRecords || [])];
      
      if (status === 'Aprobado') {
        updatedRecords.push({ 
          id: `APP_${req.id}`, 
          type: req.type as any, 
          startDate: req.startDate, 
          endDate: req.endDate, 
          days: req.days, 
          notes: req.reason, 
          year: new Date(req.startDate + 'T00:00:00').getFullYear(),
          justified: req.type === 'Especial' ? false : undefined 
        });
      }

      const { error } = await supabase.from('employees').update({ 
        requests: updatedRequests, 
        leaveRecords: updatedRecords,
        hasUnreadNews: true
      }).eq('id', employeeId);

      if (error) throw error;

      await publishNews(
        `Solicitud de licencia ${status === 'Aprobado' ? 'APROBADA' : 'RECHAZADA'}.`, 
        'RRHH', 'Sistema', employeeId
      );
      
      showToast(`Solicitud ${status} con éxito.`, status === 'Aprobado' ? 'success' : 'warning');
      await fetchData(true); 
    } catch (e: any) {
      showToast("Error al procesar: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const publishNews: DataContextType['publishNews'] = async (content, author, type = 'Comunicado', targetId) => {
    const isManual = type === 'Comunicado';
    if (isManual) setIsSaving(true);

    try {
      const newItem: NewsItem = { id: `N_${Date.now()}`, date: new Date().toISOString(), content, author, type, targetId };
      const newHistory = [newItem, ...settings.newsHistory].slice(0, 50);
      
      const { error } = await supabase.from('settings').update({ newsHistory: newHistory }).eq('id', 1);
      if (error) throw error;

      if (targetId) {
        await supabase.from('employees').update({ hasUnreadNews: true }).eq('id', targetId);
      } else {
        await supabase.rpc('mark_all_unread'); 
      }

      if (isManual) showToast("Noticia publicada.", 'success');
      await fetchData(true);
    } catch (e: any) {
      if (isManual) showToast("Error al publicar: " + e.message, 'error');
    } finally {
      if (isManual) setIsSaving(false);
    }
  };

  const updateSettings = async (s: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('settings').update(s).eq('id', 1);
      if (error) throw error;
      await fetchData(true);
    } catch (e: any) {
      showToast("Error guardando ajustes: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addAgreedDay = async (date: string, desc: string) => {
    if (settings.agreedLeaveDays.some(d => d.date === date)) {
        showToast("Ya existe un día acordado para esta fecha.", 'warning');
        return;
    }
    const newDay = { id: `AG_${Date.now()}`, date, description: desc, active: false };
    const updated = [newDay, ...settings.agreedLeaveDays];
    await updateSettings({ agreedLeaveDays: updated });
  };

  const updateAgreedDay = async (id: string, date: string, desc: string) => {
    if (settings.agreedLeaveDays.some(d => d.date === date && d.id !== id)) {
        showToast("Ya existe un día acordado para esta fecha.", 'warning');
        return;
    }
    const updated = settings.agreedLeaveDays.map(d => d.id === id ? { ...d, date, description: desc } : d);
    await updateSettings({ agreedLeaveDays: updated });
  };

  const markNewsAsRead = async (empId: string, nId: string) => {
    setIsSaving(true);
    try {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        const reads = Array.from(new Set([...(emp.readNewsIds || []), nId]));
        const { error } = await supabase.from('employees').update({ readNewsIds: reads }).eq('id', empId);
        if (error) throw error;
        await fetchData(true);
      }
    } catch (e) {
      console.error("Error marking news as read", e);
    } finally {
      setIsSaving(false);
    }
  };

  const clearUnreadNews = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('employees').update({ hasUnreadNews: false }).eq('id', id);
      if (error) throw error;
      await fetchData(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const getEmployeeById = (id: string) => employees.find(e => e.id === id);
  
  const deleteEmployee = async (id: string) => { 
    if (!confirm("¿ESTÁS SEGURO? Esto eliminará físicamente el registro.")) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      showToast("Legajo eliminado definitivamente.", 'warning');
      await fetchData(true);
    } catch (e: any) {
      showToast("Error: " + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const addLeaveRecord = async () => {};
  const markRequestAsNotified = async () => {};

  return (
    <DataContext.Provider value={{ 
      employees, settings, loading, isSaving,
      getEmployeeById, addEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee, addLeaveRecord, 
      addManualLeave, updateSettings, addAgreedDay, updateAgreedDay, 
      applyAgreedDaysToAll, initializeYearlyAgreedDays, processRequest, 
      createRequest, markRequestAsNotified, publishNews, markNewsAsRead, clearUnreadNews,
      certifyLeaveRecord, resetDatabase, deleteLeaveRecord, updateLeaveRecord
    }}>
      {children}
    </DataContext.Provider>
  );
};

const defaultSettings: LeaveSettings = { agreedLeaveDays: [], newsContent: '', newsHistory: [], qualityDocs: INITIAL_QUALITY_DOCS };
export const useData = () => { const c = useContext(DataContext); if (!c) throw new Error(); return c; };

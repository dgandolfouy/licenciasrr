import { Employee, LeaveRecord, AgreedDay, LeaveRequest } from '../types';

const BASE_LEAVE_DAYS = 20;

export const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  // Usamos hora 12:00 para evitar cambios de día por UTC-offset
  return new Date(year, month - 1, day, 12, 0, 0);
};

export const formatDateDisplay = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
};

// Función auxiliar para iterar rangos
export const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const current = new Date(startDateStr + 'T12:00:00');
    const end = new Date(endDateStr + 'T12:00:00');
    
    if (current > end) return [];
    
    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

export const calculateWorkingDays = (startDateStr: string, endDateStr: string, holidays: string[]): number => {
    if (!startDateStr || !endDateStr) return 0;
    try {
        let count = 0;
        const current = new Date(startDateStr + 'T12:00:00');
        const end = new Date(endDateStr + 'T12:00:00');
        
        if (current > end) return 0;

        while (current <= end) {
            const dayOfWeek = current.getDay(); 
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const isoDate = `${year}-${month}-${day}`;
            
            // Si es fin de semana (0=Dom, 6=Sab) o feriado, no cuenta
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(isoDate)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    } catch { return 0; }
};

export const calculateYearsOfService = (hireDateStr: string, referenceDate: Date = new Date()): number => {
  if (!hireDateStr) return 0;
  try {
      const hireDate = parseDate(hireDateStr);
      const now = referenceDate;
      let years = now.getFullYear() - hireDate.getFullYear();
      const m = now.getMonth() - hireDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < hireDate.getDate())) years--;
      return Math.max(0, years);
  } catch { return 0; }
};

export const calculateSeniorityDays = (hireDateStr: string, referenceDate: Date = new Date()): number => {
  const years = calculateYearsOfService(hireDateStr, referenceDate);
  return years < 5 ? 0 : 1 + Math.floor((years - 5) / 4);
};

// Calcula los días base generados (20 o proporcional según fecha ingreso)
export const calculateBaseGeneratedDays = (hireDateStr: string, targetYear: number): number => {
    if (!hireDateStr) return 0;
    const hireDate = parseDate(hireDateStr);
    const generationYear = targetYear - 1;

    // Caso 1: Ingresó DESPUÉS del año de generación (ej: entró en 2025 y estamos calculando saldo disponible para 2025).
    // No generó licencia en 2024. Su saldo es 0.
    if (hireDate.getFullYear() > generationYear) {
        return 0;
    }

    // Caso 2: Ingresó ANTES del año de generación (ej: entró en 2023 y calculamos saldo 2025).
    // Trabajó todo el 2024 completo. Le corresponden los 20 días base.
    if (hireDate.getFullYear() < generationYear) {
        return BASE_LEAVE_DAYS;
    }

    // Caso 3: Ingresó DURANTE el año de generación (ej: entró en Junio 2024 y calculamos saldo 2025).
    // Corresponde proporcional: 1.66 días por mes trabajado hasta el 31/12.
    // Usamos cálculo exacto por días para mayor precisión matemática equivalente a 20/12.
    const endOfYear = new Date(generationYear, 11, 31);
    
    // Calculamos días corridos trabajados en ese año
    const diffTime = Math.abs(endOfYear.getTime() - hireDate.getTime());
    const daysWorked = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día de ingreso

    // Regla: (DíasTrabajados / 365) * 20
    const proportional = (daysWorked / 365) * BASE_LEAVE_DAYS;

    // Redondeamos a 2 decimales para que sea legible (ej: 11.66)
    return parseFloat(proportional.toFixed(2));
};

export const getLeaveDaysSummary = (
  employee: Employee | undefined, 
  targetYear: number = new Date().getFullYear(),
  globalAgreedDays: AgreedDay[] = []
) => {
  const empty = { totalGenerated: 0, fixedDeductions: 0, takenDays: 0, remainingDays: 0, availablePool: 0, yearsOfService: 0, agreedRecords: [] };
  if (!employee) return empty;

  try {
      // 1. Calcular Saldo Generado (Proporcional + Antigüedad)
      const baseDays = calculateBaseGeneratedDays(employee.hireDate, targetYear);
      const seniorityDays = calculateSeniorityDays(employee.hireDate);
      
      const totalGenerated = baseDays + seniorityDays;
      const availablePool = totalGenerated;

      // 2. Identificar Días Acordados Activos para el año
      const yearGlobalAgreed = (globalAgreedDays || []).filter(d => d.active && d.date.startsWith(targetYear.toString()));
      
      // Creamos un Set de fechas acordadas para búsqueda rápida O(1)
      const agreedDatesSet = new Set(yearGlobalAgreed.map(d => d.date));
      const fixedCount = agreedDatesSet.size;

      // 3. Calcular días tomados
      let takenCount = 0;
      
      (employee.leaveRecords || []).forEach(r => {
          const recYear = r.year || parseInt(r.startDate.split('-')[0]);
          
          // LÓGICA DE NEGOCIO:
          // - Acordados: Se ignoran aquí (ya sumados en fixedCount).
          // - Especial Justificado: Se ignoran (son gratis, no descuentan).
          // - Especial NO Justificado: Se suman (cuentan como Anual hasta que traiga el papel).
          // - Anual / Adelantada: Se suman.
          
          const isSpecialAndJustified = r.type === 'Especial' && r.justified === true;
          const shouldCount = r.type !== 'Acordado' && !isSpecialAndJustified;

          if (recYear === targetYear && shouldCount) {
              const daysInRange = getDatesInRange(r.startDate, r.endDate);
              
              daysInRange.forEach(dateStr => {
                  const d = new Date(dateStr + 'T12:00:00');
                  const dayOfWeek = d.getDay();
                  
                  // Si es día laboral y NO es un día acordado, cuenta como tomado personal
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                      if (!agreedDatesSet.has(dateStr)) {
                          takenCount++;
                      }
                  }
              });
          }
      });

      // Cálculo final con decimales permitidos
      const remainingDays = parseFloat((availablePool - fixedCount - takenCount).toFixed(2));

      return {
        totalGenerated: parseFloat(totalGenerated.toFixed(2)), 
        fixedDeductions: fixedCount, 
        takenDays: takenCount, 
        remainingDays, 
        availablePool: parseFloat(availablePool.toFixed(2)), 
        yearsOfService: calculateYearsOfService(employee.hireDate),
        agreedRecords: yearGlobalAgreed
      };
  } catch { return empty; }
};

export interface UnifiedHistoryItem {
    id: string;
    startDate: string;
    endDate: string;
    type: string;
    days: number;
    notes: string;
    status: 'Aprobado' | 'Pendiente' | 'Rechazado';
    adminComment?: string;
    year: number;
    justified?: boolean; // Nuevo campo en la interfaz
}

export const getUnifiedHistory = (employee: Employee, settingsAgreedDays: AgreedDay[]): UnifiedHistoryItem[] => {
    const history: UnifiedHistoryItem[] = [];

    // Filtramos solo los días acordados activos
    const activeAgreedDays = settingsAgreedDays.filter(d => d.active);
    const agreedDatesSet = new Set(activeAgreedDays.map(d => d.date));

    // 1. Añadir Días Acordados al historial
    activeAgreedDays.forEach(d => {
        history.push({
            id: d.id,
            startDate: d.date,
            endDate: d.date,
            type: 'Acordado',
            days: 1,
            notes: d.description,
            status: 'Aprobado',
            year: parseInt(d.date.split('-')[0])
        });
    });

    // 2. Procesar Registros Personales
    (employee.leaveRecords || []).forEach(r => {
        let effectiveDays = 0;
        const daysInRange = getDatesInRange(r.startDate, r.endDate);
        daysInRange.forEach(dateStr => {
            const d = new Date(dateStr + 'T12:00:00');
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !agreedDatesSet.has(dateStr)) {
                effectiveDays++;
            }
        });

        if (effectiveDays > 0 || r.type === 'Acordado') {
             const daysToShow = r.type === 'Acordado' ? r.days : effectiveDays;
             if (r.type !== 'Acordado') {
                history.push({
                    id: r.id,
                    startDate: r.startDate,
                    endDate: r.endDate,
                    type: r.type,
                    days: daysToShow,
                    notes: r.notes || '',
                    status: 'Aprobado',
                    year: r.year || parseInt(r.startDate.split('-')[0]),
                    justified: r.justified // Pasamos el estado
                });
             }
        }
    });

    // 3. Solicitudes
    (employee.requests || []).forEach(req => {
        if (req.status !== 'Aprobado') {
            history.push({
                id: req.id,
                startDate: req.startDate,
                endDate: req.endDate,
                type: req.type,
                days: req.days,
                notes: req.reason,
                status: req.status,
                adminComment: req.adminComment,
                year: parseInt(req.startDate.split('-')[0])
            });
        }
    });

    return history.sort((a, b) => b.startDate.localeCompare(a.startDate));
};

export const formatLeaveLabel = (type: string, notes: string = ''): string => {
    const lowerNotes = notes.toLowerCase();
    
    if (type === 'Especial' || type === 'Adelantada') {
        if (lowerNotes.includes('medica') || lowerNotes.includes('médica') || lowerNotes.includes('salud') || lowerNotes.includes('enfermedad')) return 'Licencia Médica';
        if (lowerNotes.includes('estudio') || lowerNotes.includes('examen')) return 'Licencia por Estudio';
        if (lowerNotes.includes('duelo') || lowerNotes.includes('fallecimiento')) return 'Licencia por Duelo';
        if (lowerNotes.includes('maternidad') || lowerNotes.includes('paternidad')) return 'Licencia Parental';
        if (lowerNotes.includes('sangre') || lowerNotes.includes('donacion') || lowerNotes.includes('donación')) return 'Donación de Sangre';
        return 'Licencia Especial';
    }

    if (type === 'Acordado') return 'Licencia Acordada';
    if (type === 'Anual') return 'Licencia Anual';
    if (type === 'Sin Goce') return 'Licencia S/G Sueldo';
    
    return type; 
};

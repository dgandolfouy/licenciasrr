
import { Employee, LeaveRecord, AgreedDay } from '../types';

const BASE_LEAVE_DAYS = 20;

export const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateDisplay = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
};

export const calculateWorkingDays = (startDateStr: string, endDateStr: string, holidays: string[]): number => {
    if (!startDateStr || !endDateStr) return 0;
    try {
        let count = 0;
        const current = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');
        while (current <= end) {
            const dayOfWeek = current.getDay(); 
            const isoDate = current.toISOString().split('T')[0];
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(isoDate)) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    } catch { return 0; }
};

export const calculateYearsOfService = (hireDateStr: string): number => {
  if (!hireDateStr) return 0;
  try {
      const hireDate = parseDate(hireDateStr);
      const now = new Date();
      let years = now.getFullYear() - hireDate.getFullYear();
      const m = now.getMonth() - hireDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < hireDate.getDate())) years--;
      return Math.max(0, years);
  } catch { return 0; }
};

export const calculateSeniorityDays = (hireDateStr: string): number => {
  const years = calculateYearsOfService(hireDateStr);
  return years < 5 ? 0 : 1 + Math.floor((years - 5) / 4);
};

export const getLeaveDaysSummary = (
  employee: Employee | undefined, 
  targetYear: number = new Date().getFullYear(),
  globalAgreedDays: AgreedDay[] = []
) => {
  const empty = { totalGenerated: 0, fixedDeductions: 0, takenDays: 0, remainingDays: 0, availablePool: 0, yearsOfService: 0, agreedRecords: [] };
  if (!employee) return empty;

  try {
      const seniorityDays = calculateSeniorityDays(employee.hireDate);
      const totalGenerated = BASE_LEAVE_DAYS + seniorityDays;
      const availablePool = totalGenerated;

      const yearGlobalAgreed = (globalAgreedDays || []).filter(d => d.active && d.date.startsWith(targetYear.toString()));
      const fixedCount = yearGlobalAgreed.length;

      const takenCount = (employee.leaveRecords || [])
        .filter(r => (r.year === targetYear || r.startDate.startsWith(targetYear.toString())) && r.type !== 'Acordado')
        .reduce((acc, r) => acc + (r.days || 0), 0);

      const remainingDays = availablePool - fixedCount - takenCount;

      return {
        totalGenerated, 
        fixedDeductions: fixedCount, 
        takenDays: takenCount, 
        remainingDays, 
        availablePool, 
        yearsOfService: calculateYearsOfService(employee.hireDate),
        agreedRecords: yearGlobalAgreed
      };
  } catch { return empty; }
};

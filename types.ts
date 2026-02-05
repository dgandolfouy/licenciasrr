
export enum UserRole {
  OPERARIO = 'OPERARIO',
  RRHH = 'RRHH',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  role: UserRole;
}

export type EmployeeType = 'Jornalero' | 'Mensual';

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  type: 'Anual' | 'Especial' | 'Sin Goce';
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  adminComment?: string;
  createdAt: string;
  processedAt?: string;
  notified?: boolean; 
}

export interface LeaveRecord {
  id: string;
  type: 'Anual' | 'Especial' | 'Adelantada' | 'Acordado' | 'Sin Goce' | 'Excepcion' | 'AjusteSaldo';
  specialType?: string;
  startDate: string;
  endDate: string;
  days: number;
  notes?: string;
  year: number;
  isFixed?: boolean; 
  justified?: boolean; // Nuevo: True si RRHH ya certificó el comprobante
  agreedDayId?: string; // Referencia al ID del día acordado si es una excepción
}

export interface Employee {
  id: string; 
  name: string;
  lastName: string;
  hireDate: string;
  birthDate: string; 
  type: EmployeeType;
  active: boolean; 
  leaveRecords: LeaveRecord[];
  requests: LeaveRequest[];
  password?: string;
  hasUnreadNews?: boolean;
  readNewsIds?: string[];
}

export interface AgreedDay {
  id: string;
  date: string;
  description: string;
  active?: boolean; 
}

export interface NewsItem {
  id: string;
  date: string;
  content: string;
  author: string;
  type?: 'Comunicado' | 'Sistema';
  targetId?: string; 
}

export interface QualityDoc {
  id: string;
  title: string;
  content: string;
}

export interface LeaveSettings {
  agreedLeaveDays: AgreedDay[];
  newsContent: string;
  newsHistory: NewsItem[];
  qualityDocs: QualityDoc[];
}

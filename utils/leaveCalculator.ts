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
  // Cálculo ajustado a la normativa uruguaya: a partir del 5to año, suma 1 día cada 4 años.
  return years < 5 ? 0 : Math.floor(years / 4);
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

    // CAMBIO SOLICITADO: Redondear hacia arriba (ej: 10.2 -> 11)
    return Math.ceil(proportional);
};

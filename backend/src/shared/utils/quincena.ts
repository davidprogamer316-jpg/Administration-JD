export interface QuincenaRange {
  start: Date;
  end: Date;
  periodNumber: number;
}

export function getQuincena(date: Date): QuincenaRange {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (day <= 15) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 15, 23, 59, 59, 999);
    return { start, end, periodNumber: 1 };
  }

  const start = new Date(year, month, 16, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, periodNumber: 2 };
}

export function formatQuincena(range: QuincenaRange): string {
  const startStr = range.start.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  const endStr = range.end.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `Q${range.periodNumber} (${startStr} - ${endStr})`;
}

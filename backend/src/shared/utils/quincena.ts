export interface QuincenaRange {
  start: Date;
  end: Date;
  periodNumber: number;
}

export function getQuincena(date: Date): QuincenaRange {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  if (day <= 15) {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 15, 23, 59, 59, 999));
    return { start, end, periodNumber: 1 };
  }

  const start = new Date(Date.UTC(year, month, 16, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end, periodNumber: 2 };
}

export function formatQuincena(range: QuincenaRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  const startStr = range.start.toLocaleDateString('es-ES', opts);
  const endStr = range.end.toLocaleDateString('es-ES', {
    ...opts,
    year: 'numeric',
  });
  return `Q${range.periodNumber} (${startStr} - ${endStr})`;
}

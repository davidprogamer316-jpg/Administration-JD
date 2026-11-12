import type { CarJob } from '@/types';

export function buildJobInvoiceDescription(job: CarJob): string {
  const base = job.description?.trim() || 'Trabajo de instalación';

  if (job.jobType !== 'property') {
    return base;
  }

  const items = job.items || [];
  const measures = items
    .map((item) => `${item.ancho}x${item.alto} x${item.unidades}`)
    .join(', ');
  const area = (job.totalSqFt ?? 0).toFixed(2);

  if (measures) {
    return `${base} — ${items.length} medida(s): ${measures} = ${area} pies²`;
  }

  return `${base} — ${area} pies²`;
}

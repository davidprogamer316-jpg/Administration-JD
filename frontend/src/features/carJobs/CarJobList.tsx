'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { CarJob, QuincenaGroup } from '@/types';
import { Plus, Pencil, Trash2, Search, FileDown, FileText, ChevronDown } from 'lucide-react';
import { downloadFromApi } from '@/lib/download';
import VinScanner from '@/components/VinScanner';
import Modal from '@/components/Modal';
import DateInput from '@/components/DateInput';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

const PAPER_OPTIONS = [
  { value: 'premium', label: 'Premium Film' },
  { value: 'ceramic', label: 'Ceramic Film' },
  { value: 'ultra_ceramic', label: 'Ultra Ceramic Film' },
  { value: 'architectural_black', label: 'Architectural Black Film' },
  { value: 'architectural_silver', label: 'Architectural Silver Film' },
  { value: 'none', label: 'DOES NOT APPLY' },
];

export default function CarJobList() {
  const [groupedData, setGroupedData] = useState<QuincenaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CarJob | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchVin, setSearchVin] = useState('');
  const [error, setError] = useState('');
  const [detailJob, setDetailJob] = useState<CarJob | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceClientName, setInvoiceClientName] = useState('');
  const [invoiceMsg, setInvoiceMsg] = useState('');

  const [formDate, setFormDate] = useState('');
  const [formVin, setFormVin] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPayment, setFormPayment] = useState('');
  const [formPaperTypes, setFormPaperTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function togglePaper(val: string) {
    if (val === 'none') {
      setFormPaperTypes((prev) =>
        prev.includes('none') ? [] : ['none']
      );
    } else {
      setFormPaperTypes((prev) => {
        const filtered = prev.filter((x) => x !== 'none');
        return filtered.includes(val)
          ? filtered.filter((x) => x !== val)
          : [...filtered, val];
      });
    }
  }

  async function load() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (searchVin) params.set('vin', searchVin);
      const qs = params.toString();
      const res = await api.get<QuincenaGroup[]>(`/car-jobs/grouped${qs ? `?${qs}` : ''}`);
      setGroupedData(res);
      setExpandedYear(null);
      setExpandedMonth(null);
      setExpandedPeriod(null);
    } catch {
      setError('Error al cargar trabajos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => {
    const map = new Map<string, { label: string; periods: QuincenaGroup[] }>();
    for (const g of groupedData) {
      const d = new Date(g.periodStartDate);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const yearKey = String(year);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthLabel = new Date(year, month).toLocaleDateString('es-ES', { month: 'long' });
      if (!map.has(yearKey)) {
        map.set(yearKey, { label: yearKey, periods: [] });
      }
    }
    const years = Array.from(map.entries()).sort(([a], [b]) => Number(b) - Number(a));
    const result: { year: string; months: { monthKey: string; label: string; periods: QuincenaGroup[] }[] }[] = [];
    for (const [yearKey] of years) {
      const monthsMap = new Map<string, { label: string; periods: QuincenaGroup[] }>();
      for (const g of groupedData) {
        const d = new Date(g.periodStartDate);
        if (d.getUTCFullYear() !== Number(yearKey)) continue;
        const month = d.getUTCMonth();
        const monthKey = `${yearKey}-${String(month).padStart(2, '0')}`;
        const monthLabel = new Date(d.getUTCFullYear(), month).toLocaleDateString('es-ES', { month: 'long' });
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, { label: monthLabel, periods: [] });
        }
        monthsMap.get(monthKey)!.periods.push(g);
      }
      result.push({
        year: yearKey,
        months: Array.from(monthsMap.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([monthKey, v]) => ({ ...v, monthKey })),
      });
    }
    return result;
  }, [groupedData]);

  function handleFilter(e: FormEvent) {
    e.preventDefault();
    load();
  }

  function resetForm() {
    setFormDate('');
    setFormVin('');
    setFormDesc('');
    setFormPayment('');
    setFormPaperTypes([]);
    setEditing(null);
    setShowForm(false);
    setError('');
    setSubmitting(false);
  }

  function startEdit(job: CarJob) {
    setEditing(job);
    setFormDate(job.date.split('T')[0]);
    setFormVin(job.vin);
    setFormDesc(job.description);
    setFormPayment(job.payment.toString());
    setFormPaperTypes(job.paperTypes || []);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        date: formDate,
        vin: formVin,
        description: formDesc,
        payment: parseFloat(formPayment),
        paperTypes: formPaperTypes.filter((t) => t !== 'none'),
      };

      if (editing) {
        await api.patch(`/car-jobs/${editing._id}`, payload);
      } else {
        await api.post('/car-jobs', payload);
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(job: CarJob) {
    if (!confirm(`¿Eliminar trabajo del ${formatDate(job.date)}?`)) return;
    try {
      await api.delete(`/car-jobs/${job._id}`);
      load();
    } catch {
      setError('Error al eliminar');
    }
  }

  async function handleGenerateInvoice(e: FormEvent) {
    e.preventDefault();
    if (!detailJob) return;
    try {
      await api.post('/invoices', {
        clientName: invoiceClientName,
        items: [
          {
            description: detailJob.description,
            amount: detailJob.payment,
            carJobId: detailJob._id,
            paperTypes: detailJob.paperTypes || [],
            date: detailJob.date,
          },
        ],
      });
      setInvoiceMsg(`Factura generada para ${invoiceClientName}`);
      setInvoiceClientName('');
      setTimeout(() => {
        setShowInvoiceForm(false);
        setInvoiceMsg('');
      }, 2000);
    } catch (err: any) {
      setInvoiceMsg(err.message || 'Error al generar factura');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2">
          <DateInput
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border bg-bg-page px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40 transition-colors w-full sm:w-auto"
          />
          <span className="text-text-muted text-sm">a</span>
          <DateInput
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border bg-bg-page px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40 transition-colors w-full sm:w-auto"
          />
          <input
            type="text"
            value={searchVin}
            onChange={(e) => setSearchVin(e.target.value)}
            placeholder="Buscar por VIN..."
            className="rounded-lg border border-border bg-bg-page px-3.5 py-2 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors w-full sm:w-44"
          />
          <button
            type="submit"
            className="p-2 text-text-muted hover:text-accent transition-colors"
          >
            <Search size={18} />
          </button>
        </form>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (startDate) params.set('startDate', startDate);
              if (endDate) params.set('endDate', endDate);
              if (searchVin) params.set('vin', searchVin);
              const qs = params.toString();
              downloadFromApi(
                `/accounting/export/car-jobs${qs ? `?${qs}` : ''}`,
                `trabajos-${new Date().toISOString().split('T')[0]}.xlsx`
              );
            }}
            className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors"
          >
            <FileDown size={16} />
            Exportar Excel
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Nuevo trabajo
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={resetForm}
        title={editing ? 'Editar trabajo' : 'Nuevo trabajo'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-text-muted text-sm mb-1">Fecha</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">VIN</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formVin}
                  onChange={(e) => setFormVin(e.target.value.toUpperCase())}
                  placeholder="Código VIN del vehículo"
                  required
                  className="flex-1 rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
                />
                <VinScanner
                  onScan={(vin) => setFormVin(vin.toUpperCase())}
                />
              </div>
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">
                Descripción
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Trabajo realizado"
                required
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">Pago</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formPayment}
                onChange={(e) => setFormPayment(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-2">Film used</label>
              <div className="space-y-1.5">
                {PAPER_OPTIONS.map((opt) => {
                  const checked = formPaperTypes.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                        checked
                          ? 'bg-accent/10 ring-1 ring-accent/40'
                          : 'hover:bg-bg-page'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePaper(opt.value)}
                        className="accent-accent"
                      />
                      <span className="text-text-body">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear trabajo'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-border text-text-muted px-5 py-2.5 text-sm hover:bg-bg-page transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {groupedData.length === 0 ? (
        <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
          <p className="text-text-muted">
            No hay trabajos registrados{startDate || endDate ? ' en este rango' : ''}.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border shadow-sm bg-surface overflow-hidden">
          {tree.map((yearGroup) => (
            <div key={yearGroup.year} className="border-b border-border last:border-0">
              <button
                onClick={() => setExpandedYear(expandedYear === yearGroup.year ? null : yearGroup.year)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg-page transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-text-muted transition-transform ${expandedYear === yearGroup.year ? '' : '-rotate-90'}`}
                  />
                  <span className="font-semibold text-text-body truncate">{yearGroup.year}</span>
                </div>
              </button>
              {expandedYear === yearGroup.year && (
                <div className="border-t border-border">
                  {yearGroup.months.map((monthGroup) => (
                    <div key={monthGroup.monthKey} className="border-b border-border last:border-0">
                      <button
                        onClick={() => setExpandedMonth(expandedMonth === monthGroup.monthKey ? null : monthGroup.monthKey)}
                        className="w-full flex items-center justify-between px-8 py-3 text-left hover:bg-bg-page transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-text-muted transition-transform ${expandedMonth === monthGroup.monthKey ? '' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-medium text-text-body">{monthGroup.label}</span>
                        </div>
                      </button>
                      {expandedMonth === monthGroup.monthKey && (
                        <div className="border-t border-border bg-bg-page/50">
                          {monthGroup.periods.map((group) => (
                            <div key={group.periodStartDate} className="border-b border-border last:border-0">
                              <button
                                onClick={() => setExpandedPeriod(expandedPeriod === group.periodStartDate ? null : group.periodStartDate)}
                                className="w-full flex items-center justify-between px-12 py-3 text-left hover:bg-bg-page transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <ChevronDown
                                    size={15}
                                    className={`shrink-0 text-text-muted transition-transform ${expandedPeriod === group.periodStartDate ? '' : '-rotate-90'}`}
                                  />
                                  <span className="text-sm text-accent font-medium">{group.label}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-text-muted shrink-0 ml-4">
                                  <span>{group.totalJobs} trabajo{group.totalJobs !== 1 ? 's' : ''}</span>
                                  <span className="font-medium text-text-body">{formatMoney(group.totalPayment)}</span>
                                </div>
                              </button>
                              {expandedPeriod === group.periodStartDate && (
                                <div className="overflow-x-auto border-t border-border">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">Fecha</th>
                                        <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">VIN</th>
                                        <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">Descripción</th>
                                        <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">Pago</th>
                                        <th className="text-center px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">Estado</th>
                                        <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.jobs.map((job, i) => (
                                        <tr
                                          key={job._id}
                                          onClick={() => setDetailJob(job)}
                                          className={`border-b border-border even:bg-bg-page cursor-pointer hover:bg-accent/5 transition-colors`}
                                        >
                                          <td className="px-4 py-3 text-sm text-text-body">{formatDate(job.date)}</td>
                                          <td className="px-4 py-3 text-sm font-mono text-text-body">{job.vin}</td>
                                          <td className="px-4 py-3 text-sm text-text-body max-w-xs truncate">{job.description}</td>
                                          <td className="px-4 py-3 text-sm text-text-body text-right font-medium">{formatMoney(job.payment)}</td>
                                          <td className="px-4 py-3 text-center">
                                            {job.closed ? (
                                              <span className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500">Cerrado</span>
                                            ) : (
                                              <span className="rounded-full px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">Abierto</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => startEdit(job)}
                                                className="p-1.5 text-text-muted hover:text-accent transition-colors"
                                                title="Editar"
                                                disabled={job.closed}
                                              >
                                                <Pencil size={16} />
                                              </button>
                                              <button
                                                onClick={() => handleDelete(job)}
                                                className="p-1.5 text-text-muted hover:text-danger transition-colors"
                                                title="Eliminar"
                                                disabled={job.closed}
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!detailJob}
        onClose={() => setDetailJob(null)}
        title="Detalle del trabajo"
      >
        {detailJob && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Fecha
              </p>
              <p className="text-text-body font-medium">
                {formatDate(detailJob.date)}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                VIN
              </p>
              <p className="text-text-body font-mono font-medium">
                {detailJob.vin}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Descripción
              </p>
              <p className="text-text-body whitespace-pre-wrap">
                {detailJob.description}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Pago
              </p>
              <p className="text-text-body font-semibold text-base">
                {formatMoney(detailJob.payment)}
              </p>
            </div>
            {(detailJob.paperTypes?.length ?? 0) > 0 && (
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                  Film used
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detailJob.paperTypes.map((pt) => {
                    const opt = PAPER_OPTIONS.find((o) => o.value === pt);
                    return (
                      <span
                        key={pt}
                        className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                      >
                        {opt?.label || pt}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Estado
              </p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  detailJob.closed
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {detailJob.closed ? 'Cerrado' : 'Abierto'}
              </span>
            </div>
            <button
              onClick={() => {
                setShowInvoiceForm(true);
                setInvoiceClientName('');
                setInvoiceMsg('');
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <FileText size={16} />
              Generar factura
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={showInvoiceForm}
        onClose={() => {
          setShowInvoiceForm(false);
          setInvoiceMsg('');
        }}
        title="Generar factura"
      >
        {invoiceMsg && (
          <div
            className={`rounded-lg px-4 py-3 text-sm mb-4 ${
              invoiceMsg.includes('generada')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {invoiceMsg}
          </div>
        )}
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div>
            <label className="block text-text-muted text-sm mb-1">
              Nombre del cliente
            </label>
            <input
              type="text"
              value={invoiceClientName}
              onChange={(e) => setInvoiceClientName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>
          {detailJob && (
            <div className="rounded-lg bg-bg-page p-3 space-y-1 text-sm">
              <p className="text-text-muted text-xs uppercase tracking-wider">
                Trabajo seleccionado
              </p>
              <p className="text-text-body font-medium">{detailJob.description}</p>
              <p className="text-text-body font-semibold">
                {formatMoney(detailJob.payment)}
              </p>
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Crear factura
          </button>
        </form>
      </Modal>
    </div>
  );
}

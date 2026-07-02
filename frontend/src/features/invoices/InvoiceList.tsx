'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { downloadFromApi } from '@/lib/download';
import type { CarJob, Invoice } from '@/types';
import { Plus, FileDown, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';

interface EmployeeEarning {
  employeeName: string;
  percentageApplied: number;
  amount: number;
  jobDescription: string;
  jobPayment: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [earnings, setEarnings] = useState<EmployeeEarning[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const [clientName, setClientName] = useState('');
  const [carJobs, setCarJobs] = useState<CarJob[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  async function load() {
    try {
      const res = await api.get<Invoice[]>('/invoices');
      setInvoices(res);
    } catch {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (showForm && carJobs.length === 0) {
      setLoadingJobs(true);
      api.get<CarJob[]>('/car-jobs')
        .then(setCarJobs)
        .catch(() => setError('Error al cargar trabajos'))
        .finally(() => setLoadingJobs(false));
    }
  }, [showForm]);

  useEffect(() => {
    if (!detailInvoice) { setEarnings([]); return; }
    setLoadingEarnings(true);
    api.get<EmployeeEarning[]>(`/invoices/${detailInvoice._id}/employee-earnings`)
      .then(setEarnings)
      .catch(() => {})
      .finally(() => setLoadingEarnings(false));
  }, [detailInvoice]);

  function resetForm() {
    setClientName('');
    setSelectedJobIds([]);
    setShowForm(false);
    setError('');
  }

  function toggleJobId(id: string) {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (selectedJobIds.length === 0) {
      setError('Debes seleccionar al menos un trabajo');
      return;
    }

    const items = selectedJobIds
      .map((id) => carJobs.find((j) => j._id === id))
      .filter((j): j is CarJob => !!j)
      .map((j) => ({
        description: j.description,
        amount: j.payment,
        carJobId: j._id,
        paperTypes: j.paperTypes || [],
      }));

    try {
      await api.post('/invoices', { clientName, items });
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Error al crear factura');
    }
  }

  async function handleDelete(invoice: Invoice) {
    if (!confirm(`¿Eliminar factura ${invoice.invoiceNumber}?`)) return;
    try {
      await api.delete(`/invoices/${invoice._id}`);
      load();
    } catch {
      setError('Error al eliminar');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <p className="text-text-muted text-sm">
          {invoices.length} factura{invoices.length !== 1 ? 's' : ''} registrada{invoices.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors self-start"
        >
          <Plus size={16} />
          Nueva factura
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border p-6 shadow-sm bg-surface mb-6 max-w-xl"
        >
          <h3 className="text-base font-heading font-semibold text-text-body mb-4">
            Nueva factura / garantía
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-text-muted text-sm mb-1">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-2">
                Trabajos realizados
              </label>
              {loadingJobs ? (
                <div className="text-text-muted text-sm py-2">
                  Cargando trabajos...
                </div>
              ) : carJobs.length === 0 ? (
                <div className="text-text-muted text-sm py-2">
                  No hay trabajos disponibles.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {carJobs.map((job) => {
                    const checked = selectedJobIds.includes(job._id);
                    return (
                      <label
                        key={job._id}
                        className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'bg-accent/10 ring-1 ring-accent/40'
                            : 'hover:bg-bg-page'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleJobId(job._id)}
                          className="mt-0.5 accent-accent"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-body font-medium truncate">
                            {job.description}
                          </p>
                          <p className="text-text-muted text-xs">
                            {formatDate(job.date)} — {formatMoney(job.payment)}
                          </p>
                          {job.paperTypes && job.paperTypes.length > 0 && (
                            <p className="text-text-muted text-xs mt-0.5">
                              {job.paperTypes.map((pt) => {
                                const labels: Record<string, string> = {
                                  premium: 'Premium',
                                  ceramic: 'Ceramic',
                                  ultra_ceramic: 'Ultra Cerámico',
                                };
                                return labels[pt] || pt;
                              }).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-text-body font-medium whitespace-nowrap">
                          {formatMoney(job.payment)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedJobIds.length > 0 && (
                <div className="mt-2 text-sm text-text-muted">
                  {selectedJobIds.length} trabajo{selectedJobIds.length !== 1 ? 's' : ''} seleccionado{selectedJobIds.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Crear factura
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
      )}

      {invoices.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
          <p className="text-text-muted">
            No hay facturas registradas. Crea la primera.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  No. Factura
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Total
                </th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv._id}
                  onClick={() => setDetailInvoice(inv)}
                  className={`border-b border-border even:bg-bg-page cursor-pointer hover:bg-accent/5 transition-colors`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-text-body">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {inv.clientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {formatDate(inv.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body text-right font-medium">
                    {formatMoney(inv.total)}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          downloadFromApi(
                            `/invoices/${inv._id}/pdf`,
                            `factura-${inv.invoiceNumber}.pdf`
                          )
                        }
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Descargar PDF"
                      >
                        <FileDown size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="p-1.5 text-text-muted hover:text-danger transition-colors"
                        title="Eliminar"
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

      <Modal
        open={!!detailInvoice}
        onClose={() => { setDetailInvoice(null); setEarnings([]); }}
        title={`Factura ${detailInvoice?.invoiceNumber || ''}`}
      >
        {detailInvoice && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Cliente
              </p>
              <p className="text-text-body font-medium">{detailInvoice.clientName}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Fecha
              </p>
              <p className="text-text-body">{formatDate(detailInvoice.date)}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Servicios
              </p>
              {detailInvoice.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1 border-b border-border last:border-0"
                >
                  <span className="text-text-body">{item.description}</span>
                  <span className="text-text-body font-medium">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-text-body font-semibold">Total</span>
              <span className="text-text-body font-semibold text-base">
                {formatMoney(detailInvoice.total)}
              </span>
            </div>

            {(loadingEarnings || earnings.length > 0) && (
              <div className="pt-3 border-t border-border">
                <p className="text-text-muted text-xs uppercase tracking-wider mb-2">
                  Ganancias empleados
                </p>
                {loadingEarnings ? (
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pr-2 py-1.5 text-text-muted font-medium">Empleado</th>
                          <th className="text-left pr-2 py-1.5 text-text-muted font-medium">Trabajo</th>
                          <th className="text-right pr-2 py-1.5 text-text-muted font-medium">%</th>
                          <th className="text-right py-1.5 text-text-muted font-medium">Ganancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.map((e, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="pr-2 py-1.5 text-text-body">{e.employeeName}</td>
                            <td className="pr-2 py-1.5 text-text-muted max-w-[120px] truncate">{e.jobDescription}</td>
                            <td className="pr-2 py-1.5 text-text-body text-right">{e.percentageApplied}%</td>
                            <td className="py-1.5 text-text-body text-right font-medium">{formatMoney(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                downloadFromApi(
                  `/invoices/${detailInvoice._id}/pdf`,
                  `factura-${detailInvoice.invoiceNumber}.pdf`
                );
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <FileDown size={16} />
              Descargar PDF
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

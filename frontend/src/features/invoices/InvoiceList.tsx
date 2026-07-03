'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { downloadFromApi } from '@/lib/download';
import type { CarJob, Invoice } from '@/types';
import { Plus, FileDown, Printer, Trash2, Eye, Search } from 'lucide-react';
import Modal from '@/components/Modal';

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

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);

  const [clientName, setClientName] = useState('');
  const [carJobs, setCarJobs] = useState<CarJob[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [search, setSearch] = useState('');

  async function load(clientFilter?: string) {
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set('clientName', clientFilter);
      const qs = params.toString();
      const res = await api.get<Invoice[]>(`/invoices${qs ? `?${qs}` : ''}`);
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
        date: j.date,
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
        <div className="flex items-center gap-2">
          <p className="text-text-muted text-sm">
            {invoices.length} factura{invoices.length !== 1 ? 's' : ''} registrada{invoices.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente..."
              className="w-48 rounded-lg border border-border bg-bg-page px-3 py-2 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              onKeyDown={(e) => { if (e.key === 'Enter') load(search); }}
            />
            <button
              onClick={() => load(search)}
              className="p-2 text-text-muted hover:text-accent transition-colors"
            >
              <Search size={18} />
            </button>
          </div>
        </div>
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
                        onClick={() => {
                          const token = localStorage.getItem('token');
                          window.open(
                            `${process.env.NEXT_PUBLIC_API_URL}/invoices/${inv._id}/pdf?token=${token}`,
                            '_blank'
                          );
                        }}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Ver factura"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() =>
                          downloadFromApi(
                            `/invoices/${inv._id}/pdf?download=true`,
                            `factura-${inv.invoiceNumber}.pdf`
                          )
                        }
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Descargar PDF"
                      >
                        <FileDown size={16} />
                      </button>
                      <button
                        onClick={() =>
                          downloadFromApi(
                            `/invoices/${inv._id}/escpos`,
                            `factura-${inv.invoiceNumber}.prn`
                          )
                        }
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Descargar ESC/POS (.prn)"
                      >
                        <Printer size={16} />
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
        onClose={() => setDetailInvoice(null)}
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
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  window.open(
                    `${process.env.NEXT_PUBLIC_API_URL}/invoices/${detailInvoice._id}/pdf?token=${token}`,
                    '_blank'
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-accent text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/5 transition-colors"
              >
                <Eye size={16} />
                Ver factura
              </button>
              <button
                onClick={() => {
                  downloadFromApi(
                    `/invoices/${detailInvoice._id}/pdf?download=true`,
                    `factura-${detailInvoice.invoiceNumber}.pdf`
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <FileDown size={16} />
                Descargar
              </button>
              <button
                onClick={() => {
                  downloadFromApi(
                    `/invoices/${detailInvoice._id}/escpos`,
                    `factura-${detailInvoice.invoiceNumber}.prn`
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-accent text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/5 transition-colors"
              >
                <Printer size={16} />
                ESC/POS
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

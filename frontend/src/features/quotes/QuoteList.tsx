'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { downloadFromApi, openPdfFromApi } from '@/lib/download';
import type { Quote } from '@/types';
import { Plus, FileDown, Trash2, Eye, X, Pencil } from 'lucide-react';
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
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface DraftItem {
  ancho: string;
  alto: string;
  unidades: string;
  nota: string;
}

function sqFtOf(item: DraftItem) {
  const ancho = parseFloat(item.ancho);
  const alto = parseFloat(item.alto);
  const unidades = parseFloat(item.unidades);
  if (!ancho || !alto || !unidades) return 0;
  return round2((ancho * alto * unidades) / 144);
}

export default function QuoteList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);

  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { ancho: '', alto: '', unidades: '1', nota: '' },
  ]);
  const [pricePerSqFt, setPricePerSqFt] = useState('');

  async function load() {
    try {
      const res = await api.get<Quote[]>('/quotes');
      setQuotes(res);
    } catch {
      setError('Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setClientName('');
    setItems([{ ancho: '', alto: '', unidades: '1', nota: '' }]);
    setPricePerSqFt('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  function startEdit(quote: Quote) {
    setClientName(quote.clientName);
    setItems(
      quote.items.map((it) => ({
        ancho: String(it.ancho),
        alto: String(it.alto),
        unidades: String(it.unidades),
        nota: it.nota || '',
      }))
    );
    setPricePerSqFt(String(quote.pricePerSqFt));
    setEditingId(quote._id);
    setError('');
    setShowForm(true);
  }

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ancho: '', alto: '', unidades: '1', nota: '' }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalSqFt = round2(items.reduce((sum, it) => sum + sqFtOf(it), 0));
  const priceNum = parseFloat(pricePerSqFt);
  const total = round2(priceNum * totalSqFt);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (items.some((it) => !parseFloat(it.ancho) || !parseFloat(it.alto))) {
      setError('Completa ancho y alto de cada fila');
      return;
    }
    if (!priceNum) {
      setError('Ingresa el precio por pie cuadrado');
      return;
    }

    try {
      const payload = {
        clientName,
        items: items.map((it) => ({
          ancho: parseFloat(it.ancho),
          alto: parseFloat(it.alto),
          unidades: parseFloat(it.unidades) || 1,
          nota: it.nota,
        })),
        pricePerSqFt: priceNum,
      };
      if (editingId) {
        await api.put(`/quotes/${editingId}`, payload);
      } else {
        await api.post('/quotes', payload);
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Error al guardar cotización');
    }
  }

  async function handleDelete(quote: Quote) {
    if (!confirm(`¿Eliminar cotización ${quote.quoteNumber}?`)) return;
    try {
      await api.delete(`/quotes/${quote._id}`);
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
          {quotes.length} cotización{quotes.length !== 1 ? 'es' : ''} registrada{quotes.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors self-start"
        >
          <Plus size={16} />
          Nueva cotización
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
          className="rounded-xl border border-border p-6 shadow-sm bg-surface mb-6 max-w-2xl"
        >
          <h3 className="text-base font-heading font-semibold text-text-body mb-4">
            {editingId ? 'Editar cotización' : 'Nueva cotización'}
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
                Medidas en pulgadas
              </label>
              <div className="rounded-lg border border-border bg-bg-page">
                <div className="grid grid-cols-[1fr_1fr_0.7fr_0.5fr] gap-px border-b border-border bg-border">
                  <div className="px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Ancho (pulg)
                  </div>
                  <div className="px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Alto (pulg)
                  </div>
                  <div className="px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Unidades
                  </div>
                  <div className="px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider text-right">
                    Pies²
                  </div>
                </div>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_0.7fr_0.5fr] gap-px border-b border-border last:border-0 bg-border"
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.ancho}
                      onChange={(e) => updateItem(index, 'ancho', e.target.value)}
                      placeholder="5"
                      className="w-full bg-bg-page px-3 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.alto}
                      onChange={(e) => updateItem(index, 'alto', e.target.value)}
                      placeholder="4.3"
                      className="w-full bg-bg-page px-3 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.unidades}
                      onChange={(e) => updateItem(index, 'unidades', e.target.value)}
                      className="w-full bg-bg-page px-3 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <div className="flex items-center justify-end gap-1 bg-bg-page px-3 py-2.5">
                      <span className="text-sm text-text-body font-medium tabular-nums">
                        {sqFtOf(item).toFixed(2)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-0.5 text-text-muted hover:text-danger transition-colors"
                          title="Quitar fila"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-1.5">
                {items.map((item, index) => (
                  <input
                    key={index}
                    type="text"
                    value={item.nota}
                    onChange={(e) => updateItem(index, 'nota', e.target.value)}
                    placeholder={`Nota opcional fila ${index + 1} (ej: parabrisas delantero)`}
                    className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent font-medium hover:text-accent/80 transition-colors"
              >
                <Plus size={16} />
                Agregar fila
              </button>
            </div>

            <div>
              <label className="block text-text-muted text-sm mb-1">
                Precio por pie cuadrado (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerSqFt}
                onChange={(e) => setPricePerSqFt(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>

            <div className="rounded-lg border border-border bg-bg-page p-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total pies²</span>
                <span className="text-text-body font-medium tabular-nums">
                  {totalSqFt.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-text-body font-semibold">Total estimado</span>
                <span className="text-text-body font-semibold text-base tabular-nums">
                  {isNaN(total) || total <= 0 ? '—' : formatMoney(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              {editingId ? 'Guardar cambios' : 'Crear cotización'}
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

      {quotes.length === 0 && !showForm ? (
        <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
          <p className="text-text-muted">
            No hay cotizaciones registradas. Crea la primera.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  No. Cotización
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Pies²
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
              {quotes.map((q) => (
                <tr
                  key={q._id}
                  onClick={() => setDetailQuote(q)}
                  className="border-b border-border even:bg-bg-page cursor-pointer hover:bg-accent/5 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-text-body">
                    {q.quoteNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {q.clientName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {formatDate(q.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body text-right tabular-nums">
                    {q.totalSqFt.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body text-right font-medium tabular-nums">
                    {formatMoney(q.total)}
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openPdfFromApi(`/quotes/${q._id}/pdf`)}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Ver cotización"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          downloadFromApi(
                            `/quotes/${q._id}/pdf?download=true`,
                            `cotizacion-${q.quoteNumber}.pdf`
                          )
                        }}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Descargar PDF"
                      >
                        <FileDown size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
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
        open={!!detailQuote}
        onClose={() => setDetailQuote(null)}
        title={`Cotización ${detailQuote?.quoteNumber || ''}`}
      >
        {detailQuote && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Cliente
              </p>
              <p className="text-text-body font-medium">{detailQuote.clientName}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Fecha
              </p>
              <p className="text-text-body">{formatDate(detailQuote.date)}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-0.5">
                Medidas
              </p>
              <div className="rounded-lg border border-border bg-bg-page overflow-hidden">
                <div className="grid grid-cols-[1fr_0.6fr_0.7fr] gap-px border-b border-border bg-border">
                  <div className="px-3 py-1.5 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Measure
                  </div>
                  <div className="px-3 py-1.5 text-text-muted text-xs font-medium uppercase tracking-wider text-center">
                    Units
                  </div>
                  <div className="px-3 py-1.5 text-text-muted text-xs font-medium uppercase tracking-wider text-right">
                    Square feet
                  </div>
                </div>
                {detailQuote.items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_0.6fr_0.7fr] gap-px border-b border-border last:border-0 bg-border"
                  >
                    <div className="bg-bg-page px-3 py-2 text-sm text-text-body">
                      {item.ancho} inches x {item.alto} inches
                    </div>
                    <div className="bg-bg-page px-3 py-2 text-sm text-text-body text-center">
                      {item.unidades}
                    </div>
                    <div className="bg-bg-page px-3 py-2 text-sm text-text-body text-right font-medium tabular-nums">
                      {item.sqFt.toFixed(2)}
                    </div>
                  </div>
                ))}
                {detailQuote.items.some((item) => item.nota) && (
                  <div className="space-y-1 p-3">
                    {detailQuote.items.map((item, i) =>
                      item.nota ? (
                        <p key={i} className="text-text-muted text-xs">
                          Nota: {item.nota}
                        </p>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
              <div className="rounded-lg border border-border bg-bg-page p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total square feet</span>
                <span className="text-text-body tabular-nums">{detailQuote.totalSqFt.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Price per square foot</span>
                <span className="text-text-body tabular-nums">{formatMoney(detailQuote.pricePerSqFt)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-text-body font-semibold">Total</span>
              <span className="text-text-body font-semibold text-base tabular-nums">
                {formatMoney(detailQuote.total)}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => openPdfFromApi(`/quotes/${detailQuote._id}/pdf`)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-accent text-accent px-4 py-2.5 text-sm font-medium hover:bg-accent/5 transition-colors"
              >
                <Eye size={16} />
                Ver cotización
              </button>
              <button
                onClick={() => {
                  downloadFromApi(
                    `/quotes/${detailQuote._id}/pdf?download=true`,
                    `cotizacion-${detailQuote.quoteNumber}.pdf`
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <FileDown size={16} />
                Descargar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { usePaperTypes } from '@/lib/usePaperTypes';
import type { PaperType } from '@/types';
import Modal from '@/components/Modal';
import { Plus, Pencil, Power, PowerOff, Check } from 'lucide-react';

export default function PaperTypeList() {
  const { paperTypes, loading, error, reload } = usePaperTypes();

  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PaperType | null>(null);
  const [label, setLabel] = useState('');
  const [specs, setSpecs] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditing(null);
    setLabel('');
    setSpecs('');
    setActionError('');
    setShowForm(true);
  }

  function openEdit(paper: PaperType) {
    setEditing(paper);
    setLabel(paper.label);
    setSpecs(paper.specs);
    setActionError('');
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setActionError('');
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/paper-types/${editing._id}`, { label, specs });
        setMessage('Papel actualizado');
      } else {
        await api.post('/paper-types', { label, specs });
        setMessage('Papel creado');
      }
      setShowForm(false);
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(paper: PaperType) {
    setActionError('');
    setMessage('');
    try {
      await api.patch(`/paper-types/${paper._id}/toggle-active`);
      setMessage(paper.active ? 'Papel desactivado' : 'Papel activado');
      await reload();
    } catch (err: any) {
      setActionError(err.message || 'Error al cambiar el estado');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-text-muted text-sm max-w-xl">
          Los papeles desactivados no aparecen al crear trabajos nuevos, pero se
          conservan en las facturas ya emitidas.
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo papel
        </button>
      </div>

      {message && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700 text-sm">
          <Check size={16} />
          {message}
        </div>
      )}

      {(error || actionError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {actionError || error}
        </div>
      )}

      <div className="rounded-xl border border-border shadow-sm bg-surface overflow-hidden">
        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Cargando…</p>
        ) : paperTypes.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No hay tipos de papel configurados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-2.5 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Especificaciones
                  </th>
                  <th className="text-left px-4 py-2.5 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-4 py-2.5 text-text-muted text-xs font-medium uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paperTypes.map((paper) => (
                  <tr
                    key={paper._id}
                    className={`border-b border-border last:border-0 ${
                      paper.active ? '' : 'opacity-60'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-text-body font-medium">
                      {paper.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {paper.specs || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          paper.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {paper.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(paper)}
                          className="p-1.5 text-text-muted hover:text-accent transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(paper)}
                          className="p-1.5 text-text-muted hover:text-accent transition-colors"
                          title={paper.active ? 'Desactivar' : 'Activar'}
                        >
                          {paper.active ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar papel' : 'Nuevo papel'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-text-muted text-sm mb-1">Nombre</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={80}
              placeholder="Ej: Ceramic Film"
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-text-muted text-sm mb-1">
              Especificaciones
            </label>
            <textarea
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Ej: Solar rejection: 70%, UV protection: 100%, Warranty: 5 years"
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-y"
            />
            <p className="text-xs text-text-muted mt-1">
              Se imprimen en la factura junto al nombre del papel.
            </p>
          </div>

          {actionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {actionError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border text-text-muted px-5 py-2.5 text-sm hover:bg-bg-page transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Employee } from '@/types';
import { Pencil, Trash2, UserCheck, UserX, Plus, FileDown } from 'lucide-react';
import { downloadFromApi } from '@/lib/download';
import Modal from '@/components/Modal';

interface EmployeeListData {
  employees: Employee[];
  bossPercentage: number;
  totalActivePercentage: number;
}

function formatPercent(p: number) {
  return `${p.toFixed(1)}%`;
}

export default function EmployeeList() {
  const [data, setData] = useState<EmployeeListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [error, setError] = useState('');
  const [pdfTarget, setPdfTarget] = useState<Employee | null>(null);
  const [pdfMonth, setPdfMonth] = useState((new Date().getMonth() + 1).toString());
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear().toString());

  async function load() {
    try {
      const res = await api.get<EmployeeListData>('/employees');
      setData(res);
    } catch {
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName('');
    setPercentage('');
    setError('');
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(emp: Employee) {
    setEditing(emp);
    setName(emp.name);
    setPercentage(emp.percentage.toString());
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editing) {
        await api.patch(`/employees/${editing._id}`, {
          name,
          percentage: parseFloat(percentage),
        });
      } else {
        await api.post('/employees', {
          name,
          percentage: parseFloat(percentage),
        });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    }
  }

  async function handleToggleActive(emp: Employee) {
    try {
      await api.patch(`/employees/${emp._id}/toggle-active`);
      load();
    } catch {
      setError('Error al cambiar estado');
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`¿Eliminar a ${emp.name}?`)) return;
    try {
      await api.delete(`/employees/${emp._id}`);
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

  const employees = data?.employees || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-x-6">
          <p className="text-text-muted text-sm">
            Porcentaje jefe:{' '}
            <span className="font-semibold text-text-body">
              {formatPercent(data?.bossPercentage ?? 100)}
            </span>
          </p>
          <p className="text-text-muted text-sm">
            Reparto empleados:{' '}
            <span className="font-semibold text-text-body">
              {formatPercent(data?.totalActivePercentage ?? 0)}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo empleado
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
          className="rounded-xl border border-border p-6 shadow-sm bg-surface mb-6 max-w-lg"
        >
          <h3 className="text-base font-heading font-semibold text-text-body mb-4">
            {editing ? 'Editar empleado' : 'Nuevo empleado'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-text-muted text-sm mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">
                Porcentaje (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              {editing ? 'Guardar cambios' : 'Crear empleado'}
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

      {employees.length === 0 ? (
        <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
          <p className="text-text-muted">
            No hay empleados registrados. Crea el primero.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Porcentaje
                </th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => (
                <tr
                  key={emp._id}
                  className={`border-b border-border even:bg-bg-page`}
                >
                  <td className="px-4 py-3 text-sm text-text-body">
                    {emp.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {formatPercent(emp.percentage)}
                  </td>
                  <td className="px-4 py-3">
                    {emp.active ? (
                      <span className="rounded-full px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(emp)}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setPdfTarget(emp);
                          setPdfMonth((new Date().getMonth() + 1).toString());
                          setPdfYear(new Date().getFullYear().toString());
                        }}
                        className="p-1.5 text-text-muted hover:text-success transition-colors"
                        title="Descargar PDF"
                      >
                        <FileDown size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className="p-1.5 text-text-muted hover:text-accent transition-colors"
                        title={emp.active ? 'Desactivar' : 'Activar'}
                      >
                        {emp.active ? (
                          <UserX size={16} />
                        ) : (
                          <UserCheck size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(emp)}
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
        open={!!pdfTarget}
        onClose={() => setPdfTarget(null)}
        title={`PDF - ${pdfTarget?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-muted text-sm mb-1">Mes</label>
              <select
                value={pdfMonth}
                onChange={(e) => setPdfMonth(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              >
                {[
                  { value: '1', label: 'Enero' },
                  { value: '2', label: 'Febrero' },
                  { value: '3', label: 'Marzo' },
                  { value: '4', label: 'Abril' },
                  { value: '5', label: 'Mayo' },
                  { value: '6', label: 'Junio' },
                  { value: '7', label: 'Julio' },
                  { value: '8', label: 'Agosto' },
                  { value: '9', label: 'Septiembre' },
                  { value: '10', label: 'Octubre' },
                  { value: '11', label: 'Noviembre' },
                  { value: '12', label: 'Diciembre' },
                ].map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-text-muted text-sm mb-1">Año</label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={pdfYear}
                onChange={(e) => setPdfYear(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (!pdfTarget) return;
              downloadFromApi(
                `/employees/${pdfTarget._id}/pdf?year=${pdfYear}&month=${pdfMonth}`,
                `pago-${pdfTarget.name}-${pdfYear}-${pdfMonth.padStart(2, '0')}.pdf`
              );
              setPdfTarget(null);
            }}
            className="w-full rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Descargar PDF
          </button>
        </div>
      </Modal>
    </div>
  );
}

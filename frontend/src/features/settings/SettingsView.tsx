'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, ShieldOff, Key, Check, Plus, Trash2, Save, Pencil } from 'lucide-react';

interface FixedExpense {
  _id: string;
  name: string;
  amount: number;
}

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [feMessage, setFeMessage] = useState('');
  const [feError, setFeError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  async function loadFixedExpenses() {
    try {
      const data = await api.get<FixedExpense[]>('/fixed-expenses');
      setFixedExpenses(data);
    } catch {
      setFeError('Error al cargar gastos fijos');
    }
  }

  useEffect(() => { loadFixedExpenses(); }, []);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setMessage('Contraseña actualizada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña');
    }
  }

  async function handleUnlock() {
    setUnlocking(true);
    setError('');
    setMessage('');

    try {
      await api.post('/auth/unlock');
      setMessage('Cuenta desbloqueada exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al desbloquear');
    } finally {
      setUnlocking(false);
    }
  }

  const isLocked = user?.lockedUntil
    ? new Date(user.lockedUntil) > new Date()
    : false;

  async function handleAddFixedExpense(e: FormEvent) {
    e.preventDefault();
    setFeError('');
    setFeMessage('');
    try {
      await api.post('/fixed-expenses', {
        name: newName,
        amount: parseFloat(newAmount),
      });
      setNewName('');
      setNewAmount('');
      setFeMessage('Gasto fijo agregado');
      loadFixedExpenses();
    } catch (err: any) {
      setFeError(err.message || 'Error al agregar');
    }
  }

  async function handleUpdateFixedExpense(id: string) {
    setFeError('');
    setFeMessage('');
    try {
      await api.patch(`/fixed-expenses/${id}`, {
        name: editName,
        amount: parseFloat(editAmount),
      });
      setEditingId(null);
      setFeMessage('Gasto fijo actualizado');
      loadFixedExpenses();
    } catch (err: any) {
      setFeError(err.message || 'Error al actualizar');
    }
  }

  async function handleDeleteFixedExpense(id: string) {
    if (!confirm('¿Eliminar este gasto fijo?')) return;
    setFeError('');
    setFeMessage('');
    try {
      await api.delete(`/fixed-expenses/${id}`);
      setFeMessage('Gasto fijo eliminado');
      loadFixedExpenses();
    } catch (err: any) {
      setFeError(err.message || 'Error al eliminar');
    }
  }

  function startEdit(fe: FixedExpense) {
    setEditingId(fe._id);
    setEditName(fe.name);
    setEditAmount(String(fe.amount));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
        <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
          Información de cuenta
        </h2>

        <div className="space-y-3">
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Nombre
            </p>
            <p className="text-text-body text-sm">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Correo
            </p>
            <p className="text-text-body text-sm">{user?.email}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Miembro desde
            </p>
            <p className="text-text-body text-sm">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('es-ES', { timeZone: 'UTC' })
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Último acceso
            </p>
            <p className="text-text-body text-sm">
              {user?.lastLogin
                ? new Date(user.lastLogin).toLocaleString('es-ES')
                : 'Nunca'}
            </p>
          </div>
        </div>

        {isLocked && (
          <div className="mt-4 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
            <ShieldOff size={18} className="text-orange-600 shrink-0" />
            <div className="flex-1">
              <p className="text-orange-800 text-sm font-medium">
                Cuenta bloqueada
              </p>
              <p className="text-orange-600 text-xs">
                Bloqueada hasta{' '}
                {user?.lockedUntil
                  ? new Date(user.lockedUntil).toLocaleString('es-ES')
                  : ''}
              </p>
            </div>
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {unlocking ? 'Desbloqueando...' : 'Desbloquear'}
            </button>
          </div>
        )}

        {!isLocked && (
          <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">
            <Shield size={18} />
            <span className="text-sm font-medium">Cuenta activa</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
        <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
          Cambiar contraseña
        </h2>

        {message && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700 text-sm mb-4">
            <Check size={16} />
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-text-muted text-sm mb-1">
              Contraseña actual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-text-muted text-sm mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Key size={16} />
            Cambiar contraseña
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
        <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
          Gastos fijos mensuales
        </h2>

        <p className="text-text-muted text-xs mb-4">
          Se dividen automáticamente en cada quincena (mitad en Q1, mitad en Q2).
          Al guardar cambios, recalcula los periodos abiertos para que se reflejen.
        </p>

        {feMessage && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700 text-sm mb-4">
            <Check size={16} />
            {feMessage}
          </div>
        )}

        {feError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
            {feError}
          </div>
        )}

        <form onSubmit={handleAddFixedExpense} className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-text-muted text-xs mb-1">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Ej: RENTA LOCACION"
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            />
          </div>
          <div className="w-36">
            <label className="block text-text-muted text-xs mb-1">Monto total</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Agregar
          </button>
        </form>

        {fixedExpenses.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            No hay gastos fijos configurados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Nombre</th>
                  <th className="text-right px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Total</th>
                  <th className="text-right px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Por quincena</th>
                  <th className="text-right px-3 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fixedExpenses.map((fe) => (
                  <tr key={fe._id} className="border-b border-border even:bg-bg-page">
                    {editingId === fe._id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-border bg-bg-page px-2 py-1.5 text-sm text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-28 rounded border border-border bg-bg-page px-2 py-1.5 text-sm text-text-body text-right outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-text-body">
                          ${(parseFloat(editAmount || '0') / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleUpdateFixedExpense(fe._id)}
                              className="p-1.5 text-accent hover:text-accent/80 transition-colors"
                              title="Guardar"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-text-muted hover:text-text-body transition-colors"
                              title="Cancelar"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-sm text-text-body">{fe.name}</td>
                        <td className="px-3 py-2 text-sm text-text-body text-right">${fe.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-sm text-text-body text-right">${(fe.amount / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(fe)}
                              className="p-1.5 text-text-muted hover:text-accent transition-colors"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteFixedExpense(fe._id)}
                              className="p-1.5 text-text-muted hover:text-danger transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

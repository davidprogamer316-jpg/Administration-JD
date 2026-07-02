'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, ShieldOff, Key, Check } from 'lucide-react';

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

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
    </div>
  );
}

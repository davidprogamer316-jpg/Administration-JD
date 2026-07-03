'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace('/dashboard');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLocked(false);
    setLoading(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          setLocked(true);
        }
        setError(err.message);
      } else {
        setError('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/8 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 blur-3xl pointer-events-none" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent text-2xl font-bold font-heading flex items-center justify-center ring-1 ring-accent/20 mb-4">
            T
          </div>
          <h1 className="text-white text-xl font-heading font-semibold">
            Tinting-JD
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Iniciar sesión
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5"
        >
          {locked && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-400/30 rounded-xl px-4 py-3">
              <ShieldOff size={18} className="text-orange-400 shrink-0" />
              <p className="text-orange-300 text-sm">
                Cuenta bloqueada por demasiados intentos. Intenta de nuevo más
                tarde.
              </p>
            </div>
          )}

          {error && !locked && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-white/50 text-sm mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-sm mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent text-brand font-semibold px-4 py-3 w-full hover:bg-accent/90 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          &copy; {new Date().getFullYear()} Tinting-JD
        </p>
      </div>
    </div>
  );
}

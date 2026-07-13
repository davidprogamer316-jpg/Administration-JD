'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Car,
  Calculator,
  FileText,
  Settings,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounting', label: 'Contabilidad', icon: Calculator },
  { href: '/employees', label: 'Empleados', icon: Users },
  { href: '/car-jobs', label: 'Trabajos', icon: Car },
  { href: '/invoices', label: 'Facturación', icon: FileText },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        className="fixed top-4 left-4 z-50 md:hidden p-3 rounded-lg bg-brand text-white"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 bg-brand shadow-lg transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent text-sm font-bold font-heading flex items-center justify-center">
            T
          </div>
          <span className="text-white/90 font-heading font-semibold text-sm">
            Tinting-JD
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-white/15 text-accent font-medium'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`}
              >
                {active && (
                  <span className="absolute left-0 w-1 h-5 rounded-r-full bg-accent" />
                )}
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-sm font-medium">
              {user.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/80 text-sm font-medium truncate">
                {user.fullName}
              </p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm transition-colors w-full"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

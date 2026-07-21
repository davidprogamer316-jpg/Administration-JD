'use client';

import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AccountingPeriod } from '@/types';
import {
  Lock,
  Search,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import { downloadFromApi } from '@/lib/download';
import DateInput from '@/components/DateInput';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodLabel(p: AccountingPeriod) {
  return `Q${p.periodNumber} (${formatDate(p.periodStartDate)} - ${formatDate(p.periodEndDate)})`;
}

type YearGroup = {
  year: number;
  months: MonthGroup[];
};

type MonthGroup = {
  monthKey: string; // "YYYY-MM"
  label: string;
  periods: AccountingPeriod[];
};

function groupPeriods(periods: AccountingPeriod[]): YearGroup[] {
  const map = new Map<string, AccountingPeriod[]>();
  for (const p of periods) {
    const d = new Date(p.periodStartDate);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const yearsMap = new Map<number, MonthGroup[]>();
  for (const [monthKey, per] of map) {
    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr);
    const month = parseInt(mStr);
    const d = new Date(year, month);
    const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const group: MonthGroup = { monthKey, label, periods: per };
    if (!yearsMap.has(year)) yearsMap.set(year, []);
    yearsMap.get(year)!.push(group);
  }

  return Array.from(yearsMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: months.sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    }));
}

export default function AccountingList() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString();
      const res = await api.get<AccountingPeriod[]>(
        `/accounting${qs ? `?${qs}` : ''}`
      );
      setPeriods(res);
    } catch {
      setError('Error al cargar periodos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleFilter(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleClose(id: string) {
    if (!confirm('¿Cerrar este periodo? No se podrá modificar después.')) return;
    try {
      await api.patch(`/accounting/${id}/close`);
      load();
    } catch {
      setError('Error al cerrar periodo');
    }
  }

  const tree = useMemo(() => groupPeriods(periods), [periods]);

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
          <button
            type="submit"
            className="p-2 text-text-muted hover:text-accent transition-colors"
          >
            <Search size={18} />
          </button>
        </form>
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            const qs = params.toString();
            downloadFromApi(
              `/accounting/export/excel${qs ? `?${qs}` : ''}`,
              `contabilidad-${new Date().toISOString().split('T')[0]}.xlsx`
            );
          }}
          className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors cursor-pointer"
        >
          <FileDown size={16} />
          Exportar Excel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      {periods.length === 0 ? (
        <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
          <p className="text-text-muted">
            No hay periodos contables. Los periodos se crean automáticamente al
            registrar trabajos de carro.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border shadow-sm bg-surface overflow-hidden">
          {tree.map((yearGroup) => {
            const yearOpen = expandedYears.has(yearGroup.year);
            return (
              <div key={yearGroup.year} className="border-b border-border last:border-0">
                {/* Year header */}
                <button
                  onClick={() => toggleYear(yearGroup.year)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-page transition-colors cursor-pointer"
                >
                  <span className="text-base font-heading font-semibold text-text-body">
                    {yearGroup.year}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-text-muted transition-transform ${
                      yearOpen ? '' : '-rotate-90'
                    }`}
                  />
                </button>

                {yearOpen && (
                  <div className="border-t border-border">
                    {yearGroup.months.map((monthGroup) => {
                      const monthOpen = expandedMonths.has(monthGroup.monthKey);
                      return (
                        <div key={monthGroup.monthKey} className="border-b border-border last:border-0">
                          {/* Month header */}
                          <button
                            onClick={() => toggleMonth(monthGroup.monthKey)}
                            className="w-full flex items-center justify-between px-8 py-3 text-left hover:bg-bg-page transition-colors cursor-pointer"
                          >
                            <span className="text-sm font-medium text-text-body">
                              {monthGroup.label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted">
                                {monthGroup.periods.length} {monthGroup.periods.length === 1 ? 'periodo' : 'periodos'}
                              </span>
                              <ChevronDown
                                size={15}
                                className={`shrink-0 text-text-muted transition-transform ${
                                  monthOpen ? '' : '-rotate-90'
                                }`}
                              />
                            </div>
                          </button>

                          {monthOpen && (
                            <div className="border-t border-border bg-bg-page/50">
                              {monthGroup.periods.map((p) => (
                                <div
                                  key={p._id}
                                  className="flex items-center justify-between px-12 py-3 hover:bg-bg-page transition-colors border-b border-border last:border-0"
                                >
                                  <Link
                                    href={`/accounting/${p._id}`}
                                    className="text-accent hover:text-accent/80 hover:underline font-medium text-sm transition-colors"
                                  >
                                    {periodLabel(p)}
                                  </Link>
                                  <div className="flex items-center gap-3">
                                    {p.closed ? (
                                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                                        Cerrado
                                      </span>
                                    ) : (
                                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                                        Abierto
                                      </span>
                                    )}
                                    {!p.closed && (
                                      <button
                                        onClick={() => handleClose(p._id)}
                                        className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                                        title="Cerrar periodo"
                                      >
                                        <Lock size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

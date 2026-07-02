'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AccountingPeriod } from '@/types';
import {
  Lock,
  Search,
  FileDown,
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

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

function periodLabel(p: AccountingPeriod) {
  return `Q${p.periodNumber} (${formatDate(p.periodStartDate)} - ${formatDate(p.periodEndDate)})`;
}

export default function AccountingList() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
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

  const allEmployeeNames = [
    ...new Set(
      periods.flatMap((p) =>
        p.employeeDistribution.map((e) => e.employeeName)
      )
    ),
  ];

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
          className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors"
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
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Periodo
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Gastos
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                  DDDG
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                  Ganancia
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Neto
                </th>
                {allEmployeeNames.map((name) => (
                  <th
                    key={name}
                    className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider hidden lg:table-cell"
                  >
                    {name}
                  </th>
                ))}
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                  Jefe
                </th>
                <th className="text-center px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right px-3 py-3 text-text-muted text-xs font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr
                  key={p._id}
                  className={`border-b border-border even:bg-bg-page`}
                >
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    <Link
                      href={`/accounting/${p._id}`}
                      className="text-accent hover:text-accent/80 hover:underline font-medium transition-colors"
                    >
                      {periodLabel(p)}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-sm text-text-body text-right">
                    {formatMoney(p.income)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-body text-right">
                    {formatMoney(p.expenses)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-body text-right font-medium hidden sm:table-cell">
                    {formatMoney(p.dddg)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-body text-right hidden sm:table-cell">
                    {formatMoney(p.companyProfit)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-body text-right">
                    {formatMoney(p.netToDistribute)}
                  </td>
                  {allEmployeeNames.map((name) => {
                    const share = p.employeeDistribution.find(
                      (e) => e.employeeName === name
                    );
                    return (
                      <td
                        key={name}
                        className="px-3 py-3 text-sm text-text-body text-right hidden lg:table-cell"
                      >
                        {share ? formatMoney(share.amount) : '$0.00'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-sm text-text-body text-right font-medium hidden lg:table-cell">
                    {formatMoney(p.bossAmount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {p.closed ? (
                      <span className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-500">
                        Cerrado
                      </span>
                    ) : (
                      <span className="rounded-full px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                        Abierto
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {!p.closed && (
                      <button
                        onClick={() => handleClose(p._id)}
                        className="p-1.5 text-text-muted hover:text-danger transition-colors"
                        title="Cerrar periodo"
                      >
                        <Lock size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

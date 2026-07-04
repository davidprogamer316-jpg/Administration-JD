'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AccountingPeriod, CarJob } from '@/types';
import {
  ArrowLeft,
  Lock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import ExpenseEditor from '@/features/accounting/ExpenseEditor';

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

export default function AccountingDetailPage() {
  const params = useParams();
  const [period, setPeriod] = useState<AccountingPeriod | null>(null);
  const [jobs, setJobs] = useState<CarJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobsExpanded, setJobsExpanded] = useState(false);
  const [employeeSectionExpanded, setEmployeeSectionExpanded] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const res = await api.get<{ period: AccountingPeriod; jobs: CarJob[] }>(
        `/accounting/${params.id}`
      );
      setPeriod(res.period);
      setJobs(res.jobs);
    } catch {
      setError('Error al cargar el periodo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleClose() {
    if (!confirm('¿Cerrar este periodo? No se podrá modificar después.')) return;
    try {
      await api.patch(`/accounting/${params.id}/close`);
      load();
    } catch {
      setError('Error al cerrar periodo');
    }
  }

  async function handleRecalculate() {
    try {
      await api.patch(`/accounting/${params.id}/recalculate`);
      load();
    } catch {
      setError('Error al recalcular periodo');
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="md:ml-56 p-6">
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (!period) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
          <div className="rounded-xl border border-border p-12 shadow-sm bg-surface text-center">
            <p className="text-text-muted">{error || 'Periodo no encontrado'}</p>
            <Link href="/accounting" className="text-accent hover:underline mt-2 inline-block">
              Volver a contabilidad
            </Link>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/accounting"
            className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver a contabilidad
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading font-semibold text-text-body break-words">
                Q{period.periodNumber} ({formatDate(period.periodStartDate)} - {formatDate(period.periodEndDate)})
              </h1>
              <span
                className={`inline-block mt-1 rounded-full px-3 py-0.5 text-xs font-medium ${
                  period.closed
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {period.closed ? 'Cerrado' : 'Abierto'}
              </span>
            </div>
            {!period.closed && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecalculate}
                  className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors"
                >
                  <RefreshCw size={16} />
                  Recalcular
                </button>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors"
                >
                  <Lock size={16} />
                  Cerrar periodo
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Ingresos" value={formatMoney(period.income)} />
            <SummaryCard label="Gastos" value={formatMoney(period.expenses)} />
            <SummaryCard label="DDDG" value={formatMoney(period.dddg)} />
            <SummaryCard label="Ganancia (20%)" value={formatMoney(period.companyProfit)} />
            <SummaryCard label="Neto a distribuir" value={formatMoney(period.netToDistribute)} />
            {period.employeeDistribution.map((e) => (
              <SummaryCard key={e.employeeId} label={e.employeeName} value={formatMoney(e.amount)} />
            ))}
            <SummaryCard label="Jefe" value={formatMoney(period.bossAmount)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-border shadow-sm bg-surface overflow-hidden">
              <button
              onClick={() => setEmployeeSectionExpanded(!employeeSectionExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-page transition-colors"
              >
                <h2 className="text-lg font-heading font-semibold text-text-body">
                  Trabajos del periodo ({jobs.length})
                </h2>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-text-muted transition-transform ${
                    jobsExpanded ? '' : '-rotate-90'
                  }`}
                />
              </button>
            {employeeSectionExpanded && (
                <div className="border-t border-border px-6 py-4">
                  {jobs.length === 0 ? (
                    <p className="text-text-muted text-sm">No hay trabajos en este periodo.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-2 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Fecha</th>
                            <th className="text-left px-2 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">VIN</th>
                            <th className="text-left px-2 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Descripción</th>
                            <th className="text-right px-2 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Pago</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.map((job) => (
                            <tr key={job._id} className="border-b border-border last:border-0">
                              <td className="px-2 py-2 text-sm text-text-body whitespace-nowrap">{formatDate(job.date)}</td>
                              <td className="px-2 py-2 text-sm text-text-body font-mono">{job.vin}</td>
                              <td className="px-2 py-2 text-sm text-text-body">{job.description}</td>
                              <td className="px-2 py-2 text-sm text-text-body text-right">{formatMoney(job.payment)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border shadow-sm bg-surface p-6">
              <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
                Gastos del periodo
              </h2>
              {period.fixedExpenses.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Gastos fijos automáticos</p>
                  <div className="space-y-1">
                    {period.fixedExpenses.map((fe, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm text-text-body">
                        <span>{fe.name}</span>
                        <span className="font-medium">{formatMoney(fe.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <hr className="my-3 border-border" />
                </div>
              )}
              <ExpenseEditor period={period} onUpdate={load} />
            </section>
          </div>

          <section className="rounded-xl border border-border shadow-sm bg-surface overflow-hidden mt-6">
            <button
              onClick={() => setJobsExpanded(!jobsExpanded)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-page transition-colors"
            >
              <h2 className="text-lg font-heading font-semibold text-text-body">
                Ganancias empleados por trabajo
              </h2>
              <ChevronDown
                size={18}
                className={`shrink-0 text-text-muted transition-transform ${
                  employeeSectionExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>
            {jobsExpanded && (
              <div className="border-t border-border px-6 py-4">
                {jobs.length === 0 || period.income <= 0 ? (
                  <p className="text-text-muted text-sm">No hay datos para mostrar.</p>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const grouped = new Map<string, { name: string; rows: { description: string; percentage: number; amount: number }[]; total: number }>();
                      for (const job of jobs) {
                        if (!job.employeeShares?.length) continue;
                        for (const share of job.employeeShares) {
                          const amount = period.netToDistribute * (share.percentage / 100) * (job.payment / period.income);
                          const rounded = Math.round(amount * 100) / 100;
                          if (!grouped.has(share.employeeId)) {
                            grouped.set(share.employeeId, { name: share.employeeName, rows: [], total: 0 });
                          }
                          const emp = grouped.get(share.employeeId)!;
                          emp.rows.push({ description: job.description, percentage: share.percentage, amount: rounded });
                          emp.total += rounded;
                        }
                      }
                      return Array.from(grouped.entries()).map(([empId, emp]) => {
                        const open = expandedEmployees.has(empId);
                        return (
                          <div key={empId} className="rounded-lg border border-border overflow-hidden">
                            <button
                              onClick={() => {
                                const next = new Set(expandedEmployees);
                                if (open) next.delete(empId); else next.add(empId);
                                setExpandedEmployees(next);
                              }}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-page transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  size={16}
                                  className={`text-text-muted transition-transform ${open ? '' : '-rotate-90'}`}
                                />
                                <span className="font-medium text-text-body">{emp.name}</span>
                              </div>
                              <span className="font-semibold text-text-body">{formatMoney(emp.total)}</span>
                            </button>
                            {open && (
                              <div className="border-t border-border overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-border bg-bg-page">
                                      <th className="text-left px-4 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Trabajo</th>
                                      <th className="text-right px-4 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">%</th>
                                      <th className="text-right px-4 py-2 text-text-muted text-xs font-medium uppercase tracking-wider">Ganancia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emp.rows.map((row, idx) => (
                                      <tr key={idx} className="border-b border-border last:border-0">
                                        <td className="px-4 py-2 text-sm text-text-body">{row.description}</td>
                                        <td className="px-4 py-2 text-sm text-text-body text-right">{row.percentage}%</td>
                                        <td className="px-4 py-2 text-sm text-text-body text-right font-medium">{formatMoney(row.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-page p-4">
      <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold text-text-body">{value}</p>
    </div>
  );
}

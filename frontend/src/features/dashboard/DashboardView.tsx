'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DateInput from '@/components/DateInput';
import {
  Calculator,
  BarChart3,
  Users,
  Car,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface DashboardData {
  totals: {
    income: number;
    expenses: number;
    dddg: number;
    companyProfit: number;
    netToDistribute: number;
    bossAmount: number;
  };
  employeeTotals: Array<{ employeeId: string; name: string; total: number }>;
  chartData: Array<{
    label: string;
    income: number;
    expenses: number;
    companyProfit: number;
  }>;
  employeeCount: number;
  carJobCount: number;
  periodCount: number;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

const COLORS = ['#D4A84B', '#5B8C6B', '#B85C5C', '#2A2A45', '#8B7D8B'];

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString();
      const res = await api.get<DashboardData>(
        `/accounting/dashboard${qs ? `?${qs}` : ''}`
      );
      setData(res);
    } catch {
      console.error('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const distributionData = [
    ...data.employeeTotals.map((e) => ({
      name: e.name,
      value: e.total,
    })),
    { name: 'Jefe', value: data.totals.bossAmount },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
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
          onClick={load}
          className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Filtrar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Ingresos
            </p>
          </div>
          <p className="text-2xl font-semibold text-text-body">
            {formatMoney(data.totals.income)}
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Gastos
            </p>
          </div>
          <p className="text-2xl font-semibold text-text-body">
            {formatMoney(data.totals.expenses)}
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Ganancia Empresa
            </p>
          </div>
          <p className="text-2xl font-semibold text-text-body">
            {formatMoney(data.totals.companyProfit)}
          </p>
        </div>

        <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Users size={20} />
            </div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              Empleados
            </p>
          </div>
          <p className="text-2xl font-semibold text-text-body">
            {data.employeeCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-xl border border-border p-6 shadow-sm bg-surface">
          <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
            Ingresos vs Gastos
          </h2>
          {data.chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              No hay datos para mostrar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#8B7D8B' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#8B7D8B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E0D8',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(value) => formatMoney(Number(value))}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Ingresos"
                  fill="#D4A84B"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Gastos"
                  fill="#B85C5C"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="companyProfit"
                  name="Ganancia"
                  fill="#5B8C6B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
          <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
            Distribución
          </h2>
          {distributionData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {distributionData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border p-6 shadow-sm bg-surface">
        <h2 className="text-lg font-heading font-semibold text-text-body mb-4">
          Resumen de distribución
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
              Total repartido
            </p>
            <p className="text-lg font-semibold text-text-body">
              {formatMoney(data.totals.netToDistribute)}
            </p>
          </div>
          {data.employeeTotals.map((e) => (
            <div key={e.employeeId}>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
                {e.name}
              </p>
              <p className="text-lg font-semibold text-text-body">
                {formatMoney(e.total)}
              </p>
            </div>
          ))}
          <div>
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
              Jefe
            </p>
            <p className="text-lg font-semibold text-text-body">
              {formatMoney(data.totals.bossAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

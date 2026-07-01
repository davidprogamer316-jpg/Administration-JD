'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { AccountingPeriod, ExpenseItem } from '@/types';
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react';

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

interface ExpenseEditorProps {
  period: AccountingPeriod;
  onUpdate: () => void;
}

export default function ExpenseEditor({ period, onUpdate }: ExpenseEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/accounting/${period._id}/expense-items`, {
        description: desc,
        amount: parseFloat(amount),
      });
      setDesc('');
      setAmount('');
      setShowAdd(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al agregar gasto');
    }
  }

  async function handleUpdate(itemId: string) {
    setError('');
    try {
      await api.patch(`/accounting/${period._id}/expense-items/${itemId}`, {
        description: desc,
        amount: parseFloat(amount),
      });
      setEditItemId(null);
      setDesc('');
      setAmount('');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar gasto');
    }
  }

  async function handleRemove(itemId: string) {
    if (!confirm('¿Eliminar este gasto?')) return;
    setError('');
    try {
      await api.delete(`/accounting/${period._id}/expense-items/${itemId}`);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar gasto');
    }
  }

  function startEdit(item: ExpenseItem) {
    setEditItemId(item._id!);
    setDesc(item.description);
    setAmount(item.amount.toString());
    setShowAdd(false);
  }

  function cancelEdit() {
    setEditItemId(null);
    setDesc('');
    setAmount('');
    setShowAdd(false);
  }

  return (
    <div className="border-t border-border mt-2 pt-3 px-4 pb-4 bg-bg-page/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-body">
          Gastos del periodo
        </h4>
        {!period.closed && !showAdd && !editItemId && (
          <button
            onClick={() => {
              setShowAdd(true);
              setDesc('');
              setAmount('');
            }}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <Plus size={14} />
            Agregar gasto
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger mb-2">{error}</p>
      )}

      {period.expenseItems.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted">Sin gastos registrados</p>
      )}

      <div className="space-y-2">
        {period.expenseItems.map((item) => {
          if (editItemId === item._id) {
            return (
              <div key={item._id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
                  placeholder="Descripción"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors text-right"
                  placeholder="0.00"
                />
                <button
                  onClick={() => handleUpdate(item._id!)}
                  className="p-1 text-success hover:text-success/80 transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-text-muted hover:text-danger transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={item._id}
              className="flex items-center justify-between py-1"
            >
              <span className="text-xs text-text-body">{item.description}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-body font-medium">
                  {formatMoney(item.amount)}
                </span>
                {!period.closed && (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="p-0.5 text-text-muted hover:text-accent transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleRemove(item._id!)}
                      className="p-0.5 text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            placeholder="Descripción del gasto"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-body outline-none focus:ring-2 focus:ring-accent/40 transition-colors text-right"
            placeholder="0.00"
            required
          />
          <button
            type="submit"
            className="p-1 text-success hover:text-success/80 transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="p-1 text-text-muted hover:text-danger transition-colors"
          >
            <X size={14} />
          </button>
        </form>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { AccountingPeriod, ExpenseItem } from '@/types';
import { Plus, Trash2, Pencil, X, Check, ChevronDown } from 'lucide-react';

function formatMoney(n: number) {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

function normalizeCategory(s: string) {
  return s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  function toggleCat(key: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const groups = Array.from(
    period.expenseItems.reduce((map, item) => {
      const key = normalizeCategory(item.description);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
      return map;
    }, new Map<string, ExpenseItem[]>()),
    ([key, items]) => ({
      key,
      name: items[0].description.trim(),
      count: items.length,
      total: items.reduce((sum, it) => sum + it.amount, 0),
      items,
    })
  ).sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const categoryListId = `expense-cat-${period._id}`;
  const categoryNames = Array.from(
    new Set(period.expenseItems.map((item) => item.description.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'es'));

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
    setExpandedCats((prev) => new Set(prev).add(normalizeCategory(item.description)));
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

      {showAdd && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            list={categoryListId}
            autoFocus
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
          <datalist id={categoryListId}>
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </form>
      )}

      {groups.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted">Sin gastos registrados</p>
      )}

      <div className="space-y-1">
        {groups.map((group) => {
          const open = expandedCats.has(group.key);
          return (
            <div key={group.key} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleCat(group.key)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-bg-page transition-colors"
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-text-body">
                  <ChevronDown
                    size={14}
                    className={`text-text-muted transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                  {group.name}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {group.count > 1 && <span>{group.count} gastos</span>}
                  <span className="font-semibold text-text-body">{formatMoney(group.total)}</span>
                </span>
              </button>
              {open && (
                <div className="border-t border-border px-3 py-1">
                  {group.items.map((item) => {
                    if (editItemId === item._id) {
                      return (
                        <div key={item._id} className="flex items-center gap-2 py-1">
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
              )}
            </div>
          );
        })}
      </div>

      {period.expenseItems.length > 0 && (
        <div className="flex items-center justify-between text-xs font-semibold text-text-body pt-2 border-t border-border mt-2">
          <span>Total</span>
          <span>{formatMoney(period.expenseItems.reduce((sum, item) => sum + item.amount, 0))}</span>
        </div>
      )}
    </div>
  );
}

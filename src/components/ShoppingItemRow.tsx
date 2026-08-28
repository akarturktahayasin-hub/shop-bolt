import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { ShoppingItem } from '@/types/shoppingList';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: { name?: string; quantity?: number }) => void;
}

export default function ShoppingItemRow({ item, onToggle, onDelete, onUpdate }: ShoppingItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(String(item.quantity));
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setEditName(item.name);
    setEditQty(String(item.quantity));
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const qty = Number(editQty);
    onUpdate(item.id, {
      name: trimmed,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    });
    setEditing(false);
  };

  const handleEditKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveEdit();
  };

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-xl bg-white border border-primary-200 px-3 sm:px-4 py-2.5 shadow-sm">
        <form onSubmit={handleEditSubmit} className="flex items-center gap-2 w-full">
          <input
            ref={nameInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleEditKeydown}
            maxLength={120}
            aria-label="Edit item name"
            className="flex-1 min-w-0 rounded-lg border border-neutral-200 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <input
            type="number"
            min={1}
            max={9999}
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            onKeyDown={handleEditKeydown}
            aria-label="Edit quantity"
            className="w-16 shrink-0 rounded-lg border border-neutral-200 px-2 py-2 text-center text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
          <button
            type="submit"
            aria-label="Save changes"
            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary-500 text-white hover:bg-primary-600 active:scale-95 transition-all"
          >
            <Check size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            aria-label="Cancel edit"
            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl bg-white border border-neutral-100 px-3 sm:px-4 py-3 animate-scale-in">
      <button
        onClick={() => onToggle(item.id)}
        role="checkbox"
        aria-checked={item.completed}
        aria-label={item.completed ? `Mark "${item.name}" as not bought` : `Mark "${item.name}" as bought`}
        className={`shrink-0 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all active:scale-90 ${
          item.completed
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'border-neutral-200 text-transparent hover:border-primary-400'
        }`}
      >
        <Check size={16} strokeWidth={3} />
      </button>

      <div className={`flex-1 min-w-0 flex items-baseline gap-2 ${item.completed ? 'opacity-50' : ''}`}>
        <span className={`min-w-0 break-words text-[15px] ${item.completed ? 'line-through text-neutral-400' : 'text-neutral-700'}`}>
          {item.name}
        </span>
        {item.quantity > 1 && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-secondary-50 text-secondary-700 text-xs font-semibold px-2 py-0.5">
            ×{item.quantity}
          </span>
        )}
      </div>

      <button
        onClick={startEdit}
        aria-label={`Edit "${item.name}"`}
        className="shrink-0 p-1.5 rounded-lg text-neutral-300 hover:text-secondary-600 hover:bg-secondary-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => onDelete(item.id)}
        aria-label={`Remove "${item.name}"`}
        className="shrink-0 p-1.5 rounded-lg text-neutral-300 hover:text-error-500 hover:bg-error-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

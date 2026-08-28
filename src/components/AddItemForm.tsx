import { FormEvent, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

interface AddItemFormProps {
  onAdd: (name: string, quantity: number) => void;
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = quantity.trim() === '' ? 1 : Number(quantity);
    onAdd(trimmed, Number.isFinite(qty) && qty > 0 ? qty : 1);
    setName('');
    setQuantity('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item…"
        maxLength={120}
        aria-label="Item name"
        className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow"
      />
      <input
        type="number"
        min={1}
        max={9999}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        aria-label="Quantity"
        className="w-16 shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        aria-label="Add item"
        className="shrink-0 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary-500 text-white shadow-md shadow-primary-500/20 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </form>
  );
}

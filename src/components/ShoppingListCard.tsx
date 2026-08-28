import { ShoppingBag, Trash2, Pencil, ChevronRight } from 'lucide-react';
import type { ShoppingList } from '@/types/shoppingList';

interface ShoppingListCardProps {
  list: ShoppingList;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onRename: (id: string, name: string) => void | Promise<void>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ShoppingListCard({ list, onOpen, onDelete, onRename }: ShoppingListCardProps) {
  const total = list.items.length;
  const done = list.items.filter((i) => i.completed).length;
  const allDone = total > 0 && done === total;
  const totalQuantity = list.items.reduce((sum, i) => sum + i.quantity, 0);

  const handleRename = () => {
    const next = window.prompt('Rename list', list.name);
    if (next !== null && next.trim()) onRename(list.id, next.trim());
  };

  return (
    <div className="group relative rounded-2xl bg-white border border-neutral-100 shadow-sm hover:shadow-md hover:border-secondary-200 transition-all p-5 animate-scale-in cursor-pointer">
      <button
        onClick={() => onOpen(list.id)}
        className="w-full text-left"
        aria-label={`Open ${list.name}`}
      >
        <div className="flex items-center justify-between gap-3 pr-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50">
              <ShoppingBag size={20} className="text-secondary-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-800 truncate">{list.name}</h3>
              <p className="text-sm text-neutral-400">Created {formatDate(list.created_at)}</p>
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-neutral-300 group-hover:text-secondary-500 transition-colors" />
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
              <span>
                {done} of {total} {total === 1 ? 'item' : 'items'}
                {totalQuantity > total && ` · ${totalQuantity} total`}
                {allDone && <span className="text-primary-500 font-medium"> · all done</span>}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {total === 0 && <p className="mt-4 text-sm text-neutral-300">No items yet</p>}
      </button>

      <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRename();
          }}
          aria-label={`Rename ${list.name}`}
          className="p-2 rounded-lg text-neutral-300 hover:text-secondary-600 hover:bg-secondary-50 transition-all"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(list.id);
          }}
          aria-label={`Delete ${list.name}`}
          className="p-2 rounded-lg text-neutral-300 hover:text-error-500 hover:bg-error-50 transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

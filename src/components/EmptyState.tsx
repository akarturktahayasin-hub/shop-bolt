import { ShoppingBag, Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 sm:py-20 px-6 animate-fade-in-up">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-100 via-secondary-100 to-accent-100 blur-xl scale-110" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 border border-neutral-100 shadow-sm">
          <ShoppingBag size={40} className="text-secondary-500" strokeWidth={1.75} />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2">
        You don't have any shopping lists yet
      </h2>
      <p className="text-neutral-500 max-w-sm mb-8 leading-relaxed">
        Create your first list to start keeping track of everything you need to buy.
        It only takes a few seconds.
      </p>

      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-white font-semibold shadow-lg shadow-primary-500/25 hover:bg-primary-600 hover:shadow-primary-500/35 active:scale-95 transition-all"
      >
        <Plus size={20} strokeWidth={2.5} />
        Create your first list
      </button>
    </div>
  );
}

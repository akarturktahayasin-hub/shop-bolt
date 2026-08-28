import { useEffect, useState } from 'react';
import { Plus, ShoppingBag, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import ShoppingListCard from '@/components/ShoppingListCard';
import NewListModal from '@/components/NewListModal';
import UserMenu from '@/components/UserMenu';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/useAuth';
import type { Api } from '@/lib/api';
import type { ShoppingList } from '@/types/shoppingList';

interface HomeProps {
  api: Api;
  onOpenList: (id: string) => void;
  onCreateAndOpen: (name: string) => void | Promise<void>;
  onSignIn: () => void;
}

export default function Home({ api, onOpenList, onCreateAndOpen, onSignIn }: HomeProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getLists();
        if (mounted) setLists(data);
      } catch {
        if (mounted) setError('We could not load your lists. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [api]);

  // Realtime: refresh list summaries when lists or items change (cloud only).
  useEffect(() => {
    if (!api.isCloud) return;

    const channel = supabase
      .channel('home-lists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () => {
        api.getLists().then(setLists).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        api.getLists().then(setLists).catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [api]);

  const handleCreate = async (name: string) => {
    setIsModalOpen(false);
    await onCreateAndOpen(name);
  };

  const handleDeleteList = async (id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
    try {
      await api.deleteList(id);
    } catch {
      setError('Could not delete the list. Please try again.');
      setLists(await api.getLists());
    }
  };

  const handleRenameList = async (id: string, name: string) => {
    try {
      await api.renameList(id, name);
      setLists(await api.getLists());
    } catch {
      setError('Could not rename the list. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40">
      <Header right={<UserMenu onSignIn={onSignIn} />} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
        <section className="text-center pt-4 pb-10 sm:pb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-100 shadow-sm px-4 py-1.5 text-sm font-medium text-secondary-600 mb-5">
            <ShoppingBag size={14} strokeWidth={2.25} />
            Never forget me!
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-800 tracking-tight leading-tight">
            Shopping lists that keep up with you
          </h1>
          <p className="mt-3 text-neutral-500 max-w-md mx-auto leading-relaxed">
            Simple, fast, and always with you. Create a list in seconds and never
            walk into a store empty-handed again.
          </p>
        </section>

        <section className="rounded-3xl bg-white/70 border border-neutral-100 shadow-sm p-4 sm:p-8">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-neutral-200 border-t-secondary-500 animate-spin" />
            </div>
          ) : lists.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-neutral-800">Your lists</h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:bg-primary-600 active:scale-95 transition-all"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  New list
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {lists.map((list) => (
                  <ShoppingListCard
                    key={list.id}
                    list={list}
                    onOpen={onOpenList}
                    onDelete={handleDeleteList}
                    onRename={handleRenameList}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState onCreate={() => setIsModalOpen(true)} />
          )}

          {!user && !loading && (
            <p className="mt-8 text-center text-sm text-neutral-400">
              <button onClick={onSignIn} className="text-secondary-600 font-medium hover:underline">
                Sign in
              </button>{' '}
              to sync your lists across devices and share them with family.
            </p>
          )}
        </section>
      </main>

      {isModalOpen && (
        <NewListModal onClose={() => setIsModalOpen(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}

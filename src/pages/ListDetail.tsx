import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  AlertCircle,
} from 'lucide-react';
import Logo from '@/components/Logo';
import AddItemForm from '@/components/AddItemForm';
import ShoppingItemRow from '@/components/ShoppingItemRow';
import ShareModal from '@/components/ShareModal';
import { supabase } from '@/lib/supabaseClient';
import type { Api } from '@/lib/api';
import type { ListMember, ShoppingList } from '@/types/shoppingList';

interface ListDetailProps {
  listId: string;
  api: Api;
  onBack: () => void;
}

export default function ListDetail({ listId, api, onBack }: ListDetailProps) {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const fresh = await api.getList(listId);
      setList(fresh);
    } catch {
      setError('We could not load this list. Please try again.');
    }
  }, [api, listId]);

  useEffect(() => {
    let mounted = true;
    setLoaded(false);
    setError(null);
    (async () => {
      await reload();
      if (mounted) setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [reload]);

  // Realtime: refresh when this list or its items change (cloud only).
  useEffect(() => {
    if (!api.isCloud) return;

    const channel = supabase
      .channel(`list-${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${listId}` },
        () => reload(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${listId}` },
        () => reload(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_members', filter: `list_id=eq.${listId}` },
        () => {
          api.getMembers(listId).then(setMembers).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [api, listId, reload]);

  // Load members when opening the share modal.
  useEffect(() => {
    if (!shareOpen || !api.isCloud) return;
    api.getMembers(listId).then(setMembers).catch(() => {});
  }, [shareOpen, api, listId]);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  const handleAdd = async (name: string, quantity: number) => {
    try {
      const item = await api.addItem(listId, name, quantity);
      if (item) {
        setList((prev) =>
          prev ? { ...prev, items: [...prev.items, item] } : prev,
        );
      }
    } catch {
      setError('Could not add the item. Please try again.');
    }
  };

  const handleToggle = async (itemId: string) => {
    // Optimistic toggle
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, completed: !i.completed } : i,
            ),
          }
        : prev,
    );
    try {
      await api.toggleItem(listId, itemId);
    } catch {
      // Revert on failure
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === itemId ? { ...i, completed: !i.completed } : i,
              ),
            }
          : prev,
      );
      setError('Could not update the item. Please try again.');
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    changes: { name?: string; quantity?: number },
  ) => {
    // Optimistic update
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    name: changes.name ?? i.name,
                    quantity: changes.quantity ?? i.quantity,
                  }
                : i,
            ),
          }
        : prev,
    );
    try {
      await api.updateItem(listId, itemId, changes);
    } catch {
      await reload();
      setError('Could not save the change. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Optimistic remove
    setList((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev,
    );
    try {
      await api.deleteItem(listId, itemId);
    } catch {
      await reload();
      setError('Could not remove the item. Please try again.');
    }
  };

  const handleDeleteList = async () => {
    try {
      await api.deleteList(listId);
      onBack();
    } catch {
      setError('Could not delete the list. Please try again.');
    }
  };

  const startRename = () => {
    if (!list) return;
    setRenameValue(list.name);
    setRenaming(true);
  };

  const saveRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenaming(false);
      return;
    }
    setList((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setRenaming(false);
    try {
      await api.renameList(listId, trimmed);
    } catch {
      await reload();
      setError('Could not rename the list. Please try again.');
    }
  };

  const cancelRename = () => setRenaming(false);

  const handleRenameKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleRenameSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveRename();
  };

  const handleInvite = async (email: string) => {
    return api.addMember(listId, email);
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.removeMember(listId, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      setError('Could not remove that member. Please try again.');
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
          <div className="h-8 w-8 rounded-full border-2 border-neutral-200 border-t-secondary-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-neutral-800 mb-2">List not found</h1>
          <p className="text-neutral-500 mb-6">This shopping list may have been deleted.</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2.5 font-semibold text-white hover:bg-primary-600 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const total = list.items.length;
  const done = list.items.filter((i) => i.completed).length;
  const remaining = total - done;
  const totalQuantity = list.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-100">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            {api.isCloud && (
              <button
                onClick={() => setShareOpen(true)}
                aria-label="Share list"
                title="Share list"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-neutral-500 hover:text-secondary-600 hover:bg-secondary-50 transition-all"
              >
                <Users size={18} />
                <span className="hidden sm:inline text-sm font-medium">Share</span>
              </button>
            )}
            {!renaming && (
              <button
                onClick={handleDeleteList}
                aria-label="Delete list"
                title="Delete list"
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 pb-24 pt-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {renaming ? (
                <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
                  <input
                    ref={renameRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeydown}
                    maxLength={80}
                    aria-label="Rename list"
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 px-3 py-2 text-xl sm:text-2xl font-extrabold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                  />
                  <button
                    type="submit"
                    aria-label="Save name"
                    className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary-500 text-white hover:bg-primary-600 active:scale-95 transition-all"
                  >
                    <Check size={18} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    aria-label="Cancel rename"
                    className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={startRename}
                  className="group/title flex items-center gap-2 text-left"
                  title="Rename list"
                >
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-800 tracking-tight break-words">
                    {list.name}
                  </h1>
                  <Pencil size={16} className="shrink-0 text-neutral-300 group-hover/title:text-secondary-500 transition-colors" />
                </button>
              )}
              {total > 0 && (
                <p className="mt-1 text-sm text-neutral-400">
                  {done} of {total} {total === 1 ? 'item' : 'items'} bought
                  {totalQuantity > total && ` · ${totalQuantity} total`}
                  {remaining > 0 && ` · ${remaining} to go`}
                </p>
              )}
            </div>
          </div>

          {total > 0 && (
            <div className="mt-4 h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 via-secondary-400 to-accent-400 transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-neutral-100 shadow-sm p-4 sm:p-6">
          <AddItemForm onAdd={handleAdd} />

          <div className="mt-6">
            {total === 0 ? (
              <div className="flex flex-col items-center text-center py-10 animate-fade-in-up">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 to-secondary-50 border border-neutral-100 mb-4">
                  <ShoppingBag size={28} className="text-secondary-400" strokeWidth={1.75} />
                </div>
                <p className="font-medium text-neutral-700">Start adding items</p>
                <p className="text-sm text-neutral-400 mt-1 max-w-xs">
                  Type something above and tap the plus button to add it to this list.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {list.items.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </ul>
            )}

            {total > 0 && done === total && (
              <div className="mt-6 flex items-center justify-center gap-2 text-primary-600 font-medium animate-fade-in-up">
                <CheckCircle2 size={20} />
                All items bought — nice work!
              </div>
            )}
          </div>
        </div>
      </main>

      {shareOpen && list && (
        <ShareModal
          listName={list.name}
          isOwner={!!list.is_owner}
          members={members}
          onClose={() => setShareOpen(false)}
          onInvite={handleInvite}
          onRemoveMember={handleRemoveMember}
        />
      )}
    </div>
  );
}

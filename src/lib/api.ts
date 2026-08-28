import { supabase } from '@/lib/supabaseClient';
import type { ListMember, ShoppingItem, ShoppingList } from '@/types/shoppingList';

const STORAGE_KEY = 'shopmego:lists:v1';

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.round(value);
  return rounded < 1 ? 1 : rounded > 9999 ? 9999 : rounded;
}

function normalizeItem(item: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: item.id ?? generateId(),
    name: item.name ?? '',
    quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
    completed: item.completed ?? false,
    created_at: item.created_at ?? new Date().toISOString(),
  };
}

function readLocalLists(): ShoppingList[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((raw: Partial<ShoppingList>) => ({
      id: raw.id ?? generateId(),
      name: raw.name ?? 'Untitled list',
      created_at: raw.created_at ?? new Date().toISOString(),
      items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
    }));
  } catch {
    return [];
  }
}

function writeLocalLists(lists: ShoppingList[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
}

/**
 * Unified data API. Cloud (Supabase) is the source of truth when the user is
 * signed in; localStorage is a full-featured fallback for guests and offline.
 * Pages call these methods and don't need to know which backend is active.
 */
export function createApi(auth: AuthState) {
  const cloud = auth.isAuthenticated && auth.userId;

  return {
    isCloud: cloud,

    async getLists(): Promise<ShoppingList[]> {
      if (!cloud) return readLocalLists();

      const { data, error } = await supabase
        .from('shopping_lists')
        .select('id, name, created_at, updated_at, user_id')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const lists: ShoppingList[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items: [],
        is_owner: row.user_id === auth.userId,
      }));

      if (lists.length > 0) {
        const { data: items } = await supabase
          .from('shopping_items')
          .select('id, list_id, name, quantity, completed, created_at')
          .in(
            'list_id',
            lists.map((l) => l.id),
          )
          .order('created_at', { ascending: true });

        if (items) {
          const byList = new Map<string, ShoppingItem[]>();
          for (const it of items) {
            const arr = byList.get(it.list_id) ?? [];
            arr.push({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              completed: it.completed,
              created_at: it.created_at,
            });
            byList.set(it.list_id, arr);
          }
          for (const list of lists) {
            list.items = byList.get(list.id) ?? [];
          }
        }
      }

      return lists;
    },

    async getList(id: string): Promise<ShoppingList | null> {
      if (!cloud) return readLocalLists().find((l) => l.id === id) ?? null;

      const { data: row, error } = await supabase
        .from('shopping_lists')
        .select('id, name, created_at, updated_at, user_id')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!row) return null;

      const { data: items } = await supabase
        .from('shopping_items')
        .select('id, name, quantity, completed, created_at')
        .eq('list_id', id)
        .order('created_at', { ascending: true });

      return {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items: (items ?? []).map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          completed: it.completed,
          created_at: it.created_at,
        })),
        is_owner: row.user_id === auth.userId,
      };
    },

    async createList(name: string): Promise<ShoppingList> {
      if (!cloud) {
        const lists = readLocalLists();
        const newList: ShoppingList = {
          id: generateId(),
          name: name.trim(),
          created_at: new Date().toISOString(),
          items: [],
        };
        lists.unshift(newList);
        writeLocalLists(lists);
        return newList;
      }

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({ name: name.trim(), user_id: auth.userId })
        .select('id, name, created_at, updated_at')
        .maybeSingle();

      if (error || !data) throw error ?? new Error('Failed to create list');
      return { ...data, items: [], is_owner: true };
    },

    async renameList(id: string, name: string): Promise<void> {
      const trimmed = name.trim();
      if (!cloud) {
        const lists = readLocalLists();
        const list = lists.find((l) => l.id === id);
        if (list) {
          list.name = trimmed;
          writeLocalLists(lists);
        }
        return;
      }
      const { error } = await supabase.from('shopping_lists').update({ name: trimmed }).eq('id', id);
      if (error) throw error;
    },

    async deleteList(id: string): Promise<void> {
      if (!cloud) {
        writeLocalLists(readLocalLists().filter((l) => l.id !== id));
        return;
      }
      const { error } = await supabase.from('shopping_lists').delete().eq('id', id);
      if (error) throw error;
    },

    async addItem(listId: string, name: string, quantity = 1): Promise<ShoppingItem | null> {
      if (!cloud) {
        const lists = readLocalLists();
        const list = lists.find((l) => l.id === listId);
        if (!list) return null;
        const item: ShoppingItem = {
          id: generateId(),
          name: name.trim(),
          quantity: clampQuantity(quantity),
          completed: false,
          created_at: new Date().toISOString(),
        };
        list.items.push(item);
        writeLocalLists(lists);
        return item;
      }

      const { data, error } = await supabase
        .from('shopping_items')
        .insert({ list_id: listId, name: name.trim(), quantity: clampQuantity(quantity) })
        .select('id, name, quantity, completed, created_at')
        .maybeSingle();

      if (error || !data) throw error ?? new Error('Failed to add item');
      return data;
    },

    async updateItem(
      listId: string,
      itemId: string,
      changes: { name?: string; quantity?: number },
    ): Promise<void> {
      const update: Record<string, unknown> = {};
      if (typeof changes.name === 'string') update.name = changes.name.trim();
      if (typeof changes.quantity === 'number') update.quantity = clampQuantity(changes.quantity);

      if (!cloud) {
        const lists = readLocalLists();
        const item = lists.find((l) => l.id === listId)?.items.find((i) => i.id === itemId);
        if (item) {
          if (update.name !== undefined) item.name = update.name as string;
          if (update.quantity !== undefined) item.quantity = update.quantity as number;
          writeLocalLists(lists);
        }
        return;
      }

      const { error } = await supabase.from('shopping_items').update(update).eq('id', itemId);
      if (error) throw error;
    },

    async toggleItem(listId: string, itemId: string): Promise<void> {
      if (!cloud) {
        const lists = readLocalLists();
        const item = lists.find((l) => l.id === listId)?.items.find((i) => i.id === itemId);
        if (item) {
          item.completed = !item.completed;
          writeLocalLists(lists);
        }
        return;
      }

      // Fetch current then flip, so we work from the server's value.
      const { data: current, error: fetchErr } = await supabase
        .from('shopping_items')
        .select('completed')
        .eq('id', itemId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!current) return;

      const { error } = await supabase
        .from('shopping_items')
        .update({ completed: !current.completed })
        .eq('id', itemId);

      if (error) throw error;
    },

    async deleteItem(listId: string, itemId: string): Promise<void> {
      if (!cloud) {
        const lists = readLocalLists();
        const list = lists.find((l) => l.id === listId);
        if (list) {
          list.items = list.items.filter((i) => i.id !== itemId);
          writeLocalLists(lists);
        }
        return;
      }
      const { error } = await supabase.from('shopping_items').delete().eq('id', itemId);
      if (error) throw error;
    },

    // ---- sharing / members (cloud only) ----

    async getMembers(listId: string): Promise<ListMember[]> {
      if (!cloud) return [];
      const { data, error } = await supabase
        .from('list_members')
        .select('id, list_id, user_id, role, created_at')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const members: ListMember[] = (data ?? []).map((m) => ({
        id: m.id,
        list_id: m.list_id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
      }));

      if (members.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in(
            'id',
            members.map((m) => m.user_id),
          );
        if (profiles) {
          const byId = new Map(profiles.map((p) => [p.id, p.display_name]));
          for (const m of members) {
            m.display_name = byId.get(m.user_id) ?? undefined;
          }
        }
      }
      return members;
    },

    async addMember(listId: string, email: string): Promise<{ error: string | null }> {
      if (!cloud) return { error: 'Sharing requires signing in.' };

      // Look up the user by email. Auth admin API isn't available client-side,
      // so we search profiles via a known edge: we can't. Instead, we invite
      // by inserting into list_members using the target user_id resolved via
      // a secure server function. Since we can't call admin RPC from client,
      // we use a lightweight approach: the list owner shares an invite link,
      // and the invited user accepts. For simplicity in this phase, we look
      // up by email through the profiles table if the email matches a signed-up
      // user's email — but profiles doesn't store email. So we rely on an
      // edge function to resolve email -> user_id.
      const { data, error } = await supabase.functions.invoke('resolve-invite', {
        body: { list_id: listId, email: email.trim().toLowerCase() },
      });

      if (error) return { error: 'Could not send invite. Is the email correct?' };
      if (data?.error) return { error: data.error };
      return { error: null };
    },

    async removeMember(listId: string, memberId: string): Promise<void> {
      if (!cloud) return;
      const { error } = await supabase.from('list_members').delete().eq('id', memberId);
      if (error) throw error;
    },
  };
}

export type Api = ReturnType<typeof createApi>;

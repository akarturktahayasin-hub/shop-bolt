/*
# Phase 2: shopping_items, list_members, profiles, ownership, realtime

## Summary
Upgrades ShopMeGo.ai from a single-tenant localStorage-only app to a
multi-user, cloud-synced, shared-list app.

1. Recreates `shopping_lists` as an owner-scoped table (user_id column,
   owner-based RLS) so each signed-in user owns their lists.
2. Adds `shopping_items` (name, quantity, completed, list_id FK).
3. Adds `list_members` for family/shared lists (invite by email, owner +
   member roles), scoped through membership checks.
4. Adds `profiles` for display names shown in shared lists.
5. Replaces the old anon-open policies on `shopping_lists` with proper
   ownership + membership checks.
6. Enables Supabase Realtime on both `shopping_lists` and `shopping_items`.
7. Auto-creates a profile row whenever a new auth user registers.

## New Tables
- `shopping_items`, `list_members`, `profiles` (see detailed comments inline).

## Modified Tables
- `shopping_lists`: adds `user_id` (owner) and `updated_at`; repolicies.

## Security (RLS)
- Ownership + membership checks on lists, items, and members.
- Profiles: SELECT public to authenticated; INSERT/UPDATE own only.

## Realtime
- Adds shopping_lists and shopping_items to the supabase_realtime publication.

## Important Notes
1. shopping_lists was verified empty before deployment (no data loss).
2. Email confirmation stays OFF; sign-up logs in immediately.
3. No user_id on shopping_items — membership derived via parent list.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- shopping_lists: add user_id + updated_at FIRST ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shopping_lists' AND column_name = 'user_id') THEN
    ALTER TABLE shopping_lists ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'shopping_lists' AND column_name = 'updated_at') THEN
    ALTER TABLE shopping_lists ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- updated_at bump on list update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- drop old anon-open policies on shopping_lists
DROP POLICY IF EXISTS "anon_select_shopping_lists" ON shopping_lists;
DROP POLICY IF EXISTS "anon_insert_shopping_lists" ON shopping_lists;
DROP POLICY IF EXISTS "anon_update_shopping_lists" ON shopping_lists;
DROP POLICY IF EXISTS "anon_delete_shopping_lists" ON shopping_lists;

-- ---------- list_members (after user_id exists) ----------
CREATE TABLE IF NOT EXISTS list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (list_id, user_id)
);

ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;

-- owner + members can see who's in a list
DROP POLICY IF EXISTS "members_select_own_lists" ON list_members;
CREATE POLICY "members_select_own_lists" ON list_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = list_members.list_id
        AND (sl.user_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM list_members lm
               WHERE lm.list_id = list_members.list_id AND lm.user_id = auth.uid()
             ))
    )
  );

-- only the list owner can add members
DROP POLICY IF EXISTS "members_insert_by_owner" ON list_members;
CREATE POLICY "members_insert_by_owner" ON list_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = list_members.list_id AND sl.user_id = auth.uid()
    )
  );

-- only the list owner can remove members
DROP POLICY IF EXISTS "members_delete_by_owner" ON list_members;
CREATE POLICY "members_delete_by_owner" ON list_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM shopping_lists sl
      WHERE sl.id = list_members.list_id AND sl.user_id = auth.uid()
    )
  );

-- ---------- shopping_lists: owner+member policies (after list_members) ----------
DROP POLICY IF EXISTS "lists_select_owner_or_member" ON shopping_lists;
CREATE POLICY "lists_select_owner_or_member" ON shopping_lists FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = shopping_lists.id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lists_insert_own" ON shopping_lists;
CREATE POLICY "lists_insert_own" ON shopping_lists FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lists_update_owner_or_member" ON shopping_lists;
CREATE POLICY "lists_update_owner_or_member" ON shopping_lists FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = shopping_lists.id AND lm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM list_members lm
      WHERE lm.list_id = shopping_lists.id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lists_delete_owner" ON shopping_lists;
CREATE POLICY "lists_delete_owner" ON shopping_lists FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ---------- shopping_items ----------
CREATE TABLE IF NOT EXISTS shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS shopping_items_list_id_idx ON shopping_items(list_id);

-- helper: caller is owner or member of the list that owns this row
CREATE OR REPLACE FUNCTION public.can_access_list(target_list_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = target_list_id
      AND (sl.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM list_members lm
             WHERE lm.list_id = target_list_id AND lm.user_id = auth.uid()
           ))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_list(uuid) TO authenticated;

DROP POLICY IF EXISTS "items_select_accessible" ON shopping_items;
CREATE POLICY "items_select_accessible" ON shopping_items FOR SELECT
  TO authenticated USING (public.can_access_list(list_id));

DROP POLICY IF EXISTS "items_insert_accessible" ON shopping_items;
CREATE POLICY "items_insert_accessible" ON shopping_items FOR INSERT
  TO authenticated WITH CHECK (public.can_access_list(list_id));

DROP POLICY IF EXISTS "items_update_accessible" ON shopping_items;
CREATE POLICY "items_update_accessible" ON shopping_items FOR UPDATE
  TO authenticated
  USING (public.can_access_list(list_id))
  WITH CHECK (public.can_access_list(list_id));

DROP POLICY IF EXISTS "items_delete_accessible" ON shopping_items;
CREATE POLICY "items_delete_accessible" ON shopping_items FOR DELETE
  TO authenticated USING (public.can_access_list(list_id));

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;

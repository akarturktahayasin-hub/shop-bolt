/*
# Create shopping_lists table

## Summary
Adds the table that stores each shopping list a user creates on the ShopMeGo.ai
home screen. This is a single-tenant app (no sign-in), so lists are shared
storage accessed with the public (anon) key.

## New Tables
- `shopping_lists`
  - `id` (uuid, primary key) - unique identifier for the list
  - `name` (text, not null) - the list's display name, e.g. "Weekly Groceries"
  - `created_at` (timestamptz, default now()) - when the list was created

## Security
- Row Level Security is enabled on `shopping_lists`.
- Four separate policies (select, insert, update, delete) grant access to
  both `anon` and `authenticated` roles, since this app has no login screen
  and all data is intentionally shared/public at this stage.
*/

CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_shopping_lists" ON shopping_lists;
CREATE POLICY "anon_select_shopping_lists" ON shopping_lists FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shopping_lists" ON shopping_lists;
CREATE POLICY "anon_insert_shopping_lists" ON shopping_lists FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shopping_lists" ON shopping_lists;
CREATE POLICY "anon_update_shopping_lists" ON shopping_lists FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shopping_lists" ON shopping_lists;
CREATE POLICY "anon_delete_shopping_lists" ON shopping_lists FOR DELETE
  TO anon, authenticated USING (true);

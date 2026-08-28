export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  items: ShoppingItem[];
  /** true when the signed-in user is the owner (cloud mode only) */
  is_owner?: boolean;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: string;
  display_name?: string;
  email?: string;
}

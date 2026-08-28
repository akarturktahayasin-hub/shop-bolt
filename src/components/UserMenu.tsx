import { useEffect, useRef, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/useAuth';

interface UserMenuProps {
  onSignIn: () => void;
}

export default function UserMenu({ onSignIn }: UserMenuProps) {
  const { user, displayName, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-neutral-100 shadow-sm px-4 py-2 text-sm font-semibold text-secondary-600 hover:border-secondary-200 hover:shadow transition-all"
      >
        <User size={16} />
        Sign in
      </button>
    );
  }

  const initial = (displayName ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white border border-neutral-100 shadow-sm pl-1.5 pr-3 py-1.5 hover:border-secondary-200 transition-all"
        aria-label="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 text-white text-sm font-bold">
          {initial}
        </span>
        <span className="text-sm font-medium text-neutral-700 max-w-[120px] truncate hidden sm:block">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-neutral-100 shadow-lg py-1.5 animate-scale-in origin-top-right">
          <div className="px-4 py-2 border-b border-neutral-50">
            <p className="text-sm font-semibold text-neutral-800 truncate">{displayName}</p>
            <p className="text-xs text-neutral-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-error-500 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

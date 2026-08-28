import { FormEvent, useEffect, useState } from 'react';
import { X, Users, UserPlus, Trash2, Loader2, Crown } from 'lucide-react';
import type { ListMember } from '@/types/shoppingList';

interface ShareModalProps {
  listName: string;
  isOwner: boolean;
  members: ListMember[];
  onClose: () => void;
  onInvite: (email: string) => Promise<{ error: string | null }>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export default function ShareModal({
  listName,
  isOwner,
  members,
  onClose,
  onInvite,
  onRemoveMember,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await onInvite(trimmed);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEmail('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-7 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-400 to-accent-500">
              <Users size={20} className="text-white" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-800">Share list</h2>
              <p className="text-sm text-neutral-400 truncate">{listName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isOwner ? (
          <form onSubmit={handleInvite} className="mb-5">
            <label className="block text-sm font-medium text-neutral-600 mb-1.5">
              Invite by email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="family@example.com"
                disabled={submitting}
                className="flex-1 min-w-0 rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                aria-label="Send invite"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-white font-semibold hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                <span className="hidden sm:inline">Invite</span>
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-error-500">{error}</p>}
            <p className="mt-2 text-xs text-neutral-400">
              The person must have a ShopMeGo.ai account with that email.
            </p>
          </form>
        ) : (
          <p className="mb-5 text-sm text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2.5">
            Only the list owner can invite new members.
          </p>
        )}

        <div>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2">Members</h3>
          <ul className="space-y-1.5 max-h-52 overflow-y-auto">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-white text-xs font-bold">
                    {(member.display_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-neutral-700 truncate">
                    {member.display_name ?? 'Member'}
                  </span>
                  {member.role === 'owner' && (
                    <Crown size={14} className="shrink-0 text-warning-500" />
                  )}
                </div>
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    aria-label="Remove member"
                    className="shrink-0 p-1.5 rounded-lg text-neutral-300 hover:text-error-500 hover:bg-error-50 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

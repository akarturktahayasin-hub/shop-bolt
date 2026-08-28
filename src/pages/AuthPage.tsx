import { FormEvent, useState } from 'react';
import { ShoppingBag, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/useAuth';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please fill in all fields.');
      setSubmitting(false);
      return;
    }

    const result =
      mode === 'signin'
        ? await signIn(trimmedEmail, password)
        : await signUp(trimmedEmail, password, displayName.trim() || trimmedEmail.split('@')[0]);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40 flex flex-col">
      <header className="w-full">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
          <Logo size="md" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 shadow-lg shadow-secondary-500/25 mb-4">
              <ShoppingBag size={32} className="text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-800 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-neutral-500">
              {mode === 'signin'
                ? 'Sign in to sync your lists across all your devices.'
                : 'Join ShopMeGo.ai to sync and share your shopping lists.'}
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-neutral-100 shadow-sm p-6 sm:p-7">
            <div className="flex gap-1 p-1 rounded-xl bg-neutral-50 mb-6">
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === 'signin' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => switchMode('signup')}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === 'signup' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-400'
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex"
                    maxLength={60}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-shadow"
                />
              </div>

              {error && (
                <p className="text-sm text-error-500 bg-error-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 font-semibold text-white shadow-md shadow-primary-500/20 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Your lists are saved on this device even before you sign in.
          </p>
        </div>
      </main>
    </div>
  );
}

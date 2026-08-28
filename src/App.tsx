import { useEffect, useMemo, useState } from 'react';
import Home from '@/pages/Home';
import ListDetail from '@/pages/ListDetail';
import AuthPage from '@/pages/AuthPage';
import { useAuth } from '@/context/useAuth';
import { createApi } from '@/lib/api';
import type { Api } from '@/lib/api';

type Route = { name: 'home' } | { name: 'list'; id: string } | { name: 'auth' };

function readHashRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'auth') return { name: 'auth' };
  if (hash.startsWith('list/')) {
    const id = hash.slice('list/'.length);
    if (id) return { name: 'list', id };
  }
  return { name: 'home' };
}

function writeHashRoute(route: Route) {
  if (route.name === 'home') window.location.hash = '/';
  else if (route.name === 'auth') window.location.hash = '/auth';
  else window.location.hash = `/list/${route.id}`;
}

export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? { name: 'home' } : readHashRoute(),
  );

  const api: Api = useMemo(
    () => createApi({ isAuthenticated: !!user, userId: user?.id ?? null }),
    [user],
  );

  useEffect(() => {
    const onHashChange = () => setRoute(readHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Reset to home when the user signs out.
  useEffect(() => {
    if (!loading && !user && route.name === 'list') {
      setRoute({ name: 'home' });
      writeHashRoute({ name: 'home' });
    }
  }, [loading, user, route.name]);

  const navigate = (next: Route) => {
    writeHashRoute(next);
    setRoute(next);
    window.scrollTo({ top: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-secondary-50/40 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-neutral-200 border-t-secondary-500 animate-spin" />
      </div>
    );
  }

  if (route.name === 'auth') {
    if (user) {
      navigate({ name: 'home' });
      return null;
    }
    return <AuthPage />;
  }

  if (route.name === 'list') {
    return <ListDetail listId={route.id} api={api} onBack={() => navigate({ name: 'home' })} />;
  }
  return (
    <Home
      api={api}
      onOpenList={(id) => navigate({ name: 'list', id })}
      onCreateAndOpen={async (name) => {
        const list = await api.createList(name);
        navigate({ name: 'list', id: list.id });
      }}
      onSignIn={() => navigate({ name: 'auth' })}
    />
  );
}

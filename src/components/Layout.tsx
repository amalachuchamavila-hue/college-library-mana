import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookDown, BookOpen, BookUp, GraduationCap, History, LayoutDashboard, Library, LogOut, Menu, Settings, Tags, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api, type Profile } from '../lib/api';
import { cn, getLibraryName } from '../lib/utils';
import { Avatar } from './ui';

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/issue', label: 'Issue Book', icon: BookUp },
  { to: '/return', label: 'Return Book', icon: BookDown },
  { to: '/transactions', label: 'Transactions', icon: History },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/books': 'Books',
  '/students': 'Students',
  '/issue': 'Issue Book',
  '/return': 'Return Book',
  '/transactions': 'Transactions',
  '/categories': 'Categories',
  '/settings': 'Settings & Profile',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user, signOut } = useAuth();
  const { success } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const libName = getLibraryName();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    api.get<Profile>('/api/profile').then((p) => { if (mounted) setProfile(p); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await signOut();
    success('You have been logged out.');
    navigate('/login');
  };

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Admin';
  const pageTitle = TITLES[location.pathname] || 'Library';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 px-5 pb-6 pt-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/40">
          <Library className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-extrabold leading-tight text-white">{libName}</span>
          <span className="block text-xs font-medium text-blue-300">Management System</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150',
              isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40' : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar name={displayName} className="bg-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{displayName}</p>
            <p className="truncate text-xs text-blue-300">{profile?.role === 'admin' ? 'Administrator' : 'Staff'}</p>
          </div>
          <button onClick={handleLogout} title="Logout" className="rounded-lg p-2 text-blue-200/70 transition hover:bg-red-500/20 hover:text-red-300">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden" />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 lg:hidden"
            >
              <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-5 rounded-lg p-1.5 text-blue-200/70 hover:bg-white/10 hover:text-white" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
              {sidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Library className="h-4 w-4" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-extrabold text-slate-900 sm:text-lg">{pageTitle}</h2>
              <p className="hidden text-xs text-slate-500 sm:block">{today}</p>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="text-right">
                <p className="max-w-[160px] truncate text-sm font-bold text-slate-900">{displayName}</p>
                <p className="max-w-[160px] truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Avatar name={displayName} />
            </div>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:hidden" aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
        <footer className="px-4 pb-6 text-center text-xs text-slate-400 sm:px-6">
          {libName} · College Library Management System
        </footer>
      </div>
    </div>
  );
}

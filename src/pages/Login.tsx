import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, GraduationCap, History, Library, Loader2, Lock, Mail, ShieldCheck, User, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { signInWithGoogle } from '../lib/googleAuth';
import { getLibraryName, isEmail } from '../lib/utils';

const FEATURES = [
  { icon: BookOpen, title: 'Complete book catalogue', desc: 'Catalogue, copies & availability in one place' },
  { icon: GraduationCap, title: 'Student records', desc: 'Courses, departments & borrowing history' },
  { icon: History, title: 'Issue & return tracking', desc: 'Live availability with due-date control' },
  { icon: Wallet, title: 'Automatic fines', desc: 'Rs.5/day overdue calculation built in' },
];

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const libName = getLibraryName();
  const from = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  const fillDemo = () => {
    setEmail('admin@college.edu');
    setPassword('admin123');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup' && fullName.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (!isEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        success('Welcome back!', 'Login successful');
        navigate(from, { replace: true });
      } else {
        const r = await signUp(email.trim(), password, fullName.trim());
        if (r.needsConfirmation) {
          setInfo('Account created. Please check your email to confirm, then sign in.');
          setMode('signin');
        } else {
          success('Your admin account is ready.', 'Account created');
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Left branding panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-blue-950 lg:block xl:w-[52%]">
        {imgOk && (
          <img
            src="/images/library.jpg"
            alt="College library"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-blue-900/85 to-slate-950/90" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
              <Library className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xl font-extrabold text-white">{libName}</p>
              <p className="text-sm text-blue-200">Management System</p>
            </div>
          </div>
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              The modern way to run your college library.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mt-4 max-w-md text-blue-100">
              Catalogue books, manage students, track issues and returns, and collect overdue fines — all from one clean dashboard.
            </motion.p>
            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                  <f.icon className="h-5 w-5 text-blue-200" />
                  <p className="mt-2 text-sm font-bold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs text-blue-200">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <p className="text-xs text-blue-300">Secure admin access · Powered by Supabase</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
              <Library className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{libName}</p>
              <p className="text-xs font-medium text-slate-500">Management System</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{mode === 'signin' ? 'Admin Login' : 'Create admin account'}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'signin' ? 'Sign in to manage your college library.' : 'Register a new library administrator.'}
            </p>

            <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
              <button onClick={() => { setMode('signin'); setError(''); setInfo(''); }} className={`rounded-lg py-2 transition ${mode === 'signin' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Sign In</button>
              <button onClick={() => { setMode('signup'); setError(''); setInfo(''); }} className={`rounded-lg py-2 transition ${mode === 'signup' ? 'bg-white text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Sign Up</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Priya Sharma" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@college.edu" autoComplete="email" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="........" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</div>}
              {info && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700">{info}</div>}

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button onClick={() => signInWithGoogle(libName)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]">
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5.1l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" /><path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.6z" /><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.9l3.8 2.9c.9-3 3.6-5.1 6.8-5.1z" /></svg>
              Continue with Google
            </button>

            {mode === 'signin' && (
              <div className="mt-5 rounded-xl bg-slate-50 p-3.5 text-sm ring-1 ring-slate-200">
                <p className="font-bold text-slate-700">Demo credentials</p>
                <p className="mt-1 font-mono text-xs text-slate-600">admin@college.edu · admin123</p>
                <button onClick={fillDemo} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800">Autofill demo login</button>
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">Protected admin area · Only authenticated librarians can access the dashboard</p>
        </motion.div>
      </div>
    </div>
  );
}

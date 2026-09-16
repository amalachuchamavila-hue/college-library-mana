import { useEffect, useState, type FormEvent } from 'react';
import { Building2, KeyRound, ShieldCheck, User, Wallet } from 'lucide-react';
import { api, type Profile } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import supabase from '../lib/supabase';
import { DEFAULT_LOAN_DAYS, FINE_PER_DAY, formatDate, getLibraryName, getLoanDays } from '../lib/utils';
import { Avatar, Badge, Button, Card, ErrorState, Input, PageHeader, PageLoader } from '../components/ui';

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [libName, setLibName] = useState(getLibraryName());
  const [loanDays, setLoanDays] = useState(String(getLoanDays()));
  const [prefsError, setPrefsError] = useState('');
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const p = await api.get<Profile>('/api/profile');
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setProfileError('Full name is required.'); return; }
    setProfileError('');
    setSavingProfile(true);
    try {
      const p = await api.put<Profile>('/api/profile', { full_name: fullName.trim(), phone: phone.trim() });
      setProfile(p);
      success('Profile updated.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwError('');
    setSavingPw(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      setNewPassword('');
      setConfirmPassword('');
      success('Password changed successfully.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const handleSavePrefs = (e: FormEvent) => {
    e.preventDefault();
    const days = Number(loanDays);
    if (!libName.trim()) { setPrefsError('Library name is required.'); return; }
    if (!Number.isInteger(days) || days < 1 || days > 365) { setPrefsError('Loan period must be between 1 and 365 days.'); return; }
    setPrefsError('');
    localStorage.setItem('lib_library_name', libName.trim());
    localStorage.setItem('lib_loan_days', String(days));
    success('Library preferences saved. Sidebar name updates on next navigation.');
  };

  if (loading) return (<div><PageHeader title="Settings & Profile" subtitle="Your account and library preferences" /><PageLoader text="Loading profile..." /></div>);
  if (error) return (<div><PageHeader title="Settings & Profile" subtitle="Your account and library preferences" /><ErrorState message={error} onRetry={fetchProfile} /></div>);

  return (
    <div>
      <PageHeader title="Settings & Profile" subtitle="Your account and library preferences" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* Profile */}
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={fullName || profile?.email} className="h-12 w-12 text-base" />
              <div>
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><User className="h-4 w-4 text-blue-600" /> Admin Profile</h3>
                <p className="text-xs text-slate-500">How your name appears across the system</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <Input label="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} error={profileError} />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email (login)</label>
                <input value={profile?.email || user?.email || ''} disabled className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
              </div>
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <Button type="submit" loading={savingProfile} className="w-full sm:w-auto">Save Profile</Button>
              </div>
            </form>
          </Card>

          {/* Password */}
          <Card className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><KeyRound className="h-4 w-4 text-blue-600" /> Change Password</h3>
            <p className="mt-0.5 text-xs text-slate-500">Use a strong password with at least 6 characters</p>
            <form onSubmit={handleChangePassword} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <Input label="New Password" required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="........" />
              <Input label="Confirm Password" required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="........" />
              {pwError && <p className="text-xs font-medium text-red-600 sm:col-span-2">{pwError}</p>}
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <Button type="submit" variant="secondary" loading={savingPw} className="w-full sm:w-auto">Update Password</Button>
              </div>
            </form>
          </Card>

          {/* Library prefs */}
          <Card className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Building2 className="h-4 w-4 text-blue-600" /> Library Preferences</h3>
            <p className="mt-0.5 text-xs text-slate-500">Branding and default lending rules for this device</p>
            <form onSubmit={handleSavePrefs} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
              <Input label="Library Display Name" required value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="College Library" />
              <Input label="Default Loan Period (days)" required type="number" min={1} max={365} value={loanDays} onChange={(e) => setLoanDays(e.target.value)} placeholder={String(DEFAULT_LOAN_DAYS)} />
              {prefsError && <p className="text-xs font-medium text-red-600 sm:col-span-2">{prefsError}</p>}
              <div className="sm:col-span-2 sm:flex sm:justify-end">
                <Button type="submit" variant="secondary" className="w-full sm:w-auto">Save Preferences</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Account info */}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-500"><ShieldCheck className="h-4 w-4 text-blue-600" /> Account</h3>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Role</span><Badge tone="blue">{profile?.role === 'admin' ? 'Administrator' : profile?.role || 'Staff'}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><span className="max-w-[180px] truncate font-semibold text-slate-800">{profile?.email}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Member since</span><span className="font-semibold text-slate-800">{formatDate(profile?.created_at)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Auth provider</span><span className="font-semibold text-slate-800">{user?.app_metadata?.provider || 'email'}</span></div>
            </div>
          </Card>

          {/* Fine policy */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-blue-100"><Wallet className="h-4 w-4" /> Fine Policy</h3>
            <p className="mt-3 text-4xl font-extrabold">Rs.{FINE_PER_DAY}<span className="text-base font-semibold text-blue-200">/day</span></p>
            <p className="mt-2 text-sm leading-relaxed text-blue-100">Charged automatically for every day a book is kept past its due date. Fines are calculated live, saved on return, and tracked until paid.</p>
          </Card>

          {/* Security note */}
          <Card className="p-5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Security</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>- All admin pages require authentication</li>
              <li>- API routes verify your session token</li>
              <li>- Row Level Security guards library data</li>
              <li>- Sessions expire automatically for safety</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

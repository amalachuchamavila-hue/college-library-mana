import { useEffect, useMemo, useState } from 'react';
import { BookDown, CalendarDays, IndianRupee, TriangleAlert } from 'lucide-react';
import { api, type Issue } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { calcFine, FINE_PER_DAY, formatDate, formatINR, todayISO } from '../lib/utils';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, IssueStatusBadge, Modal, PageHeader, SearchInput, StatCard, TableSkeleton } from '../components/ui';

export default function ReturnBook() {
  const [active, setActive] = useState<Issue[]>([]);
  const [returned, setReturned] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [returnTarget, setReturnTarget] = useState<Issue | null>(null);
  const [returnDate, setReturnDate] = useState(todayISO());
  const [finePaid, setFinePaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, r] = await Promise.all([
        api.get<Issue[]>('/api/issues?status=active'),
        api.get<Issue[]>('/api/issues?status=returned'),
      ]);
      setActive(a);
      setReturned(r.slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issued books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return active;
    return active.filter((t) => [t.student_name, t.student_code, t.book_title, t.book_code].map((v) => String(v || '').toLowerCase()).some((v) => v.includes(q)));
  }, [active, search]);

  const overdueList = active.filter((t) => (t.overdue_days || 0) > 0);
  const pendingFine = active.reduce((n, t) => n + (t.current_fine || 0), 0);

  const openReturn = (t: Issue) => {
    setReturnTarget(t);
    setReturnDate(todayISO());
    setFinePaid((t.current_fine || 0) === 0);
  };

  const preview = returnTarget ? calcFine(returnTarget.due_date, returnDate || todayISO()) : { days: 0, fine: 0 };

  const handleReturn = async () => {
    if (!returnTarget) return;
    setSaving(true);
    try {
      const res = await api.put<Issue>('/api/issues', { action: 'return', id: returnTarget.id, return_date: returnDate || todayISO(), fine_paid: preview.fine === 0 ? true : finePaid });
      if ((res.fine_amount || 0) > 0) {
        success(`Returned with ${formatINR(res.fine_amount)} fine (${res.overdue_days} day${(res.overdue_days || 0) === 1 ? '' : 's'} overdue).${finePaid ? ' Fine collected.' : ' Fine pending.'}`, 'Book returned');
      } else {
        success(`"${returnTarget.book_title}" returned on time.`, 'Book returned');
      }
      setReturnTarget(null);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to return book.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !loading) return (<div><PageHeader title="Return Book" subtitle="Accept books back from students" /><ErrorState message={error} onRetry={fetchAll} /></div>);

  return (
    <div>
      <PageHeader title="Return Book" subtitle="All books currently issued to students" />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Currently Issued" value={String(active.length)} sub="books with students" icon={BookDown} accent="blue" />
        <StatCard label="Overdue" value={String(overdueList.length)} sub="past due date" icon={TriangleAlert} accent="red" />
        <StatCard label="Collectable Fine" value={formatINR(pendingFine)} sub={`Rs.${FINE_PER_DAY}/day per book`} icon={IndianRupee} accent="amber" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by student or book..." />
      </div>

      {loading ? (
        <Card><TableSkeleton rows={6} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={BookDown} title={search ? 'No matching issues' : 'Nothing to return'} description={search ? 'Try a different search term.' : 'No books are currently issued. All copies are on the shelves.'} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((t) => (
            <Card key={t.id} className="p-4 transition hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={t.student_name} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{t.book_title}</p>
                    <p className="truncate text-sm text-slate-500">{t.student_name} · {t.student_code}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{t.book_code}</p>
                  </div>
                </div>
                <IssueStatusBadge status={t.computed_status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                <div><p className="text-[11px] font-semibold uppercase text-slate-400">Issued</p><p className="mt-0.5 text-xs font-bold text-slate-800 sm:text-sm">{formatDate(t.issue_date)}</p></div>
                <div><p className="text-[11px] font-semibold uppercase text-slate-400">Due</p><p className="mt-0.5 text-xs font-bold text-slate-800 sm:text-sm">{formatDate(t.due_date)}</p></div>
                <div><p className="text-[11px] font-semibold uppercase text-slate-400">Fine now</p><p className={`mt-0.5 text-xs font-extrabold sm:text-sm ${(t.current_fine || 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatINR(t.current_fine)}</p></div>
              </div>
              {(t.overdue_days || 0) > 0 && <p className="mt-2 text-xs font-bold text-red-600">{t.overdue_days} day{(t.overdue_days || 0) === 1 ? '' : 's'} overdue · {formatINR(FINE_PER_DAY)}/day</p>}
              <Button onClick={() => openReturn(t)} icon={BookDown} className="mt-3 w-full">Return Book</Button>
            </Card>
          ))}
        </div>
      )}

      {/* Recently returned */}
      {!loading && returned.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">Recently Returned</h3>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Student</th>
                  <th className="px-4 py-2.5 font-semibold">Book</th>
                  <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Returned</th>
                  <th className="px-4 py-2.5 font-semibold">Fine</th>
                  <th className="px-5 py-2.5 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returned.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-800">{t.student_name}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{t.book_title}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 sm:table-cell">{formatDate(t.return_date)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatINR(t.fine_amount)}</td>
                    <td className="px-5 py-3">{Number(t.fine_amount) === 0 ? <Badge tone="slate">No fine</Badge> : t.fine_paid ? <Badge tone="emerald">Paid</Badge> : <Badge tone="amber">Unpaid</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Return modal */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title="Return Book" subtitle={returnTarget ? `"${returnTarget.book_title}" · ${returnTarget.student_name}` : ''} footer={<>
        <Button variant="secondary" onClick={() => setReturnTarget(null)} disabled={saving}>Cancel</Button>
        <Button onClick={handleReturn} loading={saving} icon={BookDown}>Confirm Return</Button>
      </>}>
        {returnTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Issue date</p><p className="mt-0.5 font-bold text-slate-800">{formatDate(returnTarget.issue_date)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Due date</p><p className="mt-0.5 font-bold text-slate-800">{formatDate(returnTarget.due_date)}</p></div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Return Date <span className="text-red-500">*</span></label>
              <input type="date" value={returnDate} min={returnTarget.issue_date.slice(0, 10)} onChange={(e) => setReturnDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className={`rounded-xl border p-4 ${preview.fine > 0 ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Overdue: {preview.days} day{preview.days === 1 ? '' : 's'}</p>
                  <p className="text-xs text-slate-500">Fine policy: {formatINR(FINE_PER_DAY)} per day after due date</p>
                </div>
                <p className={`text-2xl font-extrabold ${preview.fine > 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatINR(preview.fine)}</p>
              </div>
              {preview.fine > 0 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg bg-white/70 p-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  <input type="checkbox" checked={finePaid} onChange={(e) => setFinePaid(e.target.checked)} className="h-4 w-4 rounded accent-blue-600" />
                  Fine of {formatINR(preview.fine)} collected from student
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500">On confirm, the transaction is marked returned and the book's available copies increase automatically.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

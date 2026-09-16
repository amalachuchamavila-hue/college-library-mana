import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, History } from 'lucide-react';
import { api, type ComputedStatus, type Issue } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { cn, formatDate, formatINR, todayISO } from '../lib/utils';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, IssueStatusBadge, Modal, PageHeader, Pagination, SearchInput, TableSkeleton } from '../components/ui';

const PAGE_SIZE = 10;
type Tab = 'all' | 'issued' | 'overdue' | 'returned';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'issued', label: 'Issued' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

export default function Transactions() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [extendTarget, setExtendTarget] = useState<Issue | null>(null);
  const [newDue, setNewDue] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const { success, error: toastError } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Issue[]>('/api/issues');
      setIssues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setPage(1); }, [tab, search]);

  const counts = useMemo(() => ({
    all: issues.length,
    issued: issues.filter((i) => i.computed_status === 'issued').length,
    overdue: issues.filter((i) => i.computed_status === 'overdue').length,
    returned: issues.filter((i) => i.computed_status === 'returned').length,
  }), [issues]);

  const filtered = useMemo(() => {
    let list = issues;
    if (tab !== 'all') list = list.filter((i) => i.computed_status === (tab as ComputedStatus));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => [i.student_name, i.student_code, i.student_email, i.book_title, i.book_code, i.book_author].map((v) => String(v || '').toLowerCase()).some((v) => v.includes(q)));
    return list;
  }, [issues, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const openExtend = (t: Issue) => { setExtendTarget(t); setNewDue(t.due_date.slice(0, 10)); };

  const handleExtend = async () => {
    if (!extendTarget || !newDue) return;
    setActionLoading(true);
    try {
      await api.put('/api/issues', { action: 'extend', id: extendTarget.id, due_date: newDue });
      success(`Due date extended to ${formatDate(newDue)}.`);
      setExtendTarget(null);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to extend due date.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (t: Issue) => {
    setActionLoading(true);
    try {
      await api.put('/api/issues', { action: 'pay_fine', id: t.id });
      success(`Fine of ${formatINR(t.status === 'returned' ? t.fine_amount : t.current_fine)} marked as paid.`);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update fine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.del('/api/issues', { id: deleteTarget.id });
      success('Transaction record deleted.');
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  if (error && !loading) return (<div><PageHeader title="Transactions" subtitle="Complete issue and return history" /><ErrorState message={error} onRetry={fetchAll} /></div>);

  return (
    <div>
      <PageHeader title="Transactions" subtitle={`${issues.length} total records · fines at Rs.5/day overdue`} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition', tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
            >
              {t.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-extrabold', tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search student, book, ISBN..." className="lg:w-80" />
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><TableSkeleton rows={10} cols={7} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={History} title="No transactions found" description={search || tab !== 'all' ? 'Try a different filter or search term.' : 'Issue a book to create the first transaction.'} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Book</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Issue Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Due Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Return Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Fine</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((t) => {
                  const fine = t.status === 'returned' ? Number(t.fine_amount) : Number(t.current_fine || 0);
                  return (
                    <tr key={t.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3.5">
                        <p className="max-w-[170px] truncate font-bold text-slate-900">{t.student_name}</p>
                        <p className="font-mono text-xs text-slate-500">{t.student_code}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[200px] truncate font-medium text-slate-800">{t.book_title}</p>
                        <p className="font-mono text-xs text-slate-500">{t.book_code}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatDate(t.issue_date)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDate(t.due_date)}
                        {t.computed_status === 'overdue' && <span className="ml-1.5 text-xs font-bold text-red-600">({t.overdue_days}d)</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{t.return_date ? formatDate(t.return_date) : '—'}</td>
                      <td className="px-4 py-3.5"><IssueStatusBadge status={t.computed_status} /></td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{formatINR(fine)}</p>
                        {fine > 0 && (t.fine_paid ? <Badge tone="emerald">Paid</Badge> : <Badge tone="amber">Unpaid</Badge>)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {t.status === 'issued' && <button onClick={() => openExtend(t)} className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50">Extend</button>}
                        {fine > 0 && !t.fine_paid && <button onClick={() => handleMarkPaid(t)} className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">Paid</button>}
                        {t.status === 'returned' && <button onClick={() => setDeleteTarget(t)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>}
                        {t.status === 'issued' && fine === 0 && t.computed_status === 'issued' && <span className="text-xs text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <Modal open={!!extendTarget} onClose={() => setExtendTarget(null)} title="Extend Due Date" subtitle={extendTarget ? `"${extendTarget.book_title}" · ${extendTarget.student_name}` : ''} footer={<>
        <Button variant="secondary" onClick={() => setExtendTarget(null)} disabled={actionLoading}>Cancel</Button>
        <Button onClick={handleExtend} loading={actionLoading} icon={CalendarClock}>Extend</Button>
      </>}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">New Due Date <span className="text-red-500">*</span></label>
          <input type="date" value={newDue} min={todayISO()} onChange={(e) => setNewDue(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <p className="mt-2 text-xs text-slate-500">Current due date: {extendTarget ? formatDate(extendTarget.due_date) : '—'}. Extending clears the overdue state once the date is in the future.</p>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete transaction?" message="This returned transaction record will be permanently removed. This cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={actionLoading} />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, BookUp, GraduationCap, IndianRupee, Library, TriangleAlert } from 'lucide-react';
import { api, type DashboardData } from '../lib/api';
import { formatDate, formatINR, timeAgo } from '../lib/utils';
import { Avatar, Badge, Card, ErrorState, IssueStatusBadge, StatCard, TableSkeleton } from '../components/ui';

const ACCENT_DOTS = ['bg-blue-500', 'bg-cyan-500', 'bg-violet-500', 'bg-amber-500', 'bg-red-400', 'bg-emerald-500', 'bg-slate-400', 'bg-orange-400'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get<DashboardData>('/api/dashboard');
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />
          ))}
        </div>
        <Card className="mt-5"><TableSkeleton rows={5} /></Card>
      </div>
    );
  }

  if (error && !data) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return null;

  const s = data.stats;
  const maxCat = Math.max(1, ...data.categoryStats.map((c) => c.count));

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Books" value={String(s.totalTitles)} sub={`${s.totalCopies} total copies`} icon={Library} accent="blue" delay={0} />
        <StatCard label="Available Books" value={String(s.availableCopies)} sub="copies ready to issue" icon={BookOpen} accent="cyan" delay={0.05} />
        <StatCard label="Issued Books" value={String(s.activeIssues)} sub="currently with students" icon={BookUp} accent="violet" delay={0.1} />
        <StatCard label="Total Students" value={String(s.totalStudents)} sub="registered members" icon={GraduationCap} accent="blue" delay={0.15} />
        <StatCard label="Overdue Books" value={String(s.overdueCount)} sub="past due date" icon={TriangleAlert} accent="red" delay={0.2} />
        <StatCard label="Pending Fine" value={formatINR(s.pendingFine)} sub="Rs.5 per day overdue" icon={IndianRupee} accent="amber" delay={0.25} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Recent transactions */}
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Latest issue and return activity</p>
            </div>
            <Link to="/transactions" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {data.recentTransactions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No transactions yet. Issue a book to get started.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">Student</th>
                    <th className="px-4 py-2.5 font-semibold">Book</th>
                    <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Due date</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentTransactions.map((t) => (
                    <tr key={t.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.student_name} className="h-8 w-8 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{t.student_name}</p>
                            <p className="truncate text-xs text-slate-500">{t.student_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate font-medium text-slate-800">{t.book_title}</p>
                        <p className="text-xs text-slate-500">{t.book_code}</p>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">{formatDate(t.due_date)}</td>
                      <td className="px-4 py-3"><IssueStatusBadge status={t.computed_status} /></td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{formatINR(t.current_fine)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Overdue */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue Books
              </h3>
              <p className="text-xs text-slate-500">Needs immediate attention</p>
            </div>
            <Link to="/return" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">Collect <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
            {data.overdue.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center">
                <p className="text-sm font-semibold text-slate-600">All clear — no overdue books.</p>
                <p className="mt-1 text-xs text-slate-500">Every issued book is within its due date.</p>
              </div>
            ) : data.overdue.map((t) => (
              <div key={t.id} className="rounded-xl border border-red-100 bg-red-50/50 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{t.book_title}</p>
                    <p className="truncate text-xs text-slate-500">{t.student_name} · {t.student_code}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-red-600 px-2 py-1 text-xs font-extrabold text-white">{formatINR(t.current_fine)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">Due {formatDate(t.due_date)}</span>
                  <span className="font-bold text-red-600">{t.overdue_days}d overdue</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Category distribution */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Books by Category</h3>
              <p className="text-xs text-slate-500">{s.totalCategories} categories · {s.totalTitles} titles</p>
            </div>
            <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">Manage <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.categoryStats.length === 0 && <p className="text-sm text-slate-500">No categories yet.</p>}
            {data.categoryStats.slice(0, 7).map((c, i) => (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${ACCENT_DOTS[i % ACCENT_DOTS.length]}`} />{c.name}
                  </span>
                  <span className="font-bold text-slate-900">{c.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${ACCENT_DOTS[i % ACCENT_DOTS.length]}`} style={{ width: `${Math.max(4, (c.count / maxCat) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent books */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recently Added Books</h3>
              <p className="text-xs text-slate-500">Fresh arrivals in the catalogue</p>
            </div>
            <Link to="/books" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800">Catalogue <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {data.recentBooks.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No books in the catalogue yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {data.recentBooks.map((b) => (
                <div key={b.id} className="flex gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-lg font-extrabold text-blue-700">
                    {b.title.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{b.title}</p>
                    <p className="truncate text-xs text-slate-500">by {b.author}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {b.category_name && <Badge tone="blue">{b.category_name}</Badge>}
                      <Badge tone={Number(b.available_copies) > 0 ? 'emerald' : 'red'}>{b.available_copies}/{b.total_copies} available</Badge>
                    </div>
                  </div>
                  <span className="shrink-0 self-start text-[11px] font-medium text-slate-400">{timeAgo(b.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

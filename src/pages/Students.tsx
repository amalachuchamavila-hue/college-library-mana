import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { api, type Issue, type Student } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { formatDate, formatINR, isEmail, isPhone } from '../lib/utils';
import { Avatar, Badge, Button, CardsSkeleton, ConfirmDialog, EmptyState, ErrorState, Input, IssueStatusBadge, Modal, PageHeader, Pagination, SearchInput, TableSkeleton, Textarea } from '../components/ui';

const PAGE_SIZE = 8;

interface FormState { student_id: string; name: string; email: string; phone: string; course: string; department: string; year_semester: string; address: string; }
const EMPTY_FORM: FormState = { student_id: '', name: '', email: '', phone: '', course: '', department: '', year_semester: '', address: '' };

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; student: Student } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<Student | null>(null);
  const [history, setHistory] = useState<Issue[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const data = await api.get<Student[]>(`/api/students?${params.toString()}`);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageItems = useMemo(() => students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [students, page]);

  const openAdd = () => { setForm(EMPTY_FORM); setFormErrors({}); setModal({ mode: 'add' }); };
  const openEdit = (s: Student) => {
    setForm({ student_id: s.student_id, name: s.name, email: s.email, phone: s.phone || '', course: s.course || '', department: s.department || '', year_semester: s.year_semester || '', address: s.address || '' });
    setFormErrors({});
    setModal({ mode: 'edit', student: s });
  };
  const openView = (s: Student) => {
    setViewTarget(s);
    setHistoryLoading(true);
    api.get<Issue[]>(`/api/issues?student_id=${s.id}`).then(setHistory).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
  };

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.student_id.trim()) e.student_id = 'Student ID is required.';
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email address.';
    if (form.phone.trim() && !isPhone(form.phone)) e.phone = 'Enter a valid phone number.';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!modal || !validate()) return;
    setSaving(true);
    try {
      const payload = { student_id: form.student_id.trim(), name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), course: form.course.trim(), department: form.department.trim(), year_semester: form.year_semester.trim(), address: form.address.trim() };
      if (modal.mode === 'add') {
        await api.post('/api/students', payload);
        success('Student registered successfully.');
      } else {
        await api.put('/api/students', { ...payload, id: modal.student.id });
        success('Student details updated.');
      }
      setModal(null);
      fetchStudents();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del('/api/students', { id: deleteTarget.id });
      success(`${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  if (error && students.length === 0 && !loading) return (<div><PageHeader title="Students" subtitle="Manage registered library members" /><ErrorState message={error} onRetry={fetchStudents} /></div>);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${students.length} registered member${students.length === 1 ? '' : 's'}`}
        actions={<Button icon={Plus} onClick={openAdd}>Add Student</Button>}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, Student ID, email, course, department..." />
      </div>

      {loading ? (
        <><div className="hidden rounded-2xl border border-slate-200 bg-white md:block"><TableSkeleton rows={8} cols={5} /></div><div className="md:hidden"><CardsSkeleton /></div></>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={GraduationCap} title="No students found" description={search ? 'Try a different search term.' : 'Register your first student member.'} action={search ? undefined : <Button icon={Plus} onClick={openAdd}>Add Student</Button>} />
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">Course / Dept</th>
                    <th className="px-4 py-3 font-semibold">Issued</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((s) => (
                    <tr key={s.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} className="h-10 w-10 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{s.name}</p>
                            <p className="truncate text-xs text-slate-500">{s.year_semester || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-slate-700">{s.student_id}</td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[200px] truncate text-slate-700">{s.email}</p>
                        <p className="text-xs text-slate-500">{s.phone || '—'}</p>
                      </td>
                      <td className="hidden max-w-[180px] px-4 py-3.5 lg:table-cell">
                        <p className="truncate text-slate-700">{s.course || '—'}</p>
                        <p className="truncate text-xs text-slate-500">{s.department || ''}</p>
                      </td>
                      <td className="px-4 py-3.5">{(s.active_issues || 0) > 0 ? <Badge tone="blue">{s.active_issues} book{(s.active_issues || 0) === 1 ? '' : 's'}</Badge> : <span className="text-xs text-slate-400">None</span>}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button onClick={() => openView(s)} className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100">View</button>
                        <button onClick={() => openEdit(s)} className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50">Edit</button>
                        <button onClick={() => setDeleteTarget(s)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} totalItems={students.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>

          <div className="space-y-3 md:hidden">
            {pageItems.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} className="h-11 w-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{s.name}</p>
                    <p className="font-mono text-[11px] text-slate-500">{s.student_id}</p>
                    <p className="truncate text-xs text-slate-500">{s.course || ''}{s.course && s.department ? ' · ' : ''}{s.department || ''}</p>
                  </div>
                  {(s.active_issues || 0) > 0 && <Badge tone="blue">{s.active_issues}</Badge>}
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                  <button onClick={() => openView(s)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100">View</button>
                  <button onClick={() => openEdit(s)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50">Edit</button>
                  <button onClick={() => setDeleteTarget(s)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pagination page={page} totalPages={totalPages} totalItems={students.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Add New Student' : 'Edit Student'} subtitle={modal?.mode === 'add' ? 'Register a new library member' : modal?.mode === 'edit' ? `Updating "${modal.student.name}"` : ''} maxWidth="xl" footer={<>
        <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>{modal?.mode === 'add' ? 'Add Student' : 'Save Changes'}</Button>
      </>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Student ID" required value={form.student_id} onChange={set('student_id')} error={formErrors.student_id} placeholder="e.g. STU-2024-001" />
          <Input label="Full Name" required value={form.name} onChange={set('name')} error={formErrors.name} placeholder="e.g. Aarav Sharma" />
          <Input label="Email" required type="email" value={form.email} onChange={set('email')} error={formErrors.email} placeholder="name@college.edu" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} error={formErrors.phone} placeholder="e.g. 9876543210" />
          <Input label="Course" value={form.course} onChange={set('course')} placeholder="e.g. B.Tech" />
          <Input label="Department" value={form.department} onChange={set('department')} placeholder="e.g. Computer Science" />
          <Input label="Year / Semester" value={form.year_semester} onChange={set('year_semester')} placeholder="e.g. Sem 5" />
          <div className="sm:col-span-2"><Textarea label="Address" value={form.address} onChange={set('address')} placeholder="Residential address (optional)" /></div>
        </div>
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.name || 'Student'} subtitle={viewTarget ? `${viewTarget.student_id} · ${viewTarget.email}` : ''} maxWidth="lg">
        {viewTarget && (
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Phone</p><p className="mt-0.5 font-semibold text-slate-800">{viewTarget.phone || '—'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Course</p><p className="mt-0.5 font-semibold text-slate-800">{viewTarget.course || '—'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Department</p><p className="mt-0.5 font-semibold text-slate-800">{viewTarget.department || '—'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Year / Sem</p><p className="mt-0.5 font-semibold text-slate-800">{viewTarget.year_semester || '—'}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Active issues</p><p className="mt-0.5 font-semibold text-slate-800">{viewTarget.active_issues || 0}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-400">Member since</p><p className="mt-0.5 font-semibold text-slate-800">{formatDate(viewTarget.created_at)}</p></div>
            </div>
            <h4 className="mb-2 mt-5 text-sm font-extrabold text-slate-900">Borrowing history</h4>
            {historyLoading ? <p className="py-4 text-center text-sm text-slate-500">Loading history...</p> : history.length === 0 ? (
              <p className="rounded-xl bg-slate-50 py-5 text-center text-sm text-slate-500">No borrowing history yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{h.book_title}</p>
                      <p className="text-xs text-slate-500">Issued {formatDate(h.issue_date)} · Due {formatDate(h.due_date)}{h.status === 'returned' ? ` · Returned ${formatDate(h.return_date)}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <IssueStatusBadge status={h.computed_status} />
                      {(h.current_fine || 0) > 0 && <span className="text-xs font-bold text-red-600">{formatINR(h.current_fine)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete student?" message={`"${deleteTarget?.name} (${deleteTarget?.student_id})" will be permanently removed along with past transaction history. This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

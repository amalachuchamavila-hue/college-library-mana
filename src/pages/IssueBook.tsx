import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookUp, CheckCircle2, ChevronDown } from 'lucide-react';
import { api, type Book, type Issue, type Student } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { addDaysISO, cn, diffDays, FINE_PER_DAY, formatDate, formatINR, getLoanDays, todayISO } from '../lib/utils';
import { Avatar, Badge, Button, Card, Field, IssueStatusBadge, PageHeader, Textarea } from '../components/ui';

interface Option { value: string; label: string; sub?: string; disabled?: boolean; hint?: string }

function SearchSelect({ label, required, placeholder, options, value, onChange, error, emptyText }: { label: string; required?: boolean; placeholder: string; options: Option[]; value: string; onChange: (v: string) => void; error?: string; emptyText: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <Field label={label} required={required} error={error}>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn('flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2', error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200')}
        >
          <span className={cn('truncate', selected ? 'font-semibold text-slate-900' : 'text-slate-400')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to search..." className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-slate-500">{emptyText}</p>}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                  className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition', o.value === value ? 'bg-blue-50' : 'hover:bg-slate-50', o.disabled && 'cursor-not-allowed opacity-50')}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{o.label}</span>
                    {o.sub && <span className="block truncate text-xs text-slate-500">{o.sub}</span>}
                  </span>
                  {o.hint && <span className="shrink-0 text-xs font-bold text-slate-500">{o.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}

export default function IssueBook() {
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(() => addDaysISO(todayISO(), getLoanDays()));
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ student?: string; book?: string; dates?: string }>({});
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Issue[]>([]);
  const { success, error: toastError } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, b, r] = await Promise.all([
        api.get<Student[]>('/api/students'),
        api.get<Book[]>('/api/books'),
        api.get<Issue[]>('/api/issues?status=active'),
      ]);
      setStudents(s);
      setBooks(b);
      setRecent(r.slice(0, 6));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedBook = books.find((b) => String(b.id) === bookId);
  const selectedStudent = students.find((s) => String(s.id) === studentId);
  const loanDays = diffDays(issueDate, dueDate);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!studentId) errs.student = 'Please select a student.';
    if (!bookId) errs.book = 'Please select a book.';
    if (!issueDate || !dueDate) errs.dates = 'Issue date and due date are required.';
    else if (diffDays(issueDate, dueDate) < 0) errs.dates = 'Due date cannot be before the issue date.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await api.post('/api/issues', { student_id: Number(studentId), book_id: Number(bookId), issue_date: issueDate, due_date: dueDate, notes: notes.trim() });
      success(`"${selectedBook?.title}" issued to ${selectedStudent?.name}.`, 'Book issued');
      setStudentId(''); setBookId(''); setNotes('');
      setIssueDate(todayISO());
      setDueDate(addDaysISO(todayISO(), getLoanDays()));
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to issue book.');
    } finally {
      setSaving(false);
    }
  };

  const studentOptions: Option[] = students.map((s) => ({ value: String(s.id), label: `${s.name} (${s.student_id})`, sub: `${s.course || ''}${s.course && s.department ? ' · ' : ''}${s.department || ''}${s.email ? ' · ' + s.email : ''}` }));
  const bookOptions: Option[] = books.map((b) => ({
    value: String(b.id), label: `${b.title} — ${b.author}`, sub: `${b.book_id} · ${b.isbn}${b.category_name ? ' · ' + b.category_name : ''}`,
    disabled: Number(b.available_copies) <= 0, hint: Number(b.available_copies) > 0 ? `${b.available_copies} left` : 'Out of stock',
  }));

  return (
    <div>
      <PageHeader title="Issue Book" subtitle="Lend an available book to a registered student" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5 sm:p-6 xl:col-span-2">
          {loading ? (
            <div className="animate-pulse space-y-4 py-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <SearchSelect label="Select Student" required placeholder="Choose a student..." options={studentOptions} value={studentId} onChange={setStudentId} error={errors.student} emptyText="No students found. Register one first." />
              <SearchSelect label="Select Book" required placeholder="Choose an available book..." options={bookOptions} value={bookId} onChange={setBookId} error={errors.book} emptyText="No books found. Add books first." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Issue Date <span className="text-red-500">*</span></label>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Due Date <span className="text-red-500">*</span></label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={issueDate} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              {errors.dates && <p className="text-xs font-medium text-red-600">{errors.dates}</p>}
              {issueDate && dueDate && loanDays >= 0 && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Loan period: {loanDays} day{loanDays === 1 ? '' : 's'} · Overdue fine {formatINR(FINE_PER_DAY)}/day after {formatDate(dueDate)}</p>}
              <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks about this issue..." />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="submit" loading={saving} icon={BookUp} size="lg" className="sm:w-auto">Issue Book</Button>
              </div>
            </form>
          )}
        </Card>

        <div className="space-y-5">
          {/* Summary */}
          <Card className="p-5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Issue Summary</h3>
            {!selectedBook && !selectedStudent && <p className="mt-3 text-sm text-slate-500">Select a student and a book to preview this transaction.</p>}
            {selectedStudent && (
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <Avatar name={selectedStudent.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{selectedStudent.name}</p>
                  <p className="truncate text-xs text-slate-500">{selectedStudent.student_id} · {(selectedStudent.active_issues || 0)} active</p>
                </div>
              </div>
            )}
            {selectedBook && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-sm font-bold text-slate-900">{selectedBook.title}</p>
                <p className="text-xs text-slate-500">by {selectedBook.author} · {selectedBook.book_id}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={Number(selectedBook.available_copies) > 0 ? 'emerald' : 'red'}>{selectedBook.available_copies} of {selectedBook.total_copies} available</Badge>
                  {selectedBook.shelf_location && <span className="text-xs text-slate-500">Shelf: {selectedBook.shelf_location}</span>}
                </div>
              </div>
            )}
            <div className="mt-3 space-y-1.5 text-xs text-slate-500">
              <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Availability decreases automatically on issue</p>
              <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Out-of-stock books cannot be issued</p>
              <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Duplicate active issues are blocked</p>
            </div>
          </Card>

          {/* Recently issued */}
          <Card className="p-5">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Recently Issued</h3>
            <div className="mt-3 space-y-2.5">
              {recent.length === 0 && <p className="text-sm text-slate-500">No active issues right now.</p>}
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{r.book_title}</p>
                    <p className="truncate text-xs text-slate-500">{r.student_name} · due {formatDate(r.due_date)}</p>
                  </div>
                  <IssueStatusBadge status={r.computed_status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

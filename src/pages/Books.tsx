import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { api, type Book, type Category } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Badge, Button, CardsSkeleton, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, SearchInput, Select, TableSkeleton, Textarea } from '../components/ui';

const PAGE_SIZE = 8;

interface FormState {
  book_id: string; isbn: string; title: string; author: string; category_id: string;
  publisher: string; published_year: string; total_copies: string; shelf_location: string; description: string;
}
const EMPTY_FORM: FormState = { book_id: '', isbn: '', title: '', author: '', category_id: '', publisher: '', published_year: '', total_copies: '1', shelf_location: '', description: '' };

function CopiesBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = available <= 0 ? 'bg-red-500' : pct < 30 ? 'bg-amber-500' : 'bg-blue-600';
  return (
    <div>
      <p className="text-sm font-bold text-slate-900">{available}<span className="font-medium text-slate-400">/{total}</span></p>
      <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availFilter, setAvailFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; book: Book } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (availFilter) params.set('availability', availFilter);
      const [b, c] = await Promise.all([
        api.get<Book[]>(`/api/books?${params.toString()}`),
        api.get<Category[]>('/api/categories'),
      ]);
      setBooks(b);
      setCategories(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, availFilter]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const pageItems = useMemo(() => books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [books, page]);

  const openAdd = () => { setForm(EMPTY_FORM); setFormErrors({}); setModal({ mode: 'add' }); };
  const openEdit = (book: Book) => {
    setForm({
      book_id: book.book_id, isbn: book.isbn, title: book.title, author: book.author,
      category_id: book.category_id ? String(book.category_id) : '',
      publisher: book.publisher || '', published_year: book.published_year ? String(book.published_year) : '',
      total_copies: String(book.total_copies), shelf_location: book.shelf_location || '', description: book.description || '',
    });
    setFormErrors({});
    setModal({ mode: 'edit', book });
  };

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = 'Book name is required.';
    if (!form.author.trim()) e.author = 'Author is required.';
    if (!form.isbn.trim()) e.isbn = 'ISBN is required.';
    const total = Number(form.total_copies);
    if (form.total_copies.trim() === '' || !Number.isInteger(total) || total < 0) e.total_copies = 'Enter a non-negative whole number.';
    if (form.published_year.trim()) {
      const y = Number(form.published_year);
      if (!Number.isInteger(y) || y < 1000 || y > 2100) e.published_year = 'Enter a valid year.';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!modal || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        book_id: form.book_id.trim(), isbn: form.isbn.trim(), title: form.title.trim(), author: form.author.trim(),
        category_id: form.category_id || null, publisher: form.publisher.trim(),
        published_year: form.published_year.trim() === '' ? null : Number(form.published_year),
        total_copies: Number(form.total_copies), shelf_location: form.shelf_location.trim(), description: form.description.trim(),
      };
      if (modal.mode === 'add') {
        await api.post('/api/books', payload);
        success('Book added to the catalogue.');
      } else {
        await api.put('/api/books', { ...payload, id: modal.book.id });
        success('Book details updated.');
      }
      setModal(null);
      fetchBooks();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save book.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del('/api/books', { id: deleteTarget.id });
      success(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      fetchBooks();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete book.');
    } finally {
      setDeleting(false);
    }
  };

  if (error && books.length === 0 && !loading) return (<div><PageHeader title="Books" subtitle="Manage your library catalogue" /><ErrorState message={error} onRetry={fetchBooks} /></div>);

  return (
    <div>
      <PageHeader
        title="Books"
        subtitle={`${books.length} title${books.length === 1 ? '' : 's'} in the catalogue`}
        actions={<Button icon={Plus} onClick={openAdd}>Add Book</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by title, author, ISBN, Book ID..." />
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={availFilter} onChange={(e) => { setAvailFilter(e.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
          <option value="">All availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Out of stock</option>
        </select>
      </div>

      {loading ? (
        <><div className="hidden rounded-2xl border border-slate-200 bg-white md:block"><TableSkeleton rows={8} cols={6} /></div><div className="md:hidden"><CardsSkeleton /></div></>
      ) : books.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={BookOpen} title="No books found" description={search || categoryFilter || availFilter ? 'Try adjusting your search or filters.' : 'Add your first book to start building the catalogue.'} action={(search || categoryFilter || availFilter) ? undefined : <Button icon={Plus} onClick={openAdd}>Add Book</Button>} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Book</th>
                    <th className="px-4 py-3 font-semibold">Book ID / ISBN</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Copies</th>
                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">Publisher</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((b) => (
                    <tr key={b.id} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-base font-extrabold text-blue-700">{b.title.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-bold text-slate-900">{b.title}</p>
                            <p className="truncate text-xs text-slate-500">by {b.author}{b.published_year ? ` · ${b.published_year}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-mono text-xs font-bold text-slate-700">{b.book_id}</p>
                        <p className="font-mono text-xs text-slate-500">{b.isbn}</p>
                      </td>
                      <td className="px-4 py-3.5">{b.category_name ? <Badge tone="blue">{b.category_name}</Badge> : <span className="text-xs text-slate-400">—</span>}</td>
                      <td className="px-4 py-3.5"><CopiesBar available={Number(b.available_copies)} total={Number(b.total_copies)} /></td>
                      <td className="hidden max-w-[160px] truncate px-4 py-3.5 text-slate-600 lg:table-cell">{b.publisher || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button onClick={() => openEdit(b)} className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50">Edit</button>
                        <button onClick={() => setDeleteTarget(b)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} totalItems={books.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {pageItems.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-lg font-extrabold text-blue-700">{b.title.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{b.title}</p>
                    <p className="truncate text-xs text-slate-500">by {b.author}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{b.book_id} · {b.isbn}</p>
                  </div>
                  <Badge tone={Number(b.available_copies) > 0 ? 'emerald' : 'red'}>{b.available_copies}/{b.total_copies}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  {b.category_name ? <Badge tone="blue">{b.category_name}</Badge> : <span />}
                  <div>
                    <button onClick={() => openEdit(b)} className="mr-1 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50">Edit</button>
                    <button onClick={() => setDeleteTarget(b)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pagination page={page} totalPages={totalPages} totalItems={books.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Add New Book' : 'Edit Book'} subtitle={modal?.mode === 'add' ? 'Add a title to the library catalogue' : modal?.mode === 'edit' ? `Updating "${modal.book.title}"` : ''} maxWidth="xl" footer={<>
        <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>{modal?.mode === 'add' ? 'Add Book' : 'Save Changes'}</Button>
      </>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Book Name" required value={form.title} onChange={set('title')} error={formErrors.title} placeholder="e.g. Introduction to Algorithms" />
          <Input label="Author" required value={form.author} onChange={set('author')} error={formErrors.author} placeholder="e.g. Thomas H. Cormen" />
          <Input label="ISBN" required value={form.isbn} onChange={set('isbn')} error={formErrors.isbn} placeholder="e.g. 978-0262033848" />
          <Input label="Book ID" value={form.book_id} onChange={set('book_id')} placeholder="Auto-generated if left blank" />
          <Select label="Category" value={form.category_id} onChange={set('category_id')}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Total Copies" required type="number" min={0} step={1} value={form.total_copies} onChange={set('total_copies')} error={formErrors.total_copies} />
          <Input label="Publisher" value={form.publisher} onChange={set('publisher')} placeholder="e.g. MIT Press" />
          <Input label="Published Year" type="number" value={form.published_year} onChange={set('published_year')} error={formErrors.published_year} placeholder="e.g. 2009" />
          <Input label="Shelf Location" value={form.shelf_location} onChange={set('shelf_location')} placeholder="e.g. Rack A-12" />
          <div className="sm:col-span-2">
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Short summary of the book..." />
          </div>
          {modal?.mode === 'edit' && <p className="text-xs text-slate-500 sm:col-span-2">Available copies are managed automatically from active issues ({modal.book.total_copies - modal.book.available_copies} currently issued). Changing total copies will recalculate availability.</p>}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete book?" message={`"${deleteTarget?.title}" will be permanently removed along with its past transaction history. This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

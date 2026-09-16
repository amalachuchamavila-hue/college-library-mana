import { useEffect, useState } from 'react';
import { BookOpen, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { api, type Book, type Category } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Badge, Button, CardsSkeleton, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Textarea } from '../components/ui';

const TILE_COLORS = [
  'bg-blue-600', 'bg-cyan-600', 'bg-violet-600', 'bg-amber-500', 'bg-red-500', 'bg-emerald-600', 'bg-slate-600', 'bg-orange-500',
];

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; category: Category } | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewTarget, setViewTarget] = useState<Category | null>(null);
  const [viewBooks, setViewBooks] = useState<Book[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const { success, error: toastError } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Category[]>('/api/categories');
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => { setName(''); setDescription(''); setNameError(''); setModal({ mode: 'add' }); };
  const openEdit = (c: Category) => { setName(c.name); setDescription(c.description || ''); setNameError(''); setModal({ mode: 'edit', category: c }); };
  const openView = (c: Category) => {
    setViewTarget(c);
    setViewLoading(true);
    api.get<Book[]>(`/api/books?category_id=${c.id}`).then(setViewBooks).catch(() => setViewBooks([])).finally(() => setViewLoading(false));
  };

  const handleSave = async () => {
    if (!modal) return;
    if (!name.trim()) { setNameError('Category name is required.'); return; }
    setSaving(true);
    try {
      if (modal.mode === 'add') {
        await api.post('/api/categories', { name: name.trim(), description: description.trim() });
        success('Category added.');
      } else {
        await api.put('/api/categories', { id: modal.category.id, name: name.trim(), description: description.trim() });
        success('Category updated.');
      }
      setModal(null);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del('/api/categories', { id: deleteTarget.id });
      success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete category.');
    } finally {
      setDeleting(false);
    }
  };

  if (error && !loading) return (<div><PageHeader title="Categories" subtitle="Organise books by subject" /><ErrorState message={error} onRetry={fetchAll} /></div>);

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · click a card to view its books`}
        actions={<Button icon={Plus} onClick={openAdd}>Add Category</Button>}
      />

      {loading ? <CardsSkeleton count={6} /> : categories.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <EmptyState icon={Tags} title="No categories yet" description="Create categories like Computer Science or Mathematics to organise your catalogue." action={<Button icon={Plus} onClick={openAdd}>Add Category</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c, i) => (
            <div key={c.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => openView(c)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${TILE_COLORS[i % TILE_COLORS.length]}`}>
                    <BookOpen className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-extrabold text-slate-900 group-hover:text-blue-700">{c.name}</span>
                    <span className="block text-xs text-slate-500">{c.books_count || 0} book{(c.books_count || 0) === 1 ? '' : 's'}</span>
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(c)} title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(c)} title="Delete" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-500">{c.description || 'No description.'}</p>
              <button onClick={() => openView(c)} className="mt-3 w-full rounded-lg bg-slate-50 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50">View Books</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'add' ? 'Add Category' : 'Edit Category'} subtitle={modal?.mode === 'add' ? 'Create a new subject category' : modal?.mode === 'edit' ? `Updating "${modal.category.name}"` : ''} footer={<>
        <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} loading={saving}>{modal?.mode === 'add' ? 'Add Category' : 'Save Changes'}</Button>
      </>}>
        <div className="space-y-4">
          <Input label="Category Name" required value={name} onChange={(e) => setName(e.target.value)} error={nameError} placeholder="e.g. Computer Science" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What belongs in this category? (optional)" />
        </div>
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.name || 'Category'} subtitle={viewTarget ? `${viewBooks.length} book${viewBooks.length === 1 ? '' : 's'} in this category` : ''} maxWidth="lg">
        {viewLoading ? <p className="py-6 text-center text-sm text-slate-500">Loading books...</p> : viewBooks.length === 0 ? (
          <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-500">No books in this category yet.</p>
        ) : (
          <div className="space-y-2">
            {viewBooks.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{b.title}</p>
                  <p className="truncate text-xs text-slate-500">by {b.author} · {b.book_id}</p>
                </div>
                <Badge tone={Number(b.available_copies) > 0 ? 'emerald' : 'red'}>{b.available_copies}/{b.total_copies}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete category?" message={`"${deleteTarget?.name}" will be permanently removed. Categories containing books cannot be deleted.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}

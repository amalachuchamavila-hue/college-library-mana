import supabase from './db-client.js';

const FINE_PER_DAY = 5;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
    return null;
  }
  return data.user;
}

function dateOnly(v) { return String(v || '').slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function diffDays(fromISO, toISO) {
  const a = new Date(dateOnly(fromISO) + 'T00:00:00Z');
  const b = new Date(dateOnly(toISO) + 'T00:00:00Z');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const [{ data: books }, { data: categories }, { data: students }, { data: issues }, { data: stuFull }] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }),
      supabase.from('categories').select('id, name'),
      supabase.from('students').select('id'),
      supabase.from('book_issues').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }),
      supabase.from('students').select('id, student_id, name, email'),
    ]);

    const catMap = {};
    (categories || []).forEach((c) => { catMap[c.id] = c.name; });
    const stuMap = {};
    (stuFull || []).forEach((s) => { stuMap[s.id] = s; });
    const bookMap = {};
    (books || []).forEach((b) => { bookMap[b.id] = b; });

    const totalTitles = (books || []).length;
    const totalCopies = (books || []).reduce((n, b) => n + Number(b.total_copies || 0), 0);
    const availableCopies = (books || []).reduce((n, b) => n + Number(b.available_copies || 0), 0);

    const today = todayStr();
    const enriched = (issues || []).map((i) => {
      const s = stuMap[i.student_id] || {};
      const b = bookMap[i.book_id] || {};
      const overdueDays = i.status === 'returned'
        ? Math.max(0, diffDays(i.due_date, i.return_date))
        : Math.max(0, diffDays(i.due_date, today));
      const currentFine = i.status === 'returned' ? Number(i.fine_amount || 0) : overdueDays * FINE_PER_DAY;
      const computedStatus = i.status === 'returned' ? 'returned' : (overdueDays > 0 ? 'overdue' : 'issued');
      return {
        ...i,
        student_name: s.name || 'Unknown student',
        student_code: s.student_id || '—',
        student_email: s.email || '',
        book_title: b.title || 'Unknown book',
        book_code: b.book_id || '—',
        book_author: b.author || '',
        overdue_days: overdueDays,
        current_fine: currentFine,
        computed_status: computedStatus,
      };
    });

    const active = enriched.filter((i) => i.status === 'issued');
    const overdue = active.filter((i) => i.overdue_days > 0).sort((a, b) => b.overdue_days - a.overdue_days);
    const pendingFine = active.reduce((n, i) => n + i.current_fine, 0)
      + enriched.filter((i) => i.status === 'returned' && !i.fine_paid).reduce((n, i) => n + Number(i.fine_amount || 0), 0);

    const recentBooks = (books || []).slice(0, 5).map((b) => ({
      ...b,
      category_name: b.category_id ? catMap[b.category_id] || null : null,
    }));

    const countMap = {};
    (books || []).forEach((b) => {
      if (b.category_id) countMap[b.category_id] = (countMap[b.category_id] || 0) + 1;
    });
    const categoryStats = (categories || [])
      .map((c) => ({ id: c.id, name: c.name, count: countMap[c.id] || 0 }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      stats: {
        totalTitles,
        totalCopies,
        availableCopies,
        activeIssues: active.length,
        totalStudents: (students || []).length,
        totalCategories: (categories || []).length,
        overdueCount: overdue.length,
        pendingFine,
        returnedCount: enriched.filter((i) => i.status === 'returned').length,
        totalTransactions: enriched.length,
      },
      recentBooks,
      recentTransactions: enriched.slice(0, 8),
      overdue: overdue.slice(0, 8),
      categoryStats,
    });
  } catch (err) {
    console.error('dashboard API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

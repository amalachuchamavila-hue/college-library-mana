import supabase from './db-client.js';

const FINE_PER_DAY = 5;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
function withComputed(issue) {
  const overdueDays = issue.status === 'returned'
    ? Math.max(0, diffDays(issue.due_date, issue.return_date))
    : Math.max(0, diffDays(issue.due_date, todayStr()));
  const currentFine = issue.status === 'returned' ? Number(issue.fine_amount || 0) : overdueDays * FINE_PER_DAY;
  const computedStatus = issue.status === 'returned' ? 'returned' : (overdueDays > 0 ? 'overdue' : 'issued');
  return { ...issue, overdue_days: overdueDays, current_fine: currentFine, computed_status: computedStatus };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { status = 'all', search = '', student_id = '', book_id = '' } = req.query || {};
      const { data: issues, error } = await supabase.from('book_issues').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (error) throw error;
      const { data: students } = await supabase.from('students').select('id, student_id, name, email');
      const { data: books } = await supabase.from('books').select('id, book_id, title, author');
      const stuMap = {};
      (students || []).forEach((s) => { stuMap[s.id] = s; });
      const bookMap = {};
      (books || []).forEach((b) => { bookMap[b.id] = b; });
      let result = (issues || []).map((i) => {
        const s = stuMap[i.student_id] || {};
        const b = bookMap[i.book_id] || {};
        return withComputed({
          ...i,
          student_name: s.name || 'Unknown student',
          student_code: s.student_id || '—',
          student_email: s.email || '',
          book_title: b.title || 'Unknown book',
          book_code: b.book_id || '—',
          book_author: b.author || '',
        });
      });
      if (student_id) result = result.filter((r) => Number(r.student_id) === Number(student_id));
      if (book_id) result = result.filter((r) => Number(r.book_id) === Number(book_id));
      if (status === 'active') result = result.filter((r) => r.status === 'issued');
      else if (status === 'issued') result = result.filter((r) => r.computed_status === 'issued');
      else if (status === 'overdue') result = result.filter((r) => r.computed_status === 'overdue');
      else if (status === 'returned') result = result.filter((r) => r.computed_status === 'returned');
      const q = String(search).trim().toLowerCase();
      if (q) {
        result = result.filter((r) =>
          [r.student_name, r.student_code, r.student_email, r.book_title, r.book_code, r.book_author]
            .map((v) => String(v || '').toLowerCase())
            .some((v) => v.includes(q))
        );
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const studentId = Number(body.student_id);
      const bookId = Number(body.book_id);
      const issueDate = dateOnly(body.issue_date);
      const dueDate = dateOnly(body.due_date);
      const notes = String(body.notes || '').trim() || null;
      if (!studentId || !bookId) return res.status(400).json({ error: 'Please select both a student and a book.' });
      if (!issueDate || !dueDate) return res.status(400).json({ error: 'Issue date and due date are required.' });
      if (diffDays(issueDate, dueDate) < 0) return res.status(400).json({ error: 'Due date cannot be before the issue date.' });
      const { data: student } = await supabase.from('students').select('id, name').eq('id', studentId).single();
      if (!student) return res.status(400).json({ error: 'Selected student does not exist.' });
      const { data: book } = await supabase.from('books').select('id, title, available_copies').eq('id', bookId).single();
      if (!book) return res.status(400).json({ error: 'Selected book does not exist.' });
      if (Number(book.available_copies) <= 0) return res.status(400).json({ error: 'No copies of "' + book.title + '" are currently available.' });
      const { data: dup } = await supabase.from('book_issues').select('id').eq('student_id', studentId).eq('book_id', bookId).eq('status', 'issued').limit(1);
      if (dup && dup.length) return res.status(400).json({ error: student.name + ' already has this book issued. Return it first.' });
      const { data, error } = await supabase.from('book_issues').insert({
        student_id: studentId,
        book_id: bookId,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'issued',
        fine_amount: 0,
        fine_paid: false,
        notes,
        issued_by: user.id,
      }).select().single();
      if (error) throw error;
      await supabase.from('books').update({ available_copies: Number(book.available_copies) - 1, updated_at: new Date().toISOString() }).eq('id', bookId);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const action = String(body.action || 'return');
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Transaction id is required.' });
      const { data: issue } = await supabase.from('book_issues').select('*').eq('id', id).single();
      if (!issue) return res.status(404).json({ error: 'Transaction not found.' });

      if (action === 'return') {
        if (issue.status === 'returned') return res.status(400).json({ error: 'This book has already been returned.' });
        const returnDate = dateOnly(body.return_date) || todayStr();
        if (diffDays(issue.issue_date, returnDate) < 0) return res.status(400).json({ error: 'Return date cannot be before the issue date.' });
        const overdueDays = Math.max(0, diffDays(issue.due_date, returnDate));
        const fine = overdueDays * FINE_PER_DAY;
        const finePaid = fine === 0 ? true : Boolean(body.fine_paid);
        const { data, error } = await supabase.from('book_issues').update({
          status: 'returned',
          return_date: returnDate,
          fine_amount: fine,
          fine_paid: finePaid,
          updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        const { data: book } = await supabase.from('books').select('id, total_copies, available_copies').eq('id', issue.book_id).single();
        if (book) {
          const restored = Math.min(Number(book.total_copies), Number(book.available_copies) + 1);
          await supabase.from('books').update({ available_copies: restored, updated_at: new Date().toISOString() }).eq('id', issue.book_id);
        }
        return res.status(200).json(withComputed(data));
      }

      if (action === 'pay_fine') {
        const { data, error } = await supabase.from('book_issues').update({ fine_paid: true, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(withComputed(data));
      }

      if (action === 'extend') {
        if (issue.status === 'returned') return res.status(400).json({ error: 'Cannot extend a returned transaction.' });
        const newDue = dateOnly(body.due_date);
        if (!newDue) return res.status(400).json({ error: 'New due date is required.' });
        if (diffDays(todayStr(), newDue) < 0) return res.status(400).json({ error: 'New due date cannot be in the past.' });
        const { data, error } = await supabase.from('book_issues').update({
          due_date: newDue,
          notes: body.notes === undefined ? issue.notes : (String(body.notes || '').trim() || null),
          updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(withComputed(data));
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    if (req.method === 'DELETE') {
      const id = Number((req.body || {}).id);
      if (!id) return res.status(400).json({ error: 'Transaction id is required.' });
      const { data: issue } = await supabase.from('book_issues').select('*').eq('id', id).single();
      if (!issue) return res.status(404).json({ error: 'Transaction not found.' });
      if (issue.status === 'issued') {
        const { data: book } = await supabase.from('books').select('id, total_copies, available_copies').eq('id', issue.book_id).single();
        if (book) {
          const restored = Math.min(Number(book.total_copies), Number(book.available_copies) + 1);
          await supabase.from('books').update({ available_copies: restored, updated_at: new Date().toISOString() }).eq('id', issue.book_id);
        }
      }
      const { error } = await supabase.from('book_issues').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('issues API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

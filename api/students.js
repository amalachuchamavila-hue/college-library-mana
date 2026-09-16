import supabase from './db-client.js';

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

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const isPhone = (v) => {
  if (!v) return true;
  const d = String(v).replace(/\D/g, '');
  return d.length >= 7 && d.length <= 15;
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { search = '' } = req.query || {};
      const { data: students, error } = await supabase.from('students').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (error) throw error;
      const { data: active } = await supabase.from('book_issues').select('student_id').eq('status', 'issued');
      const activeMap = {};
      (active || []).forEach((a) => { activeMap[a.student_id] = (activeMap[a.student_id] || 0) + 1; });
      let result = (students || []).map((s) => ({ ...s, active_issues: activeMap[s.id] || 0 }));
      const q = String(search).trim().toLowerCase();
      if (q) {
        result = result.filter((s) =>
          [s.name, s.student_id, s.email, s.phone, s.course, s.department, s.year_semester]
            .map((v) => String(v || '').toLowerCase())
            .some((v) => v.includes(q))
        );
      }
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const studentId = String(body.student_id || '').trim();
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const phone = String(body.phone || '').trim();
      if (!studentId || !name || !email) return res.status(400).json({ error: 'Student ID, name and email are required.' });
      if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
      if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
      const { data: idDup } = await supabase.from('students').select('id').eq('student_id', studentId).limit(1);
      if (idDup && idDup.length) return res.status(400).json({ error: 'This Student ID is already registered.' });
      const { data: emailDup } = await supabase.from('students').select('id').eq('email', email).limit(1);
      if (emailDup && emailDup.length) return res.status(400).json({ error: 'This email is already registered to another student.' });
      const { data, error } = await supabase.from('students').insert({
        student_id: studentId,
        name,
        email,
        phone: phone || null,
        course: String(body.course || '').trim() || null,
        department: String(body.department || '').trim() || null,
        year_semester: String(body.year_semester || '').trim() || null,
        address: String(body.address || '').trim() || null,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Student id is required.' });
      const { data: current, error: curErr } = await supabase.from('students').select('*').eq('id', id).single();
      if (curErr || !current) return res.status(404).json({ error: 'Student not found.' });
      const studentId = String(body.student_id ?? current.student_id).trim();
      const name = String(body.name ?? current.name).trim();
      const email = String(body.email ?? current.email).trim();
      const phone = String(body.phone ?? current.phone ?? '').trim();
      if (!studentId || !name || !email) return res.status(400).json({ error: 'Student ID, name and email are required.' });
      if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
      if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
      const { data: idDup } = await supabase.from('students').select('id').eq('student_id', studentId).neq('id', id).limit(1);
      if (idDup && idDup.length) return res.status(400).json({ error: 'This Student ID is already registered.' });
      const { data: emailDup } = await supabase.from('students').select('id').eq('email', email).neq('id', id).limit(1);
      if (emailDup && emailDup.length) return res.status(400).json({ error: 'This email is already registered to another student.' });
      const { data, error } = await supabase.from('students').update({
        student_id: studentId,
        name,
        email,
        phone: phone || null,
        course: body.course === undefined ? current.course : (String(body.course || '').trim() || null),
        department: body.department === undefined ? current.department : (String(body.department || '').trim() || null),
        year_semester: body.year_semester === undefined ? current.year_semester : (String(body.year_semester || '').trim() || null),
        address: body.address === undefined ? current.address : (String(body.address || '').trim() || null),
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = Number((req.body || {}).id);
      if (!id) return res.status(400).json({ error: 'Student id is required.' });
      const { count } = await supabase.from('book_issues').select('id', { count: 'exact', head: true }).eq('student_id', id).eq('status', 'issued');
      if (count && count > 0) return res.status(400).json({ error: 'Cannot delete: student has books currently issued. Return them first.' });
      await supabase.from('book_issues').delete().eq('student_id', id);
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('students API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

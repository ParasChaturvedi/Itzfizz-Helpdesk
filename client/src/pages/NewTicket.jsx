import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';

export default function NewTicket() {
  const navigate = useNavigate();
  const { user, isStaff } = useAuth();
  const client = user.role === 'client';
  const [options, setOptions] = useState({ priorities: [], departments: [] });
  const [form, setForm] = useState({ subject: '', body: '', priority: 'medium', department: 'General' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/tickets/meta/options').then((r) => setOptions(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return toast.error('Subject and message required');
    setBusy(true);
    try {
      const { data } = await api.post('/tickets', form);
      toast.success(`Ticket ${data.ticket.reference} created`);
      navigate(`/tickets/${data.ticket._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">New ticket</h1>
        <p className="text-sm text-slate-400">Describe the request and we'll route it to the right team.</p>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <div>
          <label className="label">Subject</label>
          <input className="input" placeholder="Short summary of the issue"
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>

        <div>
          <label className="label">Message</label>
          <textarea className="input min-h-[150px] resize-y" placeholder="Give as much detail as you can…"
            value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>

        <div className={client ? '' : 'grid gap-4 sm:grid-cols-2'}>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {options.priorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {!client && (
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {options.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
        {client && (
          <p className="-mt-2 text-xs text-slate-400">
            Just describe your request — our team will route it to the right department and assign the best person.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/tickets" className="btn-ghost">Cancel</Link>
          <button className="btn-primary" disabled={busy}>
            <Send className="h-4 w-4" /> {busy ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

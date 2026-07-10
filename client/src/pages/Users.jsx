import { useEffect, useState } from 'react';
import { UserPlus, Trash2, X, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Spinner, Avatar, RoleBadge, EmptyState } from '../components/ui';
import { ROLE_META, roleLabel } from '../lib/ui';

const DEPARTMENTS = ['', 'General', 'Design', 'Development', 'Sales', 'Billing'];
const ROLES = Object.keys(ROLE_META); // admin, developer, designer, content_writer, hr, agent, client

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => api.get('/users').then((r) => setUsers(r.data.users)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const update = async (id, payload) => {
    try {
      const { data } = await api.patch(`/users/${id}`, payload);
      setUsers((u) => u.map((x) => (x._id === id ? data.user : x)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const resetPassword = async (u) => {
    const pw = randomPassword();
    if (!confirm(`Reset password for ${u.name} to:\n\n${pw}\n\nShare it with them — they can change it later.`)) return;
    await update(u._id, { password: pw });
    toast.success('Password reset');
  };

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((u) => u.filter((x) => x._id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Team &amp; Clients</h1>
          <p className="text-sm text-slate-400">Provision accounts, set roles, departments and access.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><UserPlus className="h-4 w-4" /> Add member</button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No users yet" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.avatarColor} size={36} />
                        <div>
                          <div className="font-medium text-slate-700">
                            {u.name} {u._id === me._id && <span className="text-xs text-slate-400">(you)</span>}
                          </div>
                          <div className="text-xs text-slate-400">
                            {u.email}{u.username && <span className="text-slate-300"> · @{u.username}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u._id === me._id ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <select className="input !w-auto !py-1.5" value={u.role}
                          onChange={(e) => update(u._id, { role: e.target.value })}>
                          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <select className="input !w-auto !py-1.5" value={u.department || ''}
                        onChange={(e) => update(u._id, { department: e.target.value })}>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d || '—'}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => update(u._id, { active: !u.active })}
                        disabled={u._id === me._id}
                        className={`chip ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} disabled:opacity-60`}
                      >
                        {u.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => resetPassword(u)} className="text-slate-300 hover:text-brand-600" title="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {u._id !== me._id && (
                          <button onClick={() => remove(u._id)} className="text-slate-300 hover:text-red-500" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <AddModal onClose={() => setShowModal(false)} onCreated={(u) => setUsers((list) => [u, ...list])} />}
    </div>
  );
}

function AddModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', username: '', password: randomPassword(),
    role: 'developer', department: 'Development',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/users', form);
      onCreated(data.user);
      toast.success('Member added — login details emailed to them ✉️');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md animate-fade-up card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Add member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Username <span className="text-slate-300">(optional)</span></label>
              <input className="input" value={form.username} placeholder="e.g. priya"
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Password (they can change it later)</label>
            <div className="flex gap-2">
              <input className="input font-mono" value={form.password} required minLength={6}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="btn-ghost !px-3" title="Generate"
                onClick={() => setForm({ ...form, password: randomPassword() })}>
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

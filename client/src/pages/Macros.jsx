import { useEffect, useState } from 'react';
import { MessageSquareText, Plus, Trash2, Save, Users, User as UserIcon, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Spinner, EmptyState } from '../components/ui';

const BLANK = { title: '', body: '', scope: 'shared', actions: { status: '', priority: '', addTags: [] } };

export default function Macros() {
  const [macros, setMacros] = useState(null);
  const [options, setOptions] = useState({ statuses: [], priorities: [] });
  const [editing, setEditing] = useState(null); // macro object or null
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/macros').then((r) => setMacros(r.data.macros));

  useEffect(() => {
    Promise.all([load(), api.get('/tickets/meta/options').then((r) => setOptions(r.data))]).catch(() =>
      toast.error('Failed to load macros')
    );
  }, []);

  const save = async () => {
    if (!editing.title.trim()) return toast.error('Give the macro a title');
    setBusy(true);
    try {
      const payload = {
        title: editing.title,
        body: editing.body,
        scope: editing.scope,
        actions: editing.actions,
      };
      if (editing._id) await api.patch(`/macros/${editing._id}`, payload);
      else await api.post('/macros', payload);
      await load();
      setEditing(null);
      toast.success('Macro saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    if (!confirm(`Delete macro “${m.title}”?`)) return;
    try {
      await api.delete(`/macros/${m._id}`);
      await load();
      toast.success('Macro deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const setAction = (k, v) => setEditing((e) => ({ ...e, actions: { ...e.actions, [k]: v } }));

  if (macros === null) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
            <MessageSquareText className="h-6 w-6 text-brand-600" /> Canned Responses
          </h1>
          <p className="text-sm text-slate-400">Reusable replies with one-click actions — insert them from any ticket.</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing({ ...BLANK })} className="btn-primary">
            <Plus className="h-4 w-4" /> New macro
          </button>
        )}
      </div>

      {editing && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">{editing._id ? 'Edit macro' : 'New macro'}</h2>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Refund acknowledged" value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Reply text</label>
            <textarea className="input min-h-[120px] resize-y" placeholder="Hi {{name}}, thanks for reaching out…"
              value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Also set status</label>
              <select className="input" value={editing.actions.status} onChange={(e) => setAction('status', e.target.value)}>
                <option value="">— No change —</option>
                {options.statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Also set priority</label>
              <select className="input" value={editing.actions.priority} onChange={(e) => setAction('priority', e.target.value)}>
                <option value="">— No change —</option>
                {options.priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Add tags (comma-separated)</label>
              <input className="input" placeholder="billing, vip"
                value={editing.actions.addTags.join(', ')}
                onChange={(e) => setAction('addTags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={editing.scope === 'personal'}
                onChange={(e) => setEditing({ ...editing, scope: e.target.checked ? 'personal' : 'shared' })} />
              Personal (only visible to me)
            </label>
            <button onClick={save} disabled={busy} className="btn-primary">
              <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save macro'}
            </button>
          </div>
        </div>
      )}

      {macros.length === 0 && !editing ? (
        <EmptyState
          icon={MessageSquareText}
          title="No canned responses yet"
          subtitle="Create reusable replies so your team answers common questions in one click."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {macros.map((m) => (
            <div key={m._id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800">{m.title}</h3>
                <span className="chip bg-slate-100 text-slate-500">
                  {m.scope === 'personal' ? <UserIcon className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                  {m.scope}
                </span>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">{m.body || <em>No text</em>}</p>
              <div className="flex flex-wrap gap-1.5">
                {m.actions?.status && <span className="chip bg-blue-50 text-blue-600">→ {m.actions.status.replace('_', ' ')}</span>}
                {m.actions?.priority && <span className="chip bg-orange-50 text-orange-600">→ {m.actions.priority}</span>}
                {(m.actions?.addTags || []).map((t) => <span key={t} className="chip bg-slate-100 text-slate-500">#{t}</span>)}
              </div>
              <div className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-2">
                <button onClick={() => setEditing({ ...BLANK, ...m, actions: { ...BLANK.actions, ...m.actions } })}
                  className="btn-ghost !px-2.5 !py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => remove(m)} className="btn-ghost !px-2.5 !py-1.5 text-xs text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

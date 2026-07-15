import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Save, Palette, Timer, Mail, Zap, Tag as TagIcon, Plus, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useSettings } from '../store/settings';
import { Spinner, TagChip } from '../components/ui';

const FR_DEFAULTS = { urgent: 1, high: 2, medium: 8, low: 24 };
const ESC_DEFAULTS = { enabled: true, bumpPriority: true };

export default function Settings() {
  const { setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState({ name: '', color: '#d45427' });
  const [slaRunning, setSlaRunning] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      const s = data.settings;
      setForm({
        ...s,
        slaFirstResponseHours: { ...FR_DEFAULTS, ...(s.slaFirstResponseHours || {}) },
        slaEscalation: { ...ESC_DEFAULTS, ...(s.slaEscalation || {}) },
      });
    });
    api.get('/tags').then(({ data }) => setTags(data.tags)).catch(() => {});
  }, []);

  if (!form) return <Spinner />;

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250 * 1024) return toast.error('Please choose an image under 250 KB');
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, logo: reader.result });
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch('/settings', {
        brandName: form.brandName,
        logo: form.logo,
        primaryColor: form.primaryColor,
        slaHours: form.slaHours,
        slaFirstResponseHours: form.slaFirstResponseHours,
        slaEscalation: form.slaEscalation,
      });
      setSettings(data.settings);
      setForm({
        ...data.settings,
        slaFirstResponseHours: { ...FR_DEFAULTS, ...(data.settings.slaFirstResponseHours || {}) },
        slaEscalation: { ...ESC_DEFAULTS, ...(data.settings.slaEscalation || {}) },
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const setSla = (k, v) => setForm({ ...form, slaHours: { ...form.slaHours, [k]: Number(v) } });
  const setFr = (k, v) => setForm({ ...form, slaFirstResponseHours: { ...form.slaFirstResponseHours, [k]: Number(v) } });
  const setEsc = (k, v) => setForm({ ...form, slaEscalation: { ...form.slaEscalation, [k]: v } });

  const addTag = async () => {
    if (!newTag.name.trim()) return toast.error('Enter a tag name');
    try {
      const { data } = await api.post('/tags', newTag);
      setTags((t) => [...t, data.tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTag({ name: '', color: '#d45427' });
      toast.success('Tag added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add tag');
    }
  };

  const deleteTag = async (t) => {
    if (!confirm(`Delete tag “${t.name}”?`)) return;
    try {
      await api.delete(`/tags/${t._id}`);
      setTags((prev) => prev.filter((x) => x._id !== t._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete tag');
    }
  };

  const runSla = async () => {
    setSlaRunning(true);
    try {
      const { data } = await api.post('/sla/run');
      toast.success(`SLA check done — ${data.escalated} escalated, ${data.warned} warned`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'SLA check failed');
    } finally {
      setSlaRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-400">Branding, SLAs, escalation, tags and notifications.</p>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary">
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Branding */}
      <div className="card p-6 space-y-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Palette className="h-4 w-4 text-brand-600" /> Branding</h2>
        <div>
          <label className="label">Brand name</label>
          <input className="input" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
        </div>
        <div>
          <label className="label">Logo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              {form.logo ? <img src={form.logo} alt="logo" className="h-full w-full object-contain p-1" /> : <span className="text-xs text-slate-400">None</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload className="h-4 w-4" /> Upload</button>
            {form.logo && (
              <button onClick={() => setForm({ ...form, logo: '' })} className="btn-danger"><Trash2 className="h-4 w-4" /> Remove</button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">PNG/SVG, under 250 KB. Stored in your database — no external storage needed.</p>
        </div>
        <div>
          <label className="label">Accent colour</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200" />
            <span className="text-sm text-slate-500">{form.primaryColor}</span>
          </div>
        </div>
      </div>

      {/* SLA */}
      <div className="card p-6 space-y-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Timer className="h-4 w-4 text-brand-600" /> SLA targets (hours)</h2>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Resolution — time to fully resolve</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['urgent', 'high', 'medium', 'low'].map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input type="number" min="1" className="input" value={form.slaHours[k]} onChange={(e) => setSla(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">First response — time to the first reply</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['urgent', 'high', 'medium', 'low'].map((k) => (
              <div key={k}>
                <label className="label capitalize">{k}</label>
                <input type="number" min="1" className="input" value={form.slaFirstResponseHours[k]} onChange={(e) => setFr(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">Tickets show a live “due in / overdue” badge. First-response and resolution clocks run independently.</p>
      </div>

      {/* Escalation */}
      <div className="card p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Zap className="h-4 w-4 text-brand-600" /> Auto-escalation</h2>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">Escalate tickets when an SLA is breached</span>
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600"
            checked={form.slaEscalation.enabled} onChange={(e) => setEsc('enabled', e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">Bump priority up one level on breach</span>
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600"
            checked={form.slaEscalation.bumpPriority} onChange={(e) => setEsc('bumpPriority', e.target.checked)} />
        </label>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">Runs automatically daily; run it now to sweep overdue tickets immediately.</p>
          <button onClick={runSla} disabled={slaRunning} className="btn-ghost">
            <PlayCircle className="h-4 w-4" /> {slaRunning ? 'Running…' : 'Run SLA check'}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="card p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><TagIcon className="h-4 w-4 text-brand-600" /> Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 && <span className="text-sm text-slate-400">No tags yet.</span>}
          {tags.map((t) => <TagChip key={t._id} name={t.name} color={t.color} onRemove={() => deleteTag(t)} />)}
        </div>
        <div className="flex items-end gap-3 border-t border-slate-100 pt-4">
          <div className="flex-1">
            <label className="label">New tag</label>
            <input className="input" placeholder="e.g. billing" value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addTag()} />
          </div>
          <input type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
            className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200" title="Tag colour" />
          <button onClick={addTag} className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      {/* Notifications note */}
      <div className="card p-6 space-y-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Mail className="h-4 w-4 text-brand-600" /> Email notifications</h2>
        <p className="text-sm text-slate-500">
          Clients, admins and assignees are automatically emailed on new tickets, assignments,
          replies, status changes and SLA breaches. No setup needed here.
        </p>
      </div>
    </div>
  );
}

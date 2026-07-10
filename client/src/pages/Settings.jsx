import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Save, Palette, Timer, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useSettings } from '../store/settings';
import { Spinner } from '../components/ui';

export default function Settings() {
  const { settings, setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setForm(data.settings));
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
      });
      setSettings(data.settings);
      setForm(data.settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const setSla = (k, v) => setForm({ ...form, slaHours: { ...form.slaHours, [k]: Number(v) } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-400">Branding, SLA targets and notifications.</p>
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
      <div className="card p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Timer className="h-4 w-4 text-brand-600" /> SLA targets (hours to resolve)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {['urgent', 'high', 'medium', 'low'].map((k) => (
            <div key={k}>
              <label className="label capitalize">{k}</label>
              <input type="number" min="1" className="input" value={form.slaHours[k]} onChange={(e) => setSla(k, e.target.value)} />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">New tickets get a “due by” target based on their priority. Overdue tickets are flagged in red.</p>
      </div>

      {/* Notifications note */}
      <div className="card p-6 space-y-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Mail className="h-4 w-4 text-brand-600" /> Email notifications</h2>
        <p className="text-sm text-slate-500">
          Clients, admins and assignees are automatically emailed on new tickets, assignments,
          replies and status changes. No setup needed here.
        </p>
      </div>
    </div>
  );
}

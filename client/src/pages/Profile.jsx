import { useState } from 'react';
import { AlertCircle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Avatar, RoleBadge } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    password: '',
    phone: user.phone || '',
    whatsappApiKey: '',
  });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.password) payload.password = form.password;
      if (form.whatsappApiKey) payload.whatsappApiKey = form.whatsappApiKey;
      const { data } = await api.patch('/users/me', payload);
      setUser(data.user);
      setForm({ ...form, password: '', whatsappApiKey: '' });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">Your profile</h1>

      {user.mustChangePassword && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <b>Set your own password.</b> Your account was created by an admin — please choose a new password below.
          </div>
        </div>
      )}

      <div className="card flex items-center gap-4 p-6">
        <Avatar name={user.name} color={user.avatarColor} size={64} />
        <div>
          <div className="text-lg font-bold text-slate-800">{user.name}</div>
          <div className="text-sm text-slate-400">
            {user.email}{user.username && <span> · @{user.username}</span>}
          </div>
          <div className="mt-1"><RoleBadge role={user.role} />{user.department && <span className="ml-2 text-xs text-slate-400">{user.department}</span>}</div>
        </div>
      </div>

      <form onSubmit={save} className="card space-y-5 p-6">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" value={form.password} placeholder="Leave blank to keep current"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MessageCircle className="h-4 w-4 text-brand-600" /> WhatsApp alerts (optional)
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">WhatsApp number</label>
              <input className="input" value={form.phone} placeholder="+9198XXXXXXXX"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">CallMeBot API key</label>
              <input className="input" value={form.whatsappApiKey} placeholder="leave blank to keep"
                onChange={(e) => setForm({ ...form, whatsappApiKey: e.target.value })} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Get a free key: message “I allow callmebot to send me messages” to +34 644 51 95 23 on WhatsApp — it replies with your apikey.
          </p>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}

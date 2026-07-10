import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Avatar, RoleBadge } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name };
      if (password) payload.password = password;
      const { data } = await api.patch('/users/me', payload);
      setUser(data.user);
      setPassword('');
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

      <div className="card flex items-center gap-4 p-6">
        <Avatar name={user.name} color={user.avatarColor} size={64} />
        <div>
          <div className="text-lg font-bold text-slate-800">{user.name}</div>
          <div className="text-sm text-slate-400">{user.email}</div>
          <div className="mt-1"><RoleBadge role={user.role} />{user.department && <span className="ml-2 text-xs text-slate-400">{user.department}</span>}</div>
        </div>
      </div>

      <form onSubmit={save} className="card space-y-5 p-6">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" value={password} placeholder="Leave blank to keep current"
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}

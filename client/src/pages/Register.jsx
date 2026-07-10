import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../store/auth';
import { AuthShell, Field } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setBusy(true);
    try {
      const user = await register(form.name, form.email, form.password);
      toast.success(user.role === 'admin' ? 'Admin account created 🎉' : 'Account created!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold text-slate-800">Create your account</h1>
      <p className="mt-1 text-sm text-slate-400">The very first account becomes the admin.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field icon={User} label="Full name" value={form.name}
          onChange={(v) => setForm({ ...form, name: v })} placeholder="Jane Cooper" />
        <Field icon={Mail} label="Email" type="email" value={form.email}
          onChange={(v) => setForm({ ...form, email: v })} placeholder="you@company.com" />
        <Field icon={Lock} label="Password" type="password" value={form.password}
          onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 6 characters" />
        <button className="btn-primary w-full !py-2.5" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

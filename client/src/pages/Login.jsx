import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Headphones, User, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../store/auth';
import { useSettings } from '../store/settings';

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form.identifier, form.password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold text-slate-800">Sign in to {settings.brandName}</h1>
      <p className="mt-1 text-sm text-slate-400">Manage every request in one calm place.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field icon={User} label="Email or username" value={form.identifier}
          onChange={(v) => setForm({ ...form, identifier: v })} placeholder="you@company.com" />
        <Field icon={Lock} label="Password" type="password" value={form.password}
          onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
        <button className="btn-primary w-full !py-2.5" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  const { settings } = useSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.20),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,.12),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            {settings.logo ? (
              <img src={settings.logo} alt="logo" className="h-10 w-10 rounded-xl object-contain bg-white/15 p-1" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Headphones className="h-5 w-5" />
              </span>
            )}
            <span className="font-display text-xl font-extrabold">{settings.brandName}</span>
          </div>
          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-snug">
              Turn every email into a tracked, assignable ticket.
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              Email-to-ticket automation, role-based access and clean task assignment —
              self-hosted and yours.
            </p>
            <div className="mt-8 flex gap-6 text-sm text-white/70">
              <span>✓ Email → Ticket</span>
              <span>✓ SLA &amp; Roles</span>
              <span>✓ Assignments</span>
            </div>
          </div>
          <span className="text-sm text-white/50">© {new Date().getFullYear()} {settings.brandName}</span>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}

export function Field({ icon: Icon, label, value, onChange, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          className={`input ${Icon ? 'pl-10' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          {...rest}
        />
      </div>
    </div>
  );
}

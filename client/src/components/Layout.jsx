import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, Users, Plus, LogOut, Menu, X, UserCircle, Headphones,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { Avatar, RoleBadge } from './ui';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/users', label: 'Team & Clients', icon: Users, roles: ['admin'] },
];

function SidebarContent({ user, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lift">
          <Headphones className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-slate-800">DeskFlow</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav
          .filter((i) => !i.roles || i.roles.includes(user.role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3">
        <NavLink to="/tickets/new" onClick={onNavigate} className="btn-primary w-full">
          <Plus className="h-4 w-4" /> New Ticket
        </NavLink>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              className="absolute right-3 top-4 text-slate-400"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8">
          <button className="text-slate-500 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden text-sm text-slate-400 lg:block">
            Welcome back, <span className="font-semibold text-slate-700">{user.name.split(' ')[0]}</span> 👋
          </div>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100">
              <Avatar name={user.name} color={user.avatarColor} size={32} />
              <div className="hidden text-left sm:block">
                <div className="text-sm font-semibold leading-tight text-slate-700">{user.name}</div>
                <div className="leading-tight"><RoleBadge role={user.role} /></div>
              </div>
            </Link>
            <button onClick={handleLogout} className="btn-ghost !px-2.5" title="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

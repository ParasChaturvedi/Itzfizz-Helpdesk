import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
      <div>
        <div className="text-7xl font-extrabold text-brand-600">404</div>
        <p className="mt-2 text-slate-500">This page wandered off.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}

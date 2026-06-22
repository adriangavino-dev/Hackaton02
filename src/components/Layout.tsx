import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tropels', label: 'Tropeles' },
  { to: '/signals', label: 'Senales' },
  { to: '/sectors', label: 'Sectores' },
];

export function Layout(): ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-edge bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 font-bold text-white">
              T
            </span>
            <span className="hidden font-semibold text-white sm:inline">TropelCare</span>
          </NavLink>

          <nav className="flex items-center gap-1" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-edge text-white'
                      : 'text-muted hover:bg-edge/50 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-right text-xs leading-tight text-muted md:block">
                <span className="block font-medium text-white">{user.displayName}</span>
                <span>{user.teamCode}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-edge px-3 py-1.5 text-sm text-muted transition hover:bg-edge hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
